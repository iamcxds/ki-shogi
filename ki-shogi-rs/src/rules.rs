// Ki Shogi - Core rule engine

use crate::types::{Owner, Cube, Face, get_move_vectors};
use crate::state::{GameState, LegalMove, Piece};
use std::collections::HashSet;

/// Chebyshev distance
pub fn cheb_dist(x1: i32, y1: i32, x2: i32, y2: i32) -> i32 {
    (x1 - x2).abs().max((y1 - y2).abs())
}

/// BFS: find all Ki cubes connected to a Gyoku via adjacent Ki chain
fn get_supported_ki(state: &GameState) -> HashSet<usize> {
    let ki_pieces: Vec<(usize, i32, i32)> = state.pieces.iter().enumerate()
        .filter(|(_, p)| p.cube == Cube::Ki && p.on_board())
        .map(|(i, p)| (i, p.x.unwrap(), p.y.unwrap()))
        .collect();
    if ki_pieces.is_empty() { return HashSet::new(); }

    let mut supported = HashSet::new();
    let mut queue = Vec::new();
    for &(idx, kx, ky) in &ki_pieces {
        for p in &state.pieces {
            if p.cube == Cube::Gyoku && p.on_board() {
                if cheb_dist(kx, ky, p.x.unwrap(), p.y.unwrap()) <= 2 {
                    supported.insert(idx);
                    queue.push((idx, kx, ky));
                    break;
                }
            }
        }
    }
    while let Some((_, cx, cy)) = queue.pop() {
        for &(idx, kx, ky) in &ki_pieces {
            if !supported.contains(&idx) && cheb_dist(kx, ky, cx, cy) == 1 {
                supported.insert(idx);
                queue.push((idx, kx, ky));
            }
        }
    }
    supported
}

/// Is position supported for a given cube type?
pub fn is_piece_supported(state: &GameState, x: i32, y: i32, cube: Cube) -> bool {
    let supported_ki = get_supported_ki(state);
    if cube == Cube::Ki {
        for p in &state.pieces {
            if p.cube == Cube::Gyoku && p.on_board()
                && cheb_dist(x, y, p.x.unwrap(), p.y.unwrap()) <= 2
            { return true; }
        }
        for &idx in &supported_ki {
            let ki = &state.pieces[idx];
            if cheb_dist(x, y, ki.x.unwrap(), ki.y.unwrap()) == 1 { return true; }
        }
        return false;
    }
    // Normal piece: adjacent to any Gyoku or supported Ki (dist 1)
    for p in &state.pieces {
        if p.cube == Cube::Gyoku && p.on_board()
            && cheb_dist(x, y, p.x.unwrap(), p.y.unwrap()) == 1
        { return true; }
    }
    for &idx in &supported_ki {
        let ki = &state.pieces[idx];
        if cheb_dist(x, y, ki.x.unwrap(), ki.y.unwrap()) == 1 { return true; }
    }
    false
}

/// Is the given player's Gyoku under attack?
pub fn is_in_check(state: &GameState, owner: Owner) -> bool {
    let gi = match state.gyoku(owner) {
        Some(i) => i,
        None => return false,
    };
    let g = &state.pieces[gi];
    if !g.on_board() { return false; }
    let (gx, gy) = (g.x.unwrap(), g.y.unwrap());
    let opponent = owner.opponent();
    let board_map = state.build_board_map();

    for p in &state.pieces {
        if p.owner != opponent || !p.on_board() { continue; }
        let (px, py) = (p.x.unwrap(), p.y.unwrap());
        for (dx, dy, is_slide) in get_move_vectors(p.face, p.owner) {
            let max_d = if is_slide { 20 } else { 1 };
            for d in 1..=max_d {
                let nx = px + dx * d;
                let ny = py + dy * d;
                if nx == gx && ny == gy { return true; }
                if board_map.contains_key(&format!("{},{}", nx, ny)) { break; }
            }
        }
    }
    false
}

/// Check if moving piece to (tx,ty) would be legal. Mutates and restores state.
fn would_be_legal(state: &mut GameState, pidx: usize, tx: i32, ty: i32, cap_idx: Option<usize>) -> bool {
    let orig_x = state.pieces[pidx].x;
    let orig_y = state.pieces[pidx].y;
    let orig_face = state.pieces[pidx].face;
    let p_cube = state.pieces[pidx].cube;
    let p_owner = state.pieces[pidx].owner;
    let p_id = state.pieces[pidx].id;

    state.pieces[pidx].x = Some(tx);
    state.pieces[pidx].y = Some(ty);

    let mut cap_ox = None;
    let mut cap_oy = None;
    if let Some(ci) = cap_idx {
        cap_ox = state.pieces[ci].x;
        cap_oy = state.pieces[ci].y;
        state.pieces[ci].x = None;
        state.pieces[ci].y = None;
    } else if p_cube != Cube::Gyoku {
        if let Some(opp) = state.pieces[pidx].face.opposite() {
            state.pieces[pidx].face = opp;
        }
    }

    let mut legal = true;

    if p_cube == Cube::Gyoku {
        for i in 0..state.pieces.len() {
            let p = &state.pieces[i];
            if p.cube == Cube::Gyoku && p.id != p_id && p.on_board() {
                if cheb_dist(tx, ty, p.x.unwrap(), p.y.unwrap()) != 2 {
                    legal = false;
                }
                break;
            }
        }
    }

    if legal && p_cube != Cube::Gyoku {
        let skip = cap_idx.map_or(false, |ci| {
            matches!(state.pieces[ci].cube, Cube::Gyoku | Cube::Ki)
        });
        if !skip && !is_piece_supported(state, tx, ty, p_cube) {
            legal = false;
        }
    }

    if legal && is_in_check(state, p_owner) {
        legal = false;
    }

    state.pieces[pidx].x = orig_x;
    state.pieces[pidx].y = orig_y;
    state.pieces[pidx].face = orig_face;
    if let Some(ci) = cap_idx {
        state.pieces[ci].x = cap_ox;
        state.pieces[ci].y = cap_oy;
    }
    legal
}

/// Generate legal moves for a piece on the board
pub fn get_legal_moves(state: &mut GameState, pidx: usize) -> Vec<LegalMove> {
    if !state.pieces[pidx].on_board() { return Vec::new(); }
    let face = state.pieces[pidx].face;
    let owner = state.pieces[pidx].owner;
    let px = state.pieces[pidx].x.unwrap();
    let py = state.pieces[pidx].y.unwrap();
    let opponent = owner.opponent();
    let board_map = state.build_board_map();
    let vectors = get_move_vectors(face, owner);
    let mut moves = Vec::new();

    for (dx, dy, is_slide) in vectors {
        let max_d = if is_slide { 20 } else { 1 };
        for d in 1..=max_d {
            let nx = px + dx * d;
            let ny = py + dy * d;
            let key = format!("{},{}", nx, ny);
            if let Some(&ti) = board_map.get(&key) {
                if state.pieces[ti].owner == opponent {
                    if would_be_legal(state, pidx, nx, ny, Some(ti)) {
                        moves.push(LegalMove { x: nx, y: ny, capture: Some(ti) });
                    }
                }
                break;
            }
            if would_be_legal(state, pidx, nx, ny, None) {
                moves.push(LegalMove { x: nx, y: ny, capture: None });
            }
        }
    }
    moves
}

/// Would dropping a piece with given face at (x,y) give check to opponent?
fn would_drop_cause_check(state: &mut GameState, owner: Owner, face: Face, x: i32, y: i32) -> bool {
    let opponent = owner.opponent();
    if is_in_check(state, opponent) { return false; }
    let temp = Piece::new(9999, owner, face.cube(), face);
    let idx = state.pieces.len();
    state.pieces.push(temp);
    state.pieces[idx].x = Some(x);
    state.pieces[idx].y = Some(y);
    let check = is_in_check(state, opponent);
    state.pieces.pop();
    check
}

/// Get legal drop positions for a piece with a given face
pub fn get_legal_drops(state: &mut GameState, owner: Owner, face: Face) -> Vec<(i32, i32)> {
    let gi = match state.gyoku(owner) { Some(i) => i, None => return Vec::new() };
    if !state.pieces[gi].on_board() { return Vec::new(); }
    let (gx, gy) = (state.pieces[gi].x.unwrap(), state.pieces[gi].y.unwrap());
    let opponent = owner.opponent();
    let ogi = state.gyoku(opponent);

    let is_ki = face.cube() == Cube::Ki;
    let range: i32 = if is_ki { 2 } else { 1 };
    let mut drops = Vec::new();

    for dx in -range..=range {
        for dy in -range..=range {
            if dx == 0 && dy == 0 { continue; }
            if dx.abs().max(dy.abs()) > range { continue; }
            let nx = gx + dx;
            let ny = gy + dy;

            if state.piece_at(nx, ny).is_some() { continue; }

            if let Some(oi) = ogi {
                let og = &state.pieces[oi];
                if og.on_board() && cheb_dist(nx, ny, og.x.unwrap(), og.y.unwrap()) <= 1 {
                    continue;
                }
            }

            if would_drop_cause_check(state, owner, face, nx, ny) { continue; }

            // Drop must resolve own check
            let temp = Piece::new(9998, owner, face.cube(), face);
            let tidx = state.pieces.len();
            state.pieces.push(temp);
            state.pieces[tidx].x = Some(nx);
            state.pieces[tidx].y = Some(ny);
            let still = is_in_check(state, owner);
            state.pieces.pop();
            if still { continue; }

            drops.push((nx, ny));
        }
    }
    drops
}

/// Find stranded pieces and capture them for opponent
pub fn handle_stranding(state: &mut GameState) {
    let turn = state.turn;
    let opponent = turn.opponent();
    let stranded: Vec<usize> = state.pieces.iter().enumerate()
        .filter(|(_, p)| {
            p.on_board() && p.cube != Cube::Gyoku && p.owner == turn
                && !is_piece_supported(state, p.x.unwrap(), p.y.unwrap(), p.cube)
        })
        .map(|(i, _)| i)
        .collect();

    for idx in stranded {
        state.pieces[idx].x = None;
        state.pieces[idx].y = None;
        state.pieces[idx].owner = opponent;
        state.pieces[idx].face = match state.pieces[idx].cube {
            Cube::Hi => Face::Hi,
            Cube::Kaku => Face::Kaku,
            Cube::Ki => Face::Ki,
            _ => state.pieces[idx].face,
        };
    }
}

/// Check if player has any legal action (move or drop)
pub fn has_legal_action(state: &mut GameState, owner: Owner) -> bool {
    let board_idxs: Vec<usize> = state.pieces.iter().enumerate()
        .filter(|(_, p)| p.owner == owner && p.on_board())
        .map(|(i, _)| i).collect();
    for pidx in board_idxs {
        if !get_legal_moves(state, pidx).is_empty() { return true; }
    }
    let hand_idxs = state.hand_pieces_for(owner);
    for &pi in &hand_idxs {
        let cube = state.pieces[pi].cube;
        for &face in Face::cube_faces(cube) {
            if !get_legal_drops(state, owner, face).is_empty() { return true; }
        }
    }
    false
}

/// Valid positions for White Gyoku (Chebyshev distance exactly 2 from Black Gyoku)
pub fn get_white_gyoku_positions(state: &GameState) -> Vec<(i32, i32)> {
    let gi = match state.gyoku(Owner::Black) { Some(i) => i, None => return Vec::new() };
    let g = &state.pieces[gi];
    if !g.on_board() { return Vec::new(); }
    let (bx, by) = (g.x.unwrap(), g.y.unwrap());
    let mut pos = Vec::new();
    for dx in -2..=2i32 {
        for dy in -2..=2i32 {
            if dx.abs().max(dy.abs()) == 2 {
                pos.push((bx + dx, by + dy));
            }
        }
    }
    pos
}
