// Ki Shogi - Constants and piece data tables

const BLACK = 'black';
const WHITE = 'white';

// Cube types
const CUBE_GYOKU = 'gyoku';
const CUBE_HI = 'hi';
const CUBE_KAKU = 'kaku';
const CUBE_KI = 'ki';

// Face display: [kanji, english]
const FACE_INFO = {
  Gyoku: ['玉', 'Jewel'],
  Hi:    ['飛', 'Flying'],  Cho:  ['猪', 'Boar'],
  Han:   ['反', 'Reverse'], Chuu: ['仲', 'Between'],
  Ou:    ['横', 'Side'],    Shu:  ['竪', 'Vertical'],
  Kaku:  ['角', 'Horns'],   Myou: ['猫', 'Cat'],
  Hon:   ['奔', 'Flee'],    Ga:   ['瓦', 'Tile'],
  Zou:   ['雑', 'Misc'],    Ken:  ['犬', 'Dog'],
  Ki:    ['麒', 'Unicorn'], Hou:  ['鳳', 'Phoenix'],
  Ro:    ['驢', 'Donkey'],  Ja:   ['蛇', 'Snake'],
  Ba:    ['馬', 'Horse'],   Ryuu: ['龍', 'Dragon'],
};

// Which cube each face belongs to
const FACE_CUBE = {
  Gyoku: CUBE_GYOKU,
  Hi: CUBE_HI, Cho: CUBE_HI, Han: CUBE_HI, Chuu: CUBE_HI, Ou: CUBE_HI, Shu: CUBE_HI,
  Kaku: CUBE_KAKU, Myou: CUBE_KAKU, Hon: CUBE_KAKU, Ga: CUBE_KAKU, Zou: CUBE_KAKU, Ken: CUBE_KAKU,
  Ki: CUBE_KI, Hou: CUBE_KI, Ro: CUBE_KI, Ja: CUBE_KI, Ba: CUBE_KI, Ryuu: CUBE_KI,
};

// Opposite faces (flip on non-capture move)
const OPPOSITES = {
  Hi: 'Cho', Cho: 'Hi',
  Han: 'Chuu', Chuu: 'Han',
  Ou: 'Shu', Shu: 'Ou',
  Kaku: 'Myou', Myou: 'Kaku',
  Hon: 'Ga', Ga: 'Hon',
  Zou: 'Ken', Ken: 'Zou',
  Ki: 'Hou', Hou: 'Ki',
  Ro: 'Ja', Ja: 'Ro',
  Ba: 'Ryuu', Ryuu: 'Ba',
};

// Promotions on capture (face -> array of choices)
const PROMOTIONS = {
  Chuu: ['Cho', 'Han', 'Ou'],
  Cho:  ['Ou', 'Shu'],
  Han:  ['Shu'],
  Ou:   ['Hi'],
  Shu:  ['Hi'],
  Hi:   ['Chuu'],
  Myou: ['Kaku'],
  Hon:  ['Kaku'],
  Ga:   ['Hon', 'Myou'],
  Zou:  ['Kaku'],
  Ken:  ['Zou', 'Myou'],
  Kaku: ['Ga', 'Ken'],
  Ja:   ['Ki', 'Hou'],
  Ro:   ['Ki', 'Hou'],
  Ryuu: ['Ja', 'Ro'],
  Ba:   ['Ja', 'Ro'],
  Ki:   ['Ryuu', 'Ba'],
  Hou:  ['Ryuu', 'Ba'],
};

// All faces of each cube (for drop face selection)
const CUBE_FACES = {
  [CUBE_HI]:   ['Hi', 'Cho', 'Han', 'Chuu', 'Ou', 'Shu'],
  [CUBE_KAKU]: ['Kaku', 'Myou', 'Hon', 'Ga', 'Zou', 'Ken'],
  [CUBE_KI]:   ['Ki', 'Hou', 'Ro', 'Ja', 'Ba', 'Ryuu'],
};

// Movement definitions
// Direction categories resolve to dx,dy vectors relative to owner's orientation
// 'step' = 1 square, 'slide' = unlimited until blocked
// Dir keys: FO=forward-ortho, BO=back-ortho, LO=left-ortho, RO=right-ortho
//           FD=forward-diag(2dirs), BD=back-diag(2dirs), O=all-ortho, D=all-diag
const MOVES = {
  Gyoku: [{ mode: 'step', dirs: ['O', 'D'] }],
  Hi:    [{ mode: 'slide', dirs: ['O'] }],
  Cho:   [{ mode: 'step', dirs: ['O'] }],
  Han:   [{ mode: 'slide', dirs: ['FO', 'BO'] }],
  Chuu:  [{ mode: 'step', dirs: ['FO', 'BO'] }],
  Ou:    [{ mode: 'step', dirs: ['FO', 'BO'] }, { mode: 'slide', dirs: ['LO', 'RO'] }],
  Shu:   [{ mode: 'step', dirs: ['LO', 'RO'] }, { mode: 'slide', dirs: ['FO', 'BO'] }],
  Kaku:  [{ mode: 'slide', dirs: ['D'] }],
  Myou:  [{ mode: 'step', dirs: ['D'] }],
  Hon:   [{ mode: 'slide', dirs: ['BO', 'FD'] }],
  Ga:    [{ mode: 'step', dirs: ['BO', 'FD'] }],
  Zou:   [{ mode: 'slide', dirs: ['BD', 'FO'] }],
  Ken:   [{ mode: 'step', dirs: ['BD', 'FO'] }],
  Ki:    [{ mode: 'step', dirs: ['D', 'JO'] }],
  Hou:   [{ mode: 'step', dirs: ['O', 'JD'] }],
  Ro:    [{ mode: 'step', dirs: ['LO', 'RO', 'JFO', 'JBO'] }],
  Ja:    [{ mode: 'step', dirs: ['LO', 'RO', 'JFO', 'JBD'] }],
  Ba:    [{ mode: 'step', dirs: ['FK', 'BK'] }],
  Ryuu:  [{ mode: 'step', dirs: ['JD'] }],
};

// Resolve direction category to array of [dx, dy] vectors for a given owner
function resolveDirs(category, owner) {
  // Black: forward=+y, White: forward=-y
  const f = owner === BLACK ? 1 : -1;
  const l = owner === BLACK ? -1 : 1;
  const map = {
    FO: [[0, f]],
    BO: [[0, -f]],
    LO: [[l, 0]],
    RO: [[-l, 0]],
    FD: [[l, f], [-l, f]],
    BD: [[l, -f], [-l, -f]],
    O:  [[0, f], [0, -f], [l, 0], [-l, 0]],
    D:  [[l, f], [-l, f], [l, -f], [-l, -f]],
    // Jump directions (distance 2, skip over pieces)
    JO:  [[0, 2*f], [0, -2*f], [2*l, 0], [-2*l, 0]],
    JD:  [[2*l, 2*f], [-2*l, 2*f], [2*l, -2*f], [-2*l, -2*f]],
    JFO: [[0, 2*f]],
    JBO: [[0, -2*f]],
    JBD: [[2*l, -2*f], [-2*l, -2*f]],
    FK:  [[l, 2*f], [-l, 2*f]],
    BK:  [[l, -2*f], [-l, -2*f]],
  };
  return map[category] || [];
}

module.exports = {
  BLACK, WHITE, CUBE_GYOKU, CUBE_HI, CUBE_KAKU, CUBE_KI,
  FACE_INFO, FACE_CUBE, OPPOSITES, PROMOTIONS, CUBE_FACES, MOVES, resolveDirs,
};
