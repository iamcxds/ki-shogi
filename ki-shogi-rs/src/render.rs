// Ki Shogi - ANSI terminal renderer

use crate::lang::{get_tutorial_pages, t, Ansi};
use crate::state::{GameState, Mode, PieceSnapshot};
use crate::types::{get_move_components, Cube, Face, MoveMode, Owner};
use std::collections::HashMap;
use std::io::{self, Write};

// ANSI codes
const RESET: &str = "\x1b[0m";
const BOLD: &str = "\x1b[1m";
const BG_YELLOW: &str = "\x1b[43m";
const BG_GREEN: &str = "\x1b[42m";
const BG_RED: &str = "\x1b[41m";
const BG_BLUE: &str = "\x1b[44m";
const FG_WHITE: &str = "\x1b[97m";
const FG_CYAN: &str = "\x1b[36m";
const FG_BLACK: &str = "\x1b[30m";
const FG_YELLOW: &str = "\x1b[33m";
const FG_GREEN: &str = "\x1b[32m";
const FG_RED: &str = "\x1b[31m";
const FG_GRAY: &str = "\x1b[90m";
const CLEAR: &str = "\x1b[2J\x1b[H";
const HIDE_CURSOR: &str = "\x1b[?25l";
const SHOW_CURSOR: &str = "\x1b[?25h";

const CELL_W: usize = 2;

/// Is this a wide (CJK) character?
fn is_wide(code: u32) -> bool {
    matches!(code,
        0x1100..=0x115F | 0x2E80..=0x303E | 0x3040..=0x33BF |
        0x3400..=0x4DBF | 0x4E00..=0x9FFF | 0xAC00..=0xD7AF |
        0xF900..=0xFAFF | 0xFE30..=0xFE6F | 0xFF01..=0xFF60 |
        0xFFE0..=0xFFE6
    )
}

/// Visual width of a string (stripping ANSI codes, CJK = 2 cols)
fn vis_len(s: &str) -> usize {
    let stripped = strip_ansi(s);
    stripped
        .chars()
        .map(|c| if is_wide(c as u32) { 2 } else { 1 })
        .sum()
}

fn strip_ansi(s: &str) -> String {
    let mut out = String::new();
    let mut in_esc = false;
    for c in s.chars() {
        if in_esc {
            if c == 'm' {
                in_esc = false;
            }
        } else if c == '\x1b' {
            in_esc = true;
        } else {
            out.push(c);
        }
    }
    out
}

/// Merge sidebar lines onto existing lines at startIdx
fn merge_sidebar(lines: &mut Vec<String>, sidebar: &[String], start: usize, grid_w: usize) {
    let pad = " ".repeat(grid_w);
    for (i, sl) in sidebar.iter().enumerate() {
        let li = start + i;
        if li < lines.len() {
            let gap = grid_w.saturating_sub(vis_len(&lines[li]));
            lines[li] = format!("{}{}  {}", lines[li], " ".repeat(gap), sl);
        } else {
            lines.push(format!("{}  {}", pad, sl));
        }
    }
}

/// Merge panel on the LEFT of lines within a range
fn merge_left_panel(lines: &mut Vec<String>, panel: &[String], start: usize, end: usize) -> usize {
    if panel.is_empty() {
        return 0;
    }
    let max_w = panel.iter().map(|s| vis_len(s)).max().unwrap_or(0);
    let col_w = max_w + 2;
    let pad_str = " ".repeat(col_w);
    for i in start..=end.min(lines.len().saturating_sub(1)) {
        let pi = i - start;
        if pi < panel.len() {
            let gap = col_w - vis_len(&panel[pi]);
            lines[i] = format!("{}{}{}", panel[pi], " ".repeat(gap), lines[i]);
        } else {
            lines[i] = format!("{}{}", pad_str, lines[i]);
        }
    }
    col_w
}

struct GridInfo {
    grid_width: usize,
    board_start: usize,
}

fn render_grid(
    state: &GameState,
    lines: &mut Vec<String>,
    x1: i32,
    x2: i32,
    y1: i32,
    y2: i32,
) -> (usize, usize) {
    let board_map = state.build_board_map();
    let legal_set: std::collections::HashSet<String> = state
        .legal_moves
        .iter()
        .map(|m| format!("{},{}", m.x, m.y))
        .collect();
    let drop_set: std::collections::HashSet<String> = state
        .drop_targets
        .iter()
        .map(|(x, y)| format!("{},{}", x, y))
        .collect();

    let start_line = lines.len();
    let mut header = "    ".to_string();
    for x in x1..=x2 {
        header += &format!("{:>2}", x);
    }
    lines.push(format!("  {}{}{}", FG_GRAY, header, RESET));

    for y in (y1..=y2).rev() {
        let mut row = format!("  {}{:>3} {}", FG_GRAY, y, RESET);
        for x in x1..=x2 {
            let key = format!("{},{}", x, y);
            let face = board_map
                .get(&key)
                .map(|&i| (state.pieces[i].face, state.pieces[i].owner));
            let is_cursor = state.cursor.0 == x && state.cursor.1 == y;
            let is_legal = legal_set.contains(&key);
            let is_drop = drop_set.contains(&key);
            let is_selected = state.selected.map_or(false, |si| {
                state.pieces[si].x == Some(x) && state.pieces[si].y == Some(y)
            });
            let is_last_move =
                state.last_move_from == Some((x, y)) || state.last_move_to == Some((x, y));
            row += &render_cell(
                face,
                is_cursor,
                is_legal,
                is_drop,
                is_selected,
                is_last_move,
            );
        }
        lines.push(row);
    }

    let grid_width = 6 + ((x2 - x1 + 1) as usize) * CELL_W;
    (grid_width, start_line)
}

fn render_cell(
    face: Option<(Face, Owner)>,
    is_cursor: bool,
    is_legal: bool,
    is_drop: bool,
    is_selected: bool,
    is_last_move: bool,
) -> String {
    let mut bg = "";
    let mut fg = "";
    let mut text = "  ".to_string();

    if let Some((f, owner)) = face {
        text = f.kanji().to_string();
        fg = if owner == Owner::Black {
            FG_WHITE
        } else {
            FG_CYAN
        };
    }

    if is_selected {
        bg = BG_BLUE;
    } else if is_cursor {
        bg = BG_YELLOW;
    } else if is_legal || is_drop {
        bg = BG_GREEN;
    } else if is_last_move {
        bg = BG_BLUE;
    }

    format!("{}{}{}{}{}", bg, fg, BOLD, text, RESET)
}

fn render_hand(state: &GameState, lines: &mut Vec<String>, owner: Owner) {
    let hand = state.hand_pieces_for(owner);
    let label = if owner == Owner::Black {
        t("black_hand")
    } else {
        t("white_hand")
    };
    let color = if owner == Owner::Black {
        FG_WHITE
    } else {
        FG_CYAN
    };
    let mut s = format!("  {}{}{}:{} ", color, BOLD, label, RESET);
    if hand.is_empty() {
        s += &format!("{}{}{}", FG_GRAY, t("hand_empty"), RESET);
    } else {
        for &pi in &hand {
            let kanji = state.pieces[pi].face.kanji();
            s += &format!("{}[{}]{} ", color, kanji, RESET);
        }
    }
    lines.push(s);
}

fn render_board(state: &GameState, lines: &mut Vec<String>) -> GridInfo {
    let on_board: Vec<_> = state.pieces.iter().filter(|p| p.on_board()).collect();
    if on_board.is_empty() && state.mode == Mode::SetupBlackGyoku {
        let b_start = lines.len();
        let (gw, _) = render_grid(
            state,
            lines,
            state.cursor.0 - 3,
            state.cursor.0 + 3,
            state.cursor.1 - 3,
            state.cursor.1 + 3,
        );
        return GridInfo {
            grid_width: gw,
            board_start: b_start,
        };
    }

    let mut min_x = state.cursor.0;
    let mut max_x = state.cursor.0;
    let mut min_y = state.cursor.1;
    let mut max_y = state.cursor.1;
    for p in &on_board {
        let px = p.x.unwrap();
        let py = p.y.unwrap();
        min_x = min_x.min(px);
        max_x = max_x.max(px);
        min_y = min_y.min(py);
        max_y = max_y.max(py);
    }

    let wh_idx = lines.len();
    render_hand(state, lines, Owner::White);
    lines.push(String::new());
    let (gw, _) = render_grid(state, lines, min_x - 2, max_x + 2, min_y - 2, max_y + 2);
    lines.push(String::new());
    render_hand(state, lines, Owner::Black);
    let bh_idx = lines.len() - 1;
    let final_gw = gw.max(vis_len(&lines[wh_idx])).max(vis_len(&lines[bh_idx]));
    GridInfo {
        grid_width: final_gw,
        board_start: wh_idx,
    }
}

fn render_status(state: &GameState, lines: &mut Vec<String>) {
    let turn_name = if state.turn == Owner::Black {
        format!("{}{}{}{}", FG_WHITE, BOLD, t("black"), RESET)
    } else {
        format!("{}{}{}{}", FG_CYAN, BOLD, t("white"), RESET)
    };

    match state.mode {
        Mode::SetupBlackGyoku => {
            lines.push(format!("  {} {}", turn_name, t("place_gyoku")));
        }
        Mode::SetupWhiteGyoku => {
            lines.push(format!("  {} {}", turn_name, t("place_gyoku_w")));
        }
        Mode::Board => {
            if state.ai_side.is_ai(state.turn) {
                if state.paused {
                    lines.push(format!(
                        "  {} {}{}{} {} {}",
                        turn_name,
                        BG_RED,
                        FG_WHITE,
                        BOLD,
                        t("paused"),
                        RESET
                    ));
                } else {
                    let elapsed = state
                        .ai_think_start
                        .map(|t| t.elapsed().as_secs_f32())
                        .unwrap_or(0.0);
                    lines.push(format!(
                        "  {} {}{} ({:.1}s){}",
                        turn_name,
                        FG_YELLOW,
                        t("ai_thinking"),
                        elapsed,
                        RESET
                    ));
                }
            } else {
                lines.push(format!("  {} {}", turn_name, t("your_turn")));
            }
        }
        Mode::Selected => {
            lines.push(format!("  {} {}", turn_name, t("select_target")));
        }
        _ => {}
    }

    if state.in_check {
        lines.push(format!(
            "  {}{}{} {} {}",
            BG_RED,
            FG_WHITE,
            BOLD,
            t("check"),
            RESET
        ));
    }
    if !state.message.is_empty() {
        lines.push(format!("  {}{}{}", FG_YELLOW, state.message, RESET));
    }
}

fn render_menu(state: &GameState, lines: &mut Vec<String>) {
    let menus: &[(&str, &[(&str, &str)], &str)] = &[
        (
            "choose_opponent",
            &[("1", "local_2p"), ("2", "ai_battle"), ("3", "tutorial")],
            "press_123",
        ),
        (
            "choose_pieces",
            &[("1", "basic_set"), ("2", "full_set")],
            "press_12",
        ),
        (
            "choose_diff",
            &[
                ("1", "diff_easy"),
                ("2", "diff_medium"),
                ("3", "diff_hard"),
                ("4", "diff_very_hard"),
                ("5", "diff_extreme"),
            ],
            "press_12345",
        ),
        (
            "choose_side",
            &[
                ("1", "play_black"),
                ("2", "play_white"),
                ("3", "random"),
                ("4", "ai_vs_ai"),
            ],
            "press_1234",
        ),
    ];
    let idx = (state.menu_step as usize)
        .saturating_sub(1)
        .min(menus.len() - 1);
    let (title, items, hint) = menus[idx];
    lines.push(format!("  {}{}{}", BOLD, t(title), RESET));
    lines.push(String::new());
    for &(k, v) in &*items {
        lines.push(format!("  {}{}{}  {}", FG_YELLOW, k, RESET, t(v)));
    }
    lines.push(String::new());
    lines.push(format!("  {}{}{}", FG_GRAY, t(hint), RESET));
}

fn render_hand_select(state: &GameState, lines: &mut Vec<String>) {
    let turn_name = if state.turn == Owner::Black {
        t("black_short")
    } else {
        t("white_short")
    };
    lines.push(format!(
        "  {}{} {}{}",
        BOLD,
        turn_name,
        t("choose_drop"),
        RESET
    ));
    for (i, &pi) in state.hand_pieces.iter().enumerate() {
        let p = &state.pieces[pi];
        let kanji = p.face.kanji();
        let marker = if i == state.hand_index {
            format!("{}{}", BG_YELLOW, FG_BLACK)
        } else {
            String::new()
        };
        lines.push(format!("  {} {} {:?} {}", marker, kanji, p.face, RESET));
    }
}

fn render_face_select(state: &GameState, lines: &mut Vec<String>) {
    lines.push(format!("  {}{}{}", BOLD, t("choose_face"), RESET));
    for (i, &face) in state.drop_faces.iter().enumerate() {
        let kanji = face.kanji();
        let eng = face.english();
        let marker = if i == state.face_index {
            format!("{}{}", BG_YELLOW, FG_BLACK)
        } else {
            String::new()
        };
        lines.push(format!(
            "  {} {} {:?} ({}) {}",
            marker, kanji, face, eng, RESET
        ));
    }
}

fn render_drop_target(lines: &mut Vec<String>) {
    lines.push(format!("  {}{}{}", BOLD, t("choose_drop_pos"), RESET));
}

fn render_promote(state: &GameState, lines: &mut Vec<String>) {
    lines.push(format!("  {}{}{}", BOLD, t("choose_promote"), RESET));
    for (i, &face) in state.promote_choices.iter().enumerate() {
        let kanji = face.kanji();
        let eng = face.english();
        let marker = if i == state.promote_index {
            format!("{}{}", BG_YELLOW, FG_BLACK)
        } else {
            String::new()
        };
        lines.push(format!(
            "  {} {} {:?} ({}) {}",
            marker, kanji, face, eng, RESET
        ));
    }
}

fn render_log_browse(state: &GameState, lines: &mut Vec<String>) {
    if state.move_log.is_empty() {
        return;
    }
    let entry = &state.move_log[state.log_index];
    let snap = &entry.snapshot;

    let on_board: Vec<_> = snap.iter().filter(|p| p.x.is_some()).collect();
    let (mut min_x, mut max_x, mut min_y, mut max_y) = (0i32, 0, 0, 0);
    for p in &on_board {
        let px = p.x.unwrap();
        let py = p.y.unwrap();
        min_x = min_x.min(px);
        max_x = max_x.max(px);
        min_y = min_y.min(py);
        max_y = max_y.max(py);
    }

    let board_map: HashMap<String, &PieceSnapshot> = on_board
        .iter()
        .map(|p| (format!("{},{}", p.x.unwrap(), p.y.unwrap()), *p))
        .collect();

    let (x1, x2, y1, y2) = (min_x - 2, max_x + 2, min_y - 2, max_y + 2);

    // White hand
    let board_start = lines.len();
    render_snap_hand(snap, lines, Owner::White);
    lines.push(String::new());

    // Grid header + rows
    let _start_line = lines.len();
    let mut header = "    ".to_string();
    for x in x1..=x2 {
        header += &format!("{:>2}", x);
    }
    lines.push(format!("  {}{}{}", FG_GRAY, header, RESET));

    let move_from = entry.from.map(|(x, y)| format!("{},{}", x, y));
    let move_to = entry.to.map(|(x, y)| format!("{},{}", x, y));

    for y in (y1..=y2).rev() {
        let mut row = format!("  {}{:>3} {}", FG_GRAY, y, RESET);
        for x in x1..=x2 {
            let key = format!("{},{}", x, y);
            let face = board_map.get(&key).map(|p| (p.face, p.owner));
            let is_from = move_from.as_deref() == Some(&key);
            let is_to = move_to.as_deref() == Some(&key);
            row += &render_cell(face, is_from, false, false, is_to, false);
        }
        lines.push(row);
    }

    // Black hand
    lines.push(String::new());
    render_snap_hand(snap, lines, Owner::Black);
    let board_end = lines.len() - 1;

    let grid_width = 6 + ((x2 - x1 + 1) as usize) * CELL_W;

    // Build log panel (left column)
    let mut log_panel = Vec::new();
    log_panel.push(format!("{}── {} ──{}", FG_GRAY, t("log_title"), RESET));
    let board_height = board_end - board_start + 1;
    let visible = 12.min(board_height.saturating_sub(2));
    let total = state.move_log.len();
    let mut w_start = state.log_index.saturating_sub(visible / 2);
    w_start = w_start.min(total.saturating_sub(visible));
    let w_end = total.min(w_start + visible);
    for i in w_start..w_end {
        let e = &state.move_log[i];
        let color = if e.owner == Owner::Black {
            FG_WHITE
        } else {
            FG_CYAN
        };
        let ow = if e.owner == Owner::Black {
            t("black_short")
        } else {
            t("white_short")
        };
        if i == state.log_index {
            log_panel.push(format!(
                "{}{}{}.{} {}{}",
                BG_YELLOW, FG_BLACK, e.num, ow, e.text, RESET
            ));
        } else {
            log_panel.push(format!(
                "{}{}.{} {}{}{}{} {}",
                FG_GRAY, e.num, RESET, color, BOLD, ow, RESET, e.text
            ));
        }
    }

    // Merge log on left of board area
    let left_w = merge_left_panel(lines, &log_panel, board_start, board_end);

    // Merge hint on right
    if let Some(face) = entry.face {
        let hint = get_move_hint_lines(face, entry.owner);
        let mut gw = grid_width + left_w;
        let end = lines.len().min(board_start + hint.len());
        for i in board_start..end {
            gw = gw.max(vis_len(&lines[i]));
        }
        merge_sidebar(lines, &hint, board_start, gw);
    }
}

fn render_snap_hand(snap: &[PieceSnapshot], lines: &mut Vec<String>, owner: Owner) {
    let hand: Vec<_> = snap
        .iter()
        .filter(|p| p.x.is_none() && p.cube != Cube::Gyoku && p.owner == owner)
        .collect();
    let label = if owner == Owner::Black {
        t("black_hand")
    } else {
        t("white_hand")
    };
    let color = if owner == Owner::Black {
        FG_WHITE
    } else {
        FG_CYAN
    };
    let mut s = format!("  {}{}{}:{} ", color, BOLD, label, RESET);
    if hand.is_empty() {
        s += &format!("{}{}{}", FG_GRAY, t("hand_empty"), RESET);
    } else {
        for p in &hand {
            s += &format!("{}[{}]{} ", color, p.face.kanji(), RESET);
        }
    }
    lines.push(s);
}

fn build_diagram(face: Face, owner: Owner) -> Vec<String> {
    let comps = get_move_components(face, owner);
    if comps.is_empty() {
        return Vec::new();
    }
    let mut max_off: i32 = 1;
    for comp in &comps {
        for &(dx, dy) in &comp.dirs {
            max_off = max_off.max(dx.abs()).max(dy.abs());
        }
    }
    let sz = (max_off * 2 + 1) as usize;
    let mid = max_off;
    let mut grid: Vec<Vec<Option<MoveMode>>> = vec![vec![None; sz]; sz];
    for comp in &comps {
        for &(dx, dy) in &comp.dirs {
            grid[(mid - dy) as usize][(dx + mid) as usize] = Some(comp.mode);
        }
    }
    let kanji = face.kanji();
    let mut lines = Vec::new();
    for r in 0..sz {
        let mut line = String::new();
        for c in 0..sz {
            if r as i32 == mid && c as i32 == mid {
                line += kanji;
            } else if let Some(mode) = grid[r][c] {
                if mode == MoveMode::Step {
                    line += "* ";
                } else {
                    let dx = c as i32 - mid;
                    let dy = mid - r as i32;
                    if dx == 0 {
                        line += "| ";
                    } else if dy == 0 {
                        line += "--";
                    } else if (dx < 0 && dy > 0) || (dx > 0 && dy < 0) {
                        line += "\\ ";
                    } else {
                        line += "/ ";
                    }
                }
            } else {
                line += ". ";
            }
        }
        lines.push(line);
    }
    lines
}

fn get_move_hint_lines(face: Face, owner: Owner) -> Vec<String> {
    let comps = get_move_components(face, owner);
    if comps.is_empty() {
        return Vec::new();
    }
    let mut result = Vec::new();

    let cur = build_diagram(face, owner);
    let opp = face.opposite();
    let mut header = format!("{}{}{}{:?}{}", FG_YELLOW, BOLD, face.kanji(), face, RESET);
    if let Some(opp_face) = opp {
        header += &format!(
            "{}  {}{}{:?}{}",
            FG_GRAY,
            t("hint_flip"),
            opp_face.kanji(),
            opp_face,
            RESET
        );
        let opp_d = build_diagram(opp_face, owner);
        result.push(header);
        for l in side_by_side(&[cur, opp_d], "  ") {
            result.push(format!("{}{}{}", FG_GREEN, l, RESET));
        }
    } else {
        result.push(header);
        for l in &cur {
            result.push(format!("{}{}{}", FG_GREEN, l, RESET));
        }
    }

    let promos = face.promotions();
    if !promos.is_empty() {
        let names: Vec<String> = promos
            .iter()
            .map(|f| format!("{}{:?}", f.kanji(), f))
            .collect();
        result.push(format!(
            "{}{}{}{}",
            FG_RED,
            t("hint_promote"),
            names.join("/"),
            RESET
        ));
        let promo_diags: Vec<Vec<String>> =
            promos.iter().map(|f| build_diagram(*f, owner)).collect();
        for l in side_by_side(&promo_diags, "  ") {
            result.push(format!("{}{}{}", FG_RED, l, RESET));
        }
    }

    result
}

fn get_hint_for_state(state: &GameState) -> Vec<String> {
    let mut face = None;
    let mut owner = None;
    match state.mode {
        Mode::Board => {
            if let Some(pi) = state.piece_at(state.cursor.0, state.cursor.1) {
                face = Some(state.pieces[pi].face);
                owner = Some(state.pieces[pi].owner);
            }
        }
        Mode::Selected => {
            if let Some(si) = state.selected {
                face = Some(state.pieces[si].face);
                owner = Some(state.pieces[si].owner);
            }
        }
        Mode::FaceSelect => {
            if let Some(&f) = state.drop_faces.get(state.face_index) {
                face = Some(f);
                owner = Some(state.turn);
            }
        }
        Mode::Promote => {
            if let Some(&f) = state.promote_choices.get(state.promote_index) {
                face = Some(f);
                owner = Some(state.turn);
            }
        }
        _ => {}
    }
    match (face, owner) {
        (Some(f), Some(o)) => get_move_hint_lines(f, o),
        _ => Vec::new(),
    }
}

fn side_by_side(diagrams: &[Vec<String>], gap: &str) -> Vec<String> {
    let max_h = diagrams.iter().map(|d| d.len()).max().unwrap_or(0);
    let widths: Vec<usize> = diagrams
        .iter()
        .map(|d| if d.is_empty() { 0 } else { d[0].len() })
        .collect();
    let mut result = Vec::new();
    for i in 0..max_h {
        let parts: Vec<String> = diagrams
            .iter()
            .enumerate()
            .map(|(j, d)| {
                if i < d.len() {
                    d[i].clone()
                } else {
                    " ".repeat(widths[j])
                }
            })
            .collect();
        result.push(parts.join(gap));
    }
    result
}

fn render_tutorial(state: &GameState, lines: &mut Vec<String>) {
    let ansi = Ansi {
        bold: BOLD,
        reset: RESET,
        fg_gray: FG_GRAY,
        fg_white: FG_WHITE,
        fg_cyan: FG_CYAN,
        fg_green: FG_GREEN,
        fg_yellow: FG_YELLOW,
        fg_red: FG_RED,
    };
    let pages = get_tutorial_pages(&ansi);
    let page = &pages[state.tutorial_page];
    let total = pages.len();
    let num = state.tutorial_page + 1;
    lines.push(format!(
        "  {}{} ({}/{}) - {}{}",
        BOLD,
        t("tut_title"),
        num,
        total,
        page[0],
        RESET
    ));
    lines.push(String::new());
    for i in 1..page.len() {
        lines.push(format!("  {}", page[i]));
    }
    lines.push(String::new());
    let mut nav = Vec::new();
    if num > 1 {
        nav.push(t("tut_prev").to_string());
    }
    if num < total {
        nav.push(t("tut_next").to_string());
    }
    nav.push(t("tut_back").to_string());
    lines.push(format!("  {}{}{}", FG_GRAY, nav.join("  "), RESET));
}

fn build_log_panel(state: &GameState) -> Vec<String> {
    let mut panel = Vec::new();
    if !state.move_log.is_empty() {
        panel.push(format!("{}── {} ──{}", FG_GRAY, t("log_title"), RESET));
        let start = state.move_log.len().saturating_sub(8);
        for entry in &state.move_log[start..] {
            let color = if entry.owner == Owner::Black {
                FG_WHITE
            } else {
                FG_CYAN
            };
            let ow = if entry.owner == Owner::Black {
                t("black_short")
            } else {
                t("white_short")
            };
            panel.push(format!(
                "{}{}.{} {}{}{}{} {}",
                FG_GRAY, entry.num, RESET, color, BOLD, ow, RESET, entry.text
            ));
        }
    }
    panel
}

fn build_sidebar(state: &GameState) -> Vec<String> {
    get_hint_for_state(state)
}

fn get_controls_hint(state: &GameState) -> Option<Vec<String>> {
    match state.mode {
        Mode::SetupBlackGyoku | Mode::SetupWhiteGyoku => Some(vec![
            t("controls_setup_1").into(),
            t("controls_setup_2").into(),
        ]),
        Mode::Board => {
            if state.ai_side.is_ai(state.turn) {
                Some(vec![
                    format!("{}  Tab:{}", t("space_pause"), t("log_title")),
                    t("controls_board_2").into(),
                ])
            } else {
                Some(vec![
                    t("controls_board_1").into(),
                    t("controls_board_2").into(),
                ])
            }
        }
        Mode::Selected => Some(vec![t("controls_move").into()]),
        Mode::Hand | Mode::FaceSelect => Some(vec![t("controls_list").into()]),
        Mode::DropTarget => Some(vec![t("controls_drop").into()]),
        Mode::Promote => Some(vec![t("controls_promote").into()]),
        Mode::LogBrowse => Some(vec![format!(
            "↑↓:{}  ESC:{}",
            t("log_browse_nav"),
            t("log_browse_back")
        )]),
        _ => None,
    }
}

pub fn render(state: &GameState) {
    let mut lines = Vec::new();
    lines.push(format!("{}  ═══ {} ═══{}", BOLD, t("game_title"), RESET));
    lines.push(String::new());

    let mut grid_info: Option<GridInfo> = None;

    if state.mode == Mode::Menu {
        render_menu(state, &mut lines);
    } else if state.mode == Mode::Tutorial {
        render_tutorial(state, &mut lines);
    } else if state.mode == Mode::LogBrowse {
        render_log_browse(state, &mut lines);
    } else {
        let gi = render_board(state, &mut lines);
        lines.push(String::new());

        match state.mode {
            Mode::GameOver => {
                let winner_name = if state.winner == Some(Owner::Black) {
                    t("black")
                } else {
                    t("white")
                };
                lines.push(format!(
                    "  {}{}★ {} {} ★{}",
                    BOLD,
                    FG_YELLOW,
                    winner_name,
                    t("wins"),
                    RESET
                ));
                if !state.message.is_empty() {
                    lines.push(format!("  {}{}{}", FG_YELLOW, state.message, RESET));
                }
                lines.push(String::new());
                lines.push(format!(
                    "  {}{}  Tab:{}{}",
                    FG_GRAY,
                    t("quit_menu"),
                    t("log_title"),
                    RESET
                ));
            }
            Mode::Draw => {
                lines.push(format!("  {}{}★ {} ★{}", BOLD, FG_YELLOW, t("draw"), RESET));
                lines.push(format!("  {}{}{}", FG_YELLOW, state.message, RESET));
                lines.push(String::new());
                lines.push(format!(
                    "  {}{}  Tab:{}{}",
                    FG_GRAY,
                    t("quit_menu"),
                    t("log_title"),
                    RESET
                ));
            }
            Mode::Hand => render_hand_select(state, &mut lines),
            Mode::FaceSelect => render_face_select(state, &mut lines),
            Mode::DropTarget => render_drop_target(&mut lines),
            Mode::Promote => render_promote(state, &mut lines),
            _ => render_status(state, &mut lines),
        }

        grid_info = Some(gi);
    }

    // Merge hints on the right, then log panel further right
    if let Some(ref gi) = grid_info {
        if gi.grid_width > 0 {
            let side_start = gi.board_start;
            let sidebar = build_sidebar(state);
            let mut gw = gi.grid_width;
            if !sidebar.is_empty() {
                let end = lines.len().min(side_start + sidebar.len());
                for i in side_start..end {
                    gw = gw.max(vis_len(&lines[i]));
                }
                merge_sidebar(&mut lines, &sidebar, side_start, gw);
            }
            let log_panel = build_log_panel(state);
            if !log_panel.is_empty() {
                let mut gw2 = gw;
                let log_end = lines.len().min(side_start + log_panel.len());
                for i in side_start..log_end {
                    gw2 = gw2.max(vis_len(&lines[i]));
                }
                merge_sidebar(&mut lines, &log_panel, side_start, gw2);
            }
        }
    }

    // Controls hint at bottom
    if let Some(ctrl) = get_controls_hint(state) {
        lines.push(String::new());
        for c in &ctrl {
            lines.push(format!("  {}{}{}", FG_GRAY, c, RESET));
        }
    }

    let output = format!("{}{}{}\r\n", CLEAR, HIDE_CURSOR, lines.join("\r\n"));
    let _ = io::stdout().write_all(output.as_bytes());
    let _ = io::stdout().flush();
}

pub fn cleanup() {
    let _ = crossterm::terminal::disable_raw_mode();
    let _ = io::stdout().write_all(format!("{}{}", SHOW_CURSOR, RESET).as_bytes());
    let _ = io::stdout().flush();
}
