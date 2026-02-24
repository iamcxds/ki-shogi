// Ki Shogi - Piece and GameState classes
const { BLACK, WHITE, CUBE_GYOKU, CUBE_HI, CUBE_KAKU, CUBE_KI, FACE_CUBE } = require('./types');
const { t } = require('./lang');

class Piece {
  constructor(id, owner, cube, face, x = null, y = null) {
    this.id = id;
    this.owner = owner;
    this.cube = cube;
    this.face = face;
    this.x = x;
    this.y = y;
  }
  get onBoard() { return this.x !== null; }
  get key() { return `${this.x},${this.y}`; }
}

// UI modes
const MODE = {
  MENU: 'menu',
  SETUP_BLACK_GYOKU: 'setup_black_gyoku',
  SETUP_WHITE_GYOKU: 'setup_white_gyoku',
  BOARD: 'board',
  SELECTED: 'selected',
  HAND: 'hand',
  FACE_SELECT: 'face_select',
  DROP_TARGET: 'drop_target',
  PROMOTE: 'promote',
  GAME_OVER: 'game_over',
  DRAW: 'draw',
  TUTORIAL: 'tutorial',
  LOG_BROWSE: 'log_browse',
};

class GameState {
  constructor() {
    this.pieces = [];
    this.turn = BLACK;
    this.useKi = false;
    this.mode = MODE.MENU;
    this.cursor = { x: 0, y: 0 };
    this.selected = null;       // selected piece index
    this.legalMoves = [];       // [{x,y,capture?}]
    this.handPieces = [];       // pieces in current player's hand (for hand mode)
    this.handIndex = 0;         // cursor in hand selection
    this.dropFaces = [];        // available faces for drop
    this.faceIndex = 0;         // cursor in face selection
    this.dropTargets = [];      // legal drop positions
    this.dropIndex = 0;         // cursor in drop target selection
    this.promoteChoices = [];   // promotion face options
    this.promoteIndex = 0;
    this.pendingCapture = null; // piece being captured, awaiting promotion
    this.pendingMove = null;    // {piece, tx, ty} awaiting promotion
    this.message = '';
    this.winner = null;
    this.inCheck = false;
    this.aiSide = null;        // null=local, BLACK/WHITE=AI controls that side
    this.aiDifficulty = 2;     // 1=easy, 2=medium, 3=hard
    this.menuStep = 1;         // 1=opponent, 2=pieces, 3=difficulty, 4=side
    this.tutorialPage = 0;
    this.moveLog = [];          // [{num, owner, text, snapshot}]
    this.logIndex = -1;         // cursor in log browse mode
    this.moveNum = 0;
    this.pendingLogInfo = null;
    this.positionHistory = new Map();
    this.paused = false;
  }

  startGame(useKi, aiSide) {
    this.useKi = useKi;
    this.aiSide = aiSide || null;
    this._initPieces();
    this.mode = MODE.SETUP_BLACK_GYOKU;
    this.message = t('place_black_gyoku');
  }

  _initPieces() {
    let id = 0;
    for (const owner of [BLACK, WHITE]) {
      this.pieces.push(new Piece(id++, owner, CUBE_GYOKU, 'Gyoku'));
      this.pieces.push(new Piece(id++, owner, CUBE_HI, 'Hi'));
      this.pieces.push(new Piece(id++, owner, CUBE_KAKU, 'Kaku'));
      if (this.useKi) this.pieces.push(new Piece(id++, owner, CUBE_KI, 'Ki'));
    }
  }

  // Build position map for O(1) lookup
  buildBoardMap() {
    const map = new Map();
    for (const p of this.pieces) {
      if (p.onBoard) map.set(p.key, p);
    }
    return map;
  }

  getPieceAt(x, y) {
    return this.pieces.find(p => p.onBoard && p.x === x && p.y === y) || null;
  }

  getGyoku(owner) {
    return this.pieces.find(p => p.owner === owner && p.cube === CUBE_GYOKU);
  }

  getHandPieces(owner) {
    return this.pieces.filter(p => p.owner === owner && !p.onBoard && p.cube !== CUBE_GYOKU);
  }

  getBoardPieces(owner) {
    return this.pieces.filter(p => p.owner === owner && p.onBoard);
  }

  switchTurn() {
    this.turn = this.turn === BLACK ? WHITE : BLACK;
  }
}

module.exports = { Piece, GameState, MODE };
