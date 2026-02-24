// Ki Shogi - Piece and GameState

use std::collections::HashMap;
use std::time::Instant;
use crate::types::{Owner, Cube, Face};
use crate::lang::t;

// ---------------------------------------------------------------------------
// Piece
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct Piece {
    pub id: usize,
    pub owner: Owner,
    pub cube: Cube,
    pub face: Face,
    pub x: Option<i32>,
    pub y: Option<i32>,
}

impl Piece {
    pub fn new(id: usize, owner: Owner, cube: Cube, face: Face) -> Self {
        Self { id, owner, cube, face, x: None, y: None }
    }

    pub fn on_board(&self) -> bool {
        self.x.is_some()
    }

    pub fn key(&self) -> String {
        format!("{},{}", self.x.unwrap_or(0), self.y.unwrap_or(0))
    }

    pub fn pos(&self) -> Option<(i32, i32)> {
        match (self.x, self.y) {
            (Some(x), Some(y)) => Some((x, y)),
            _ => None,
        }
    }
}

// ---------------------------------------------------------------------------
// Mode
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    Menu,
    SetupBlackGyoku,
    SetupWhiteGyoku,
    Board,
    Selected,
    Hand,
    FaceSelect,
    DropTarget,
    Promote,
    GameOver,
    Draw,
    Tutorial,
    LogBrowse,
}

// ---------------------------------------------------------------------------
// AiSide
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AiSide {
    None,
    Player(Owner),
    Both,
}

impl AiSide {
    pub fn is_ai(&self, owner: Owner) -> bool {
        match self {
            AiSide::None => false,
            AiSide::Player(o) => *o == owner,
            AiSide::Both => true,
        }
    }
}

// ---------------------------------------------------------------------------
// MoveLogEntry
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct MoveLogEntry {
    pub num: usize,
    pub owner: Owner,
    pub text: String,
    pub snapshot: Vec<PieceSnapshot>,
    pub face: Option<Face>,
    pub from: Option<(i32, i32)>,
    pub to: Option<(i32, i32)>,
}

#[derive(Debug, Clone)]
pub struct PieceSnapshot {
    pub id: usize,
    pub owner: Owner,
    pub cube: Cube,
    pub face: Face,
    pub x: Option<i32>,
    pub y: Option<i32>,
}

impl PieceSnapshot {
    pub fn from_piece(p: &Piece) -> Self {
        Self {
            id: p.id, owner: p.owner, cube: p.cube,
            face: p.face, x: p.x, y: p.y,
        }
    }
}

// ---------------------------------------------------------------------------
// LegalMove
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct LegalMove {
    pub x: i32,
    pub y: i32,
    pub capture: Option<usize>, // piece index
}

// ---------------------------------------------------------------------------
// GameState
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct GameState {
    pub pieces: Vec<Piece>,
    pub turn: Owner,
    pub use_ki: bool,
    pub mode: Mode,
    pub cursor: (i32, i32),
    pub selected: Option<usize>,
    pub legal_moves: Vec<LegalMove>,
    pub hand_pieces: Vec<usize>,   // indices into pieces
    pub hand_index: usize,
    pub drop_faces: Vec<Face>,
    pub face_index: usize,
    pub drop_targets: Vec<(i32, i32)>,
    pub promote_choices: Vec<Face>,
    pub promote_index: usize,
    pub pending_log_info: Option<PendingLogInfo>,
    pub message: String,
    pub winner: Option<Owner>,
    pub in_check: bool,
    pub ai_side: AiSide,
    pub ai_difficulty: u8,
    pub menu_step: u8,
    pub tutorial_page: usize,
    pub move_log: Vec<MoveLogEntry>,
    pub log_index: usize,
    pub move_num: usize,
    pub position_history: HashMap<String, Vec<PositionRecord>>,
    pub paused: bool,
    pub pre_log_mode: Option<Mode>,
    pub want_ai: bool,
    pub ai_think_start: Option<Instant>,
    pub last_move_from: Option<(i32, i32)>,
    pub last_move_to: Option<(i32, i32)>,
}

#[derive(Debug, Clone)]
pub struct PendingLogInfo {
    pub owner: Owner,
    pub cap_base: String,
    pub face: Face,
    pub from: (i32, i32),
    pub to: (i32, i32),
}

#[derive(Debug, Clone)]
pub struct PositionRecord {
    pub in_check: bool,
}

impl GameState {
    pub fn new() -> Self {
        Self {
            pieces: Vec::new(),
            turn: Owner::Black,
            use_ki: false,
            mode: Mode::Menu,
            cursor: (0, 0),
            selected: None,
            legal_moves: Vec::new(),
            hand_pieces: Vec::new(),
            hand_index: 0,
            drop_faces: Vec::new(),
            face_index: 0,
            drop_targets: Vec::new(),
            promote_choices: Vec::new(),
            promote_index: 0,
            pending_log_info: None,
            message: String::new(),
            winner: None,
            in_check: false,
            ai_side: AiSide::None,
            ai_difficulty: 2,
            menu_step: 1,
            tutorial_page: 0,
            move_log: Vec::new(),
            log_index: 0,
            move_num: 0,
            position_history: HashMap::new(),
            paused: false,
            pre_log_mode: None,
            want_ai: false,
            ai_think_start: None,
            last_move_from: None,
            last_move_to: None,
        }
    }

    pub fn start_game(&mut self, use_ki: bool, ai_side: AiSide) {
        self.use_ki = use_ki;
        self.ai_side = ai_side;
        self.init_pieces();
        self.mode = Mode::SetupBlackGyoku;
        self.message = t("place_black_gyoku").to_string();
    }

    fn init_pieces(&mut self) {
        let mut id = 0usize;
        for &owner in &[Owner::Black, Owner::White] {
            self.pieces.push(Piece::new(id, owner, Cube::Gyoku, Face::Gyoku)); id += 1;
            self.pieces.push(Piece::new(id, owner, Cube::Hi, Face::Hi)); id += 1;
            self.pieces.push(Piece::new(id, owner, Cube::Kaku, Face::Kaku)); id += 1;
            if self.use_ki {
                self.pieces.push(Piece::new(id, owner, Cube::Ki, Face::Ki)); id += 1;
            }
        }
    }

    pub fn build_board_map(&self) -> HashMap<String, usize> {
        let mut map = HashMap::new();
        for (i, p) in self.pieces.iter().enumerate() {
            if p.on_board() {
                map.insert(p.key(), i);
            }
        }
        map
    }

    pub fn piece_at(&self, x: i32, y: i32) -> Option<usize> {
        let key = format!("{},{}", x, y);
        for (i, p) in self.pieces.iter().enumerate() {
            if p.on_board() && p.key() == key {
                return Some(i);
            }
        }
        None
    }

    pub fn gyoku(&self, owner: Owner) -> Option<usize> {
        self.pieces.iter().position(|p| p.owner == owner && p.cube == Cube::Gyoku)
    }

    pub fn hand_pieces_for(&self, owner: Owner) -> Vec<usize> {
        self.pieces.iter().enumerate()
            .filter(|(_, p)| p.owner == owner && !p.on_board() && p.cube != Cube::Gyoku)
            .map(|(i, _)| i)
            .collect()
    }

    pub fn board_pieces_for(&self, owner: Owner) -> Vec<usize> {
        self.pieces.iter().enumerate()
            .filter(|(_, p)| p.owner == owner && p.on_board())
            .map(|(i, _)| i)
            .collect()
    }

    pub fn switch_turn(&mut self) {
        self.turn = self.turn.opponent();
    }

    pub fn take_snapshot(&self) -> Vec<PieceSnapshot> {
        self.pieces.iter().map(PieceSnapshot::from_piece).collect()
    }

    pub fn reset(&mut self) {
        let use_ki = self.use_ki;
        let ai_side = self.ai_side;
        let ai_diff = self.ai_difficulty;
        *self = Self::new();
        self.use_ki = use_ki;
        self.ai_side = ai_side;
        self.ai_difficulty = ai_diff;
    }

    pub fn reset_to_menu(&mut self) {
        *self = Self::new();
    }
}
