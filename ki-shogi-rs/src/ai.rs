// Ki Shogi - AI engine

use crate::types::{Owner, Cube, Face};
use crate::state::{GameState, LegalMove};
use crate::rules::{cheb_dist, is_in_check, is_piece_supported, get_legal_moves, get_legal_drops};

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub enum Action {
    Move {
        piece_idx: usize,
        mv: LegalMove,
        promote_to: Option<Face>,
    },
    Drop {
        piece_idx: usize,
        face: Face,
        pos: (i32, i32),
    },
}

// ---------------------------------------------------------------------------
// Undo info for apply/undo
// ---------------------------------------------------------------------------

struct Undo {
    px: Option<i32>,
    py: Option<i32>,
    pface: Face,
    // capture restore
    cx: Option<i32>,
    cy: Option<i32>,
    cowner: Option<Owner>,
    cface: Option<Face>,
    cap_idx: Option<usize>,
}

// ---------------------------------------------------------------------------
// Evaluate
// ---------------------------------------------------------------------------

pub fn evaluate(state: &GameState, ai_owner: Owner) -> i32 {
    let opponent = ai_owner.opponent();
    let mut score = 0i32;

    for p in &state.pieces {
        if p.cube == Cube::Gyoku { continue; }
        let val = p.face.face_value();
        let sign = if p.owner == ai_owner { 1 } else { -1 };
        if p.on_board() && !is_piece_supported(state, p.x.unwrap(), p.y.unwrap(), p.cube) {
            score -= sign * (val + 20);
        } else {
            score += sign * (val + if p.on_board() { 10 } else { 0 });
        }
    }

    if let Some(oi) = state.gyoku(opponent) {
        let og = &state.pieces[oi];
        if og.on_board() {
            let (ox, oy) = (og.x.unwrap(), og.y.unwrap());
            for p in &state.pieces {
                if p.owner == ai_owner && p.on_board() && p.cube != Cube::Gyoku {
                    score += 0i32.max(5 - cheb_dist(p.x.unwrap(), p.y.unwrap(), ox, oy));
                }
            }
        }
    }

    if is_in_check(state, opponent) { score += 30; }
    if is_in_check(state, ai_owner) { score -= 30; }
    score
}

// ---------------------------------------------------------------------------
// Apply / Undo
// ---------------------------------------------------------------------------

fn apply_action(state: &mut GameState, action: &Action) -> Undo {
    match action {
        Action::Move { piece_idx, mv, promote_to } => {
            let pi = *piece_idx;
            let undo = Undo {
                px: state.pieces[pi].x, py: state.pieces[pi].y,
                pface: state.pieces[pi].face,
                cx: None, cy: None, cowner: None, cface: None, cap_idx: None,
            };
            if let Some(ci) = mv.capture {
                let mut u = undo;
                u.cx = state.pieces[ci].x;
                u.cy = state.pieces[ci].y;
                u.cowner = Some(state.pieces[ci].owner);
                u.cface = Some(state.pieces[ci].face);
                u.cap_idx = Some(ci);
                state.pieces[ci].x = None;
                state.pieces[ci].y = None;
                state.pieces[ci].owner = state.pieces[pi].owner;
                state.pieces[pi].x = Some(mv.x);
                state.pieces[pi].y = Some(mv.y);
                if let Some(pt) = promote_to {
                    state.pieces[pi].face = *pt;
                }
                u
            } else {
                state.pieces[pi].x = Some(mv.x);
                state.pieces[pi].y = Some(mv.y);
                let cube = state.pieces[pi].cube;
                if cube != Cube::Gyoku {
                    if let Some(opp) = state.pieces[pi].face.opposite() {
                        state.pieces[pi].face = opp;
                    }
                }
                undo
            }
        }
        Action::Drop { piece_idx, face, pos } => {
            let pi = *piece_idx;
            let undo = Undo {
                px: state.pieces[pi].x, py: state.pieces[pi].y,
                pface: state.pieces[pi].face,
                cx: None, cy: None, cowner: None, cface: None, cap_idx: None,
            };
            state.pieces[pi].face = *face;
            state.pieces[pi].x = Some(pos.0);
            state.pieces[pi].y = Some(pos.1);
            undo
        }
    }
}

fn undo_action(state: &mut GameState, action: &Action, undo: Undo) {
    match action {
        Action::Move { piece_idx, .. } | Action::Drop { piece_idx, .. } => {
            let pi = *piece_idx;
            state.pieces[pi].x = undo.px;
            state.pieces[pi].y = undo.py;
            state.pieces[pi].face = undo.pface;
            if let Some(ci) = undo.cap_idx {
                state.pieces[ci].x = undo.cx;
                state.pieces[ci].y = undo.cy;
                if let Some(o) = undo.cowner { state.pieces[ci].owner = o; }
                if let Some(f) = undo.cface { state.pieces[ci].face = f; }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Get all actions
// ---------------------------------------------------------------------------

pub fn get_all_actions(state: &mut GameState, owner: Owner) -> Vec<Action> {
    let mut actions = Vec::new();
    let board_idxs: Vec<usize> = state.pieces.iter().enumerate()
        .filter(|(_, p)| p.owner == owner && p.on_board())
        .map(|(i, _)| i).collect();

    for pidx in board_idxs {
        let moves = get_legal_moves(state, pidx);
        let face = state.pieces[pidx].face;
        let cube = state.pieces[pidx].cube;
        for mv in moves {
            if mv.capture.is_some() && cube != Cube::Gyoku {
                let promos = face.promotions();
                if !promos.is_empty() {
                    for &pf in promos {
                        actions.push(Action::Move {
                            piece_idx: pidx, mv: mv.clone(), promote_to: Some(pf),
                        });
                    }
                } else {
                    actions.push(Action::Move { piece_idx: pidx, mv, promote_to: None });
                }
            } else {
                actions.push(Action::Move { piece_idx: pidx, mv, promote_to: None });
            }
        }
    }

    let hand_idxs = state.hand_pieces_for(owner);
    for &pi in &hand_idxs {
        let cube = state.pieces[pi].cube;
        for &face in Face::cube_faces(cube) {
            for pos in get_legal_drops(state, owner, face) {
                actions.push(Action::Drop { piece_idx: pi, face, pos });
            }
        }
    }
    actions
}

// ---------------------------------------------------------------------------
// Move ordering + Minimax
// ---------------------------------------------------------------------------

fn move_order_score(action: &Action, state: &GameState) -> i32 {
    match action {
        Action::Move { mv, .. } => {
            if let Some(ci) = mv.capture {
                if state.pieces[ci].cube == Cube::Gyoku { 10000 }
                else { 100 + state.pieces[ci].face.face_value() }
            } else { 0 }
        }
        _ => 0,
    }
}

const MAX_MOVES: usize = 40;

/// Adaptive depth: fewer available moves → deeper search, many moves → shallower
fn adaptive_depth(base: i32, num_actions: usize) -> i32 {
    let d = if num_actions <= 10 { base + 2 }
    else if num_actions <= 25 { base + 1 }
    else if num_actions > 80 { (base - 1).max(1) }
    else { base };
    d.min(4)
}

fn minimax(state: &mut GameState, depth: i32, mut alpha: i32, mut beta: i32, is_max: bool, ai_owner: Owner) -> i32 {
    if depth == 0 { return evaluate(state, ai_owner); }
    let current = if is_max { ai_owner } else { ai_owner.opponent() };
    let mut actions = get_all_actions(state, current);
    if actions.is_empty() { return if is_max { -9999 } else { 9999 }; }

    // Sort by move order score descending, then truncate to limit branching
    actions.sort_by(|a, b| move_order_score(b, state).cmp(&move_order_score(a, state)));
    actions.truncate(MAX_MOVES);

    if is_max {
        let mut best = i32::MIN;
        for action in &actions {
            if let Action::Move { mv, .. } = action {
                if let Some(ci) = mv.capture {
                    if state.pieces[ci].cube == Cube::Gyoku { return 9999; }
                }
            }
            let u = apply_action(state, action);
            let val = minimax(state, depth - 1, alpha, beta, false, ai_owner);
            undo_action(state, action, u);
            best = best.max(val);
            alpha = alpha.max(val);
            if beta <= alpha { break; }
        }
        best
    } else {
        let mut best = i32::MAX;
        for action in &actions {
            if let Action::Move { mv, .. } = action {
                if let Some(ci) = mv.capture {
                    if state.pieces[ci].cube == Cube::Gyoku { return -9999; }
                }
            }
            let u = apply_action(state, action);
            let val = minimax(state, depth - 1, alpha, beta, true, ai_owner);
            undo_action(state, action, u);
            best = best.min(val);
            beta = beta.min(val);
            if beta <= alpha { break; }
        }
        best
    }
}

// ---------------------------------------------------------------------------
// Position hash + repetition penalty
// ---------------------------------------------------------------------------

pub fn position_hash(state: &GameState) -> String {
    let bg = match state.gyoku(Owner::Black) {
        Some(i) => &state.pieces[i],
        None => return String::new(),
    };
    let (ox, oy) = (bg.x.unwrap_or(0), bg.y.unwrap_or(0));

    let mut board: Vec<String> = state.pieces.iter()
        .filter(|p| p.on_board())
        .map(|p| format!("{},{},{:?},{:?}", p.x.unwrap() - ox, p.y.unwrap() - oy, p.owner, p.face))
        .collect();
    board.sort();

    let mut hand: Vec<String> = state.pieces.iter()
        .filter(|p| !p.on_board())
        .map(|p| format!("{:?},{:?},{:?}", p.owner, p.cube, p.face))
        .collect();
    hand.sort();

    format!("{:?}|{}|{}", state.turn, board.join(";"), hand.join(";"))
}

fn ai_repetition_penalty(state: &mut GameState, action: &Action, owner: Owner) -> i32 {
    let opponent = owner.opponent();
    let u = apply_action(state, action);
    let orig_turn = state.turn;
    state.turn = opponent;
    let hash = position_hash(state);
    let would_check = is_in_check(state, opponent);
    state.turn = orig_turn;
    undo_action(state, action, u);

    let hist = match state.position_history.get(&hash) {
        Some(h) if !h.is_empty() => h,
        _ => return 0,
    };
    let all_check = hist.iter().all(|h| h.in_check);

    // Perpetual check penalties
    if hist.len() >= 3 && all_check && would_check { return -5000; }
    if hist.len() >= 2 && all_check && would_check { return -3000; }
    if hist.len() >= 1 && all_check && would_check { return -800; }

    // Sennichite draw: adjust based on eval
    let eval = evaluate(state, owner);
    if hist.len() >= 3 { return if eval > 0 { -2000 } else { 2000 }; }
    if hist.len() >= 2 { return if eval > 0 { -500 } else { 500 }; }
    if eval > 0 { -50 } else { 30 }
}

fn score_actions(state: &mut GameState, actions: &mut [(Action, i32)], owner: Owner) {
    let opponent = owner.opponent();
    let opp_gi = state.gyoku(opponent);
    let opp_pos = opp_gi.and_then(|i| {
        let p = &state.pieces[i];
        if p.on_board() { Some((p.x.unwrap(), p.y.unwrap())) } else { None }
    });

    for (action, score) in actions.iter_mut() {
        match action {
            Action::Move { piece_idx, mv, .. } => {
                if let Some(ci) = mv.capture {
                    if state.pieces[ci].cube == Cube::Gyoku {
                        *score += 1000;
                    } else {
                        *score += 100 + state.pieces[ci].face.face_value();
                    }
                } else {
                    // Check if move gives check
                    let pi = *piece_idx;
                    let ox = state.pieces[pi].x;
                    let oy = state.pieces[pi].y;
                    let of = state.pieces[pi].face;
                    state.pieces[pi].x = Some(mv.x);
                    state.pieces[pi].y = Some(mv.y);
                    if state.pieces[pi].cube != Cube::Gyoku {
                        if let Some(opp) = state.pieces[pi].face.opposite() {
                            state.pieces[pi].face = opp;
                        }
                    }
                    if is_in_check(state, opponent) { *score += 50; }
                    state.pieces[pi].x = ox;
                    state.pieces[pi].y = oy;
                    state.pieces[pi].face = of;
                }
                if let Some((ox, oy)) = opp_pos {
                    *score += 0i32.max(5 - cheb_dist(mv.x, mv.y, ox, oy));
                }
            }
            Action::Drop { face, pos, .. } => {
                *score += 10 + face.face_value() / 10;
                if let Some((ox, oy)) = opp_pos {
                    *score += 0i32.max(4 - cheb_dist(pos.0, pos.1, ox, oy));
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// AI move selection
// ---------------------------------------------------------------------------

/// Choose and return the best action for the current AI player.
/// Returns None if no actions available.
pub fn ai_choose(state: &mut GameState) -> Option<Action> {
    let owner = state.turn;
    let mut actions = get_all_actions(state, owner);
    if actions.is_empty() { return None; }

    let difficulty = state.ai_difficulty;

    // Easy: random, but avoid perpetual check loss
    if difficulty == 1 {
        let penalties: Vec<i32> = actions.iter()
            .map(|a| ai_repetition_penalty(state, a, owner))
            .collect();
        let safe: Vec<usize> = (0..actions.len())
            .filter(|&i| penalties[i] > -5000)
            .collect();
        let pool = if safe.is_empty() {
            (0..actions.len()).collect::<Vec<_>>()
        } else { safe };
        let idx = pool[rand_usize(pool.len())];
        return Some(actions.swap_remove(idx));
    }

    // Medium/Hard/Extreme: minimax with adaptive depth
    if difficulty >= 3 {
        let base_depth = match difficulty {
            5 => 3,
            4 => 2,
            _ => 1,
        };
        let depth = adaptive_depth(base_depth, actions.len());
        actions.sort_by(|a, b| move_order_score(b, state).cmp(&move_order_score(a, state)));
        let mut best_score = i32::MIN;
        let mut best_idxs = Vec::new();
        for i in 0..actions.len() {
            if let Action::Move { mv, .. } = &actions[i] {
                if let Some(ci) = mv.capture {
                    if state.pieces[ci].cube == Cube::Gyoku {
                        return Some(actions.swap_remove(i));
                    }
                }
            }
            let u = apply_action(state, &actions[i]);
            let score = minimax(state, depth, best_score, i32::MAX, false, owner)
                + ai_repetition_penalty(state, &actions[i], owner);
            undo_action(state, &actions[i], u);
            if score > best_score { best_score = score; best_idxs = vec![i]; }
            else if score == best_score { best_idxs.push(i); }
        }
        let idx = best_idxs[rand_usize(best_idxs.len())];
        return Some(actions.swap_remove(idx));
    }

    // Medium: heuristic scoring
    let mut scored: Vec<(Action, i32)> = actions.into_iter()
        .map(|a| {
            let pen = ai_repetition_penalty(state, &a, owner);
            (a, pen)
        })
        .collect();
    score_actions(state, &mut scored, owner);
    let max_s = scored.iter().map(|(_, s)| *s).max().unwrap_or(0);
    let best: Vec<Action> = scored.into_iter()
        .filter(|(_, s)| *s == max_s)
        .map(|(a, _)| a)
        .collect();
    Some(best[rand_usize(best.len())].clone())
}

/// Simple pseudo-random using std
fn rand_usize(max: usize) -> usize {
    use std::time::SystemTime;
    if max == 0 { return 0; }
    let seed = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos() as usize;
    seed % max
}
