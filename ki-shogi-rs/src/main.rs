// Ki Shogi - Main entry point

use std::thread;
use std::time::{Duration, Instant};
use std::sync::mpsc;
use crossterm::terminal;

use ki_shogi::types::{Owner, Cube, Face};
use ki_shogi::state::{GameState, Mode, AiSide, MoveLogEntry, PendingLogInfo, PositionRecord};
use ki_shogi::rules::{
    get_legal_moves, get_legal_drops, is_in_check, handle_stranding,
    has_legal_action, get_white_gyoku_positions,
};
use ki_shogi::render::{render, cleanup};
use ki_shogi::input::{poll_key, Key};
use ki_shogi::lang::{t, toggle_lang};
use ki_shogi::ai::{ai_choose, position_hash, Action};

fn fk(face: Face) -> &'static str {
    face.kanji()
}

fn log_move(state: &mut GameState, owner: Owner, text: String, face: Option<Face>, from: Option<(i32, i32)>, to: Option<(i32, i32)>) {
    state.move_num += 1;
    let snapshot = state.take_snapshot();
    state.move_log.push(MoveLogEntry {
        num: state.move_num, owner, text, snapshot, face, from, to,
    });
}

fn end_turn(state: &mut GameState) {
    handle_stranding(state);
    let snap = state.take_snapshot();
    if let Some(last) = state.move_log.last_mut() {
        last.snapshot = snap;
    }
    state.switch_turn();
    state.message.clear();

    if !has_legal_action(state, state.turn) {
        state.winner = Some(state.turn.opponent());
        state.mode = Mode::GameOver;
        render(state);
        return;
    }

    state.in_check = is_in_check(state, state.turn);

    let hash = position_hash(state);
    let hist = state.position_history.entry(hash).or_default();
    hist.push(PositionRecord { in_check: state.in_check });

    if hist.len() == 3 {
        let all_check = hist.iter().all(|h| h.in_check);
        state.message = if all_check {
            t("perpetual_check_warning").to_string()
        } else {
            t("sennichite_warning").to_string()
        };
    }
    if hist.len() >= 4 {
        let all_check = hist.iter().all(|h| h.in_check);
        if all_check {
            state.winner = Some(state.turn);
            state.mode = Mode::GameOver;
            state.message = t("perpetual_check_lose").to_string();
            render(state);
            return;
        }
        state.mode = Mode::Draw;
        state.message = t("sennichite").to_string();
        render(state);
        return;
    }

    state.mode = Mode::Board;
    state.selected = None;
    state.legal_moves.clear();
    if !state.ai_side.is_ai(state.turn) {
        if let Some(gi) = state.gyoku(state.turn) {
            if state.pieces[gi].on_board() {
                state.cursor = (state.pieces[gi].x.unwrap(), state.pieces[gi].y.unwrap());
            }
        }
    }
    render(state);
}

fn execute_move(state: &mut GameState, pidx: usize, mv_x: i32, mv_y: i32, cap_idx: Option<usize>, promote_to: Option<Face>) {
    let ox = state.pieces[pidx].x.unwrap();
    let oy = state.pieces[pidx].y.unwrap();
    let of = state.pieces[pidx].face;
    let m_from = (ox, oy);
    let m_to = (mv_x, mv_y);

    if let Some(ci) = cap_idx {
        // Capturing Gyoku = immediate win
        if state.pieces[ci].cube == Cube::Gyoku {
            state.pieces[pidx].x = Some(mv_x);
            state.pieces[pidx].y = Some(mv_y);
            state.pieces[ci].x = None;
            state.pieces[ci].y = None;
            let text = format!("{}({},{})×{}({},{})", fk(of), ox, oy, fk(Face::Gyoku), mv_x, mv_y);
            log_move(state, state.pieces[pidx].owner, text, Some(of), Some(m_from), Some(m_to));
            state.winner = Some(state.pieces[pidx].owner);
            state.mode = Mode::GameOver;
            state.selected = None;
            state.legal_moves.clear();
            render(state);
            return;
        }

        let cap_face = state.pieces[ci].face;
        let p_owner = state.pieces[pidx].owner;
        state.pieces[ci].x = None;
        state.pieces[ci].y = None;
        state.pieces[ci].owner = p_owner;
        state.pieces[pidx].x = Some(mv_x);
        state.pieces[pidx].y = Some(mv_y);

        let cap_base = format!("{}({},{})×{}({},{})", fk(of), ox, oy, fk(cap_face), mv_x, mv_y);

        if state.pieces[pidx].cube != Cube::Gyoku {
            let promos = state.pieces[pidx].face.promotions();
            if !promos.is_empty() {
                if promos.len() == 1 {
                    state.pieces[pidx].face = promos[0];
                    let text = format!("{}→{}", cap_base, fk(promos[0]));
                    log_move(state, p_owner, text, Some(of), Some(m_from), Some(m_to));
                    state.selected = None;
                    state.legal_moves.clear();
                    end_turn(state);
                    return;
                }
                if let Some(pt) = promote_to {
                    state.pieces[pidx].face = pt;
                    let text = format!("{}→{}", cap_base, fk(pt));
                    log_move(state, p_owner, text, Some(of), Some(m_from), Some(m_to));
                    state.selected = None;
                    state.legal_moves.clear();
                    end_turn(state);
                    return;
                }
                if state.ai_side.is_ai(p_owner) {
                    let best = promos.iter().max_by_key(|f| f.face_value()).copied().unwrap();
                    state.pieces[pidx].face = best;
                    let text = format!("{}→{}", cap_base, fk(best));
                    log_move(state, p_owner, text, Some(of), Some(m_from), Some(m_to));
                    state.selected = None;
                    state.legal_moves.clear();
                    end_turn(state);
                    return;
                }
                // Human: show promote UI
                state.promote_choices = promos.to_vec();
                state.promote_index = 0;
                state.pending_log_info = Some(PendingLogInfo {
                    owner: p_owner, cap_base, face: of, from: m_from, to: m_to,
                });
                state.mode = Mode::Promote;
                render(state);
                return;
            }
        }
        // No promotion available
        log_move(state, p_owner, cap_base, Some(of), Some(m_from), Some(m_to));
        state.selected = None;
        state.legal_moves.clear();
        end_turn(state);
    } else {
        // Non-capture: move and flip
        let p_owner = state.pieces[pidx].owner;
        state.pieces[pidx].x = Some(mv_x);
        state.pieces[pidx].y = Some(mv_y);
        if state.pieces[pidx].cube != Cube::Gyoku {
            if let Some(opp) = state.pieces[pidx].face.opposite() {
                state.pieces[pidx].face = opp;
            }
        }
        let new_face = state.pieces[pidx].face;
        let flipped = if new_face != of { format!("={}", fk(new_face)) } else { String::new() };
        let text = format!("{}({},{})→({},{}){}",  fk(of), ox, oy, mv_x, mv_y, flipped);
        log_move(state, p_owner, text, Some(of), Some(m_from), Some(m_to));
        state.selected = None;
        state.legal_moves.clear();
        end_turn(state);
    }
}

fn ai_setup_black_gyoku(state: &mut GameState) {
    if let Some(gi) = state.gyoku(Owner::Black) {
        state.pieces[gi].x = Some(0);
        state.pieces[gi].y = Some(0);
        let text = format!("{}↓(0,0)", fk(Face::Gyoku));
        log_move(state, Owner::Black, text, Some(Face::Gyoku), None, Some((0, 0)));
        state.mode = Mode::SetupWhiteGyoku;
        let positions = get_white_gyoku_positions(state);
        if !positions.is_empty() {
            let best = positions.iter()
                .max_by(|a, b| a.1.cmp(&b.1).then(b.0.abs().cmp(&a.0.abs())))
                .copied().unwrap();
            state.cursor = best;
            state.legal_moves = positions.iter()
                .map(|&(x, y)| ki_shogi::state::LegalMove { x, y, capture: None })
                .collect();
        }
        state.turn = Owner::White;
        state.message.clear();
        render(state);
    }
}

fn ai_setup_white_gyoku(state: &mut GameState) {
    let positions = get_white_gyoku_positions(state);
    if positions.is_empty() { return; }
    let pick = positions[rand_idx(positions.len())];
    if let Some(gi) = state.gyoku(Owner::White) {
        state.pieces[gi].x = Some(pick.0);
        state.pieces[gi].y = Some(pick.1);
        let text = format!("{}↓({},{})", fk(Face::Gyoku), pick.0, pick.1);
        log_move(state, Owner::White, text, Some(Face::Gyoku), None, Some(pick));
        state.legal_moves.clear();
        state.turn = Owner::Black;
        state.mode = Mode::Board;
        if let Some(bgi) = state.gyoku(Owner::Black) {
            if state.pieces[bgi].on_board() {
                state.cursor = (state.pieces[bgi].x.unwrap(), state.pieces[bgi].y.unwrap());
            }
        }
        state.message = t("game_start").to_string();
        render(state);
    }
}

fn rand_idx(max: usize) -> usize {
    use std::time::SystemTime;
    if max == 0 { return 0; }
    let seed = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos() as usize;
    seed % max
}

fn ai_do_move_with_action(state: &mut GameState, action: Action) {
    match action {
        Action::Move { piece_idx, mv, promote_to } => {
            let from = state.pieces[piece_idx].pos();
            state.selected = Some(piece_idx);
            execute_move(state, piece_idx, mv.x, mv.y, mv.capture, promote_to);
            state.last_move_from = from;
            state.last_move_to = Some((mv.x, mv.y));
        }
        Action::Drop { piece_idx, face, pos } => {
            state.pieces[piece_idx].face = face;
            state.pieces[piece_idx].x = Some(pos.0);
            state.pieces[piece_idx].y = Some(pos.1);
            let text = format!("{}↓({},{})", fk(face), pos.0, pos.1);
            let owner = state.pieces[piece_idx].owner;
            log_move(state, owner, text, Some(face), None, Some(pos));
            state.selected = None;
            state.drop_targets.clear();
            state.last_move_from = None;
            state.last_move_to = Some(pos);
            end_turn(state);
        }
    }
}

fn on_menu(state: &mut GameState, key: Key) {
    if key == Key::Esc && state.menu_step > 1 {
        state.menu_step -= 1;
        if state.menu_step == 2 && !state.want_ai { state.menu_step = 1; }
        render(state);
        return;
    }
    if state.menu_step == 1 {
        match key {
            Key::One => state.want_ai = false,
            Key::Two => state.want_ai = true,
            Key::Three => {
                state.tutorial_page = 0;
                state.mode = Mode::Tutorial;
                render(state);
                return;
            }
            _ => return,
        }
        state.menu_step = 2;
    } else if state.menu_step == 2 {
        match key {
            Key::One => state.use_ki = false,
            Key::Two => state.use_ki = true,
            _ => return,
        }
        if state.want_ai {
            state.menu_step = 3;
        } else {
            state.start_game(state.use_ki, AiSide::None);
        }
    } else if state.menu_step == 3 {
        match key {
            Key::One => state.ai_difficulty = 1,
            Key::Two => state.ai_difficulty = 2,
            Key::Three => state.ai_difficulty = 3,
            Key::Four => state.ai_difficulty = 4,
            Key::Five => state.ai_difficulty = 5,
            _ => return,
        }
        state.menu_step = 4;
    } else if state.menu_step == 4 {
        let ai_side = match key {
            Key::One => AiSide::Player(Owner::White),
            Key::Two => AiSide::Player(Owner::Black),
            Key::Three => {
                if rand_idx(2) == 0 { AiSide::Player(Owner::Black) }
                else { AiSide::Player(Owner::White) }
            }
            Key::Four => AiSide::Both,
            _ => return,
        };
        let use_ki = state.use_ki;
        state.start_game(use_ki, ai_side);
        if ai_side.is_ai(Owner::Black) {
            ai_setup_black_gyoku(state);
            if ai_side.is_ai(Owner::White) {
                thread::sleep(Duration::from_millis(300));
                ai_setup_white_gyoku(state);
            }
            return;
        }
    }
    render(state);
}

fn on_tutorial(state: &mut GameState, key: Key) {
    match key {
        Key::Esc => {
            state.mode = Mode::Menu;
            state.menu_step = 1;
        }
        Key::Right if state.tutorial_page < 6 => {
            state.tutorial_page += 1;
        }
        Key::Left if state.tutorial_page > 0 => {
            state.tutorial_page -= 1;
        }
        _ => {}
    }
    render(state);
}

fn on_log_browse(state: &mut GameState, key: Key) {
    match key {
        Key::Esc | Key::Tab => {
            state.mode = state.pre_log_mode.unwrap_or(Mode::Board);
            state.pre_log_mode = None;
        }
        Key::Up => {
            if state.log_index > 0 { state.log_index -= 1; }
        }
        Key::Down => {
            if state.log_index + 1 < state.move_log.len() {
                state.log_index += 1;
            }
        }
        _ => {}
    }
    render(state);
}

fn on_setup_black_gyoku(state: &mut GameState, key: Key) {
    match key {
        Key::Up => state.cursor.1 += 1,
        Key::Down => state.cursor.1 -= 1,
        Key::Left => state.cursor.0 -= 1,
        Key::Right => state.cursor.0 += 1,
        Key::Enter => {
            if let Some(gi) = state.gyoku(Owner::Black) {
                state.pieces[gi].x = Some(state.cursor.0);
                state.pieces[gi].y = Some(state.cursor.1);
                let text = format!("{}↓({},{})", fk(Face::Gyoku), state.cursor.0, state.cursor.1);
                log_move(state, Owner::Black, text, Some(Face::Gyoku), None, Some(state.cursor));
                state.mode = Mode::SetupWhiteGyoku;
                let positions = get_white_gyoku_positions(state);
                if !positions.is_empty() {
                    let best = positions.iter()
                        .max_by(|a, b| a.1.cmp(&b.1).then(b.0.abs().cmp(&a.0.abs())))
                        .copied().unwrap();
                    state.cursor = best;
                    state.legal_moves = positions.iter()
                        .map(|&(x, y)| ki_shogi::state::LegalMove { x, y, capture: None })
                        .collect();
                }
                state.turn = Owner::White;
                state.message.clear();
                if state.ai_side.is_ai(Owner::White) {
                    render(state);
                    thread::sleep(Duration::from_millis(300));
                    ai_setup_white_gyoku(state);
                    return;
                }
            }
        }
        _ => {}
    }
    render(state);
}

fn on_setup_white_gyoku(state: &mut GameState, key: Key) {
    let positions = get_white_gyoku_positions(state);
    let pos_set: std::collections::HashSet<(i32, i32)> = positions.into_iter().collect();

    match key {
        Key::Up => state.cursor.1 += 1,
        Key::Down => state.cursor.1 -= 1,
        Key::Left => state.cursor.0 -= 1,
        Key::Right => state.cursor.0 += 1,
        Key::Enter => {
            if pos_set.contains(&state.cursor) {
                if let Some(gi) = state.gyoku(Owner::White) {
                    state.pieces[gi].x = Some(state.cursor.0);
                    state.pieces[gi].y = Some(state.cursor.1);
                    let text = format!("{}↓({},{})", fk(Face::Gyoku), state.cursor.0, state.cursor.1);
                    log_move(state, Owner::White, text, Some(Face::Gyoku), None, Some(state.cursor));
                    state.legal_moves.clear();
                    state.turn = Owner::Black;
                    state.mode = Mode::Board;
                    if let Some(bgi) = state.gyoku(Owner::Black) {
                        if state.pieces[bgi].on_board() {
                            state.cursor = (state.pieces[bgi].x.unwrap(), state.pieces[bgi].y.unwrap());
                        }
                    }
                    state.message = t("game_start").to_string();
                }
            } else {
                state.message = t("invalid_pos").to_string();
            }
        }
        _ => {}
    }
    render(state);
}

fn on_board(state: &mut GameState, key: Key) {
    match key {
        Key::Up => state.cursor.1 += 1,
        Key::Down => state.cursor.1 -= 1,
        Key::Left => state.cursor.0 -= 1,
        Key::Right => state.cursor.0 += 1,
        Key::Tab => {
            if !state.move_log.is_empty() {
                state.log_index = state.move_log.len() - 1;
                state.pre_log_mode = Some(Mode::Board);
                state.mode = Mode::LogBrowse;
            }
        }
        Key::D => {
            state.last_move_from = None;
            state.last_move_to = None;
            let hand = state.hand_pieces_for(state.turn);
            if hand.is_empty() {
                state.message = t("no_hand").to_string();
                render(state);
                return;
            }
            state.hand_pieces = hand;
            state.hand_index = 0;
            state.mode = Mode::Hand;
        }
        Key::Enter => {
            state.last_move_from = None;
            state.last_move_to = None;
            if let Some(pi) = state.piece_at(state.cursor.0, state.cursor.1) {
                if state.pieces[pi].owner == state.turn {
                    let moves = get_legal_moves(state, pi);
                    if moves.is_empty() {
                        state.message = if is_in_check(state, state.turn) {
                            t("no_moves_check").to_string()
                        } else {
                            t("no_moves").to_string()
                        };
                        render(state);
                        return;
                    }
                    state.selected = Some(pi);
                    state.legal_moves = moves;
                    state.mode = Mode::Selected;
                } else {
                    state.message = t("not_yours").to_string();
                }
            } else {
                state.message = t("empty_sq").to_string();
            }
        }
        _ => {}
    }
    render(state);
}

fn on_selected(state: &mut GameState, key: Key) {
    match key {
        Key::Esc => {
            state.selected = None;
            state.legal_moves.clear();
            state.mode = Mode::Board;
            state.message.clear();
        }
        Key::Up => state.cursor.1 += 1,
        Key::Down => state.cursor.1 -= 1,
        Key::Left => state.cursor.0 -= 1,
        Key::Right => state.cursor.0 += 1,
        Key::Enter => {
            let found = state.legal_moves.iter()
                .find(|m| m.x == state.cursor.0 && m.y == state.cursor.1)
                .cloned();
            if let Some(mv) = found {
                let pidx = state.selected.unwrap();
                execute_move(state, pidx, mv.x, mv.y, mv.capture, None);
                return;
            } else {
                state.message = t("invalid_target").to_string();
            }
        }
        _ => {}
    }
    render(state);
}

fn on_hand(state: &mut GameState, key: Key) {
    match key {
        Key::Esc => {
            state.mode = Mode::Board;
            state.message.clear();
        }
        Key::Up => {
            if state.hand_index > 0 { state.hand_index -= 1; }
        }
        Key::Down => {
            if state.hand_index + 1 < state.hand_pieces.len() {
                state.hand_index += 1;
            }
        }
        Key::Enter => {
            let pi = state.hand_pieces[state.hand_index];
            let cube = state.pieces[pi].cube;
            let faces = Face::cube_faces(cube).to_vec();
            if faces.is_empty() {
                state.message = t("cant_drop").to_string();
                render(state);
                return;
            }
            state.drop_faces = faces;
            state.face_index = 0;
            state.selected = Some(pi);
            state.mode = Mode::FaceSelect;
        }
        _ => {}
    }
    render(state);
}

fn on_face_select(state: &mut GameState, key: Key) {
    match key {
        Key::Esc => {
            state.mode = Mode::Hand;
            state.message.clear();
        }
        Key::Up => {
            if state.face_index > 0 { state.face_index -= 1; }
        }
        Key::Down => {
            if state.face_index + 1 < state.drop_faces.len() {
                state.face_index += 1;
            }
        }
        Key::Enter => {
            let face = state.drop_faces[state.face_index];
            let drops = get_legal_drops(state, state.turn, face);
            if drops.is_empty() {
                state.message = t("no_drop_pos").to_string();
                render(state);
                return;
            }
            if let Some(si) = state.selected {
                state.pieces[si].face = face;
            }
            state.cursor = drops[0];
            state.drop_targets = drops;
            state.mode = Mode::DropTarget;
        }
        _ => {}
    }
    render(state);
}

fn on_drop_target(state: &mut GameState, key: Key) {
    match key {
        Key::Esc => {
            state.drop_targets.clear();
            state.mode = Mode::FaceSelect;
            state.message.clear();
        }
        Key::Up => state.cursor.1 += 1,
        Key::Down => state.cursor.1 -= 1,
        Key::Left => state.cursor.0 -= 1,
        Key::Right => state.cursor.0 += 1,
        Key::Enter => {
            if !state.drop_targets.contains(&state.cursor) {
                state.message = t("invalid_drop").to_string();
                render(state);
                return;
            }
            let si = state.selected.unwrap();
            let face = state.pieces[si].face;
            let owner = state.pieces[si].owner;
            state.pieces[si].x = Some(state.cursor.0);
            state.pieces[si].y = Some(state.cursor.1);
            let text = format!("{}↓({},{})", fk(face), state.cursor.0, state.cursor.1);
            log_move(state, owner, text, Some(face), None, Some(state.cursor));
            state.selected = None;
            state.drop_targets.clear();
            end_turn(state);
            return;
        }
        _ => {}
    }
    render(state);
}

fn on_promote(state: &mut GameState, key: Key) {
    match key {
        Key::Up => {
            if state.promote_index > 0 { state.promote_index -= 1; }
        }
        Key::Down => {
            if state.promote_index + 1 < state.promote_choices.len() {
                state.promote_index += 1;
            }
        }
        Key::Enter => {
            let chosen = state.promote_choices[state.promote_index];
            if let Some(si) = state.selected {
                state.pieces[si].face = chosen;
            }
            if let Some(info) = state.pending_log_info.take() {
                let text = format!("{}→{}", info.cap_base, fk(chosen));
                log_move(state, info.owner, text, Some(info.face), Some(info.from), Some(info.to));
            }
            state.selected = None;
            state.legal_moves.clear();
            state.promote_choices.clear();
            end_turn(state);
            return;
        }
        _ => {}
    }
    render(state);
}

fn handle_key(state: &mut GameState, key: Key) {
    if key == Key::Q {
        cleanup();
        std::process::exit(0);
    }
    if key == Key::L {
        toggle_lang();
        render(state);
        return;
    }
    if key == Key::R && state.mode != Mode::Menu {
        state.reset();
        state.start_game(state.use_ki, state.ai_side);
        render(state);
        if state.ai_side.is_ai(Owner::Black) {
            thread::sleep(Duration::from_millis(300));
            ai_setup_black_gyoku(state);
            if state.ai_side.is_ai(Owner::White) {
                thread::sleep(Duration::from_millis(300));
                ai_setup_white_gyoku(state);
            }
        }
        return;
    }
    if key == Key::M && state.mode != Mode::Menu {
        state.reset_to_menu();
        render(state);
        return;
    }

    // During AI turn: allow cursor, Tab, Space (pause), block the rest
    if state.ai_side.is_ai(state.turn) && state.mode == Mode::Board {
        match key {
            Key::Space => {
                state.paused = !state.paused;
                render(state);
            }
            Key::Up => { state.cursor.1 += 1; render(state); }
            Key::Down => { state.cursor.1 -= 1; render(state); }
            Key::Left => { state.cursor.0 -= 1; render(state); }
            Key::Right => { state.cursor.0 += 1; render(state); }
            Key::Tab if !state.move_log.is_empty() => {
                state.log_index = state.move_log.len() - 1;
                state.pre_log_mode = Some(Mode::Board);
                state.mode = Mode::LogBrowse;
                render(state);
            }
            _ => {}
        }
        return;
    }

    match state.mode {
        Mode::Menu => on_menu(state, key),
        Mode::SetupBlackGyoku => on_setup_black_gyoku(state, key),
        Mode::SetupWhiteGyoku => on_setup_white_gyoku(state, key),
        Mode::Board => on_board(state, key),
        Mode::Selected => on_selected(state, key),
        Mode::Hand => on_hand(state, key),
        Mode::FaceSelect => on_face_select(state, key),
        Mode::DropTarget => on_drop_target(state, key),
        Mode::Promote => on_promote(state, key),
        Mode::Tutorial => on_tutorial(state, key),
        Mode::LogBrowse => on_log_browse(state, key),
        Mode::GameOver | Mode::Draw => {
            match key {
                Key::Up => { state.cursor.1 += 1; render(state); }
                Key::Down => { state.cursor.1 -= 1; render(state); }
                Key::Left => { state.cursor.0 -= 1; render(state); }
                Key::Right => { state.cursor.0 += 1; render(state); }
                Key::Tab if !state.move_log.is_empty() => {
                    state.log_index = state.move_log.len() - 1;
                    state.pre_log_mode = Some(state.mode);
                    state.mode = Mode::LogBrowse;
                    render(state);
                }
                _ => {}
            }
        }
    }
}

fn main() {
    terminal::enable_raw_mode().expect("Failed to enable raw mode");
    let mut state = GameState::new();
    render(&state);

    let mut ai_rx: Option<mpsc::Receiver<Option<Action>>> = None;

    loop {
        // AI turn handling
        if state.mode == Mode::Board && state.ai_side.is_ai(state.turn) && !state.paused {
            // Spawn AI thread if not already running
            if ai_rx.is_none() {
                state.ai_think_start = Some(Instant::now());
                let mut state_clone = state.clone();
                let (tx, rx) = mpsc::channel();
                thread::spawn(move || {
                    let result = ai_choose(&mut state_clone);
                    let _ = tx.send(result);
                });
                ai_rx = Some(rx);
                render(&state);
            }

            // Check if AI finished
            if let Some(ref rx) = ai_rx {
                match rx.try_recv() {
                    Ok(action) => {
                        ai_rx = None;
                        state.ai_think_start = None;
                        if let Some(action) = action {
                            ai_do_move_with_action(&mut state, action);
                        }
                        continue;
                    }
                    Err(mpsc::TryRecvError::Empty) => {}
                    Err(mpsc::TryRecvError::Disconnected) => {
                        ai_rx = None;
                        state.ai_think_start = None;
                    }
                }
            }

            // Poll for user input while AI thinks
            if let Some(key) = poll_key(200) {
                handle_key(&mut state, key);
            } else {
                render(&state); // re-render to update timer
            }
            continue;
        }

        // Human turn: block until key
        if let Some(key) = poll_key(500) {
            handle_key(&mut state, key);
        }
    }
}