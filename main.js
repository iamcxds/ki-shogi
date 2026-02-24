#!/usr/bin/env node
// Ki Shogi - Main entry point
const { BLACK, WHITE, CUBE_GYOKU, CUBE_FACES, OPPOSITES, PROMOTIONS, FACE_INFO } = require('./types');
const { GameState, MODE } = require('./state');
const { getLegalMoves, getLegalDrops, isInCheck, handleStranding, hasLegalAction, getWhiteGyokuPositions, chebDist, getMoveVectors, isPieceSupported } = require('./rules');
const { render, cleanup } = require('./render');
const { setupInput, KEY } = require('./input');
const { t, toggleLang } = require('./lang');

// Face values based on mobility/power
const FACE_VALUES = {
  Gyoku: 0,
  Hi: 80, Cho: 30, Han: 50, Chuu: 15, Ou: 55, Shu: 55,
  Kaku: 80, Myou: 30, Hon: 60, Ga: 20, Zou: 60, Ken: 20,
  Ki: 45, Hou: 45, Ro: 25, Ja: 25, Ba: 20, Ryuu: 20,
};

const state = new GameState();

function isAI(owner) { return state.aiSide === 'both' || state.aiSide === owner; }

function redraw() { render(state); }

function positionHash(state) {
  const bg = state.getGyoku(BLACK);
  const ox = bg.x, oy = bg.y;
  const board = state.pieces.filter(p => p.onBoard)
    .map(p => `${p.x - ox},${p.y - oy},${p.owner},${p.face}`)
    .sort().join(';');
  const hand = state.pieces.filter(p => !p.onBoard)
    .map(p => `${p.owner},${p.cube},${p.face}`)
    .sort().join(';');
  return `${state.turn}|${board}|${hand}`;
}

function fk(face) { return FACE_INFO[face] ? FACE_INFO[face][0] : face; }

function logMove(owner, text, face, from, to) {
  state.moveNum++;
  const snapshot = state.pieces.map(p => ({ id: p.id, owner: p.owner, cube: p.cube, face: p.face, x: p.x, y: p.y }));
  state.moveLog.push({ num: state.moveNum, owner, text, snapshot, face: face || null, from: from || null, to: to || null });
}

function quit() {
  cleanup();
  process.exit(0);
}

function endTurn() {
  // Handle stranding
  handleStranding(state);
  state.switchTurn();
  state.message = '';

  // Check win condition
  if (!hasLegalAction(state, state.turn)) {
    const winner = state.turn === BLACK ? WHITE : BLACK;
    state.winner = winner;
    state.mode = MODE.GAME_OVER;
    redraw();
    return;
  }

  state.inCheck = isInCheck(state, state.turn);

  // Sennichite (千日手) check
  const hash = positionHash(state);
  if (!state.positionHistory.has(hash)) state.positionHistory.set(hash, []);
  const hist = state.positionHistory.get(hash);
  hist.push({ inCheck: state.inCheck });
  if (hist.length === 3) {
    state.message = hist.every(h => h.inCheck) ? t('perpetual_check_warning') : t('sennichite_warning');
  }
  if (hist.length >= 4) {
    if (hist.every(h => h.inCheck)) {
      // Perpetual check: the player whose turn it is NOT (the checker) loses
      state.winner = state.turn;
      state.mode = MODE.GAME_OVER;
      state.message = t('perpetual_check_lose');
      redraw();
      return;
    }
    state.mode = MODE.DRAW;
    state.message = t('sennichite');
    redraw();
    return;
  }

  state.mode = MODE.BOARD;
  state.selected = null;
  state.legalMoves = [];
  // Center cursor on own Gyoku
  const g = state.getGyoku(state.turn);
  if (g && g.onBoard) {
    state.cursor.x = g.x;
    state.cursor.y = g.y;
  }
  redraw();
  if (isAI(state.turn) && !state.paused) setTimeout(aiMove, 300);
}

function handleKey(key) {
  if (key === KEY.Q) return quit();
  if (key === KEY.L) { toggleLang(); redraw(); return; }
  if (key === KEY.R && state.mode !== MODE.MENU) {
    const useKi = state.useKi, aiSide = state.aiSide, aiDiff = state.aiDifficulty;
    Object.assign(state, new GameState());
    state.startGame(useKi, aiSide);
    state.aiDifficulty = aiDiff;
    redraw();
    if (isAI(BLACK)) setTimeout(aiSetupBlackGyoku, 300);
    return;
  }
  if (key === KEY.M && state.mode !== MODE.MENU) {
    Object.assign(state, new GameState());
    redraw();
    return;
  }
  // During AI turn: allow cursor, Tab, Space (pause), block the rest
  if (state.aiSide && isAI(state.turn) && state.mode === MODE.BOARD) {
    if (key === KEY.SPACE) {
      state.paused = !state.paused;
      if (!state.paused) setTimeout(aiMove, 300);
      redraw();
      return;
    }
    if (key === KEY.UP) { state.cursor.y++; redraw(); return; }
    if (key === KEY.DOWN) { state.cursor.y--; redraw(); return; }
    if (key === KEY.LEFT) { state.cursor.x--; redraw(); return; }
    if (key === KEY.RIGHT) { state.cursor.x++; redraw(); return; }
    if (key === KEY.TAB && state.moveLog.length > 0) {
      state.logIndex = state.moveLog.length - 1;
      state._preLogMode = MODE.BOARD;
      state.mode = MODE.LOG_BROWSE;
      redraw();
      return;
    }
    return;
  }

  switch (state.mode) {
    case MODE.MENU: return onMenu(key);
    case MODE.SETUP_BLACK_GYOKU: return onSetupBlackGyoku(key);
    case MODE.SETUP_WHITE_GYOKU: return onSetupWhiteGyoku(key);
    case MODE.BOARD: return onBoard(key);
    case MODE.SELECTED: return onSelected(key);
    case MODE.HAND: return onHand(key);
    case MODE.FACE_SELECT: return onFaceSelect(key);
    case MODE.DROP_TARGET: return onDropTarget(key);
    case MODE.PROMOTE: return onPromote(key);
    case MODE.TUTORIAL: return onTutorial(key);
    case MODE.LOG_BROWSE: return onLogBrowse(key);
    case MODE.GAME_OVER:
    case MODE.DRAW:
      if (key === KEY.TAB && state.moveLog.length > 0) {
        state.logIndex = state.moveLog.length - 1;
        state._preLogMode = state.mode;
        state.mode = MODE.LOG_BROWSE;
        redraw();
      }
      return;
  }
}

// === Menu ===

function onMenu(key) {
  if (state.menuStep === 1) {
    // 选择对手
    if (key === KEY.ONE) state._wantAI = false;
    else if (key === KEY.TWO) state._wantAI = true;
    else if (key === KEY.THREE) {
      state.tutorialPage = 0;
      state.mode = MODE.TUTORIAL;
      redraw();
      return;
    }
    else return;
    state.menuStep = 2;
  } else if (state.menuStep === 2) {
    // 选择棋子
    if (key === KEY.ONE) state.useKi = false;
    else if (key === KEY.TWO) state.useKi = true;
    else return;
    if (state._wantAI) {
      state.menuStep = 3;
    } else {
      state.startGame(state.useKi, null);
    }
  } else if (state.menuStep === 3) {
    // 选择难度
    if (key === KEY.ONE) state.aiDifficulty = 1;
    else if (key === KEY.TWO) state.aiDifficulty = 2;
    else if (key === KEY.THREE) state.aiDifficulty = 3;
    else return;
    state.menuStep = 4;
  } else if (state.menuStep === 4) {
    // 选择先后手
    let aiSide;
    if (key === KEY.ONE) aiSide = WHITE;
    else if (key === KEY.TWO) aiSide = BLACK;
    else if (key === KEY.THREE) aiSide = Math.random() < 0.5 ? BLACK : WHITE;
    else if (key === KEY.FOUR) aiSide = 'both';
    else return;
    state.startGame(state.useKi, aiSide);
    if (isAI(BLACK)) setTimeout(aiSetupBlackGyoku, 300);
  }
  redraw();
}

function onTutorial(key) {
  if (key === KEY.ESC) {
    state.mode = MODE.MENU;
    state.menuStep = 1;
  } else if (key === KEY.RIGHT && state.tutorialPage < 6) {
    state.tutorialPage++;
  } else if (key === KEY.LEFT && state.tutorialPage > 0) {
    state.tutorialPage--;
  }
  redraw();
}

function onLogBrowse(key) {
  if (key === KEY.ESC || key === KEY.TAB) {
    state.mode = state._preLogMode || MODE.BOARD;
    state._preLogMode = null;
  } else if (key === KEY.UP) {
    state.logIndex = Math.max(0, state.logIndex - 1);
  } else if (key === KEY.DOWN) {
    state.logIndex = Math.min(state.moveLog.length - 1, state.logIndex + 1);
  }
  redraw();
}

// === Setup phases ===

function onSetupBlackGyoku(key) {
  if (key === KEY.UP) state.cursor.y++;
  else if (key === KEY.DOWN) state.cursor.y--;
  else if (key === KEY.LEFT) state.cursor.x--;
  else if (key === KEY.RIGHT) state.cursor.x++;
  else if (key === KEY.ENTER) {
    const g = state.getGyoku(BLACK);
    g.x = state.cursor.x;
    g.y = state.cursor.y;
    g.face = 'Gyoku';
    state.mode = MODE.SETUP_WHITE_GYOKU;
    // Set cursor to valid white position, prefer directly above (max y)
    const positions = getWhiteGyokuPositions(state);
    if (positions.length > 0) {
      const best = positions.reduce((a, b) => b.y > a.y || (b.y === a.y && Math.abs(b.x) < Math.abs(a.x)) ? b : a);
      state.cursor.x = best.x;
      state.cursor.y = best.y;
      state.legalMoves = positions;
    }
    state.turn = WHITE;
    state.message = '';
    if (isAI(WHITE)) setTimeout(aiSetupWhiteGyoku, 300);
  }
  redraw();
}

function onSetupWhiteGyoku(key) {
  const positions = getWhiteGyokuPositions(state);
  const posSet = new Set(positions.map(p => `${p.x},${p.y}`));

  if (key === KEY.UP) state.cursor.y++;
  else if (key === KEY.DOWN) state.cursor.y--;
  else if (key === KEY.LEFT) state.cursor.x--;
  else if (key === KEY.RIGHT) state.cursor.x++;
  else if (key === KEY.ENTER) {
    if (posSet.has(`${state.cursor.x},${state.cursor.y}`)) {
      const g = state.getGyoku(WHITE);
      g.x = state.cursor.x;
      g.y = state.cursor.y;
      g.face = 'Gyoku';
      state.legalMoves = [];
      state.turn = BLACK;
      state.mode = MODE.BOARD;
      const bg = state.getGyoku(BLACK);
      state.cursor.x = bg.x;
      state.cursor.y = bg.y;
      state.message = t('game_start');
      if (isAI(BLACK)) setTimeout(aiMove, 300);
    } else {
      state.message = t('invalid_pos');
    }
  }
  redraw();
}

// === Board mode ===

function onBoard(key) {
  if (key === KEY.UP) state.cursor.y++;
  else if (key === KEY.DOWN) state.cursor.y--;
  else if (key === KEY.LEFT) state.cursor.x--;
  else if (key === KEY.RIGHT) state.cursor.x++;
  else if (key === KEY.TAB) {
    if (state.moveLog.length > 0) {
      state.logIndex = state.moveLog.length - 1;
      state._preLogMode = MODE.BOARD;
      state.mode = MODE.LOG_BROWSE;
    }
  } else if (key === KEY.D) {
    // Switch to hand mode
    const hand = state.getHandPieces(state.turn);
    if (hand.length === 0) {
      state.message = t('no_hand');
      redraw();
      return;
    }
    state.handPieces = hand;
    state.handIndex = 0;
    state.mode = MODE.HAND;
  } else if (key === KEY.ENTER) {
    const piece = state.getPieceAt(state.cursor.x, state.cursor.y);
    if (piece && piece.owner === state.turn) {
      const moves = getLegalMoves(state, piece);
      if (moves.length === 0) {
        state.message = isInCheck(state, state.turn) ? t('no_moves_check') : t('no_moves');
        redraw();
        return;
      }
      state.selected = state.pieces.indexOf(piece);
      state.legalMoves = moves;
      state.mode = MODE.SELECTED;
    } else {
      state.message = piece ? t('not_yours') : t('empty_sq');
    }
  }
  redraw();
}

// === Selected mode (choosing move target) ===

function onSelected(key) {
  if (key === KEY.ESC) {
    state.selected = null;
    state.legalMoves = [];
    state.mode = MODE.BOARD;
    state.message = '';
    redraw();
    return;
  }
  if (key === KEY.UP) state.cursor.y++;
  else if (key === KEY.DOWN) state.cursor.y--;
  else if (key === KEY.LEFT) state.cursor.x--;
  else if (key === KEY.RIGHT) state.cursor.x++;
  else if (key === KEY.ENTER) {
    const move = state.legalMoves.find(m => m.x === state.cursor.x && m.y === state.cursor.y);
    if (!move) {
      state.message = t('invalid_target');
      redraw();
      return;
    }
    executeMove(state.pieces[state.selected], move);
    return;
  }
  redraw();
}

function executeMove(piece, move, promoteTo) {
  const ox = piece.x, oy = piece.y, of = piece.face;
  const mFrom = {x: ox, y: oy}, mTo = {x: move.x, y: move.y};
  if (move.capture) {
    const captured = move.capture;

    // Capturing Gyoku = immediate win
    if (captured.cube === CUBE_GYOKU) {
      piece.x = move.x; piece.y = move.y;
      captured.x = null; captured.y = null;
      logMove(piece.owner, `${fk(of)}(${ox},${oy})×${fk('Gyoku')}(${move.x},${move.y})`, of, mFrom, mTo);
      state.winner = piece.owner;
      state.mode = MODE.GAME_OVER;
      state.selected = null; state.legalMoves = [];
      redraw();
      return;
    }

    captured.x = null;
    captured.y = null;
    captured.owner = piece.owner;

    piece.x = move.x;
    piece.y = move.y;

    // Promotion
    const capBase = `${fk(of)}(${ox},${oy})×${fk(captured.face)}(${move.x},${move.y})`;
    if (piece.cube !== CUBE_GYOKU && PROMOTIONS[piece.face]) {
      const choices = PROMOTIONS[piece.face];
      if (choices.length === 1) {
        piece.face = choices[0];
        logMove(piece.owner, `${capBase}→${fk(choices[0])}`, of, mFrom, mTo);
        state.selected = null;
        state.legalMoves = [];
        endTurn();
      } else if (promoteTo) {
        piece.face = promoteTo;
        logMove(piece.owner, `${capBase}→${fk(promoteTo)}`, of, mFrom, mTo);
        state.selected = null;
        state.legalMoves = [];
        endTurn();
      } else if (isAI(piece.owner)) {
        piece.face = choices.reduce((a, b) => (FACE_VALUES[a] || 0) >= (FACE_VALUES[b] || 0) ? a : b);
        logMove(piece.owner, `${capBase}→${fk(piece.face)}`, of, mFrom, mTo);
        state.selected = null;
        state.legalMoves = [];
        endTurn();
      } else {
        state.promoteChoices = choices;
        state.promoteIndex = 0;
        state.pendingCapture = captured;
        state.pendingLogInfo = { owner: piece.owner, capBase, face: of, from: mFrom, to: mTo };
        state.mode = MODE.PROMOTE;
        redraw();
      }
    } else {
      logMove(piece.owner, capBase, of, mFrom, mTo);
      state.selected = null;
      state.legalMoves = [];
      endTurn();
    }
  } else {
    // Non-capture: move and flip
    piece.x = move.x;
    piece.y = move.y;
    if (piece.cube !== CUBE_GYOKU && OPPOSITES[piece.face]) {
      piece.face = OPPOSITES[piece.face];
    }
    const flipped = piece.face !== of ? `=${fk(piece.face)}` : '';
    logMove(piece.owner, `${fk(of)}(${ox},${oy})→(${move.x},${move.y})${flipped}`, of, mFrom, mTo);
    state.selected = null;
    state.legalMoves = [];
    endTurn();
  }
}

// === Hand mode (choosing piece to drop) ===

function onHand(key) {
  if (key === KEY.ESC) {
    state.mode = MODE.BOARD;
    state.message = '';
    redraw();
    return;
  }
  if (key === KEY.UP) state.handIndex = Math.max(0, state.handIndex - 1);
  else if (key === KEY.DOWN) state.handIndex = Math.min(state.handPieces.length - 1, state.handIndex + 1);
  else if (key === KEY.ENTER) {
    const piece = state.handPieces[state.handIndex];
    const faces = CUBE_FACES[piece.cube];
    if (!faces) { state.message = t('cant_drop'); redraw(); return; }
    state.dropFaces = faces;
    state.faceIndex = 0;
    state.selected = state.pieces.indexOf(piece);
    state.mode = MODE.FACE_SELECT;
  }
  redraw();
}

// === Face select mode ===

function onFaceSelect(key) {
  if (key === KEY.ESC) {
    state.mode = MODE.HAND;
    state.message = '';
    redraw();
    return;
  }
  if (key === KEY.UP) state.faceIndex = Math.max(0, state.faceIndex - 1);
  else if (key === KEY.DOWN) state.faceIndex = Math.min(state.dropFaces.length - 1, state.faceIndex + 1);
  else if (key === KEY.ENTER) {
    const face = state.dropFaces[state.faceIndex];
    const drops = getLegalDrops(state, state.turn, face);
    if (drops.length === 0) {
      state.message = t('no_drop_pos');
      redraw();
      return;
    }
    state.pieces[state.selected].face = face;
    state.dropTargets = drops;
    state.mode = MODE.DROP_TARGET;
    // Move cursor to first drop target
    state.cursor.x = drops[0].x;
    state.cursor.y = drops[0].y;
  }
  redraw();
}

// === Drop target mode ===

function onDropTarget(key) {
  if (key === KEY.ESC) {
    state.dropTargets = [];
    state.mode = MODE.FACE_SELECT;
    state.message = '';
    redraw();
    return;
  }
  if (key === KEY.UP) state.cursor.y++;
  else if (key === KEY.DOWN) state.cursor.y--;
  else if (key === KEY.LEFT) state.cursor.x--;
  else if (key === KEY.RIGHT) state.cursor.x++;
  else if (key === KEY.ENTER) {
    const drop = state.dropTargets.find(d => d.x === state.cursor.x && d.y === state.cursor.y);
    if (!drop) {
      state.message = t('invalid_drop');
      redraw();
      return;
    }
    const piece = state.pieces[state.selected];
    piece.x = drop.x;
    piece.y = drop.y;
    logMove(piece.owner, `${fk(piece.face)}↓(${drop.x},${drop.y})`, piece.face, null, {x: drop.x, y: drop.y});
    state.selected = null;
    state.dropTargets = [];
    endTurn();
    return;
  }
  redraw();
}

// === Promote mode ===

function onPromote(key) {
  if (key === KEY.UP) state.promoteIndex = Math.max(0, state.promoteIndex - 1);
  else if (key === KEY.DOWN) state.promoteIndex = Math.min(state.promoteChoices.length - 1, state.promoteIndex + 1);
  else if (key === KEY.ENTER) {
    const piece = state.pieces[state.selected];
    piece.face = state.promoteChoices[state.promoteIndex];
    if (state.pendingLogInfo) {
      logMove(state.pendingLogInfo.owner, `${state.pendingLogInfo.capBase}→${fk(piece.face)}`, state.pendingLogInfo.face, state.pendingLogInfo.from, state.pendingLogInfo.to);
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

// === AI ===

function aiSetupBlackGyoku() {
  const g = state.getGyoku(BLACK);
  g.x = 0; g.y = 0; g.face = 'Gyoku';
  state.mode = MODE.SETUP_WHITE_GYOKU;
  const positions = getWhiteGyokuPositions(state);
  if (positions.length > 0) {
    const best = positions.reduce((a, b) => b.y > a.y || (b.y === a.y && Math.abs(b.x) < Math.abs(a.x)) ? b : a);
    state.cursor.x = best.x; state.cursor.y = best.y;
    state.legalMoves = positions;
  }
  state.turn = WHITE;
  state.message = '';
  redraw();
  if (isAI(WHITE)) setTimeout(aiSetupWhiteGyoku, 300);
}

function aiSetupWhiteGyoku() {
  const positions = getWhiteGyokuPositions(state);
  const pick = positions[Math.floor(Math.random() * positions.length)];
  const g = state.getGyoku(WHITE);
  g.x = pick.x; g.y = pick.y; g.face = 'Gyoku';
  state.legalMoves = [];
  state.turn = BLACK;
  state.mode = MODE.BOARD;
  const bg = state.getGyoku(BLACK);
  state.cursor.x = bg.x; state.cursor.y = bg.y;
  state.message = t('game_start');
  redraw();
  if (isAI(BLACK)) setTimeout(aiMove, 300);
}

function evaluate(state, aiOwner) {
  const opponent = aiOwner === BLACK ? WHITE : BLACK;
  let score = 0;
  for (const p of state.pieces) {
    if (p.cube === CUBE_GYOKU) continue;
    const val = FACE_VALUES[p.face] || 0;
    const sign = p.owner === aiOwner ? 1 : -1;
    if (p.onBoard && !isPieceSupported(state, p.x, p.y, p.cube)) {
      score -= sign * (val + 20);
    } else {
      score += sign * (val + (p.onBoard ? 10 : 0));
    }
  }
  const oppG = state.getGyoku(opponent);
  if (oppG && oppG.onBoard) {
    for (const p of state.pieces) {
      if (p.owner === aiOwner && p.onBoard && p.cube !== CUBE_GYOKU) {
        score += Math.max(0, 5 - chebDist(p.x, p.y, oppG.x, oppG.y));
      }
    }
  }
  if (isInCheck(state, opponent)) score += 30;
  if (isInCheck(state, aiOwner)) score -= 30;
  return score;
}

function getAllActions(state, owner) {
  const actions = [];
  for (const p of state.pieces) {
    if (p.owner === owner && p.onBoard) {
      for (const m of getLegalMoves(state, p)) {
        if (m.capture && p.cube !== CUBE_GYOKU && PROMOTIONS[p.face]) {
          for (const pf of PROMOTIONS[p.face]) {
            actions.push({ type: 'move', piece: p, move: m, promoteTo: pf });
          }
        } else {
          actions.push({ type: 'move', piece: p, move: m, promoteTo: null });
        }
      }
    }
  }
  for (const p of state.getHandPieces(owner)) {
    const faces = CUBE_FACES[p.cube];
    if (!faces) continue;
    for (const face of faces) {
      for (const d of getLegalDrops(state, owner, face)) {
        actions.push({ type: 'drop', piece: p, face, pos: d });
      }
    }
  }
  return actions;
}

function applyAction(state, action) {
  const p = action.piece;
  const undo = { px: p.x, py: p.y, pface: p.face };
  if (action.type === 'move') {
    const m = action.move;
    if (m.capture) {
      const c = m.capture;
      undo.cx = c.x; undo.cy = c.y; undo.cowner = c.owner; undo.cface = c.face;
      c.x = null; c.y = null; c.owner = p.owner;
      p.x = m.x; p.y = m.y;
      if (action.promoteTo) p.face = action.promoteTo;
    } else {
      p.x = m.x; p.y = m.y;
      if (p.cube !== CUBE_GYOKU && OPPOSITES[p.face]) p.face = OPPOSITES[p.face];
    }
  } else {
    p.face = action.face;
    p.x = action.pos.x; p.y = action.pos.y;
  }
  return undo;
}

function undoAction(state, action, undo) {
  const p = action.piece;
  p.x = undo.px; p.y = undo.py; p.face = undo.pface;
  if (action.type === 'move' && action.move.capture) {
    const c = action.move.capture;
    c.x = undo.cx; c.y = undo.cy; c.owner = undo.cowner; c.face = undo.cface;
  }
}

function moveOrderScore(a) {
  if (a.type !== 'move') return 0;
  if (a.move.capture) {
    if (a.move.capture.cube === CUBE_GYOKU) return 10000;
    return 100 + (FACE_VALUES[a.move.capture.face] || 0);
  }
  return 0;
}

function minimax(state, depth, alpha, beta, isMax, aiOwner) {
  if (depth === 0) return evaluate(state, aiOwner);
  const current = isMax ? aiOwner : (aiOwner === BLACK ? WHITE : BLACK);
  const actions = getAllActions(state, current);
  if (actions.length === 0) return isMax ? -9999 : 9999;
  actions.sort((a, b) => moveOrderScore(b) - moveOrderScore(a));
  if (isMax) {
    let best = -Infinity;
    for (const action of actions) {
      if (action.type === 'move' && action.move.capture && action.move.capture.cube === CUBE_GYOKU) return 9999;
      const u = applyAction(state, action);
      const val = minimax(state, depth - 1, alpha, beta, false, aiOwner);
      undoAction(state, action, u);
      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const action of actions) {
      if (action.type === 'move' && action.move.capture && action.move.capture.cube === CUBE_GYOKU) return -9999;
      const u = applyAction(state, action);
      const val = minimax(state, depth - 1, alpha, beta, true, aiOwner);
      undoAction(state, action, u);
      best = Math.min(best, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function aiRepetitionPenalty(action, owner) {
  const opponent = owner === BLACK ? WHITE : BLACK;
  const u = applyAction(state, action);
  const origTurn = state.turn;
  state.turn = opponent;
  const hash = positionHash(state);
  const wouldCheck = isInCheck(state, opponent);
  state.turn = origTurn;
  undoAction(state, action, u);

  const hist = state.positionHistory.get(hash);
  if (!hist || hist.length === 0) return 0;
  if (hist.length >= 3) {
    if (hist.every(h => h.inCheck) && wouldCheck) return -5000; // perpetual check = lose
    return -2000; // sennichite draw
  }
  if (hist.length >= 2) {
    if (hist.every(h => h.inCheck) && wouldCheck) return -500;
    return -100;
  }
  return 0;
}

function aiMove() {
  const owner = state.turn;
  const opponent = owner === BLACK ? WHITE : BLACK;

  const actions = getAllActions(state, owner);
  if (actions.length === 0) return;

  // Easy: pure random, but avoid perpetual check loss
  if (state.aiDifficulty === 1) {
    const safe = actions.filter(a => aiRepetitionPenalty(a, owner) > -5000);
    const pool = safe.length > 0 ? safe : actions;
    return aiExecute(pool[Math.floor(Math.random() * pool.length)]);
  }

  // Hard: minimax depth 2
  if (state.aiDifficulty === 3) {
    let bestScore = -Infinity, bestActions = [];
    for (const action of actions) {
      if (action.type === 'move' && action.move.capture && action.move.capture.cube === CUBE_GYOKU) {
        bestActions = [action]; break;
      }
      const u = applyAction(state, action);
      const score = minimax(state, 1, -Infinity, Infinity, false, owner) + aiRepetitionPenalty(action, owner);
      undoAction(state, action, u);
      if (score > bestScore) { bestScore = score; bestActions = [action]; }
      else if (score === bestScore) bestActions.push(action);
    }
    return aiExecute(bestActions[Math.floor(Math.random() * bestActions.length)]);
  }

  // Medium: heuristic scoring
  for (const a of actions) { a.score = aiRepetitionPenalty(a, owner); }
  scoreActions(actions, owner, opponent);
  const maxS = Math.max(...actions.map(a => a.score));
  const best = actions.filter(a => a.score === maxS);
  aiExecute(best[Math.floor(Math.random() * best.length)]);
}

function scoreActions(actions, owner, opponent) {
  const oppGyoku = state.getGyoku(opponent);
  for (const a of actions) {
    if (a.type === 'move') {
      const m = a.move;
      if (m.capture && m.capture.cube === CUBE_GYOKU) a.score = 1000;
      else if (m.capture) a.score = 100 + (FACE_VALUES[m.capture.face] || 0);
      else {
        const p = a.piece, ox = p.x, oy = p.y, of_ = p.face;
        p.x = m.x; p.y = m.y;
        if (p.cube !== CUBE_GYOKU && OPPOSITES[p.face]) p.face = OPPOSITES[p.face];
        if (isInCheck(state, opponent)) a.score = 50;
        p.x = ox; p.y = oy; p.face = of_;
      }
      if (oppGyoku && oppGyoku.onBoard) {
        a.score += Math.max(0, 5 - chebDist(m.x, m.y, oppGyoku.x, oppGyoku.y));
      }
    } else {
      a.score = 10 + (FACE_VALUES[a.face] || 0) / 10;
      if (oppGyoku && oppGyoku.onBoard) {
        a.score += Math.max(0, 4 - chebDist(a.pos.x, a.pos.y, oppGyoku.x, oppGyoku.y));
      }
    }
  }
}

function aiExecute(chosen) {
  if (chosen.type === 'move') {
    state.selected = state.pieces.indexOf(chosen.piece);
    executeMove(chosen.piece, chosen.move, chosen.promoteTo);
  } else {
    chosen.piece.face = chosen.face;
    chosen.piece.x = chosen.pos.x;
    chosen.piece.y = chosen.pos.y;
    logMove(chosen.piece.owner, `${fk(chosen.face)}↓(${chosen.pos.x},${chosen.pos.y})`, chosen.face, null, {x: chosen.pos.x, y: chosen.pos.y});
    state.selected = null;
    state.dropTargets = [];
    endTurn();
  }
}

// === Start ===

setupInput(handleKey);
redraw();
