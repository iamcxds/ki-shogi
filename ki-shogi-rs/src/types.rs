// Ki Shogi - Type definitions, constants, movement data

// ---------------------------------------------------------------------------
// Owner
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Owner {
    Black,
    White,
}

impl Owner {
    pub fn opponent(self) -> Owner {
        match self {
            Owner::Black => Owner::White,
            Owner::White => Owner::Black,
        }
    }

    /// Forward direction multiplier (+1 for Black, -1 for White).
    pub fn forward(self) -> i32 {
        match self {
            Owner::Black => 1,
            Owner::White => -1,
        }
    }

    /// Left direction multiplier (-1 for Black, +1 for White).
    pub fn left(self) -> i32 {
        match self {
            Owner::Black => -1,
            Owner::White => 1,
        }
    }
}

// ---------------------------------------------------------------------------
// Cube
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Cube {
    Gyoku,
    Hi,
    Kaku,
    Ki,
}

// ---------------------------------------------------------------------------
// Face
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Face {
    Gyoku,
    Hi,
    Cho,
    Han,
    Chuu,
    Ou,
    Shu,
    Kaku,
    Myou,
    Hon,
    Ga,
    Zou,
    Ken,
    Ki,
    Hou,
    Ro,
    Ja,
    Ba,
    Ryuu,
}

impl Face {
    /// The kanji character for this face.
    pub fn kanji(&self) -> &'static str {
        match self {
            Face::Gyoku => "玉",
            Face::Hi    => "飛",
            Face::Cho   => "猪",
            Face::Han   => "反",
            Face::Chuu  => "仲",
            Face::Ou    => "横",
            Face::Shu   => "竪",
            Face::Kaku  => "角",
            Face::Myou  => "猫",
            Face::Hon   => "奔",
            Face::Ga    => "瓦",
            Face::Zou   => "雑",
            Face::Ken   => "犬",
            Face::Ki    => "麒",
            Face::Hou   => "鳳",
            Face::Ro    => "驢",
            Face::Ja    => "蛇",
            Face::Ba    => "馬",
            Face::Ryuu  => "龍",
        }
    }

    /// The English name for this face.
    pub fn english(&self) -> &'static str {
        match self {
            Face::Gyoku => "Jewel",
            Face::Hi    => "Flying",
            Face::Cho   => "Boar",
            Face::Han   => "Reverse",
            Face::Chuu  => "Between",
            Face::Ou    => "Side",
            Face::Shu   => "Vertical",
            Face::Kaku  => "Horns",
            Face::Myou  => "Cat",
            Face::Hon   => "Flee",
            Face::Ga    => "Tile",
            Face::Zou   => "Misc",
            Face::Ken   => "Dog",
            Face::Ki    => "Unicorn",
            Face::Hou   => "Phoenix",
            Face::Ro    => "Donkey",
            Face::Ja    => "Snake",
            Face::Ba    => "Horse",
            Face::Ryuu  => "Dragon",
        }
    }

    /// Which cube this face belongs to.
    pub fn cube(&self) -> Cube {
        match self {
            Face::Gyoku => Cube::Gyoku,
            Face::Hi | Face::Cho | Face::Han | Face::Chuu | Face::Ou | Face::Shu => Cube::Hi,
            Face::Kaku | Face::Myou | Face::Hon | Face::Ga | Face::Zou | Face::Ken => Cube::Kaku,
            Face::Ki | Face::Hou | Face::Ro | Face::Ja | Face::Ba | Face::Ryuu => Cube::Ki,
        }
    }

    /// The opposite face on the same cube. Gyoku has no opposite.
    pub fn opposite(&self) -> Option<Face> {
        match self {
            Face::Gyoku => None,
            Face::Hi    => Some(Face::Cho),
            Face::Cho   => Some(Face::Hi),
            Face::Han   => Some(Face::Chuu),
            Face::Chuu  => Some(Face::Han),
            Face::Ou    => Some(Face::Shu),
            Face::Shu   => Some(Face::Ou),
            Face::Kaku  => Some(Face::Myou),
            Face::Myou  => Some(Face::Kaku),
            Face::Hon   => Some(Face::Ga),
            Face::Ga    => Some(Face::Hon),
            Face::Zou   => Some(Face::Ken),
            Face::Ken   => Some(Face::Zou),
            Face::Ki    => Some(Face::Hou),
            Face::Hou   => Some(Face::Ki),
            Face::Ro    => Some(Face::Ja),
            Face::Ja    => Some(Face::Ro),
            Face::Ba    => Some(Face::Ryuu),
            Face::Ryuu  => Some(Face::Ba),
        }
    }

    /// Promotion choices when this face captures. Gyoku cannot promote.
    pub fn promotions(&self) -> &'static [Face] {
        match self {
            Face::Gyoku => &[],
            Face::Hi    => &[Face::Chuu],
            Face::Cho   => &[Face::Ou, Face::Shu],
            Face::Han   => &[Face::Shu],
            Face::Chuu  => &[Face::Cho, Face::Han, Face::Ou],
            Face::Ou    => &[Face::Hi],
            Face::Shu   => &[Face::Hi],
            Face::Kaku  => &[Face::Ga, Face::Ken],
            Face::Myou  => &[Face::Kaku],
            Face::Hon   => &[Face::Kaku],
            Face::Ga    => &[Face::Hon, Face::Myou],
            Face::Zou   => &[Face::Kaku],
            Face::Ken   => &[Face::Zou, Face::Myou],
            Face::Ki    => &[Face::Ryuu, Face::Ba],
            Face::Hou   => &[Face::Ryuu, Face::Ba],
            Face::Ro    => &[Face::Ki, Face::Hou],
            Face::Ja    => &[Face::Ki, Face::Hou],
            Face::Ba    => &[Face::Ja, Face::Ro],
            Face::Ryuu  => &[Face::Ja, Face::Ro],
        }
    }

    /// All faces belonging to a given cube.
    pub fn cube_faces(cube: Cube) -> &'static [Face] {
        match cube {
            Cube::Gyoku => &[Face::Gyoku],
            Cube::Hi    => &[Face::Hi, Face::Cho, Face::Han, Face::Chuu, Face::Ou, Face::Shu],
            Cube::Kaku  => &[Face::Kaku, Face::Myou, Face::Hon, Face::Ga, Face::Zou, Face::Ken],
            Cube::Ki    => &[Face::Ki, Face::Hou, Face::Ro, Face::Ja, Face::Ba, Face::Ryuu],
        }
    }

    /// Heuristic value for AI evaluation.
    pub fn face_value(&self) -> i32 {
        match self {
            Face::Gyoku => 0,
            Face::Hi    => 80,
            Face::Cho   => 30,
            Face::Han   => 50,
            Face::Chuu  => 15,
            Face::Ou    => 55,
            Face::Shu   => 55,
            Face::Kaku  => 80,
            Face::Myou  => 30,
            Face::Hon   => 60,
            Face::Ga    => 20,
            Face::Zou   => 60,
            Face::Ken   => 20,
            Face::Ki    => 45,
            Face::Hou   => 45,
            Face::Ro    => 25,
            Face::Ja    => 25,
            Face::Ba    => 20,
            Face::Ryuu  => 20,
        }
    }
}

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum MoveMode {
    Step,
    Slide,
}

/// A component of a piece's movement rule: a mode plus the concrete direction
/// vectors it can move along.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MoveComponent {
    pub mode: MoveMode,
    pub dirs: Vec<(i32, i32)>,
}

// ---------------------------------------------------------------------------
// Direction categories (internal)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
enum DirCategory {
    FO,
    BO,
    LO,
    RO,
    FD,
    BD,
    O,
    D,
    JO,
    JD,
    JFO,
    JBO,
    JBD,
    FK,
    BK,
}

/// Resolve a direction category into concrete (dx, dy) vectors for the given
/// owner.
fn resolve_dirs(cat: DirCategory, owner: Owner) -> Vec<(i32, i32)> {
    let f = owner.forward();
    let l = owner.left();
    match cat {
        DirCategory::FO  => vec![(0, f)],
        DirCategory::BO  => vec![(0, -f)],
        DirCategory::LO  => vec![(l, 0)],
        DirCategory::RO  => vec![(-l, 0)],
        DirCategory::FD  => vec![(l, f), (-l, f)],
        DirCategory::BD  => vec![(l, -f), (-l, -f)],
        DirCategory::O   => vec![(0, f), (0, -f), (l, 0), (-l, 0)],
        DirCategory::D   => vec![(l, f), (-l, f), (l, -f), (-l, -f)],
        DirCategory::JO  => vec![(0, 2 * f), (0, -2 * f), (2 * l, 0), (-2 * l, 0)],
        DirCategory::JD  => vec![(2 * l, 2 * f), (-2 * l, 2 * f), (2 * l, -2 * f), (-2 * l, -2 * f)],
        DirCategory::JFO => vec![(0, 2 * f)],
        DirCategory::JBO => vec![(0, -2 * f)],
        DirCategory::JBD => vec![(2 * l, -2 * f), (-2 * l, -2 * f)],
        DirCategory::FK  => vec![(l, 2 * f), (-l, 2 * f)],
        DirCategory::BK  => vec![(l, -2 * f), (-l, -2 * f)],
    }
}

/// Internal: the movement rule for each face, expressed as (MoveMode, &[DirCategory]).
fn face_move_spec(face: Face) -> &'static [(MoveMode, &'static [DirCategory])] {
    use DirCategory::*;
    use MoveMode::*;
    match face {
        Face::Gyoku => &[(Step,  &[O, D])],
        Face::Hi    => &[(Slide, &[O])],
        Face::Cho   => &[(Step,  &[O])],
        Face::Han   => &[(Slide, &[FO, BO])],
        Face::Chuu  => &[(Step,  &[FO, BO])],
        Face::Ou    => &[(Step,  &[FO, BO]), (Slide, &[LO, RO])],
        Face::Shu   => &[(Step,  &[LO, RO]), (Slide, &[FO, BO])],
        Face::Kaku  => &[(Slide, &[D])],
        Face::Myou  => &[(Step,  &[D])],
        Face::Hon   => &[(Slide, &[BO, FD])],
        Face::Ga    => &[(Step,  &[BO, FD])],
        Face::Zou   => &[(Slide, &[BD, FO])],
        Face::Ken   => &[(Step,  &[BD, FO])],
        Face::Ki    => &[(Step,  &[D, JO])],
        Face::Hou   => &[(Step,  &[O, JD])],
        Face::Ro    => &[(Step,  &[LO, RO, JFO, JBO])],
        Face::Ja    => &[(Step,  &[LO, RO, JFO, JBD])],
        Face::Ba    => &[(Step,  &[FK, BK])],
        Face::Ryuu  => &[(Step,  &[JD])],
    }
}

/// Returns all movement vectors for a face owned by the given player.
///
/// Each tuple is `(dx, dy, is_slide)` where `is_slide` indicates whether the
/// piece slides along that direction (true) or steps exactly one cell (false).
/// Returns the movement components for a face, preserving step/slide grouping.
/// Used by the diagram builder.
pub fn get_move_components(face: Face, owner: Owner) -> Vec<MoveComponent> {
    let spec = face_move_spec(face);
    let mut result = Vec::new();
    for &(mode, cats) in spec {
        let mut dirs = Vec::new();
        for &cat in cats {
            dirs.extend(resolve_dirs(cat, owner));
        }
        result.push(MoveComponent { mode, dirs });
    }
    result
}

pub fn get_move_vectors(face: Face, owner: Owner) -> Vec<(i32, i32, bool)> {
    let spec = face_move_spec(face);
    let mut result = Vec::new();
    for &(mode, cats) in spec {
        let is_slide = mode == MoveMode::Slide;
        for &cat in cats {
            for (dx, dy) in resolve_dirs(cat, owner) {
                result.push((dx, dy, is_slide));
            }
        }
    }
    result
}
