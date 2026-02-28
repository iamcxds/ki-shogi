"use strict";

// === CONSTANTS ===
const BLACK = "black",
  WHITE = "white";
const CUBE_GYOKU = "gyoku",
  CUBE_HI = "hi",
  CUBE_KAKU = "kaku",
  CUBE_KI = "ki";

const FACE_INFO = {
  Gyoku: ["玉", "Jewel"],
  Hi: ["飛", "Flying"],
  Cho: ["猪", "Boar"],
  Han: ["反", "Reverse"],
  Chuu: ["仲", "Between"],
  Ou: ["横", "Side"],
  Shu: ["竪", "Vertical"],
  Kaku: ["角", "Horns"],
  Myou: ["猫", "Cat"],
  Hon: ["奔", "Flee"],
  Ga: ["瓦", "Tile"],
  Zou: ["雑", "Misc"],
  Ken: ["犬", "Dog"],
  Ki: ["麒", "Unicorn"],
  Hou: ["鳳", "Phoenix"],
  Ro: ["驢", "Donkey"],
  Ja: ["蛇", "Snake"],
  Ba: ["馬", "Horse"],
  Ryuu: ["龍", "Dragon"],
};

const FACE_CUBE = {
  Gyoku: CUBE_GYOKU,
  Hi: CUBE_HI,
  Cho: CUBE_HI,
  Han: CUBE_HI,
  Chuu: CUBE_HI,
  Ou: CUBE_HI,
  Shu: CUBE_HI,
  Kaku: CUBE_KAKU,
  Myou: CUBE_KAKU,
  Hon: CUBE_KAKU,
  Ga: CUBE_KAKU,
  Zou: CUBE_KAKU,
  Ken: CUBE_KAKU,
  Ki: CUBE_KI,
  Hou: CUBE_KI,
  Ro: CUBE_KI,
  Ja: CUBE_KI,
  Ba: CUBE_KI,
  Ryuu: CUBE_KI,
};

const OPPOSITES = {
  Hi: "Cho",
  Cho: "Hi",
  Han: "Chuu",
  Chuu: "Han",
  Ou: "Shu",
  Shu: "Ou",
  Kaku: "Myou",
  Myou: "Kaku",
  Hon: "Ga",
  Ga: "Hon",
  Zou: "Ken",
  Ken: "Zou",
  Ki: "Hou",
  Hou: "Ki",
  Ro: "Ja",
  Ja: "Ro",
  Ba: "Ryuu",
  Ryuu: "Ba",
};

const PROMOTIONS = {
  Chuu: ["Cho", "Han", "Ou"],
  Cho: ["Ou", "Shu"],
  Han: ["Shu"],
  Ou: ["Hi"],
  Shu: ["Hi"],
  Hi: ["Chuu"],
  Myou: ["Kaku"],
  Hon: ["Kaku"],
  Ga: ["Hon", "Myou"],
  Zou: ["Kaku"],
  Ken: ["Zou", "Myou"],
  Kaku: ["Ga", "Ken"],
  Ja: ["Ki", "Hou"],
  Ro: ["Ki", "Hou"],
  Ryuu: ["Ja", "Ro"],
  Ba: ["Ja", "Ro"],
  Ki: ["Ryuu", "Ba"],
  Hou: ["Ryuu", "Ba"],
};

const CUBE_FACES = {
  [CUBE_HI]: ["Hi", "Cho", "Han", "Chuu", "Ou", "Shu"],
  [CUBE_KAKU]: ["Kaku", "Myou", "Hon", "Ga", "Zou", "Ken"],
  [CUBE_KI]: ["Ki", "Hou", "Ro", "Ja", "Ba", "Ryuu"],
};

const MOVES = {
  Gyoku: [{ mode: "step", dirs: ["O", "D"] }],
  Hi: [{ mode: "slide", dirs: ["O"] }],
  Cho: [{ mode: "step", dirs: ["O"] }],
  Han: [{ mode: "slide", dirs: ["FO", "BO"] }],
  Chuu: [{ mode: "step", dirs: ["FO", "BO"] }],
  Ou: [
    { mode: "step", dirs: ["FO", "BO"] },
    { mode: "slide", dirs: ["LO", "RO"] },
  ],
  Shu: [
    { mode: "step", dirs: ["LO", "RO"] },
    { mode: "slide", dirs: ["FO", "BO"] },
  ],
  Kaku: [{ mode: "slide", dirs: ["D"] }],
  Myou: [{ mode: "step", dirs: ["D"] }],
  Hon: [{ mode: "slide", dirs: ["BO", "FD"] }],
  Ga: [{ mode: "step", dirs: ["BO", "FD"] }],
  Zou: [{ mode: "slide", dirs: ["BD", "FO"] }],
  Ken: [{ mode: "step", dirs: ["BD", "FO"] }],
  Ki: [{ mode: "step", dirs: ["D", "JO"] }],
  Hou: [{ mode: "step", dirs: ["O", "JD"] }],
  Ro: [{ mode: "step", dirs: ["LO", "RO", "JFO", "JBO"] }],
  Ja: [{ mode: "step", dirs: ["LO", "RO", "JFO", "JBD"] }],
  Ba: [{ mode: "step", dirs: ["FK", "BK"] }],
  Ryuu: [{ mode: "step", dirs: ["JD"] }],
};

const FACE_VALUES = {
  Gyoku: 0,
  Hi: 80,
  Cho: 30,
  Han: 50,
  Chuu: 15,
  Ou: 55,
  Shu: 55,
  Kaku: 80,
  Myou: 30,
  Hon: 60,
  Ga: 20,
  Zou: 60,
  Ken: 20,
  Ki: 45,
  Hou: 45,
  Ro: 25,
  Ja: 25,
  Ba: 20,
  Ryuu: 20,
};

function resolveDirs(cat, owner) {
  const f = owner === BLACK ? 1 : -1,
    l = owner === BLACK ? -1 : 1;
  const map = {
    FO: [[0, f]],
    BO: [[0, -f]],
    LO: [[l, 0]],
    RO: [[-l, 0]],
    FD: [
      [l, f],
      [-l, f],
    ],
    BD: [
      [l, -f],
      [-l, -f],
    ],
    O: [
      [0, f],
      [0, -f],
      [l, 0],
      [-l, 0],
    ],
    D: [
      [l, f],
      [-l, f],
      [l, -f],
      [-l, -f],
    ],
    JO: [
      [0, 2 * f],
      [0, -2 * f],
      [2 * l, 0],
      [-2 * l, 0],
    ],
    JD: [
      [2 * l, 2 * f],
      [-2 * l, 2 * f],
      [2 * l, -2 * f],
      [-2 * l, -2 * f],
    ],
    JFO: [[0, 2 * f]],
    JBO: [[0, -2 * f]],
    JBD: [
      [2 * l, -2 * f],
      [-2 * l, -2 * f],
    ],
    FK: [
      [l, 2 * f],
      [-l, 2 * f],
    ],
    BK: [
      [l, -2 * f],
      [-l, -2 * f],
    ],
  };
  return map[cat] || [];
}

// === STRINGS (English only) ===
const S = {
  game_title: "麒将棋 Ki Shogi",
  choose_opponent: "Choose opponent:",
  local_2p: "Local 2P",
  ai_battle: "AI Battle",
  tutorial: "Tutorial",
  press_123: "Press 1, 2 or 3  ESC:Back",
  choose_pieces: "Choose pieces:",
  basic_set: "Basic (玉+飛+角)",
  full_set: "Full (玉+飛+角+麒)",
  press_12: "Press 1 or 2  ESC:Back",
  choose_diff: "Difficulty:",
  diff_easy: "Easy (random)",
  diff_medium: "Normal (captures/checks)",
  diff_hard: "Hard (evaluates board)",
  choose_side: "Choose side:",
  play_black: "Play Black (first)",
  play_white: "Play White (second)",
  random: "Random",
  ai_vs_ai: "AI vs AI",
  press_1234: "Press 1, 2, 3 or 4  ESC:Back",
  black: "Black",
  white: "White",
  black_short: "B",
  white_short: "W",
  wins: "Wins!",
  quit_menu: "M:Menu R:Restart",
  black_hand: "B Hand",
  white_hand: "W Hand",
  hand_empty: "(none)",
  place_gyoku: "Place 玉",
  ai_thinking: "AI thinking...",
  your_turn: "'s turn",
  controls_setup: "Arrows/Click:Move Enter/Click:Confirm",
  controls_board: "Arrows/Click:Move Enter/Click:Select D:Drop Tab:Log",
  controls_board2: "T:Theme M:Menu R:Restart",
  select_target: "Select target",
  controls_move: "Arrows/Click:Move Enter/Click:Confirm ESC:Cancel",
  check: "Check!",
  choose_drop: "Choose piece to drop:",
  controls_list: "↑↓/Click:Choose Enter/Click:OK ESC:Cancel",
  choose_face: "Choose face up:",
  choose_drop_pos: "Choose drop position (green):",
  controls_drop: "Arrows/Click:Move Enter/Click:Confirm ESC:Cancel",
  choose_promote: "Choose promotion:",
  controls_promote: "↑↓/Click:Choose Enter/Click:OK",
  hint_flip: "Flip→",
  hint_promote: "Promote→",
  game_start: "Game start!",
  invalid_pos: "Invalid: must be distance 2 from Black 玉",
  no_hand: "No pieces to drop",
  no_moves_check: "Cannot resolve check",
  no_moves: "No legal moves",
  not_yours: "Not your piece",
  empty_sq: "Empty",
  invalid_target: "Invalid target",
  cant_drop: "Cannot drop this piece",
  no_drop_pos: "No legal drop positions",
  invalid_drop: "Invalid drop position",
  place_black_gyoku: "Black places 玉",
  log_title: "Log",
  log_browse_nav: "Browse",
  log_browse_back: "Back",
  draw: "Draw!",
  sennichite: "Sennichite (4-fold repetition)",
  sennichite_warning: "Position repeated 3 times!",
  perpetual_check_lose: "Perpetual check — loses",
  perpetual_check_warning: "Perpetual check — one more and you lose!",
  paused: "Paused",
  space_pause: "Space:Pause/Resume",
  tut_title: "Tutorial",
  tut_prev: "←Prev",
  tut_next: "Next→",
  tut_back: "ESC:Back",
};
function t(k) {
  return S[k] || k;
}

// === MODE ===
const MODE = {
  MENU: "menu",
  SETUP_BLACK_GYOKU: "sbg",
  SETUP_WHITE_GYOKU: "swg",
  BOARD: "board",
  SELECTED: "selected",
  HAND: "hand",
  FACE_SELECT: "face_select",
  DROP_TARGET: "drop_target",
  PROMOTE: "promote",
  GAME_OVER: "game_over",
  DRAW: "draw",
  TUTORIAL: "tutorial",
};

// === PIECE & GAME STATE ===
class Piece {
  constructor(id, owner, cube, face, x = null, y = null) {
    this.id = id;
    this.owner = owner;
    this.cube = cube;
    this.face = face;
    this.x = x;
    this.y = y;
  }
  get onBoard() {
    return this.x !== null;
  }
  get key() {
    return `${this.x},${this.y}`;
  }
}

class GameState {
  constructor() {
    this.pieces = [];
    this.turn = BLACK;
    this.useKi = false;
    this.mode = MODE.MENU;
    this.cursor = { x: 0, y: 0 };
    this.selected = null;
    this.legalMoves = [];
    this.handPieces = [];
    this.handIndex = 0;
    this.dropFaces = [];
    this.faceIndex = 0;
    this.dropTargets = [];
    this.dropIndex = 0;
    this.promoteChoices = [];
    this.promoteHoverIdx = 0;
    this.pendingCapture = null;
    this.pendingMove = null;
    this.message = "";
    this.winner = null;
    this.inCheck = false;
    this.aiSide = null;
    this.aiDifficulty = 2;
    this.menuStep = 1;
    this.tutorialPage = 0;
    this.moveLog = [];
    this.moveNum = 0;
    this.pendingLogInfo = null;
    this.positionHistory = new Map();
    this.paused = false;
    this._wantAI = false;
  }
  startGame(useKi, aiSide) {
    this.useKi = useKi;
    this.aiSide = aiSide || null;
    this._initPieces();
    this.mode = MODE.SETUP_BLACK_GYOKU;
    this.message = t("place_black_gyoku");
  }
  _initPieces() {
    let id = 0;
    for (const owner of [BLACK, WHITE]) {
      this.pieces.push(new Piece(id++, owner, CUBE_GYOKU, "Gyoku"));
      this.pieces.push(new Piece(id++, owner, CUBE_HI, "Hi"));
      this.pieces.push(new Piece(id++, owner, CUBE_KAKU, "Kaku"));
      if (this.useKi) this.pieces.push(new Piece(id++, owner, CUBE_KI, "Ki"));
    }
  }
  buildBoardMap() {
    const m = new Map();
    for (const p of this.pieces) if (p.onBoard) m.set(p.key, p);
    return m;
  }
  getPieceAt(x, y) {
    return this.pieces.find((p) => p.onBoard && p.x === x && p.y === y) || null;
  }
  getGyoku(owner) {
    return this.pieces.find((p) => p.owner === owner && p.cube === CUBE_GYOKU);
  }
  getHandPieces(owner) {
    return this.pieces.filter(
      (p) => p.owner === owner && !p.onBoard && p.cube !== CUBE_GYOKU,
    );
  }
  getBoardPieces(owner) {
    return this.pieces.filter((p) => p.owner === owner && p.onBoard);
  }
  switchTurn() {
    this.turn = this.turn === BLACK ? WHITE : BLACK;
  }
}

// === RULES ===
function chebDist(x1, y1, x2, y2) {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

function getSupportedKi(st) {
  const kiPieces = st.pieces.filter((p) => p.cube === CUBE_KI && p.onBoard);
  if (!kiPieces.length) return [];
  const supported = new Set(),
    queue = [];
  for (const ki of kiPieces) {
    for (const g of st.pieces) {
      if (
        g.cube === CUBE_GYOKU &&
        g.onBoard &&
        chebDist(ki.x, ki.y, g.x, g.y) <= 2
      ) {
        supported.add(ki.id);
        queue.push(ki);
        break;
      }
    }
  }
  while (queue.length) {
    const cur = queue.shift();
    for (const ki of kiPieces) {
      if (!supported.has(ki.id) && chebDist(ki.x, ki.y, cur.x, cur.y) === 1) {
        supported.add(ki.id);
        queue.push(ki);
      }
    }
  }
  return kiPieces.filter((p) => supported.has(p.id));
}

function isAdjacentToAnyGyoku(st, x, y) {
  for (const p of st.pieces)
    if (p.cube === CUBE_GYOKU && p.onBoard && chebDist(x, y, p.x, p.y) === 1)
      return true;
  for (const ki of getSupportedKi(st))
    if (chebDist(x, y, ki.x, ki.y) === 1) return true;
  return false;
}

function isPieceSupported(st, x, y, cube) {
  if (cube === CUBE_KI) {
    for (const p of st.pieces)
      if (p.cube === CUBE_GYOKU && p.onBoard && chebDist(x, y, p.x, p.y) <= 2)
        return true;
    for (const ki of getSupportedKi(st))
      if (chebDist(x, y, ki.x, ki.y) === 1) return true;
    return false;
  }
  return isAdjacentToAnyGyoku(st, x, y);
}

function getMoveVectors(face, owner) {
  const md = MOVES[face];
  if (!md) return [];
  const r = [];
  for (const comp of md)
    for (const cat of comp.dirs)
      for (const [dx, dy] of resolveDirs(cat, owner))
        r.push({ dx, dy, slide: comp.mode === "slide" });
  return r;
}

function getLegalMoves(st, piece) {
  if (!piece.onBoard) return [];
  const bm = st.buildBoardMap(),
    vecs = getMoveVectors(piece.face, piece.owner),
    moves = [];
  const opp = piece.owner === BLACK ? WHITE : BLACK;
  for (const { dx, dy, slide } of vecs) {
    const maxD = slide ? 20 : 1;
    for (let d = 1; d <= maxD; d++) {
      const nx = piece.x + dx * d,
        ny = piece.y + dy * d,
        key = `${nx},${ny}`,
        tgt = bm.get(key);
      if (tgt) {
        if (tgt.owner === opp && wouldBeLegal(st, piece, nx, ny, tgt))
          moves.push({ x: nx, y: ny, capture: tgt });
        break;
      }
      if (wouldBeLegal(st, piece, nx, ny, null))
        moves.push({ x: nx, y: ny, capture: null });
    }
  }
  return moves;
}

function wouldBeLegal(st, piece, tx, ty, cap) {
  const ox = piece.x,
    oy = piece.y,
    of_ = piece.face;
  piece.x = tx;
  piece.y = ty;
  if (cap) {
    cap.x = null;
    cap.y = null;
  } else if (piece.cube !== CUBE_GYOKU && OPPOSITES[piece.face])
    piece.face = OPPOSITES[piece.face];
  let legal = true;
  if (piece.cube === CUBE_GYOKU) {
    const other = st.pieces.find(
      (p) => p.cube === CUBE_GYOKU && p.id !== piece.id && p.onBoard,
    );
    if (other && chebDist(tx, ty, other.x, other.y) !== 2) legal = false;
  }
  if (
    legal &&
    piece.cube !== CUBE_GYOKU &&
    !(cap && (cap.cube === CUBE_GYOKU || cap.cube === CUBE_KI))
  ) {
    if (!isPieceSupported(st, tx, ty, piece.cube)) legal = false;
  }
  if (legal && isInCheck(st, piece.owner)) legal = false;
  piece.x = ox;
  piece.y = oy;
  piece.face = of_;
  if (cap) {
    cap.x = tx;
    cap.y = ty;
  }
  return legal;
}

function isInCheck(st, owner) {
  const g = st.getGyoku(owner);
  if (!g || !g.onBoard) return false;
  const opp = owner === BLACK ? WHITE : BLACK;
  for (const p of st.pieces) {
    if (p.owner !== opp || !p.onBoard) continue;
    const vecs = getMoveVectors(p.face, p.owner),
      bm = st.buildBoardMap();
    for (const { dx, dy, slide } of vecs) {
      const maxD = slide ? 20 : 1;
      for (let d = 1; d <= maxD; d++) {
        const nx = p.x + dx * d,
          ny = p.y + dy * d;
        if (nx === g.x && ny === g.y) return true;
        if (bm.has(`${nx},${ny}`)) break;
      }
    }
  }
  return false;
}

function getLegalDrops(st, owner, face) {
  const g = st.getGyoku(owner);
  if (!g || !g.onBoard) return [];
  const opp = owner === BLACK ? WHITE : BLACK,
    og = st.getGyoku(opp),
    drops = [];
  const isKi = FACE_CUBE[face] === CUBE_KI,
    range = isKi ? 2 : 1;
  for (let dx = -range; dx <= range; dx++)
    for (let dy = -range; dy <= range; dy++) {
      if (!dx && !dy) continue;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > range) continue;
      const nx = g.x + dx,
        ny = g.y + dy;
      if (st.getPieceAt(nx, ny)) continue;
      if (og && og.onBoard && chebDist(nx, ny, og.x, og.y) <= 1) continue;
      if (wouldDropCauseCheck(st, owner, face, nx, ny)) continue;
      const tmp = {
        owner,
        face,
        onBoard: true,
        x: nx,
        y: ny,
        cube: FACE_CUBE[face] || "tmp",
        id: -2,
        key: `${nx},${ny}`,
      };
      st.pieces.push(tmp);
      const still = isInCheck(st, owner);
      st.pieces.pop();
      if (!still) drops.push({ x: nx, y: ny });
    }
  return drops;
}

function wouldDropCauseCheck(st, owner, face, x, y) {
  const opp = owner === BLACK ? WHITE : BLACK;
  if (isInCheck(st, opp)) return false;
  const tmp = {
    owner,
    face,
    onBoard: true,
    x,
    y,
    cube: "tmp",
    id: -1,
    key: `${x},${y}`,
  };
  st.pieces.push(tmp);
  const chk = isInCheck(st, opp);
  st.pieces.pop();
  return chk;
}

function handleStranding(st) {
  const captured = [];
  for (const p of st.pieces) {
    if (!p.onBoard || p.cube === CUBE_GYOKU || p.owner !== st.turn) continue;
    if (!isPieceSupported(st, p.x, p.y, p.cube)) captured.push(p);
  }
  const opp = st.turn === BLACK ? WHITE : BLACK;
  for (const p of captured) {
    const captor = p.owner === st.turn ? opp : st.turn;
    p.x = null;
    p.y = null;
    p.owner = captor;
    const defaults = { hi: "Hi", kaku: "Kaku", ki: "Ki" };
    if (defaults[p.cube]) p.face = defaults[p.cube];
  }
  return captured;
}

function hasLegalAction(st, owner) {
  for (const p of st.pieces)
    if (p.owner === owner && p.onBoard && getLegalMoves(st, p).length > 0)
      return true;
  for (const p of st.getHandPieces(owner)) {
    const faces = p.cube === CUBE_GYOKU ? ["Gyoku"] : CUBE_FACES[p.cube];
    if (faces)
      for (const f of faces)
        if (getLegalDrops(st, owner, f).length > 0) return true;
  }
  return false;
}

function getWhiteGyokuPositions(st) {
  const bg = st.getGyoku(BLACK);
  if (!bg || !bg.onBoard) return [];
  const pos = [];
  for (let dx = -2; dx <= 2; dx++)
    for (let dy = -2; dy <= 2; dy++)
      if (Math.max(Math.abs(dx), Math.abs(dy)) === 2)
        pos.push({ x: bg.x + dx, y: bg.y + dy });
  return pos;
}

// === AI ===
const state = new GameState();
function isAI(owner) {
  return state.aiSide === "both" || state.aiSide === owner;
}
function fk(face) {
  return FACE_INFO[face] ? FACE_INFO[face][0] : face;
}

function positionHash(st) {
  const bg = st.getGyoku(BLACK),
    ox = bg.x,
    oy = bg.y;
  const board = st.pieces
    .filter((p) => p.onBoard)
    .map((p) => `${p.x - ox},${p.y - oy},${p.owner},${p.face}`)
    .sort()
    .join(";");
  const hand = st.pieces
    .filter((p) => !p.onBoard)
    .map((p) => `${p.owner},${p.cube},${p.face}`)
    .sort()
    .join(";");
  return `${st.turn}|${board}|${hand}`;
}

function logMove(owner, text, face, from, to) {
  state.moveNum++;
  const snapshot = state.pieces.map((p) => ({
    id: p.id,
    owner: p.owner,
    cube: p.cube,
    face: p.face,
    x: p.x,
    y: p.y,
  }));
  state.moveLog.push({
    num: state.moveNum,
    owner,
    text,
    snapshot,
    face: face || null,
    from: from || null,
    to: to || null,
  });
  logScrollOffset = 0;
}

function evaluate(st, aiOwner) {
  const opp = aiOwner === BLACK ? WHITE : BLACK;
  let score = 0;
  for (const p of st.pieces) {
    if (p.cube === CUBE_GYOKU) continue;
    const val = FACE_VALUES[p.face] || 0,
      sign = p.owner === aiOwner ? 1 : -1;
    if (p.onBoard && !isPieceSupported(st, p.x, p.y, p.cube))
      score -= sign * (val + 20);
    else score += sign * (val + (p.onBoard ? 10 : 0));
  }
  const oppG = st.getGyoku(opp);
  if (oppG && oppG.onBoard) {
    for (const p of st.pieces)
      if (p.owner === aiOwner && p.onBoard && p.cube !== CUBE_GYOKU)
        score += Math.max(0, 5 - chebDist(p.x, p.y, oppG.x, oppG.y));
  }
  if (isInCheck(st, opp)) score += 30;
  if (isInCheck(st, aiOwner)) score -= 30;
  return score;
}

function getAllActions(st, owner) {
  const actions = [];
  for (const p of st.pieces) {
    if (p.owner === owner && p.onBoard) {
      for (const m of getLegalMoves(st, p)) {
        if (m.capture && p.cube !== CUBE_GYOKU && PROMOTIONS[p.face]) {
          for (const pf of PROMOTIONS[p.face])
            actions.push({
              type: "move",
              piece: p,
              move: m,
              promoteTo: pf,
            });
        } else
          actions.push({
            type: "move",
            piece: p,
            move: m,
            promoteTo: null,
          });
      }
    }
  }
  for (const p of st.getHandPieces(owner)) {
    const faces = CUBE_FACES[p.cube];
    if (!faces) continue;
    for (const face of faces)
      for (const d of getLegalDrops(st, owner, face))
        actions.push({ type: "drop", piece: p, face, pos: d });
  }
  return actions;
}

function applyAction(st, action) {
  const p = action.piece,
    undo = { px: p.x, py: p.y, pface: p.face };
  if (action.type === "move") {
    const m = action.move;
    if (m.capture) {
      const c = m.capture;
      undo.cx = c.x;
      undo.cy = c.y;
      undo.cowner = c.owner;
      undo.cface = c.face;
      c.x = null;
      c.y = null;
      c.owner = p.owner;
      p.x = m.x;
      p.y = m.y;
      if (action.promoteTo) p.face = action.promoteTo;
    } else {
      p.x = m.x;
      p.y = m.y;
      if (p.cube !== CUBE_GYOKU && OPPOSITES[p.face])
        p.face = OPPOSITES[p.face];
    }
  } else {
    p.face = action.face;
    p.x = action.pos.x;
    p.y = action.pos.y;
  }
  return undo;
}

function undoAction(st, action, undo) {
  const p = action.piece;
  p.x = undo.px;
  p.y = undo.py;
  p.face = undo.pface;
  if (action.type === "move" && action.move.capture) {
    const c = action.move.capture;
    c.x = undo.cx;
    c.y = undo.cy;
    c.owner = undo.cowner;
    c.face = undo.cface;
  }
}

function moveOrderScore(a) {
  if (a.type !== "move") return 0;
  if (a.move.capture) {
    if (a.move.capture.cube === CUBE_GYOKU) return 10000;
    return 100 + (FACE_VALUES[a.move.capture.face] || 0);
  }
  return 0;
}

function minimax(st, depth, alpha, beta, isMax, aiOwner) {
  if (depth === 0) return evaluate(st, aiOwner);
  const cur = isMax ? aiOwner : aiOwner === BLACK ? WHITE : BLACK;
  const actions = getAllActions(st, cur);
  if (!actions.length) return isMax ? -9999 : 9999;
  actions.sort((a, b) => moveOrderScore(b) - moveOrderScore(a));
  if (isMax) {
    let best = -Infinity;
    for (const action of actions) {
      if (
        action.type === "move" &&
        action.move.capture &&
        action.move.capture.cube === CUBE_GYOKU
      )
        return 9999;
      const u = applyAction(st, action);
      const val = minimax(st, depth - 1, alpha, beta, false, aiOwner);
      undoAction(st, action, u);
      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const action of actions) {
      if (
        action.type === "move" &&
        action.move.capture &&
        action.move.capture.cube === CUBE_GYOKU
      )
        return -9999;
      const u = applyAction(st, action);
      const val = minimax(st, depth - 1, alpha, beta, true, aiOwner);
      undoAction(st, action, u);
      best = Math.min(best, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function aiRepetitionPenalty(action, owner) {
  const opp = owner === BLACK ? WHITE : BLACK;
  const u = applyAction(state, action);
  const origTurn = state.turn;
  state.turn = opp;
  const hash = positionHash(state),
    wouldCheck = isInCheck(state, opp);
  state.turn = origTurn;
  undoAction(state, action, u);
  const hist = state.positionHistory.get(hash);
  if (!hist || !hist.length) return 0;
  if (hist.length >= 3 && hist.every((h) => h.inCheck) && wouldCheck)
    return -5000;
  if (hist.length >= 2 && hist.every((h) => h.inCheck) && wouldCheck)
    return -3000;
  if (hist.length >= 1 && hist.every((h) => h.inCheck) && wouldCheck)
    return -800;
  const ev = evaluate(state, owner);
  if (hist.length >= 3) return ev > 0 ? -2000 : 2000;
  if (hist.length >= 2) return ev > 0 ? -500 : 500;
  return ev > 0 ? -50 : 30;
}

function scoreActions(actions, owner, opp) {
  const oppG = state.getGyoku(opp);
  for (const a of actions) {
    if (a.type === "move") {
      const m = a.move;
      if (m.capture && m.capture.cube === CUBE_GYOKU) a.score = 1000;
      else if (m.capture) a.score = 100 + (FACE_VALUES[m.capture.face] || 0);
      else {
        const p = a.piece,
          ox = p.x,
          oy = p.y,
          of_ = p.face;
        p.x = m.x;
        p.y = m.y;
        if (p.cube !== CUBE_GYOKU && OPPOSITES[p.face])
          p.face = OPPOSITES[p.face];
        if (isInCheck(state, opp)) a.score = 50;
        p.x = ox;
        p.y = oy;
        p.face = of_;
      }
      if (oppG && oppG.onBoard)
        a.score += Math.max(0, 5 - chebDist(m.x, m.y, oppG.x, oppG.y));
    } else {
      a.score = 10 + (FACE_VALUES[a.face] || 0) / 10;
      if (oppG && oppG.onBoard)
        a.score += Math.max(0, 4 - chebDist(a.pos.x, a.pos.y, oppG.x, oppG.y));
    }
  }
}

// === GAME LOGIC ===
function endTurn() {
  handleStranding(state);
  const lastLog = state.moveLog[state.moveLog.length - 1];
  if (lastLog)
    lastLog.snapshot = state.pieces.map((p) => ({
      id: p.id,
      owner: p.owner,
      cube: p.cube,
      face: p.face,
      x: p.x,
      y: p.y,
    }));
  state.switchTurn();
  state.message = "";
  if (!hasLegalAction(state, state.turn)) {
    state.winner = state.turn === BLACK ? WHITE : BLACK;
    state.mode = MODE.GAME_OVER;
    redraw();
    return;
  }
  state.inCheck = isInCheck(state, state.turn);
  const hash = positionHash(state);
  if (!state.positionHistory.has(hash)) state.positionHistory.set(hash, []);
  const hist = state.positionHistory.get(hash);
  hist.push({ inCheck: state.inCheck });
  if (hist.length === 3)
    state.message = hist.every((h) => h.inCheck)
      ? t("perpetual_check_warning")
      : t("sennichite_warning");
  if (hist.length >= 4) {
    if (hist.every((h) => h.inCheck)) {
      state.winner = state.turn;
      state.mode = MODE.GAME_OVER;
      state.message = t("perpetual_check_lose");
      redraw();
      return;
    }
    state.mode = MODE.DRAW;
    state.message = t("sennichite");
    redraw();
    return;
  }
  state.mode = MODE.BOARD;
  state.selected = null;
  state.legalMoves = [];
  const g = state.getGyoku(state.turn);
  if (g && g.onBoard) {
    state.cursor.x = g.x;
    state.cursor.y = g.y;
  }
  redraw();
  if (isAI(state.turn) && !state.paused) setTimeout(aiMove, 300);
}

function executeMove(piece, move, promoteTo) {
  const ox = piece.x,
    oy = piece.y,
    of_ = piece.face;
  const mFrom = { x: ox, y: oy },
    mTo = { x: move.x, y: move.y };
  if (move.capture) {
    const cap = move.capture;
    if (cap.cube === CUBE_GYOKU) {
      piece.x = move.x;
      piece.y = move.y;
      cap.x = null;
      cap.y = null;
      logMove(
        piece.owner,
        `${fk(of_)}(${ox},${oy})×${fk("Gyoku")}(${move.x},${move.y})`,
        of_,
        mFrom,
        mTo,
      );
      state.winner = piece.owner;
      state.mode = MODE.GAME_OVER;
      state.selected = null;
      state.legalMoves = [];
      redraw();
      return;
    }
    cap.x = null;
    cap.y = null;
    cap.owner = piece.owner;
    piece.x = move.x;
    piece.y = move.y;
    const capBase = `${fk(of_)}(${ox},${oy})×${fk(cap.face)}(${move.x},${move.y})`;
    if (piece.cube !== CUBE_GYOKU && PROMOTIONS[piece.face]) {
      const choices = PROMOTIONS[piece.face];
      if (choices.length === 1) {
        piece.face = choices[0];
        logMove(piece.owner, `${capBase}→${fk(choices[0])}`, of_, mFrom, mTo);
        state.selected = null;
        state.legalMoves = [];
        endTurn();
      } else if (promoteTo) {
        piece.face = promoteTo;
        logMove(piece.owner, `${capBase}→${fk(promoteTo)}`, of_, mFrom, mTo);
        state.selected = null;
        state.legalMoves = [];
        endTurn();
      } else if (isAI(piece.owner)) {
        piece.face = choices.reduce((a, b) =>
          (FACE_VALUES[a] || 0) >= (FACE_VALUES[b] || 0) ? a : b,
        );
        logMove(piece.owner, `${capBase}→${fk(piece.face)}`, of_, mFrom, mTo);
        state.selected = null;
        state.legalMoves = [];
        endTurn();
      } else {
        state.promoteChoices = choices;
        state.promoteHoverIdx = -1;
        state.pendingCapture = cap;
        state.pendingLogInfo = {
          owner: piece.owner,
          capBase,
          face: of_,
          from: mFrom,
          to: mTo,
        };
        state.mode = MODE.PROMOTE;
        redraw();
      }
    } else {
      logMove(piece.owner, capBase, of_, mFrom, mTo);
      state.selected = null;
      state.legalMoves = [];
      endTurn();
    }
  } else {
    piece.x = move.x;
    piece.y = move.y;
    if (piece.cube !== CUBE_GYOKU && OPPOSITES[piece.face])
      piece.face = OPPOSITES[piece.face];
    const flipped = piece.face !== of_ ? `=${fk(piece.face)}` : "";
    logMove(
      piece.owner,
      `${fk(of_)}(${ox},${oy})→(${move.x},${move.y})${flipped}`,
      of_,
      mFrom,
      mTo,
    );
    state.selected = null;
    state.legalMoves = [];
    endTurn();
  }
}

// === INPUT HANDLERS ===
function onMenu(key) {
  menuHoverIdx = -1;
  if (key === "Escape" && state.menuStep > 1) {
    state.menuStep--;
    if (state.menuStep === 2 && !state._wantAI) state.menuStep = 1;
    redraw();
    return;
  }
  if (state.menuStep === 1) {
    if (key === "1") state._wantAI = false;
    else if (key === "2") state._wantAI = true;
    else if (key === "3") {
      state.tutorialPage = 0;
      state.mode = MODE.TUTORIAL;
      redraw();
      return;
    } else return;
    state.menuStep = 2;
  } else if (state.menuStep === 2) {
    if (key === "1") state.useKi = false;
    else if (key === "2") state.useKi = true;
    else return;
    if (state._wantAI) state.menuStep = 3;
    else state.startGame(state.useKi, null);
  } else if (state.menuStep === 3) {
    if (key === "1") state.aiDifficulty = 1;
    else if (key === "2") state.aiDifficulty = 2;
    else if (key === "3") state.aiDifficulty = 3;
    else return;
    state.menuStep = 4;
  } else if (state.menuStep === 4) {
    let aiSide;
    if (key === "1") aiSide = WHITE;
    else if (key === "2") aiSide = BLACK;
    else if (key === "3") aiSide = Math.random() < 0.5 ? BLACK : WHITE;
    else if (key === "4") aiSide = "both";
    else return;
    state.startGame(state.useKi, aiSide);
    if (isAI(BLACK)) setTimeout(aiSetupBlackGyoku, 300);
  }
  redraw();
}

function onTutorial(key) {
  if (key === "Escape") {
    state.mode = MODE.MENU;
    state.menuStep = 1;
  } else if (key === "ArrowRight" && state.tutorialPage < 6)
    state.tutorialPage++;
  else if (key === "ArrowLeft" && state.tutorialPage > 0) state.tutorialPage--;
  redraw();
}

function onSetupBlackGyoku(key) {
  if (key === "ArrowUp") state.cursor.y++;
  else if (key === "ArrowDown") state.cursor.y--;
  else if (key === "ArrowLeft") state.cursor.x--;
  else if (key === "ArrowRight") state.cursor.x++;
  else if (key === "Enter") {
    const g = state.getGyoku(BLACK);
    g.x = state.cursor.x;
    g.y = state.cursor.y;
    g.face = "Gyoku";
    logMove(BLACK, `${fk("Gyoku")}↓(${g.x},${g.y})`, "Gyoku", null, {
      x: g.x,
      y: g.y,
    });
    state.mode = MODE.SETUP_WHITE_GYOKU;
    const positions = getWhiteGyokuPositions(state);
    if (positions.length > 0) {
      const best = positions.reduce((a, b) =>
        b.y > a.y || (b.y === a.y && Math.abs(b.x) < Math.abs(a.x)) ? b : a,
      );
      state.cursor.x = best.x;
      state.cursor.y = best.y;
      state.legalMoves = positions;
    }
    state.turn = WHITE;
    state.message = "";
    if (isAI(WHITE)) setTimeout(aiSetupWhiteGyoku, 300);
  }
  redraw();
}

function onSetupWhiteGyoku(key) {
  const positions = getWhiteGyokuPositions(state);
  const posSet = new Set(positions.map((p) => `${p.x},${p.y}`));
  if (key === "ArrowUp") state.cursor.y++;
  else if (key === "ArrowDown") state.cursor.y--;
  else if (key === "ArrowLeft") state.cursor.x--;
  else if (key === "ArrowRight") state.cursor.x++;
  else if (key === "Enter") {
    if (posSet.has(`${state.cursor.x},${state.cursor.y}`)) {
      const g = state.getGyoku(WHITE);
      g.x = state.cursor.x;
      g.y = state.cursor.y;
      g.face = "Gyoku";
      logMove(WHITE, `${fk("Gyoku")}↓(${g.x},${g.y})`, "Gyoku", null, {
        x: g.x,
        y: g.y,
      });
      state.legalMoves = [];
      state.turn = BLACK;
      state.mode = MODE.BOARD;
      const bg = state.getGyoku(BLACK);
      state.cursor.x = bg.x;
      state.cursor.y = bg.y;
      state.message = t("game_start");
      if (isAI(BLACK)) setTimeout(aiMove, 300);
    } else state.message = t("invalid_pos");
  }
  redraw();
}

function onBoard(key) {
  // Log focused: up/down navigate, Escape/Tab exits
  if (logFocused) {
    if (key === "ArrowUp") logFocusIdx = Math.max(0, logFocusIdx - 1);
    else if (key === "ArrowDown")
      logFocusIdx = Math.min(state.moveLog.length - 1, logFocusIdx + 1);
    else if (key === "Escape") {
      logFocused = false;
      logFocusIdx = -1;
    } else if (key === "Tab") {
      logFocused = false;
      logFocusIdx = -1;
    }
    // Auto-scroll to keep focused entry visible
    if (logFocusIdx >= 0) {
      const maxVis = 10;
      const total = state.moveLog.length;
      const maxOff = Math.max(0, total - maxVis);
      const visStart = maxOff - logScrollOffset;
      const visEnd = visStart + maxVis - 1;
      if (logFocusIdx < visStart) logScrollOffset = maxOff - logFocusIdx;
      else if (logFocusIdx > visEnd)
        logScrollOffset = maxOff - (logFocusIdx - maxVis + 1);
      logScrollOffset = Math.max(0, Math.min(logScrollOffset, maxOff));
    }
    redraw();
    return;
  }
  // Cell popup open: Escape closes it
  if (cellPopup) {
    if (key === "Escape") {
      closeCellPopup();
    }
    redraw();
    return;
  }
  // Popup open: left/right cycle pieces, Escape closes
  if (hoverHandIdx >= 0) {
    if (key === "Escape") {
      hoverHandIdx = -1;
      hoverPopupIdx = -1;
    } else if (key === "ArrowLeft" || key === "ArrowRight") {
      const hand = state.getHandPieces(state.turn);
      if (hand.length) {
        if (key === "ArrowRight")
          hoverHandIdx = (hoverHandIdx + 1) % hand.length;
        else hoverHandIdx = (hoverHandIdx - 1 + hand.length) % hand.length;
        hoverPopupIdx = -1;
      }
    } else if (key === "ArrowUp" || key === "ArrowDown") {
      const hand = state.getHandPieces(state.turn);
      const p = hand[hoverHandIdx];
      const faces = p ? CUBE_FACES[p.cube] : null;
      if (faces && faces.length) {
        if (hoverPopupIdx < 0)
          hoverPopupIdx = key === "ArrowDown" ? 0 : faces.length - 1;
        else if (key === "ArrowDown")
          hoverPopupIdx = Math.min(hoverPopupIdx + 1, faces.length - 1);
        else hoverPopupIdx = Math.max(hoverPopupIdx - 1, 0);
      }
    } else if (key === "Enter" && hoverPopupIdx >= 0) {
      const hand = state.getHandPieces(state.turn);
      const p = hand[hoverHandIdx];
      const faces = p ? CUBE_FACES[p.cube] : null;
      if (faces && hoverPopupIdx < faces.length) {
        const face = faces[hoverPopupIdx];
        const drops = getLegalDrops(state, p.owner, face);
        if (!drops.length) {
          state.message = t("no_drop_pos");
          redraw();
          return;
        }
        p.face = face;
        state.selected = state.pieces.indexOf(p);
        state.dropFaces = faces;
        state.faceIndex = hoverPopupIdx;
        state.dropTargets = drops;
        state.mode = MODE.DROP_TARGET;
        state.message = t("choose_drop_pos");
        hoverHandIdx = -1;
        hoverPopupIdx = -1;
      }
    } else if (key === "d" || key === "D") {
      hoverHandIdx = -1;
      hoverPopupIdx = -1;
    }
    redraw();
    return;
  }
  if (key === "ArrowUp") state.cursor.y++;
  else if (key === "ArrowDown") state.cursor.y--;
  else if (key === "ArrowLeft") state.cursor.x--;
  else if (key === "ArrowRight") state.cursor.x++;
  else if (key === "Tab") {
    if (logFocused) {
      logFocused = false;
      logFocusIdx = -1;
    } else if (state.moveLog.length > 0) {
      logFocused = true;
      logFocusIdx = state.moveLog.length - 1;
      logHoverIdx = -1;
    }
  } else if (key === "d" || key === "D") {
    const hand = state.getHandPieces(state.turn);
    if (!hand.length) {
      state.message = t("no_hand");
      redraw();
      return;
    }
    hoverHandIdx = 0;
    hoverPopupIdx = -1;
  } else if (key === "Enter") {
    const piece = state.getPieceAt(state.cursor.x, state.cursor.y);
    if (piece && piece.owner === state.turn) {
      const moves = getLegalMoves(state, piece);
      if (!moves.length) {
        state.message = isInCheck(state, state.turn)
          ? t("no_moves_check")
          : t("no_moves");
        redraw();
        return;
      }
      state.selected = state.pieces.indexOf(piece);
      state.legalMoves = moves;
      state.mode = MODE.SELECTED;
    } else state.message = piece ? t("not_yours") : t("empty_sq");
  }
  redraw();
}

function openCellPopup(gx, gy, hand) {
  // For each hand piece, find which faces can legally drop at (gx,gy)
  const cubes = [];
  const seen = new Set();
  for (const p of hand) {
    if (seen.has(p.cube)) continue;
    seen.add(p.cube);
    const faces = CUBE_FACES[p.cube];
    if (!faces) continue;
    const validFaces = faces.filter((f) => {
      const drops = getLegalDrops(state, state.turn, f);
      return drops.some((d) => d.x === gx && d.y === gy);
    });
    if (validFaces.length) cubes.push({ piece: p, faces: validFaces });
  }
  if (!cubes.length) {
    state.cursor.x = gx;
    state.cursor.y = gy;
    redraw();
    return;
  }
  cellPopup = { gx, gy, cubes };
  cellPopupHover = -1;
  cellPopupFaceHover = -1;
  hoverHandIdx = -1;
  hoverPopupIdx = -1;
  redraw();
}

function closeCellPopup() {
  cellPopup = null;
  cellPopupHover = -1;
  cellPopupFaceHover = -1;
  cellPopupZone = null;
  cellFaceZone = null;
  redraw();
}

function onSelected(key) {
  if (key === "Escape") {
    state.selected = null;
    state.legalMoves = [];
    state.mode = MODE.BOARD;
    state.message = "";
    redraw();
    return;
  }
  if (key === "ArrowUp") state.cursor.y++;
  else if (key === "ArrowDown") state.cursor.y--;
  else if (key === "ArrowLeft") state.cursor.x--;
  else if (key === "ArrowRight") state.cursor.x++;
  else if (key === "Enter") {
    const move = state.legalMoves.find(
      (m) => m.x === state.cursor.x && m.y === state.cursor.y,
    );
    if (!move) {
      state.message = t("invalid_target");
      redraw();
      return;
    }
    executeMove(state.pieces[state.selected], move);
    return;
  }
  redraw();
}

function onHand(key) {
  if (key === "Escape") {
    state.mode = MODE.BOARD;
    state.message = "";
    redraw();
    return;
  }
  if (key === "ArrowUp") state.handIndex = Math.max(0, state.handIndex - 1);
  else if (key === "ArrowDown")
    state.handIndex = Math.min(
      state.handPieces.length - 1,
      state.handIndex + 1,
    );
  else if (key === "Enter") {
    const piece = state.handPieces[state.handIndex];
    const faces = CUBE_FACES[piece.cube];
    if (!faces) {
      state.message = t("cant_drop");
      redraw();
      return;
    }
    state.dropFaces = faces;
    state.faceIndex = 0;
    state.selected = state.pieces.indexOf(piece);
    state.mode = MODE.FACE_SELECT;
  }
  redraw();
}

function onFaceSelect(key) {
  if (key === "Escape") {
    state.mode = MODE.HAND;
    state.message = "";
    redraw();
    return;
  }
  if (key === "ArrowUp") state.faceIndex = Math.max(0, state.faceIndex - 1);
  else if (key === "ArrowDown")
    state.faceIndex = Math.min(state.dropFaces.length - 1, state.faceIndex + 1);
  else if (key === "Enter") {
    const face = state.dropFaces[state.faceIndex];
    const drops = getLegalDrops(state, state.turn, face);
    if (!drops.length) {
      state.message = t("no_drop_pos");
      redraw();
      return;
    }
    state.pieces[state.selected].face = face;
    state.dropTargets = drops;
    state.mode = MODE.DROP_TARGET;
    state.cursor.x = drops[0].x;
    state.cursor.y = drops[0].y;
  }
  redraw();
}

function onDropTarget(key) {
  if (key === "Escape") {
    const piece = state.pieces[state.selected];
    const hand = state.getHandPieces(state.turn);
    const hi = hand.indexOf(piece);
    state.dropTargets = [];
    state.selected = null;
    state.mode = MODE.BOARD;
    state.message = "";
    hoverHandIdx = hi >= 0 ? hi : 0;
    hoverPopupIdx = -1;
    redraw();
    return;
  }
  if (key === "ArrowUp") state.cursor.y++;
  else if (key === "ArrowDown") state.cursor.y--;
  else if (key === "ArrowLeft") state.cursor.x--;
  else if (key === "ArrowRight") state.cursor.x++;
  else if (key === "Enter") {
    const drop = state.dropTargets.find(
      (d) => d.x === state.cursor.x && d.y === state.cursor.y,
    );
    if (!drop) {
      state.message = t("invalid_drop");
      redraw();
      return;
    }
    const piece = state.pieces[state.selected];
    piece.x = drop.x;
    piece.y = drop.y;
    logMove(
      piece.owner,
      `${fk(piece.face)}↓(${drop.x},${drop.y})`,
      piece.face,
      null,
      { x: drop.x, y: drop.y },
    );
    state.selected = null;
    state.dropTargets = [];
    endTurn();
    return;
  }
  redraw();
}

function onPromote(key) {
  if (key === "ArrowUp")
    state.promoteHoverIdx = Math.max(0, state.promoteHoverIdx - 1);
  else if (key === "ArrowDown")
    state.promoteHoverIdx = Math.min(
      state.promoteChoices.length - 1,
      state.promoteHoverIdx + 1,
    );
  else if (key === "Enter") {
    const piece = state.pieces[state.selected];
    piece.face = state.promoteChoices[state.promoteHoverIdx];
    if (state.pendingLogInfo) {
      logMove(
        state.pendingLogInfo.owner,
        `${state.pendingLogInfo.capBase}→${fk(piece.face)}`,
        state.pendingLogInfo.face,
        state.pendingLogInfo.from,
        state.pendingLogInfo.to,
      );
      state.pendingLogInfo = null;
    }
    state.selected = null;
    state.legalMoves = [];
    state.promoteChoices = [];
    endTurn();
    return;
  }
  redraw();
}

// === AI MOVE ===
function aiSetupBlackGyoku() {
  const g = state.getGyoku(BLACK);
  g.x = 0;
  g.y = 0;
  g.face = "Gyoku";
  logMove(BLACK, `${fk("Gyoku")}↓(0,0)`, "Gyoku", null, { x: 0, y: 0 });
  state.mode = MODE.SETUP_WHITE_GYOKU;
  const positions = getWhiteGyokuPositions(state);
  if (positions.length > 0) {
    const best = positions.reduce((a, b) =>
      b.y > a.y || (b.y === a.y && Math.abs(b.x) < Math.abs(a.x)) ? b : a,
    );
    state.cursor.x = best.x;
    state.cursor.y = best.y;
    state.legalMoves = positions;
  }
  state.turn = WHITE;
  state.message = "";
  redraw();
  if (isAI(WHITE)) setTimeout(aiSetupWhiteGyoku, 300);
}

function aiSetupWhiteGyoku() {
  const positions = getWhiteGyokuPositions(state);
  const pick = positions[Math.floor(Math.random() * positions.length)];
  const g = state.getGyoku(WHITE);
  g.x = pick.x;
  g.y = pick.y;
  g.face = "Gyoku";
  logMove(WHITE, `${fk("Gyoku")}↓(${pick.x},${pick.y})`, "Gyoku", null, {
    x: pick.x,
    y: pick.y,
  });
  state.legalMoves = [];
  state.turn = BLACK;
  state.mode = MODE.BOARD;
  const bg = state.getGyoku(BLACK);
  state.cursor.x = bg.x;
  state.cursor.y = bg.y;
  state.message = t("game_start");
  redraw();
  if (isAI(BLACK)) setTimeout(aiMove, 300);
}

function aiMove() {
  const owner = state.turn,
    opp = owner === BLACK ? WHITE : BLACK;
  const actions = getAllActions(state, owner);
  if (!actions.length) return;
  if (state.aiDifficulty === 1) {
    const safe = actions.filter((a) => aiRepetitionPenalty(a, owner) > -5000);
    const pool = safe.length > 0 ? safe : actions;
    return aiExecute(pool[Math.floor(Math.random() * pool.length)]);
  }
  if (state.aiDifficulty === 3) {
    let bestScore = -Infinity,
      bestActions = [];
    for (const action of actions) {
      if (
        action.type === "move" &&
        action.move.capture &&
        action.move.capture.cube === CUBE_GYOKU
      ) {
        bestActions = [action];
        break;
      }
      const u = applyAction(state, action);
      const score =
        minimax(state, 1, -Infinity, Infinity, false, owner) +
        aiRepetitionPenalty(action, owner);
      undoAction(state, action, u);
      if (score > bestScore) {
        bestScore = score;
        bestActions = [action];
      } else if (score === bestScore) bestActions.push(action);
    }
    return aiExecute(
      bestActions[Math.floor(Math.random() * bestActions.length)],
    );
  }
  for (const a of actions) a.score = aiRepetitionPenalty(a, owner);
  scoreActions(actions, owner, opp);
  const maxS = Math.max(...actions.map((a) => a.score));
  const best = actions.filter((a) => a.score === maxS);
  aiExecute(best[Math.floor(Math.random() * best.length)]);
}

function aiExecute(chosen) {
  if (chosen.type === "move") {
    state.selected = state.pieces.indexOf(chosen.piece);
    executeMove(chosen.piece, chosen.move, chosen.promoteTo);
  } else {
    chosen.piece.face = chosen.face;
    chosen.piece.x = chosen.pos.x;
    chosen.piece.y = chosen.pos.y;
    logMove(
      chosen.piece.owner,
      `${fk(chosen.face)}↓(${chosen.pos.x},${chosen.pos.y})`,
      chosen.face,
      null,
      { x: chosen.pos.x, y: chosen.pos.y },
    );
    state.selected = null;
    state.dropTargets = [];
    endTurn();
  }
}

// === KEY DISPATCH ===
function handleKey(key) {
  if (key === "r" || key === "R") {
    if (state.mode !== MODE.MENU) {
      logFocused = false;
      logFocusIdx = -1;
      logHoverIdx = -1;
      logScrollOffset = 0;
      const useKi = state.useKi,
        aiSide = state.aiSide,
        aiDiff = state.aiDifficulty;
      Object.assign(state, new GameState());
      state.startGame(useKi, aiSide);
      state.aiDifficulty = aiDiff;
      redraw();
      if (isAI(BLACK)) setTimeout(aiSetupBlackGyoku, 300);
      return;
    }
  }
  if (key === "m" || key === "M") {
    if (state.mode !== MODE.MENU) {
      logFocused = false;
      logFocusIdx = -1;
      logHoverIdx = -1;
      logScrollOffset = 0;
      Object.assign(state, new GameState());
      redraw();
      return;
    }
  }
  if (key === "t" || key === "T") {
    darkMode = !darkMode;
    applyTheme();
    redraw();
    return;
  }
  // During AI turn: allow cursor, Tab, Space, block the rest
  if (state.aiSide && isAI(state.turn) && state.mode === MODE.BOARD) {
    if (key === " ") {
      state.paused = !state.paused;
      if (!state.paused) setTimeout(aiMove, 300);
      redraw();
      return;
    }
    if (key === "ArrowUp") {
      state.cursor.y++;
      redraw();
      return;
    }
    if (key === "ArrowDown") {
      state.cursor.y--;
      redraw();
      return;
    }
    if (key === "ArrowLeft") {
      state.cursor.x--;
      redraw();
      return;
    }
    if (key === "ArrowRight") {
      state.cursor.x++;
      redraw();
      return;
    }
    if (key === "Tab") {
      if (logFocused) {
        logFocused = false;
        logFocusIdx = -1;
        redraw();
      } else if (state.moveLog.length > 0) {
        logFocused = true;
        logFocusIdx = state.moveLog.length - 1;
        logHoverIdx = -1;
        redraw();
      }
      return;
    }
    return;
  }
  switch (state.mode) {
    case MODE.MENU:
      return onMenu(key);
    case MODE.SETUP_BLACK_GYOKU:
      return onSetupBlackGyoku(key);
    case MODE.SETUP_WHITE_GYOKU:
      return onSetupWhiteGyoku(key);
    case MODE.BOARD:
      return onBoard(key);
    case MODE.SELECTED:
      return onSelected(key);
    case MODE.HAND:
      return onHand(key);
    case MODE.FACE_SELECT:
      return onFaceSelect(key);
    case MODE.DROP_TARGET:
      return onDropTarget(key);
    case MODE.PROMOTE:
      return onPromote(key);
    case MODE.TUTORIAL:
      return onTutorial(key);
    case MODE.GAME_OVER:
    case MODE.DRAW:
      if (logFocused) {
        if (key === "ArrowUp") logFocusIdx = Math.max(0, logFocusIdx - 1);
        else if (key === "ArrowDown")
          logFocusIdx = Math.min(state.moveLog.length - 1, logFocusIdx + 1);
        else if (key === "Escape" || key === "Tab") {
          logFocused = false;
          logFocusIdx = -1;
        }
        if (logFocusIdx >= 0) {
          const maxVis = 10;
          const total = state.moveLog.length;
          const maxOff = Math.max(0, total - maxVis);
          const visStart = maxOff - logScrollOffset;
          const visEnd = visStart + maxVis - 1;
          if (logFocusIdx < visStart) logScrollOffset = maxOff - logFocusIdx;
          else if (logFocusIdx > visEnd)
            logScrollOffset = maxOff - (logFocusIdx - maxVis + 1);
          logScrollOffset = Math.max(0, Math.min(logScrollOffset, maxOff));
        }
        redraw();
        return;
      }
      if (key === "Tab" && state.moveLog.length > 0) {
        logFocused = true;
        logFocusIdx = state.moveLog.length - 1;
        logHoverIdx = -1;
        logScrollOffset = 0;
        redraw();
      }
      return;
  }
}

// === RENDERER ===
const CELL = 44,
  PAD = 2,
  FONT = "22px serif",
  SFONT = "14px sans-serif",
  MFONT = "16px sans-serif";
let darkMode = false;
let COL_BG,
  COL_GRID,
  COL_TEXT,
  COL_WHITE,
  COL_CYAN,
  COL_YELLOW,
  COL_GREEN,
  COL_RED;
let COL_BLUE, COL_CURSOR, COL_LEGAL, COL_DROP, COL_SEL, COL_DARK;
function applyTheme() {
  if (darkMode) {
    COL_BG = "#1a1a2e";
    COL_GRID = "#2a2a4e";
    COL_TEXT = "#aaa";
    COL_WHITE = "#fff";
    COL_CYAN = "#0ff";
    COL_YELLOW = "#cc0";
    COL_GREEN = "#0a0";
    COL_RED = "#c00";
    COL_BLUE = "#26c";
    COL_CURSOR = "#884";
    COL_LEGAL = "#253";
    COL_DROP = "#253";
    COL_SEL = "#248";
    COL_DARK = "#111";
  } else {
    COL_BG = "#e8e0d0";
    COL_GRID = "#d4c8b0";
    COL_TEXT = "#555";
    COL_WHITE = "#111";
    COL_CYAN = "#b22";
    COL_YELLOW = "#a70";
    COL_GREEN = "#080";
    COL_RED = "#c00";
    COL_BLUE = "#36a";
    COL_CURSOR = "#cc9";
    COL_LEGAL = "#cec";
    COL_DROP = "#cec";
    COL_SEL = "#9bd";
    COL_DARK = "#bbb";
  }
}
applyTheme();

let canvas, ctx;
let clickZones = [];
let boardGeo = null; // {bx, by, x1, x2, y1, y2} for hover tracking
let hoverHandIdx = -1; // index into current player's hand for hover popup
let handZones = []; // [{x,y,w,h,idx}] for hand piece hover detection
let popupZone = null; // {x,y,w,h} for the face popup area
let hoverPopupIdx = -1; // which face row in popup is hovered
let pendingPopup = null; // {owner, hand, color} deferred popup info
// Cell-click drop popup
let cellPopup = null; // {gx, gy, sx, sy, cubes:[{piece,faces}]} or null
let cellPopupHover = -1; // which cube row is hovered
let cellPopupFaceHover = -1; // which face in sub-popup is hovered
let cellPopupZone = null; // {x,y,w,h}
let cellFaceZone = null; // {x,y,w,h}
let promotePopupZone = null; // {x,y,w,h}
let promoteHoverIdx = -1; // which promote choice is hovered
// Log panel hover/focus
let logHoverIdx = -1; // log entry index hovered by mouse
let logFocused = false; // true when log panel is focused (click/Tab)
let logFocusIdx = -1; // focused log entry index
let logRowZones = []; // [{x,y,w,h,idx}] for log row hover/click
let logPanelZone = null; // {x,y,w,h} bounding box of log panel
let logScrollOffset = 0; // 0=bottom (latest), positive=scrolled up
let menuRowZones = []; // [{x,y,w,h}] for menu row hover detection
let menuHoverIdx = -1; // which menu row is hovered

function redraw() {
  requestAnimationFrame(render);
}

function render() {
  clickZones = [];
  handZones = [];
  popupZone = null;
  pendingPopup = null;
  cellPopupZone = null;
  cellFaceZone = null;
  promotePopupZone = null;
  menuRowZones = [];
  const dpr = window.devicePixelRatio || 1;
  const headerH = 36,
    handH = 30,
    statusH = 80,
    footerH = 20;
  const sideW = 260,
    sideH = 240,
    logW = 200,
    logH = 220;

  // For menu/tutorial, use fixed size
  if (state.mode === MODE.MENU || state.mode === MODE.TUTORIAL) {
    const totalW = 520,
      totalH = 420;
    canvas.style.width = totalW + "px";
    canvas.style.height = totalH + "px";
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COL_BG;
    ctx.fillRect(0, 0, totalW, totalH);
    ctx.font = "bold 16px sans-serif";
    ctx.fillStyle = COL_YELLOW;
    ctx.textAlign = "left";
    ctx.fillText("═══ " + t("game_title") + " ═══", 12, 20);
    // Theme toggle button at top-right
    const themeLabel2 = darkMode ? "☀ Light" : "🌙 Dark";
    ctx.font = "bold 12px sans-serif";
    const themeTW2 = ctx.measureText(themeLabel2).width + 14;
    const themeBtnX2 = totalW - themeTW2 - 8,
      themeBtnY2 = 6;
    ctx.fillStyle = darkMode ? "#334" : "#c8bca8";
    ctx.fillRect(themeBtnX2, themeBtnY2, themeTW2, 22);
    ctx.strokeStyle = darkMode ? "#667" : "#a09880";
    ctx.lineWidth = 1;
    ctx.strokeRect(themeBtnX2, themeBtnY2, themeTW2, 22);
    ctx.fillStyle = darkMode ? "#ccc" : "#333";
    ctx.textAlign = "left";
    ctx.fillText(themeLabel2, themeBtnX2 + 7, themeBtnY2 + 15);
    clickZones.push({
      x: themeBtnX2,
      y: themeBtnY2,
      w: themeTW2,
      h: 22,
      action: "key",
      data: "t",
    });
    if (state.mode === MODE.MENU) renderMenu(headerH);
    else renderTutorial(headerH);
    return;
  }

  // Compute board bounds from Gyoku positions (not cursor)
  const previewIdx = getLogPreviewIdx();
  const previewSnap =
    previewIdx >= 0 && state.moveLog[previewIdx]
      ? state.moveLog[previewIdx].snapshot
      : null;
  const onBoard = state.pieces.filter((p) => p.onBoard);
  let minX, maxX, minY, maxY;
  if (onBoard.length === 0 && state.mode === MODE.SETUP_BLACK_GYOKU) {
    minX = -3;
    maxX = 3;
    minY = -3;
    maxY = 3;
  } else {
    // Base bounds on Gyoku + Ki cubes
    const anchors = onBoard.filter(
      (p) => p.cube === CUBE_GYOKU || p.cube === CUBE_KI,
    );
    if (anchors.length > 0) {
      minX = maxX = anchors[0].x;
      minY = maxY = anchors[0].y;
      for (const a of anchors) {
        minX = Math.min(minX, a.x);
        maxX = Math.max(maxX, a.x);
        minY = Math.min(minY, a.y);
        maxY = Math.max(maxY, a.y);
      }
    } else {
      minX = maxX = 0;
      minY = maxY = 0;
    }
    // Expand for legal moves / drop targets (game state, not cursor)
    for (const m of state.legalMoves) {
      minX = Math.min(minX, m.x);
      maxX = Math.max(maxX, m.x);
      minY = Math.min(minY, m.y);
      maxY = Math.max(maxY, m.y);
    }
    for (const d of state.dropTargets || []) {
      minX = Math.min(minX, d.x);
      maxX = Math.max(maxX, d.x);
      minY = Math.min(minY, d.y);
      maxY = Math.max(maxY, d.y);
    }
    minX -= PAD;
    maxX += PAD;
    minY -= PAD;
    maxY += PAD;
  }
  // Expand bounds to include snapshot pieces if previewing
  if (previewSnap) {
    for (const p of previewSnap) {
      if (p.x === null) continue;
      minX = Math.min(minX, p.x - PAD);
      maxX = Math.max(maxX, p.x + PAD);
      minY = Math.min(minY, p.y - PAD);
      maxY = Math.max(maxY, p.y + PAD);
    }
  }

  const cols = maxX - minX + 1,
    rows = maxY - minY + 1;
  const boardW = cols * CELL,
    boardH = rows * CELL;
  const totalW = Math.max(520, 30 + boardW + sideW );
  const totalH = headerH + handH + 8 + Math.max( sideH+logH ,boardH + 8 + handH + statusH)+  footerH;

  canvas.style.width = totalW + "px";
  canvas.style.height = totalH + "px";
  canvas.width = totalW * dpr;
  canvas.height = totalH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = COL_BG;
  ctx.fillRect(0, 0, totalW, totalH);

  let cy = 4;
  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = COL_YELLOW;
  ctx.textAlign = "left";
  ctx.fillText("═══ " + t("game_title") + " ═══", 12, cy + 16);
  // Theme toggle button at top-right
  const themeLabel = darkMode ? "☀ Light" : "🌙 Dark";
  ctx.font = "bold 12px sans-serif";
  const themeTW = ctx.measureText(themeLabel).width + 14;
  const themeBtnX = totalW - themeTW - 8,
    themeBtnY = 6;
  ctx.fillStyle = darkMode ? "#334" : "#c8bca8";
  ctx.fillRect(themeBtnX, themeBtnY, themeTW, 22);
  ctx.strokeStyle = darkMode ? "#667" : "#a09880";
  ctx.lineWidth = 1;
  ctx.strokeRect(themeBtnX, themeBtnY, themeTW, 22);
  ctx.fillStyle = darkMode ? "#ccc" : "#333";
  ctx.textAlign = "left";
  ctx.fillText(themeLabel, themeBtnX + 7, themeBtnY + 15);
  clickZones.push({
    x: themeBtnX,
    y: themeBtnY,
    w: themeTW,
    h: 22,
    action: "key",
    data: "t",
  });
  cy = headerH;

  // White hand
  const whY = cy;
  renderHand(12, whY, WHITE);
  cy = whY + handH + 4;

  // Board grid (uses render bounds for full snapshot visibility)
  const boardX = 40,
    boardY = cy;
  renderGrid(boardX, boardY, minX, maxX, minY, maxY);
  cy = boardY + boardH + 4;

  // Black hand
  renderHand(12, cy, BLACK);
  cy += handH + 8;

  // Status / sub-mode panels
  renderStatusArea(12, cy);

  // Sidebar: piece hint
  renderHintSidebar(boardX + boardW + 12, boardY+10+ logH);

  // Log panel
  renderLogPanel(boardX + boardW + 12, boardY );

  // Hand drop popup (rendered last so it's on top of everything)
  renderHandPopup();
  renderCellPopup();
  renderPromotePopup();
}

// === RENDER: Menu & Tutorial ===
function renderMenu(cy) {
  const menus = {
    1: [
      "choose_opponent",
      [
        ["1", "local_2p"],
        ["2", "ai_battle"],
        ["3", "tutorial"],
      ],
    ],
    2: [
      "choose_pieces",
      [
        ["1", "basic_set"],
        ["2", "full_set"],
      ],
    ],
    3: [
      "choose_diff",
      [
        ["1", "diff_easy"],
        ["2", "diff_medium"],
        ["3", "diff_hard"],
      ],
    ],
    4: [
      "choose_side",
      [
        ["1", "play_black"],
        ["2", "play_white"],
        ["3", "random"],
        ["4", "ai_vs_ai"],
      ],
    ],
  };
  const m = menus[state.menuStep];
  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = COL_WHITE;
  ctx.textAlign = "left";
  ctx.fillText(t(m[0]), 20, cy + 20);
  cy += 32;
  ctx.font = MFONT;
  for (let ri = 0; ri < m[1].length; ri++) {
    const [k, v] = m[1][ri];
    const tx = 20,
      ty = cy,
      tw = 340,
      th = 28;
    // Highlight on hover
    if (ri === menuHoverIdx) {
      ctx.fillStyle = darkMode ? "#334" : "#c8bca0";
      ctx.fillRect(tx, ty, tw, th);
    }
    ctx.font = MFONT;
    ctx.textAlign = "left";
    ctx.fillStyle = ri === menuHoverIdx ? COL_YELLOW : COL_YELLOW;
    ctx.fillText(k + "  ", tx + 4, ty + 18);
    ctx.fillStyle = ri === menuHoverIdx ? COL_YELLOW : COL_WHITE;
    ctx.fillText(t(v), tx + 32, ty + 18);
    menuRowZones.push({ x: tx, y: ty, w: tw, h: th });
    clickZones.push({ x: tx, y: ty, w: tw, h: th, action: "key", data: k });
    cy += th + 2;
  }
  // Back button (except on step 1)
  cy += 8;
  if (state.menuStep > 1) {
    drawBtn(20, cy, "Back [Esc]", "Escape");
  }
}

function renderTutorial(cy) {
  const pages = getTutorialPages();
  const page = pages[state.tutorialPage];
  const total = pages.length,
    num = state.tutorialPage + 1;
  ctx.font = "bold 15px sans-serif";
  ctx.fillStyle = COL_YELLOW;
  ctx.textAlign = "left";
  ctx.fillText(`${t("tut_title")} (${num}/${total}) - ${page[0]}`, 20, cy + 18);
  cy += 30;
  const colorMap = {
    g: COL_TEXT,
    w: COL_WHITE,
    c: COL_CYAN,
    n: COL_GREEN,
    y: COL_YELLOW,
    r: COL_RED,
  };
  for (let i = 1; i < page.length; i++) {
    const line = page[i];
    if (line === "") {
      cy += 10;
      continue;
    }
    if (typeof line === "string") {
      ctx.font = "14px sans-serif";
      ctx.fillStyle = COL_WHITE;
      ctx.fillText(line, 24, cy + 14);
    } else {
      ctx.font = "bold 14px monospace";
      const cw = ctx.measureText("M").width; // single monospace char width
      let lx = 24;
      for (const [ck, txt] of line) {
        ctx.fillStyle = colorMap[ck] || COL_WHITE;
        for (const ch of txt) {
          const isCJK = ch.charCodeAt(0) > 0x2e7f;
          ctx.fillText(ch, lx, cy + 14);
          lx += isCJK ? cw * 2 : cw;
        }
      }
    }
    cy += 18;
  }
  cy += 16;
  ctx.font = "bold 12px sans-serif";
  const prevW = ctx.measureText("Prev [←]").width + 20;
  const nextW = ctx.measureText("Next [→]").width + 20;
  let btnX = 20;
  if (num > 1) {
    btnX = drawBtn(btnX, cy, "Prev [←]", "ArrowLeft");
  } else {
    btnX += prevW;
  }
  if (num < total) {
    btnX = drawBtn(btnX, cy, "Next [→]", "ArrowRight");
  } else {
    btnX += nextW;
  }
  btnX = drawBtn(btnX, cy, "Back [Esc]", "Escape");
}

function getTutorialPages() {
  // Lines: string = plain text, "" = spacer, array of [colorKey, text] = colored segments
  // Color keys: g=gray, w=white(black pieces), c=cyan(white pieces), n=green, y=yellow, r=red
  return [
    [
      "Overview",
      "Ki Shogi is a two-player game on an infinite board,",
      "designed by L.Lynn Smith.",
      "Each side has dice-shaped pieces; each face is a different unit.",
      "",
      [
        ["g", "  . . . . . "],
        ["w", "White"],
        ["g", "=Black (first)"],
      ],
      [
        ["g", "  . "],
        ["w", "玉"],
        ["g", ". . . "],
        ["c", "Cyan"],
        ["g", "=White (second)"],
      ],
      [
        ["g", "  . "],
        ["w", "飛"],
        ["c", "角"],
        ["g", ". . "],
      ],
      [
        ["g", "  . . . "],
        ["c", "玉"],
        ["g", ". "],
      ],
      [["g", "  . . . . ."]],
      "",
      [
        ["g", "Basic: "],
        ["w", "玉"],
        ["g", " + "],
        ["w", "飛"],
        ["g", "(Rook die) + "],
        ["w", "角"],
        ["g", "(Bishop die)"],
      ],
      [
        ["g", "Full:  adds "],
        ["y", "麒"],
        ["g", "(Kirin die)"],
      ],
    ],
    [
      "Setup",
      "Both sides place their 玉(King) first.",
      "The two 玉 must be exactly Chebyshev distance 2 apart.",
      "",
      [["g", "  Legal positions at distance 2:"]],
      [["n", "  + + + + +"]],
      [
        ["n", "  + "],
        ["g", ". . . "],
        ["n", "+"],
      ],
      [
        ["n", "  + "],
        ["g", ". "],
        ["w", "玉"],
        ["g", ". "],
        ["n", "+"],
      ],
      [
        ["n", "  + "],
        ["g", ". . . "],
        ["n", "+"],
      ],
      [["n", "  + + + + +"]],
      "",
      "After placement, remaining pieces go to hand",
      "and can be dropped on later turns.",
    ],
    [
      "Movement & Flip",
      "Each turn you move one piece on the board.",
      "The piece moves according to its current face.",
      "",
      [["g", "Non-capture move → auto-flip to opposite:"]],
      [
        ["w", "飛"],
        ["g", "(cross slide)  after move  "],
        ["w", "猪"],
        ["g", "(cross step)"],
      ],
      "",
      [["g", "  Before:      After:"]],
      [
        ["g", "  . "],
        ["c", "玉"],
        ["g", " .     . "],
        ["c", "玉"],
        ["g", " ."],
      ],
      [
        ["g", "  . "],
        ["w", "飛"],
        ["g", " .  →  . . "],
        ["w", "猪"],
      ],
      [
        ["g", "  . "],
        ["w", "玉"],
        ["g", " .     . "],
        ["w", "玉"],
        ["g", " ."],
      ],
      "",
      "Move hints are shown to the right of the board.",
    ],
    [
      "Capture & Promote",
      "Move onto an opponent piece to capture it.",
      "",
      [["g", "  Before:      After (choose promotion):"]],
      [
        ["g", "  . "],
        ["w", "飛"],
        ["c", "角"],
        ["g", "     . . "],
        ["w", "仲"],
      ],
      [
        ["g", "  . "],
        ["w", "玉"],
        ["g", " .  →  . "],
        ["w", "玉"],
        ["g", " ."],
      ],
      "",
      "After capture: choose a promotion face (no flip).",
      [
        ["g", "  "],
        ["w", "飛"],
        ["g", " promotes to: "],
        ["w", "仲"],
      ],
      "Captured piece goes to your hand.",
      "",
      [
        ["g", "You can sacrifice (strand) pieces to capture "],
        ["y", "麒"],
        ["g", " cubes."],
      ],
    ],
    [
      "Support Rule",
      "Pieces must be supported to stay on the board:",
      "",
      [
        ["g", "Normal pieces: adjacent to "],
        ["w", "玉"],
        ["g", " or "],
        ["y", "麒"],
        ["g", " (dist 1)"],
      ],
      [
        ["y", "麒"],
        ["g", " cube: dist 1-2 from "],
        ["w", "玉"],
        ["g", ", or adjacent to another "],
        ["y", "麒"],
      ],
      "",
      [
        ["n", "  + + + + +"],
        ["g", " ."],
      ],
      [
        ["n", "  + "],
        ["w", "玉"],
        ["n", "+ "],
        ["w", "麒"],
        ["w", "飛"],
        ["g", ". "],
        ["g", "←飛 supported by 麒"],
      ],
      [
        ["n", "  + + + + +"],
        ["g", " ."],
      ],
      "",
      [
        ["y", "麒"],
        ["g", "→"],
        ["y", "麒"],
        ["g", " chains extend support range."],
      ],
      "Unsupported pieces at end of turn are captured by opponent.",
    ],
    [
      "Dropping Pieces",
      "Press D to enter drop mode.",
      "Choose a hand piece → choose face → choose position.",
      "",
      [
        ["n", "+ "],
        ["g", "=normal drop  "],
        ["y", "+ "],
        ["g", "=麒 extra range  "],
        ["r", "x "],
        ["g", "=forbidden"],
      ],
      [
        ["y", "  + + + + + "],
        ["g", ". ."],
      ],
      [
        ["y", "  + "],
        ["n", "+ + "],
        ["r", "x x x "],
        ["g", "."],
      ],
      [
        ["y", "  + "],
        ["n", "+ "],
        ["w", "玉"],
        ["r", "x "],
        ["c", "玉"],
        ["r", "x "],
        ["g", ". "],
        ["g", "x=near opp 玉"],
      ],
      [
        ["y", "  + "],
        ["n", "+ + "],
        ["r", "x x x "],
        ["g", "."],
      ],
      [
        ["y", "  + + + + + "],
        ["g", ". ."],
      ],
      "",
      "Normal pieces drop adjacent to own 玉 (dist 1).",
      [
        ["y", "麒"],
        ["g", " cube can drop at dist 1-2 from own "],
        ["w", "玉"],
        ["g", "."],
      ],
      "Restriction: cannot give check by dropping.",
    ],
    [
      "Win Condition",
      "Capture opponent 玉 → instant win",
      "Opponent has no legal action → you win",
      "",
      [
        ["g", "Check example: "],
        ["w", "飛"],
        ["g", " threatens White "],
        ["c", "玉"],
      ],
      [
        ["g", "  . "],
        ["c", "玉"],
        ["g", " ."],
      ],
      [
        ["g", "  . "],
        ["r", "||"],
        ["g", " . "],
        ["g", "←飛 attack line"],
      ],
      [
        ["g", "  . "],
        ["w", "飛"],
        ["g", " ."],
      ],
      [
        ["g", "  . "],
        ["w", "玉"],
        ["g", " ."],
      ],
      "",
      "When in check, you must resolve it or 玉 is captured.",
      "",
      [["y", "Enjoy the game!"]],
    ],
  ];
}

// === RENDER: Grid & Hand ===
function renderGrid(bx, by, x1, x2, y1, y2) {
  boardGeo = { bx, by, x1, x2, y1, y2 };
  const previewIdx = getLogPreviewIdx();
  const previewing = previewIdx >= 0 && state.moveLog[previewIdx];
  const snap = previewing ? state.moveLog[previewIdx].snapshot : null;
  const snapEntry = previewing ? state.moveLog[previewIdx] : null;

  let boardMap;
  let legalSet = new Set(),
    dropSet = new Set();
  if (snap) {
    boardMap = new Map();
    for (const p of snap) if (p.x !== null) boardMap.set(`${p.x},${p.y}`, p);
  } else {
    boardMap = state.buildBoardMap();
    legalSet = new Set(state.legalMoves.map((m) => `${m.x},${m.y}`));
    dropSet = new Set((state.dropTargets || []).map((m) => `${m.x},${m.y}`));
  }
  const moveFrom =
    snapEntry && snapEntry.from
      ? `${snapEntry.from.x},${snapEntry.from.y}`
      : null;
  const moveTo =
    snapEntry && snapEntry.to ? `${snapEntry.to.x},${snapEntry.to.y}` : null;

  // Column headers
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#666";
  ctx.textAlign = "center";
  for (let x = x1; x <= x2; x++) {
    ctx.fillText(String(x), bx + (x - x1) * CELL + CELL / 2, by - 4);
  }

  for (let y = y2; y >= y1; y--) {
    const ry = by + (y2 - y) * CELL;
    // Row label
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#666";
    ctx.textAlign = "right";
    ctx.fillText(String(y), bx - 4, ry + CELL / 2 + 4);

    for (let x = x1; x <= x2; x++) {
      const rx = bx + (x - x1) * CELL;
      const key = `${x},${y}`;
      const piece = boardMap.get(key);
      const isCursor =
        !previewing && state.cursor.x === x && state.cursor.y === y;
      const isLegal = legalSet.has(key);
      const isDrop = dropSet.has(key);
      const isSel =
        !previewing &&
        state.selected !== null &&
        state.pieces[state.selected].x === x &&
        state.pieces[state.selected].y === y;
      const isSnapTo = previewing && key === moveTo;
      const isSnapFrom = previewing && key === moveFrom;

      // Cell background
      let bg = COL_GRID;
      if (isSnapTo) bg = COL_SEL;
      else if (isSnapFrom) bg = COL_CURSOR;
      else if (isSel) bg = COL_SEL;
      else if (isCursor) bg = COL_CURSOR;
      else if (isLegal || isDrop) bg = COL_LEGAL;

      ctx.fillStyle = bg;
      ctx.fillRect(rx, ry, CELL - 1, CELL - 1);

      // Piece kanji
      if (piece) {
        const info = FACE_INFO[piece.face];
        const ch = info ? info[0] : piece.face.slice(0, 2);
        const cx = rx + CELL / 2,
          cy2 = ry + CELL / 2;
        ctx.font = FONT;
        ctx.textAlign = "center";
        ctx.fillStyle = piece.owner === BLACK ? COL_WHITE : COL_CYAN;
        if (piece.owner === WHITE) {
          ctx.save();
          ctx.translate(cx, cy2);
          ctx.rotate(Math.PI);
          ctx.fillText(ch, 0, 8);
          ctx.restore();
        } else {
          ctx.fillText(ch, cx, cy2 + 8);
        }
      } else if (isLegal || isDrop) {
        // Dot for legal move
        ctx.fillStyle = "#4a4";
        ctx.beginPath();
        ctx.arc(rx + CELL / 2, ry + CELL / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Click zone for this cell
      clickZones.push({
        x: rx,
        y: ry,
        w: CELL,
        h: CELL,
        action: "cell",
        data: { x, y },
      });
    }
  }
}

function renderHand(hx, hy, owner) {
  const previewIdx = getLogPreviewIdx();
  const snap =
    previewIdx >= 0 && state.moveLog[previewIdx]
      ? state.moveLog[previewIdx].snapshot
      : null;
  let hand;
  if (snap) {
    hand = snap.filter(
      (p) => p.x === null && p.owner === owner && p.cube !== CUBE_GYOKU,
    );
  } else {
    hand = state.getHandPieces(owner);
  }
  const label = owner === BLACK ? t("black_hand") : t("white_hand");
  const color = owner === BLACK ? COL_WHITE : COL_CYAN;
  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.fillText(label + ":", hx, hy + 16);
  let ox = hx + ctx.measureText(label + ": ").width + 4;
  const isMyHand = owner === state.turn;
  const canDrop =
    !snap && isMyHand && state.mode === MODE.BOARD && !isAI(state.turn);
  if (!hand.length) {
    ctx.fillStyle = "#666";
    ctx.fillText(t("hand_empty"), ox, hy + 16);
  } else {
    for (let hi = 0; hi < hand.length; hi++) {
      const p = hand[hi];
      const info = FACE_INFO[p.face];
      ctx.font = "18px serif";
      const txt = "[" + info[0] + "]";
      const tw = ctx.measureText(txt).width;
      // Highlight on hover
      if (canDrop && hi === hoverHandIdx) {
        ctx.fillStyle = darkMode ? "#445" : "#c8b8a0";
        ctx.fillRect(ox - 2, hy, tw + 4, 24);
        ctx.strokeStyle = COL_CURSOR;
        ctx.lineWidth = 1;
        ctx.strokeRect(ox - 2, hy, tw + 4, 24);
      }
      ctx.fillStyle = color;
      ctx.fillText(txt, ox, hy + 18);
      if (canDrop) {
        handZones.push({ x: ox - 2, y: hy, w: tw + 4, h: 24, idx: hi });
      }
      ox += tw + 6;
    }
    // Hint text for current player
    if (canDrop) {
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#888";
      ctx.fillText("← select to drop", ox + 4, hy + 16);
    }
  }
  // Defer popup rendering (drawn after board so it's on top)
  if (canDrop && hoverHandIdx >= 0 && hoverHandIdx < hand.length) {
    pendingPopup = { owner, hand, color };
  }
}

function renderHandPopup() {
  if (!pendingPopup) return;
  const { owner, hand, color } = pendingPopup;
  const p = hand[hoverHandIdx];
  const faces = CUBE_FACES[p.cube];
  if (!faces || !faces.length) return;
  const hz = handZones.find((z) => z.idx === hoverHandIdx);
  if (!hz) return;

  const rowH = 24;
  const popW = 160;
  const popH = faces.length * rowH + 4;
  const popX = hz.x;
  // White hand → popup below; Black hand → popup above
  const popY = owner === WHITE ? hz.y + hz.h + 2 : hz.y - popH - 2;
  popupZone = { x: popX, y: popY, w: popW, h: popH };

  // Background
  ctx.fillStyle = darkMode ? "rgba(17,17,40,0.75)" : "rgba(200,190,170,0.8)";
  ctx.fillRect(popX, popY, popW, popH);
  ctx.strokeStyle = darkMode ? "#99b" : "#998";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(popX, popY, popW, popH);

  // Face options
  for (let fi = 0; fi < faces.length; fi++) {
    const face = faces[fi],
      finfo = FACE_INFO[face];
    const fy = popY + 2 + fi * rowH;
    // Highlight hovered row
    if (fi === hoverPopupIdx) {
      ctx.fillStyle = darkMode ? "#445" : "#c8b8a0";
      ctx.fillRect(popX + 1, fy, popW - 2, rowH);
    }
    ctx.font = "14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = fi === hoverPopupIdx ? COL_YELLOW : color;
    ctx.fillText(
      " " + finfo[0] + " " + face + " (" + finfo[1] + ")",
      popX + 4,
      fy + 16,
    );
    clickZones.push({
      x: popX,
      y: fy,
      w: popW,
      h: rowH,
      action: "quickdrop",
      data: { pieceIdx: state.pieces.indexOf(p), face: face },
    });
  }
}

function renderCellPopup() {
  if (!cellPopup || !boardGeo) return;
  const { gx, gy, cubes } = cellPopup;
  const { bx, by, x1, x2, y1, y2 } = boardGeo;
  // Board pixel bounds
  const boardR = bx + (x2 - x1 + 1) * CELL;
  const boardB = by + (y2 - y1 + 1) * CELL;
  // Screen position of the clicked cell
  const cellLeft = bx + (gx - x1) * CELL;
  const cellRight = cellLeft + CELL;
  const cellTop = by + (y2 - gy) * CELL;

  const rowH = 24,
    popW = 140,
    subW = 160;
  const popH = cubes.length * rowH + 4;
  // Place cube popup right of cell, but never past board right edge
  let popX = cellRight;
  if (popX + popW > boardR) popX = boardR - popW;
  if (popX < bx) popX = bx;
  // Clamp vertically inside board
  let popY = Math.min(cellTop, boardB - popH);
  popY = Math.max(popY, by);
  cellPopupZone = { x: popX, y: popY, w: popW, h: popH };

  // Background
  ctx.fillStyle = darkMode ? "rgba(17,17,40,0.75)" : "rgba(200,190,170,0.8)";
  ctx.fillRect(popX, popY, popW, popH);
  ctx.strokeStyle = darkMode ? "#99b" : "#998";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(popX, popY, popW, popH);

  const color = state.turn === BLACK ? COL_WHITE : COL_CYAN;
  for (let ci = 0; ci < cubes.length; ci++) {
    const { piece } = cubes[ci];
    const info = FACE_INFO[piece.face];
    const ry = popY + 2 + ci * rowH;
    if (ci === cellPopupHover) {
      ctx.fillStyle = darkMode ? "#445" : "#c8b8a0";
      ctx.fillRect(popX + 1, ry, popW - 2, rowH);
    }
    ctx.font = "14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = ci === cellPopupHover ? COL_YELLOW : color;
    ctx.fillText(" [" + info[0] + "] " + piece.cube, popX + 4, ry + 16);
  }

  // Sub-popup: faces for hovered cube
  if (cellPopupHover >= 0 && cellPopupHover < cubes.length) {
    const { piece, faces } = cubes[cellPopupHover];
    // Place face popup right of cube popup, clamp to board
    let subX = popX + popW;
    if (subX + subW > boardR) subX = popX - subW;
    if (subX < bx) subX = bx;
    let subY = popY + cellPopupHover * rowH;
    const subH = faces.length * rowH + 4;
    subY = Math.min(subY, boardB - subH);
    subY = Math.max(subY, by);
    cellFaceZone = { x: subX, y: subY, w: subW, h: subH };

    ctx.fillStyle = darkMode ? "rgba(17,17,40,0.75)" : "rgba(200,190,170,0.8)";
    ctx.fillRect(subX, subY, subW, subH);
    ctx.strokeStyle = darkMode ? "#99b" : "#998";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(subX, subY, subW, subH);

    for (let fi = 0; fi < faces.length; fi++) {
      const face = faces[fi],
        finfo = FACE_INFO[face];
      const fy = subY + 2 + fi * rowH;
      if (fi === cellPopupFaceHover) {
        ctx.fillStyle = darkMode ? "#445" : "#c8b8a0";
        ctx.fillRect(subX + 1, fy, subW - 2, rowH);
      }
      ctx.font = "14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = fi === cellPopupFaceHover ? COL_YELLOW : color;
      ctx.fillText(
        " " + finfo[0] + " " + face + " (" + finfo[1] + ")",
        subX + 4,
        fy + 16,
      );
      clickZones.push({
        x: subX,
        y: fy,
        w: subW,
        h: rowH,
        action: "celldrop",
        data: { pieceIdx: state.pieces.indexOf(piece), face, gx, gy },
      });
    }
  }
}

function renderPromotePopup() {
  if (state.mode !== MODE.PROMOTE || !boardGeo) return;
  const piece = state.pieces[state.selected];
  if (!piece) return;
  const { bx, by, x1, x2, y1, y2 } = boardGeo;
  const boardR = bx + (x2 - x1 + 1) * CELL;
  const boardB = by + (y2 - y1 + 1) * CELL;
  const cellLeft = bx + (piece.x - x1) * CELL;
  const cellRight = cellLeft + CELL;
  const cellTop = by + (y2 - piece.y) * CELL;

  const rowH = 24, popW = 140;
  const popH = state.promoteChoices.length * rowH + 4;
  let popX = cellRight;
  if (popX + popW > boardR) popX = boardR - popW;
  if (popX < bx) popX = bx;
  let popY = Math.min(cellTop, boardB - popH);
  popY = Math.max(popY, by);
  promotePopupZone = { x: popX, y: popY, w: popW, h: popH };

  ctx.fillStyle = darkMode ? "rgba(17,17,40,0.75)" : "rgba(200,190,170,0.8)";
  ctx.fillRect(popX, popY, popW, popH);
  ctx.strokeStyle = darkMode ? "#99b" : "#998";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(popX, popY, popW, popH);

  const color = piece.owner === BLACK ? COL_WHITE : COL_CYAN;
  for (let i = 0; i < state.promoteChoices.length; i++) {
    const face = state.promoteChoices[i];
    const info = FACE_INFO[face];
    const ry = popY + 2 + i * rowH;
    const active = i === promoteHoverIdx || i === state.promoteHoverIdx;
    if (active) {
      ctx.fillStyle = darkMode ? "#445" : "#c8b8a0";
      ctx.fillRect(popX + 1, ry, popW - 2, rowH);
    }
    ctx.font = "14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = active ? COL_YELLOW : color;
    ctx.fillText( " " + info[0] + " " + face + " (" + info[1] + ")", popX + 4, ry + 16);
    clickZones.push({ x: popX, y: ry, w: popW, h: rowH, action: "promote", data: i });
  }
}

// === RENDER: Buttons & Status Area ===
function drawBtn(x, y, label, keyData) {
  ctx.font = "bold 12px sans-serif";
  const tw = ctx.measureText(label).width + 14;
  const h = 22;
  ctx.fillStyle = darkMode ? "#334" : "#c8bca8";
  ctx.fillRect(x, y, tw, h);
  ctx.strokeStyle = darkMode ? "#667" : "#a09880";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, tw, h);
  ctx.fillStyle = darkMode ? "#ccc" : "#333";
  ctx.textAlign = "left";
  ctx.fillText(label, x + 7, y + 15);
  clickZones.push({ x, y, w: tw, h, action: "key", data: keyData });
  return x + tw + 6;
}

function renderStatusArea(sx, sy) {
  const turnColor = state.turn === BLACK ? COL_WHITE : COL_CYAN;
  const turnName = state.turn === BLACK ? t("black") : t("white");
  ctx.textAlign = "left";

  if (state.mode === MODE.GAME_OVER) {
    const winName = state.winner === BLACK ? t("black") : t("white");
    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = COL_YELLOW;
    ctx.fillText("★ " + winName + " " + t("wins") + " ★", sx, sy + 18);
    if (state.message) {
      ctx.font = "14px sans-serif";
      ctx.fillStyle = COL_YELLOW;
      ctx.fillText(state.message, sx, sy + 38);
    }
    let bx1 = sx;
    bx1 = drawBtn(bx1, sy + 62, "Menu [M]", "m");
    bx1 = drawBtn(bx1, sy + 62, "Restart [R]", "r");
    bx1 = drawBtn(bx1, sy + 62, "Log [Tab]", "Tab");
    return;
  }
  if (state.mode === MODE.DRAW) {
    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = COL_YELLOW;
    ctx.fillText("★ " + t("draw") + " ★", sx, sy + 18);
    ctx.font = "14px sans-serif";
    ctx.fillStyle = COL_YELLOW;
    ctx.fillText(state.message, sx, sy + 38);
    let bx2 = sx;
    bx2 = drawBtn(bx2, sy + 62, "Menu [M]", "m");
    bx2 = drawBtn(bx2, sy + 62, "Restart [R]", "r");
    bx2 = drawBtn(bx2, sy + 62, "Log [Tab]", "Tab");
    return;
  }
  if (state.mode === MODE.HAND) {
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = COL_WHITE;
    ctx.fillText(t("choose_drop"), sx, sy + 16);
    ctx.font = MFONT;
    for (let i = 0; i < state.handPieces.length; i++) {
      const p = state.handPieces[i],
        info = FACE_INFO[p.face];
      const iy = sy + 24 + i * 24;
      if (i === state.handIndex) {
        ctx.fillStyle = COL_CURSOR;
        ctx.fillRect(sx, iy, 200, 22);
      }
      ctx.fillStyle = i === state.handIndex ? COL_DARK : COL_WHITE;
      ctx.fillText(" " + info[0] + " " + p.face, sx + 4, iy + 16);
      clickZones.push({
        x: sx,
        y: iy,
        w: 200,
        h: 22,
        action: "hand",
        data: i,
      });
    }
    drawBtn(
      sx,
      sy + 24 + state.handPieces.length * 24 + 6,
      "Cancel [Esc]",
      "Escape",
    );
    return;
  }
  if (state.mode === MODE.FACE_SELECT) {
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = COL_WHITE;
    ctx.fillText(t("choose_face"), sx, sy + 16);
    ctx.font = MFONT;
    for (let i = 0; i < state.dropFaces.length; i++) {
      const face = state.dropFaces[i],
        info = FACE_INFO[face];
      const iy = sy + 24 + i * 24;
      if (i === state.faceIndex) {
        ctx.fillStyle = COL_CURSOR;
        ctx.fillRect(sx, iy, 240, 22);
      }
      ctx.fillStyle = i === state.faceIndex ? COL_DARK : COL_WHITE;
      ctx.fillText(
        " " + info[0] + " " + face + " (" + info[1] + ")",
        sx + 4,
        iy + 16,
      );
      clickZones.push({
        x: sx,
        y: iy,
        w: 240,
        h: 22,
        action: "face",
        data: i,
      });
    }
    drawBtn(
      sx,
      sy + 24 + state.dropFaces.length * 24 + 6,
      "Cancel [Esc]",
      "Escape",
    );
    return;
  }
  if (state.mode === MODE.PROMOTE) {
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = COL_WHITE;
    ctx.fillText(t("choose_promote"), sx, sy + 16);
    return;
  }

  // Default: turn indicator + status
  ctx.font = "bold 14px sans-serif";
  ctx.fillStyle = turnColor;
  let statusText = turnName;
  if (
    state.mode === MODE.SETUP_BLACK_GYOKU ||
    state.mode === MODE.SETUP_WHITE_GYOKU
  ) {
    statusText += " " + t("place_gyoku");
  } else if (state.mode === MODE.BOARD) {
    if (state.aiSide && isAI(state.turn)) {
      statusText += state.paused ? " " + t("paused") : " " + t("ai_thinking");
    } else statusText += t("your_turn");
  } else if (state.mode === MODE.SELECTED) {
    statusText += " " + t("select_target");
  } else if (state.mode === MODE.DROP_TARGET) {
    statusText += " " + t("choose_drop_pos");
  }
  ctx.fillText(statusText, sx, sy + 16);

  let msgY = sy + 34;
  if (state.inCheck) {
    ctx.fillStyle = COL_RED;
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(t("check"), sx, msgY);
    msgY += 18;
  }
  if (state.message) {
    ctx.fillStyle = COL_YELLOW;
    ctx.font = "13px sans-serif";
    ctx.fillText(state.message, sx, msgY);
    msgY += 18;
  }

  // Clickable action buttons
  let btnX = sx;
  const btnY = msgY + 4;
  if (state.mode === MODE.BOARD && !(state.aiSide && isAI(state.turn))) {
    btnX = drawBtn(btnX, btnY, "Drop [D]", "d");
    btnX = drawBtn(btnX, btnY, "Log [Tab]", "Tab");
  }
  if (state.mode === MODE.BOARD && state.aiSide && isAI(state.turn)) {
    btnX = drawBtn(btnX, btnY, state.paused ? "▶ Resume [Space]" : "⏸ Pause [Space]", " ");
    btnX = drawBtn(btnX, btnY, "Log [Tab]", "Tab");
  }
  if (state.mode === MODE.SELECTED) {
    btnX = drawBtn(btnX, btnY, "Cancel [Esc]", "Escape");
  }
  if (state.mode === MODE.DROP_TARGET) {
    btnX = drawBtn(btnX, btnY, "Cancel [Esc]", "Escape");
  }
  // Always show Menu/Restart when in game
  const m2 = state.mode;
  if (m2 !== MODE.MENU && m2 !== MODE.TUTORIAL) {
    btnX = drawBtn(btnX, btnY, "Menu [M]", "m");
    btnX = drawBtn(btnX, btnY, "Restart [R]", "r");
  }
}

// === RENDER: Hint Sidebar ===
function buildDiagram(face, owner) {
  const md = MOVES[face];
  if (!md) return [];
  let maxOff = 1;
  for (const comp of md)
    for (const cat of comp.dirs)
      for (const [dx, dy] of resolveDirs(cat, owner))
        maxOff = Math.max(maxOff, Math.abs(dx), Math.abs(dy));
  const sz = maxOff * 2 + 1,
    mid = maxOff;
  const grid = Array.from({ length: sz }, () => Array(sz).fill(null));
  for (const comp of md)
    for (const cat of comp.dirs)
      for (const [dx, dy] of resolveDirs(cat, owner))
        grid[mid - dy][dx + mid] = comp.mode;
  return { grid, sz, mid, face };
}

function slideSym(r, c, mid) {
  const dx = c - mid,
    dy = mid - r;
  if (dx === 0) return "|";
  if (dy === 0) return "一";
  return (dx < 0 && dy > 0) || (dx > 0 && dy < 0) ? "\\" : "/";
}

function drawDiagram(dx, dy, diag, owner) {
  const { grid, sz, mid, face } = diag;
  const cs = 20;
  const info = FACE_INFO[face];
  for (let r = 0; r < sz; r++)
    for (let c = 0; c < sz; c++) {
      const px = dx + c * cs,
        py = dy + r * cs;
      ctx.font = "18px monospace";
      ctx.textAlign = "center";
      if (r === mid && c === mid) {
        ctx.fillStyle = owner === BLACK ? COL_WHITE : COL_CYAN;
        ctx.font = "18px serif";
        if (owner === WHITE) {
          ctx.save();
          ctx.translate(px + cs / 2, py + cs / 2 - 3);
          ctx.rotate(Math.PI);
          ctx.fillText(info[0], 0, 5);
          ctx.restore();
        } else {
          ctx.fillText(info[0], px + cs / 2, py + cs / 2 + 5);
        }
      } else if (grid[r][c]) {
        ctx.fillStyle = grid[r][c] === "step" ? "#4a4" : "#6a6";
        ctx.fillText(
          grid[r][c] === "step" ? "*" : slideSym(r, c, mid),
          px + cs / 2,
          py + cs / 2 + 5,
        );
      } else {
        ctx.fillStyle = darkMode ? "#333" : "#bbb";
        ctx.fillText("·", px + cs / 2, py + cs / 2 + 5);
      }
    }
  return sz * cs;
}

function renderHintSidebar(hx, hy) {
  let face = null,
    owner = null;
  // Popup hover face takes priority
  if (
    cellPopup &&
    cellPopupFaceHover >= 0 &&
    cellPopupHover >= 0 &&
    cellPopupHover < cellPopup.cubes.length
  ) {
    const cf = cellPopup.cubes[cellPopupHover].faces[cellPopupFaceHover];
    if (cf) {
      face = cf;
      owner = state.turn;
    }
  } else if (
    hoverPopupIdx >= 0 &&
    pendingPopup &&
    pendingPopup.hand[hoverHandIdx]
  ) {
    const faces = CUBE_FACES[pendingPopup.hand[hoverHandIdx].cube];
    if (faces && hoverPopupIdx < faces.length) {
      face = faces[hoverPopupIdx];
      owner = pendingPopup.owner;
    }
  } else if (
    state.mode === MODE.BOARD ||
    state.mode === MODE.GAME_OVER ||
    state.mode === MODE.DRAW
  ) {
    // Log preview: look up piece from snapshot
    const previewIdx = getLogPreviewIdx();
    if (previewIdx >= 0 && state.moveLog[previewIdx]) {
      const snap = state.moveLog[previewIdx].snapshot;
      const sp = snap.find(
        (p) => p.x === state.cursor.x && p.y === state.cursor.y,
      );
      if (sp) {
        face = sp.face;
        owner = sp.owner;
      }
    } else {
      const p = state.getPieceAt(state.cursor.x, state.cursor.y);
      if (p) {
        face = p.face;
        owner = p.owner;
      }
    }
  } else if (state.mode === MODE.SELECTED) {
    const p = state.pieces[state.selected];
    if (p) {
      face = p.face;
      owner = p.owner;
    }
  } else if (state.mode === MODE.FACE_SELECT) {
    face = state.dropFaces[state.faceIndex];
    owner = state.turn;
  } else if (state.mode === MODE.PROMOTE) {
    const idx = promoteHoverIdx >= 0 ? promoteHoverIdx : state.promoteHoverIdx;
    face = state.promoteChoices[idx];
    owner = state.turn;
  }
  if (!face) return;

  let cy = hy;
  const info = FACE_INFO[face];
  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = COL_YELLOW;
  ctx.textAlign = "left";
  ctx.fillText(info[0] + " " + face, hx, cy + 14);

  cy += 22;

  // Current face diagram
  const d1 = buildDiagram(face, owner);
  const w1 = drawDiagram(hx, cy, d1, owner);

  cy -= 22;
  const opp = OPPOSITES[face];
  if (opp) {
    const oi = FACE_INFO[opp];
    ctx.fillStyle = "#666";
    ctx.font = "16px sans-serif";
    ctx.fillText(t("hint_flip") + oi[0] + " " + opp, hx + w1 + 58, cy + 14);
  }
  cy += 22;
  // Opposite face diagram side by side
  if (opp) {
    const d2 = buildDiagram(opp, owner);
    drawDiagram(hx + w1 + 8, cy, d2, owner);
  }
  cy += d1.sz * 18 + 10;

  // Promotion info
  const promo = PROMOTIONS[face];
  if (promo) {
    ctx.font = "16px sans-serif";
    ctx.fillStyle = COL_RED;
    ctx.textAlign = "left";
    const names = promo.map((f) => FACE_INFO[f][0] + " " + f).join("/");
    ctx.fillText(t("hint_promote") + names, hx, cy + 12);
    cy += 20;
    let pdx = hx;
    for (const pf of promo) {
      const pd = buildDiagram(pf, owner);
      const pw = drawDiagram(pdx, cy, pd, owner);
      pdx += pw + 8;
    }
  }
}

// === RENDER: Log Panel & Log Browse ===
function getLogPreviewIdx() {
  if (logFocused && logFocusIdx >= 0) return logFocusIdx;
  if (logHoverIdx >= 0) return logHoverIdx;
  return -1;
}

function renderLogPanel(lx, ly) {
  logRowZones = [];
  if (!state.moveLog.length) return;
  const activeIdx = getLogPreviewIdx();
  ctx.font = "13px sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = logFocused ? COL_YELLOW : "#666";
  ctx.fillText(
    "── " + t("log_title") + (logFocused ? " ◀" : "") + " ──",
    lx,
    ly + 14,
  );
  const maxVisible = 10;
  const total = state.moveLog.length;
  const maxOffset = Math.max(0, total - maxVisible);
  logScrollOffset = Math.max(0, Math.min(logScrollOffset, maxOffset));
  const startIdx = maxOffset - logScrollOffset;
  const endIdx = Math.min(startIdx + maxVisible, total);
  let cy = ly + 28;
  const rowH = 19;
  for (let idx = startIdx; idx < endIdx; idx++) {
    const entry = state.moveLog[idx];
    const color = entry.owner === BLACK ? COL_WHITE : COL_CYAN;
    const ow = entry.owner === BLACK ? t("black_short") : t("white_short");
    // Highlight active row
    if (idx === activeIdx) {
      ctx.fillStyle = darkMode ? "#334" : "#c8bca0";
      ctx.fillRect(lx - 2, cy, 160, rowH);
    }
    ctx.font = "13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = idx === activeIdx ? COL_YELLOW : "#666";
    ctx.fillText(entry.num + ".", lx, cy + 14);
    ctx.fillStyle = color;
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(ow, lx + 24, cy + 14);
    ctx.font = "13px sans-serif";
    ctx.fillStyle = idx === activeIdx ? COL_YELLOW : darkMode ? "#aaa" : "#444";
    ctx.fillText(entry.text, lx + 42, cy + 14);
    logRowZones.push({ x: lx - 2, y: cy, w: 160, h: rowH, idx });
    clickZones.push({
      x: lx - 2,
      y: cy,
      w: 160,
      h: rowH,
      action: "logentry",
      data: idx,
    });
    cy += rowH;
  }
  logPanelZone = { x: lx - 2, y: ly, w: 160, h: cy - ly };
}

// === INPUT: Keyboard & Mouse ===
function setupInput() {
  canvas.addEventListener("keydown", (e) => {
    e.preventDefault();
    let key = e.key;
    if (key === " ") key = " ";
    handleKey(key);
  });

  // Hover: move cursor within board grid + hand piece hover
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left,
      my = e.clientY - rect.top;

    // Menu row hover detection
    if (state.mode === MODE.MENU) {
      let newMH = -1;
      for (let i = 0; i < menuRowZones.length; i++) {
        const z = menuRowZones[i];
        if (mx >= z.x && mx < z.x + z.w && my >= z.y && my < z.y + z.h) {
          newMH = i;
          break;
        }
      }
      if (newMH !== menuHoverIdx) {
        menuHoverIdx = newMH;
        redraw();
      }
      return;
    }

    // Check hand hover (include popup zone + diagram zone)
    let newHover = -1;
    let newPopIdx = -1;
    if (state.mode === MODE.BOARD && !isAI(state.turn)) {
      // Check if mouse is over the popup or its diagram
      const inPopup =
        popupZone &&
        hoverHandIdx >= 0 &&
        mx >= popupZone.x - 2 &&
        mx < popupZone.x + popupZone.w + 120 &&
        my >= popupZone.y - 2 &&
        my < popupZone.y + popupZone.h + 4;
      if (inPopup) {
        newHover = hoverHandIdx;
        // Detect which row
        if (
          mx >= popupZone.x &&
          mx < popupZone.x + popupZone.w &&
          my >= popupZone.y &&
          my < popupZone.y + popupZone.h
        ) {
          newPopIdx = Math.floor((my - popupZone.y - 2) / 24);
        } else {
          newPopIdx = hoverPopupIdx; // keep current if over diagram
        }
      } else {
        for (const hz of handZones) {
          if (
            mx >= hz.x &&
            mx < hz.x + hz.w &&
            my >= hz.y &&
            my < hz.y + hz.h
          ) {
            newHover = hz.idx;
            break;
          }
        }
      }
    }
    let needRedraw = false;
    if (newHover !== hoverHandIdx) {
      hoverHandIdx = newHover;
      hoverPopupIdx = newPopIdx;
      needRedraw = true;
    } else if (newPopIdx !== hoverPopupIdx) {
      hoverPopupIdx = newPopIdx;
      needRedraw = true;
    }
    if (needRedraw) redraw();

    // Cell popup hover
    if (cellPopup) {
      let newCH = -1,
        newCF = -1;
      const inFace =
        cellFaceZone &&
        mx >= cellFaceZone.x &&
        mx < cellFaceZone.x + cellFaceZone.w &&
        my >= cellFaceZone.y &&
        my < cellFaceZone.y + cellFaceZone.h;
      const inCube =
        cellPopupZone &&
        mx >= cellPopupZone.x &&
        mx < cellPopupZone.x + cellPopupZone.w &&
        my >= cellPopupZone.y &&
        my < cellPopupZone.y + cellPopupZone.h;
      if (inFace) {
        newCH = cellPopupHover;
        newCF = Math.floor((my - cellFaceZone.y - 2) / 24);
      } else if (inCube) {
        newCH = Math.floor((my - cellPopupZone.y - 2) / 24);
        newCF = -1;
      }
      if (newCH !== cellPopupHover || newCF !== cellPopupFaceHover) {
        cellPopupHover = newCH;
        cellPopupFaceHover = newCF;
        redraw();
      }
      return; // block board cursor
    }

    // Promote popup hover
    if (promotePopupZone && state.mode === MODE.PROMOTE) {
      const inProm = mx >= promotePopupZone.x && mx < promotePopupZone.x + promotePopupZone.w &&
                     my >= promotePopupZone.y && my < promotePopupZone.y + promotePopupZone.h;
      const newPH = inProm ? Math.floor((my - promotePopupZone.y - 2) / 24) : -1;
      if (newPH !== promoteHoverIdx) {
        promoteHoverIdx = newPH;
        redraw();
      }
      if (inProm) return;
    }

    // Log panel hover (only when not focused — focused uses keyboard)
    if (!logFocused) {
      let newLogHover = -1;
      for (const lz of logRowZones) {
        if (mx >= lz.x && mx < lz.x + lz.w && my >= lz.y && my < lz.y + lz.h) {
          newLogHover = lz.idx;
          break;
        }
      }
      if (newLogHover !== logHoverIdx) {
        logHoverIdx = newLogHover;
        redraw();
      }
    }

    // Board grid hover — skip if mouse is over popup/hand
    if (hoverHandIdx >= 0) return;
    if (!boardGeo) return;
    const m = state.mode;
    if (
      m !== MODE.BOARD &&
      m !== MODE.SELECTED &&
      m !== MODE.DROP_TARGET &&
      m !== MODE.SETUP_BLACK_GYOKU &&
      m !== MODE.SETUP_WHITE_GYOKU &&
      m !== MODE.GAME_OVER &&
      m !== MODE.DRAW
    )
      return;
    const { bx, by, x1, x2, y1, y2 } = boardGeo;
    const col = Math.floor((mx - bx) / CELL);
    const row = Math.floor((my - by) / CELL);
    const gx = x1 + col,
      gy = y2 - row;
    if (gx >= x1 && gx <= x2 && gy >= y1 && gy <= y2) {
      if (state.cursor.x !== gx || state.cursor.y !== gy) {
        state.cursor.x = gx;
        state.cursor.y = gy;
        redraw();
      }
    }
  });

  canvas.addEventListener("mouseleave", () => {
    if (hoverHandIdx !== -1 || hoverPopupIdx !== -1) {
      hoverHandIdx = -1;
      hoverPopupIdx = -1;
    }
    if (logHoverIdx !== -1) {
      logHoverIdx = -1;
    }
    if (menuHoverIdx !== -1) {
      menuHoverIdx = -1;
    }
    promoteHoverIdx = -1;
    redraw();
  });

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left,
      my = e.clientY - rect.top;
    // Check click zones in reverse (top-most first)
    for (let i = clickZones.length - 1; i >= 0; i--) {
      const z = clickZones[i];
      if (mx >= z.x && mx < z.x + z.w && my >= z.y && my < z.y + z.h) {
        if (z.action === "key") {
          handleKey(z.data);
        } else if (z.action === "cell") {
          // Block if click is inside a popup zone
          const inPop = (zone) =>
            zone &&
            mx >= zone.x &&
            mx < zone.x + zone.w &&
            my >= zone.y &&
            my < zone.y + zone.h;
          if (inPop(cellPopupZone) || inPop(cellFaceZone) || inPop(popupZone) || inPop(promotePopupZone)) {
            redraw();
            return;
          }
          handleCellClick(z.data.x, z.data.y);
        } else if (z.action === "hand") {
          state.handIndex = z.data;
          handleKey("Enter");
        } else if (z.action === "face") {
          state.faceIndex = z.data;
          handleKey("Enter");
        } else if (z.action === "promote") {
          state.promoteHoverIdx = z.data;
          handleKey("Enter");
        } else if (z.action === "quickdrop") {
          // Direct drop: select piece, set face, compute drops, enter DROP_TARGET
          const piece = state.pieces[z.data.pieceIdx];
          const face = z.data.face;
          const drops = getLegalDrops(state, piece.owner, face);
          if (!drops.length) {
            state.message = t("no_drop_pos");
            redraw();
            return;
          }
          piece.face = face;
          state.selected = z.data.pieceIdx;
          state.dropFaces = CUBE_FACES[piece.cube];
          state.faceIndex = state.dropFaces.indexOf(face);
          state.dropTargets = drops;
          state.mode = MODE.DROP_TARGET;
          state.message = t("choose_drop_pos");
          hoverHandIdx = -1;
          redraw();
        } else if (z.action === "celldrop") {
          const piece = state.pieces[z.data.pieceIdx];
          piece.face = z.data.face;
          piece.x = z.data.gx;
          piece.y = z.data.gy;
          piece.owner = state.turn;
          logMove(
            piece.owner,
            `${fk(piece.face)}↓(${z.data.gx},${z.data.gy})`,
            piece.face,
            null,
            { x: z.data.gx, y: z.data.gy },
          );
          cellPopup = null;
          cellPopupHover = -1;
          cellPopupFaceHover = -1;
          state.selected = null;
          endTurn();
        } else if (z.action === "logentry") {
          logFocused = true;
          logFocusIdx = z.data;
          logHoverIdx = -1;
          redraw();
        }
        return;
      }
    }
    // No zone hit — dismiss popups, exit log focus, or cancel drop
    if (logFocused) {
      logFocused = false;
      logFocusIdx = -1;
      redraw();
    } else if (cellPopup) {
      closeCellPopup();
    } else if (state.mode === MODE.DROP_TARGET) {
      handleKey("Escape");
    } else if (state.mode === MODE.SELECTED) {
      handleKey("Escape");
    }
  });

  canvas.addEventListener(
    "wheel",
    (e) => {
      if (!logPanelZone) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (
        mx < logPanelZone.x ||
        mx > logPanelZone.x + logPanelZone.w ||
        my < logPanelZone.y ||
        my > logPanelZone.y + logPanelZone.h
      )
        return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;
      const maxOff = Math.max(0, state.moveLog.length - 10);
      const b_delta =
        Math.max(0, Math.min(logScrollOffset + delta, maxOff)) -
        logScrollOffset;
      logScrollOffset += b_delta;
      if (!logFocused) {
        let newLogHover = -1;
        for (const lz of logRowZones) {
          if (
            mx >= lz.x &&
            mx < lz.x + lz.w &&
            my >= lz.y + lz.h * b_delta &&
            my < lz.y + (1 + b_delta) * lz.h
          ) {
            newLogHover = lz.idx;
            break;
          }
        }
        if (newLogHover !== logHoverIdx) {
          logHoverIdx = newLogHover;
        }
      }
      redraw();
    },
    { passive: false },
  );
}

function handleCellClick(x, y) {
  // Close any open popups, then continue with normal click logic
  if (cellPopup) closeCellPopup();
  if (hoverHandIdx >= 0) {
    hoverHandIdx = -1;
    hoverPopupIdx = -1;
  }
  const m = state.mode;
  if (m === MODE.SETUP_BLACK_GYOKU || m === MODE.SETUP_WHITE_GYOKU) {
    state.cursor.x = x;
    state.cursor.y = y;
    handleKey("Enter");
  } else if (m === MODE.BOARD) {
    const piece = state.getPieceAt(x, y);
    if (piece && piece.owner === state.turn) {
      state.cursor.x = x;
      state.cursor.y = y;
      handleKey("Enter");
    } else if (!piece && !isAI(state.turn)) {
      // Empty cell: open cell drop popup if player has hand pieces
      state.cursor.x = x;
      state.cursor.y = y;
      const hand = state.getHandPieces(state.turn);
      if (hand.length) {
        openCellPopup(x, y, hand);
      } else {
        redraw();
      }
    } else {
      state.cursor.x = x;
      state.cursor.y = y;
      redraw();
    }
  } else if (m === MODE.SELECTED) {
    const move = state.legalMoves.find((mv) => mv.x === x && mv.y === y);
    if (move) {
      state.cursor.x = x;
      state.cursor.y = y;
      handleKey("Enter");
    } else {
      // Click own piece: same piece = cancel, different = switch selection
      const piece = state.getPieceAt(x, y);
      if (piece && piece.owner === state.turn) {
        const selPiece = state.pieces[state.selected];
        if (selPiece && selPiece.x === x && selPiece.y === y) {
          handleKey("Escape");
        } else {
          state.selected = null;
          state.legalMoves = [];
          state.mode = MODE.BOARD;
          state.cursor.x = x;
          state.cursor.y = y;
          handleKey("Enter");
        }
      } else {
        // Invalid cell — cancel selection
        handleKey("Escape");
      }
    }
  } else if (m === MODE.DROP_TARGET) {
    const drop = state.dropTargets.find((d) => d.x === x && d.y === y);
    if (drop) {
      state.cursor.x = x;
      state.cursor.y = y;
      handleKey("Enter");
    } else {
      // Invalid position — cancel drop, reopen popup
      handleKey("Escape");
    }
  }
}

// === INIT ===
canvas = document.getElementById("c");
ctx = canvas.getContext("2d");
setupInput();
canvas.focus();
redraw();
