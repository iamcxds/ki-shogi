// Ki Shogi - ANSI terminal renderer
const { BLACK, WHITE, FACE_INFO, CUBE_GYOKU, MOVES, OPPOSITES, PROMOTIONS, resolveDirs } = require('./types');
const { MODE } = require('./state');
const { t, getTutorialPages } = require('./lang');

// ANSI codes
const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const BG_YELLOW = `${ESC}43m`;
const BG_GREEN = `${ESC}42m`;
const BG_RED = `${ESC}41m`;
const BG_BLUE = `${ESC}44m`;
const BG_GRAY = `${ESC}100m`;
const FG_WHITE = `${ESC}97m`;
const FG_CYAN = `${ESC}36m`;
const FG_BLACK = `${ESC}30m`;
const FG_YELLOW = `${ESC}33m`;
const FG_GREEN = `${ESC}32m`;
const FG_RED = `${ESC}31m`;
const FG_GRAY = `${ESC}90m`;
const CLEAR = `${ESC}2J${ESC}H`;
const HIDE_CURSOR = `${ESC}?25l`;
const SHOW_CURSOR = `${ESC}?25h`;

const CELL_W = 2; // terminal columns per cell

// Get terminal display width (CJK chars = 2 columns)
function isWide(code) {
  if (code >= 0x1100 && code <= 0x115F) return true;   // Hangul Jamo
  if (code >= 0x2E80 && code <= 0x303E) return true;   // CJK Radicals, Kangxi, Symbols
  if (code >= 0x3040 && code <= 0x33BF) return true;   // Hiragana, Katakana, Bopomofo, CJK Compat
  if (code >= 0x3400 && code <= 0x4DBF) return true;   // CJK Extension A
  if (code >= 0x4E00 && code <= 0x9FFF) return true;   // CJK Unified Ideographs
  if (code >= 0xAC00 && code <= 0xD7AF) return true;   // Hangul Syllables
  if (code >= 0xF900 && code <= 0xFAFF) return true;   // CJK Compat Ideographs
  if (code >= 0xFE30 && code <= 0xFE6F) return true;   // CJK Compat Forms, Small Forms
  if (code >= 0xFF01 && code <= 0xFF60) return true;   // Fullwidth Forms
  if (code >= 0xFFE0 && code <= 0xFFE6) return true;   // Fullwidth Signs
  return false;
}

function visLen(s) {
  const stripped = s.replace(/\x1b\[[^m]*m/g, '');
  let w = 0;
  for (const ch of stripped) w += isWide(ch.charCodeAt(0)) ? 2 : 1;
  return w;
}

// Merge panel on the LEFT of lines within a specific range
function mergeLeftPanel(lines, panel, startIdx, endIdx) {
  if (panel.length === 0) return 0;
  let maxW = 0;
  for (const s of panel) maxW = Math.max(maxW, visLen(s));
  const colW = maxW + 2;
  const padStr = ' '.repeat(colW);
  for (let i = startIdx; i <= endIdx && i < lines.length; i++) {
    const pi = i - startIdx;
    if (pi < panel.length) {
      const pLine = panel[pi];
      const gap = colW - visLen(pLine);
      lines[i] = pLine + ' '.repeat(gap) + lines[i];
    } else {
      lines[i] = padStr + lines[i];
    }
  }
  return colW;
}

// Merge sidebar lines onto existing lines starting at startIdx
function mergeSidebar(lines, sidebar, startIdx, gridWidth) {
  const pad = ' '.repeat(gridWidth);
  for (let i = 0; i < sidebar.length; i++) {
    const li = startIdx + i;
    if (li < lines.length) {
      const gap = Math.max(0, gridWidth - visLen(lines[li]));
      lines[li] += ' '.repeat(gap) + '  ' + sidebar[i];
    } else {
      lines.push(pad + '  ' + sidebar[i]);
    }
  }
}

function getControlsHint(state) {
  switch (state.mode) {
    case MODE.SETUP_BLACK_GYOKU:
    case MODE.SETUP_WHITE_GYOKU: return [t('controls_setup_1'), t('controls_setup_2')];
    case MODE.BOARD:
      if (state.aiSide && (state.aiSide === 'both' || state.aiSide === state.turn)) {
        return [`${t('space_pause')}  Tab:${t('log_title')}`, t('controls_board_2')];
      }
      return [t('controls_board_1'), t('controls_board_2')];
    case MODE.SELECTED: return [t('controls_move')];
    case MODE.HAND:
    case MODE.FACE_SELECT: return [t('controls_list')];
    case MODE.DROP_TARGET: return [t('controls_drop')];
    case MODE.PROMOTE: return [t('controls_promote')];
    case MODE.LOG_BROWSE: return [`↑↓:${t('log_browse_nav')} ESC:${t('log_browse_back')}`];
    default: return null;
  }
}

function render(state) {
  const lines = [];
  lines.push(`${BOLD}  ═══ ${t('game_title')} ═══${RESET}`);
  lines.push('');

  let gridInfo = null; // { gridWidth, sidebarStart }

  if (state.mode === MODE.MENU) {
    renderMenu(state, lines);
  } else if (state.mode === MODE.TUTORIAL) {
    renderTutorial(state, lines);
  } else if (state.mode === MODE.LOG_BROWSE) {
    renderLogBrowse(state, lines);
  } else {
    // All game modes: board + sidebar
    gridInfo = renderBoard(state, lines);
    lines.push('');
    if (state.mode === MODE.GAME_OVER) {
      const winnerName = state.winner === BLACK ? t('black') : t('white');
      lines.push(`  ${BOLD}${FG_YELLOW}★ ${winnerName} ${t('wins')} ★${RESET}`);
      if (state.message) lines.push(`  ${FG_YELLOW}${state.message}${RESET}`);
      lines.push('');
      lines.push(`  ${FG_GRAY}${t('quit_menu')}  Tab:${t('log_title')}${RESET}`);
    } else if (state.mode === MODE.DRAW) {
      lines.push(`  ${BOLD}${FG_YELLOW}★ ${t('draw')} ★${RESET}`);
      lines.push(`  ${FG_YELLOW}${state.message}${RESET}`);
      lines.push('');
      lines.push(`  ${FG_GRAY}${t('quit_menu')}  Tab:${t('log_title')}${RESET}`);
    } else if (state.mode === MODE.HAND) {
      renderHandSelect(state, lines);
    } else if (state.mode === MODE.FACE_SELECT) {
      renderFaceSelect(state, lines);
    } else if (state.mode === MODE.DROP_TARGET) {
      renderDropTarget(state, lines);
    } else if (state.mode === MODE.PROMOTE) {
      renderPromote(state, lines);
    } else {
      renderStatus(state, lines);
    }
  }

  // Merge hints on the right, then log panel further right
  if (gridInfo && gridInfo.gridWidth > 0) {
    const sideStart = gridInfo.boardStart;
    const sidebar = buildSidebar(state);
    let gw = gridInfo.gridWidth;
    if (sidebar.length > 0) {
      const end = Math.min(lines.length, sideStart + sidebar.length);
      for (let i = sideStart; i < end; i++) gw = Math.max(gw, visLen(lines[i]));
      mergeSidebar(lines, sidebar, sideStart, gw);
    }
    // Log panel to the right of hints
    const logPanel = buildLogPanel(state);
    if (logPanel.length > 0) {
      let gw2 = gw;
      const logEnd = Math.min(lines.length, sideStart + logPanel.length);
      for (let i = sideStart; i < logEnd; i++) gw2 = Math.max(gw2, visLen(lines[i]));
      mergeSidebar(lines, logPanel, sideStart, gw2);
    }
  }

  // Controls hint at very bottom
  const ctrl = getControlsHint(state);
  if (ctrl) {
    lines.push('');
    for (const c of ctrl) lines.push(`  ${FG_GRAY}${c}${RESET}`);
  }

  process.stdout.write(CLEAR + HIDE_CURSOR + lines.join('\n') + '\n');
}

// Build log panel for right side of board (after hints)
function buildLogPanel(state) {
  const panel = [];
  if (state.moveLog && state.moveLog.length > 0) {
    panel.push(`${FG_GRAY}── ${t('log_title')} ──${RESET}`);
    const recent = state.moveLog.slice(-8);
    for (const entry of recent) {
      const color = entry.owner === BLACK ? FG_WHITE : FG_CYAN;
      const ow = entry.owner === BLACK ? t('black_short') : t('white_short');
      panel.push(`${FG_GRAY}${entry.num}.${RESET} ${color}${BOLD}${ow}${RESET} ${entry.text}`);
    }
  }
  return panel;
}

// Build right sidebar: hints only
function buildSidebar(state) {
  return getHintForState(state);
}

function renderMenu(state, lines) {
  const menus = {
    1: ['choose_opponent', [['1', 'local_2p'], ['2', 'ai_battle'], ['3', 'tutorial']], 'press_123'],
    2: ['choose_pieces', [['1', 'basic_set'], ['2', 'full_set']], 'press_12'],
    3: ['choose_diff', [['1', 'diff_easy'], ['2', 'diff_medium'], ['3', 'diff_hard']], 'press_123'],
    4: ['choose_side', [['1', 'play_black'], ['2', 'play_white'], ['3', 'random'], ['4', 'ai_vs_ai']], 'press_1234'],
  };
  const m = menus[state.menuStep];
  lines.push(`  ${BOLD}${t(m[0])}${RESET}`);
  lines.push('');
  for (const [k, v] of m[1]) lines.push(`  ${FG_YELLOW}${k}${RESET}  ${t(v)}`);
  lines.push('');
  lines.push(`  ${FG_GRAY}${t(m[2])}${RESET}`);
}

function renderBoard(state, lines) {
  const onBoard = state.pieces.filter(p => p.onBoard);
  if (onBoard.length === 0 && state.mode === MODE.SETUP_BLACK_GYOKU) {
    const bStart = lines.length;
    const s = renderGrid(state, lines, state.cursor.x - 3, state.cursor.x + 3,
               state.cursor.y - 3, state.cursor.y + 3);
    return { gridWidth: s.gridWidth, sidebarStart: s.startLine + 1, boardStart: bStart, boardEnd: lines.length - 1 };
  }

  let minX = state.cursor.x, maxX = state.cursor.x;
  let minY = state.cursor.y, maxY = state.cursor.y;
  for (const p of onBoard) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const whIdx = lines.length;
  renderHand(state, lines, WHITE);
  lines.push('');
  const s = renderGrid(state, lines, minX - 2, maxX + 2, minY - 2, maxY + 2);
  lines.push('');
  renderHand(state, lines, BLACK);
  const bhIdx = lines.length - 1;
  const gw = Math.max(s.gridWidth, visLen(lines[whIdx]), visLen(lines[bhIdx]));
  return { gridWidth: gw, sidebarStart: s.startLine + 1, boardStart: whIdx, boardEnd: bhIdx };
}

function renderGrid(state, lines, x1, x2, y1, y2) {
  const boardMap = state.buildBoardMap();
  const legalSet = new Set(state.legalMoves.map(m => `${m.x},${m.y}`));
  const dropSet = new Set((state.dropTargets || []).map(m => `${m.x},${m.y}`));

  const startLine = lines.length;
  let header = '    ';
  for (let x = x1; x <= x2; x++) header += String(x).padStart(2).padEnd(CELL_W);
  lines.push(`  ${FG_GRAY}${header}${RESET}`);

  for (let y = y2; y >= y1; y--) {
    let row = `  ${FG_GRAY}${String(y).padStart(3)} ${RESET}`;
    for (let x = x1; x <= x2; x++) {
      const key = `${x},${y}`;
      const piece = boardMap.get(key);
      const isCursor = state.cursor.x === x && state.cursor.y === y;
      const isLegal = legalSet.has(key);
      const isDrop = dropSet.has(key);
      const isSelected = state.selected !== null &&
        state.pieces[state.selected].x === x &&
        state.pieces[state.selected].y === y;
      row += renderCell(piece, isCursor, isLegal, isDrop, isSelected);
    }
    lines.push(row);
  }

  return { gridWidth: 6 + (x2 - x1 + 1) * CELL_W, startLine };
}

function renderCell(piece, isCursor, isLegal, isDrop, isSelected) {
  let bg = '';
  let fg = '';
  let text = '  ';

  if (piece) {
    const info = FACE_INFO[piece.face];
    text = info ? info[0] : piece.face.slice(0, 2);
    fg = piece.owner === BLACK ? FG_WHITE : FG_CYAN;
  }

  if (isSelected) {
    bg = BG_BLUE;
  } else if (isCursor) {
    bg = BG_YELLOW;
    if (piece) fg = FG_BLACK;
  } else if (isLegal || isDrop) {
    bg = BG_GREEN;
    if (piece) fg = FG_BLACK;
  }

  return `${bg}${fg}${BOLD}${text}${RESET}`;
}

function renderHand(state, lines, owner) {
  const hand = state.getHandPieces(owner);
  const label = owner === BLACK ? t('black_hand') : t('white_hand');
  const color = owner === BLACK ? FG_WHITE : FG_CYAN;
  let handStr = `  ${color}${BOLD}${label}:${RESET} `;
  if (hand.length === 0) {
    handStr += `${FG_GRAY}${t('hand_empty')}${RESET}`;
  } else {
    for (const p of hand) {
      const info = FACE_INFO[p.face];
      handStr += `${color}[${info[0]}]${RESET} `;
    }
  }
  lines.push(handStr);
}

function renderStatus(state, lines) {
  const turnName = state.turn === BLACK ? `${FG_WHITE}${BOLD}${t('black')}${RESET}` : `${FG_CYAN}${BOLD}${t('white')}${RESET}`;

  if (state.mode === MODE.SETUP_BLACK_GYOKU) {
    lines.push(`  ${turnName} ${t('place_gyoku')}`);
  } else if (state.mode === MODE.SETUP_WHITE_GYOKU) {
    lines.push(`  ${turnName} ${t('place_gyoku_w')}`);
  } else if (state.mode === MODE.BOARD) {
    if (state.aiSide && (state.aiSide === 'both' || state.aiSide === state.turn)) {
      if (state.paused) {
        lines.push(`  ${turnName} ${BG_RED}${FG_WHITE}${BOLD} ${t('paused')} ${RESET}`);
      } else {
        lines.push(`  ${turnName} ${FG_YELLOW}${t('ai_thinking')}${RESET}`);
      }
    } else {
      lines.push(`  ${turnName} ${t('your_turn')}`);
    }
  } else if (state.mode === MODE.SELECTED) {
    lines.push(`  ${turnName} ${t('select_target')}`);
  }

  if (state.inCheck) {
    lines.push(`  ${BG_RED}${FG_WHITE}${BOLD} ${t('check')} ${RESET}`);
  }
  if (state.message) {
    lines.push(`  ${FG_YELLOW}${state.message}${RESET}`);
  }
}

function renderHandSelect(state, lines) {
  const turnName = state.turn === BLACK ? t('black_short') : t('white_short');
  lines.push(`  ${BOLD}${turnName} ${t('choose_drop')}${RESET}`);
  for (let i = 0; i < state.handPieces.length; i++) {
    const p = state.handPieces[i];
    const info = FACE_INFO[p.face];
    const marker = i === state.handIndex ? `${BG_YELLOW}${FG_BLACK}` : '';
    lines.push(`  ${marker} ${info[0]} ${p.face} ${RESET}`);
  }
}

function renderFaceSelect(state, lines) {
  lines.push(`  ${BOLD}${t('choose_face')}${RESET}`);
  for (let i = 0; i < state.dropFaces.length; i++) {
    const face = state.dropFaces[i];
    const info = FACE_INFO[face];
    const marker = i === state.faceIndex ? `${BG_YELLOW}${FG_BLACK}` : '';
    lines.push(`  ${marker} ${info[0]} ${face} (${info[1]}) ${RESET}`);
  }
}

function renderDropTarget(state, lines) {
  lines.push(`  ${BOLD}${t('choose_drop_pos')}${RESET}`);
}

function renderPromote(state, lines) {
  lines.push(`  ${BOLD}${t('choose_promote')}${RESET}`);
  for (let i = 0; i < state.promoteChoices.length; i++) {
    const face = state.promoteChoices[i];
    const info = FACE_INFO[face];
    const marker = i === state.promoteIndex ? `${BG_YELLOW}${FG_BLACK}` : '';
    lines.push(`  ${marker} ${info[0]} ${face} (${info[1]}) ${RESET}`);
  }
}

function renderSnapHand(snap, lines, owner) {
  const hand = snap.filter(p => p.x === null && p.cube !== CUBE_GYOKU && p.owner === owner);
  const label = owner === BLACK ? t('black_hand') : t('white_hand');
  const color = owner === BLACK ? FG_WHITE : FG_CYAN;
  let s = `  ${color}${BOLD}${label}:${RESET} `;
  if (hand.length === 0) s += `${FG_GRAY}${t('hand_empty')}${RESET}`;
  else for (const p of hand) s += `${color}[${FACE_INFO[p.face][0]}]${RESET} `;
  lines.push(s);
}

function renderLogBrowse(state, lines) {
  const entry = state.moveLog[state.logIndex];
  const snap = entry.snapshot;

  const onBoard = snap.filter(p => p.x !== null);
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  for (const p of onBoard) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }

  const boardMap = new Map();
  for (const p of onBoard) boardMap.set(`${p.x},${p.y}`, p);

  const x1 = minX - 2, x2 = maxX + 2, y1 = minY - 2, y2 = maxY + 2;

  // White hand
  const boardStart = lines.length;
  renderSnapHand(snap, lines, WHITE);
  lines.push('');

  // Grid header + rows
  const startLine = lines.length;
  let header = '    ';
  for (let x = x1; x <= x2; x++) header += String(x).padStart(2).padEnd(CELL_W);
  lines.push(`  ${FG_GRAY}${header}${RESET}`);

  const moveFrom = entry.from ? `${entry.from.x},${entry.from.y}` : null;
  const moveTo = entry.to ? `${entry.to.x},${entry.to.y}` : null;

  for (let y = y2; y >= y1; y--) {
    let row = `  ${FG_GRAY}${String(y).padStart(3)} ${RESET}`;
    for (let x = x1; x <= x2; x++) {
      const key = `${x},${y}`;
      const piece = boardMap.get(key);
      const isTo = key === moveTo;
      const isFrom = key === moveFrom;
      row += renderCell(piece, isFrom, false, false, isTo);
    }
    lines.push(row);
  }

  // Black hand
  lines.push('');
  renderSnapHand(snap, lines, BLACK);
  const boardEnd = lines.length - 1;

  const gridWidth = 6 + (x2 - x1 + 1) * CELL_W;

  // Build log panel (left column)
  const logPanel = [];
  logPanel.push(`${FG_GRAY}── ${t('log_title')} ──${RESET}`);
  const boardHeight = boardEnd - boardStart + 1;
  const VISIBLE = Math.min(12, Math.max(0, boardHeight - 2));
  const total = state.moveLog.length;
  let wStart = Math.max(0, state.logIndex - Math.floor(VISIBLE / 2));
  wStart = Math.min(wStart, Math.max(0, total - VISIBLE));
  const wEnd = Math.min(total, wStart + VISIBLE);
  for (let i = wStart; i < wEnd; i++) {
    const e = state.moveLog[i];
    const color = e.owner === BLACK ? FG_WHITE : FG_CYAN;
    const ow = e.owner === BLACK ? t('black_short') : t('white_short');
    if (i === state.logIndex) {
      logPanel.push(`${BG_YELLOW}${FG_BLACK}${e.num}. ${ow} ${e.text}${RESET}`);
    } else {
      logPanel.push(`${FG_GRAY}${e.num}.${RESET} ${color}${BOLD}${ow}${RESET} ${e.text}`);
    }
  }

  // Merge log on left of board area
  const leftW = mergeLeftPanel(lines, logPanel, boardStart, boardEnd);

  // Merge hint on right
  if (entry.face) {
    const hint = getMoveHintLines(entry.face, entry.owner);
    let gw = gridWidth + leftW;
    const end = Math.min(lines.length, boardStart + hint.length);
    for (let i = boardStart; i < end; i++) gw = Math.max(gw, visLen(lines[i]));
    mergeSidebar(lines, hint, boardStart, gw);
  }
}

// Get hint lines for current state
function getHintForState(state) {
  let face = null, owner = null;
  if (state.mode === MODE.BOARD) {
    const p = state.getPieceAt(state.cursor.x, state.cursor.y);
    if (p) { face = p.face; owner = p.owner; }
  } else if (state.mode === MODE.SELECTED) {
    const p = state.pieces[state.selected];
    if (p) { face = p.face; owner = p.owner; }
  } else if (state.mode === MODE.FACE_SELECT) {
    face = state.dropFaces[state.faceIndex];
    owner = state.turn;
  } else if (state.mode === MODE.PROMOTE) {
    face = state.promoteChoices[state.promoteIndex];
    owner = state.turn;
  }
  return face ? getMoveHintLines(face, owner) : [];
}

function buildDiagram(face, owner) {
  const moveDef = MOVES[face];
  if (!moveDef) return [];
  let maxOff = 1;
  for (const comp of moveDef) {
    for (const cat of comp.dirs) {
      for (const [dx, dy] of resolveDirs(cat, owner)) {
        maxOff = Math.max(maxOff, Math.abs(dx), Math.abs(dy));
      }
    }
  }
  const sz = maxOff * 2 + 1;
  const mid = maxOff;
  const grid = Array.from({length: sz}, () => Array(sz).fill(null));
  for (const comp of moveDef) {
    for (const cat of comp.dirs) {
      for (const [dx, dy] of resolveDirs(cat, owner)) {
        grid[mid - dy][dx + mid] = comp.mode;
      }
    }
  }
  const info = FACE_INFO[face];
  const sym = (r, c) => {
    if (r === mid && c === mid) return info[0];
    const t = grid[r][c];
    if (!t) return '. ';
    if (t === 'step') return '* ';
    const dx = c - mid, dy = mid - r;
    if (dx === 0) return '| ';
    if (dy === 0) return '--';
    return (dx < 0 && dy > 0) || (dx > 0 && dy < 0) ? '\\ ' : '/ ';
  };
  const lines = [];
  for (let r = 0; r < sz; r++) {
    let line = '';
    for (let c = 0; c < sz; c++) line += sym(r, c);
    lines.push(line);
  }
  return lines;
}

function sideBySide(diagrams, gap = '  ') {
  const maxH = Math.max(...diagrams.map(d => d.length));
  const widths = diagrams.map(d => d.length > 0 ? d[0].length : 0);
  const lines = [];
  for (let i = 0; i < maxH; i++) {
    const parts = diagrams.map((d, j) => i < d.length ? d[i] : ' '.repeat(widths[j]));
    lines.push(parts.join(gap));
  }
  return lines;
}

function getMoveHintLines(face, owner) {
  const moveDef = MOVES[face];
  if (!moveDef) return [];
  const info = FACE_INFO[face];
  const result = [];

  const cur = buildDiagram(face, owner);
  const opp = OPPOSITES[face];
  let header = `${FG_YELLOW}${BOLD}${info[0]}${face}${RESET}`;
  if (opp) {
    const oi = FACE_INFO[opp];
    header += `${FG_GRAY}  ${t('hint_flip')}${oi[0]}${opp}${RESET}`;
    const oppD = buildDiagram(opp, owner);
    result.push(header);
    for (const l of sideBySide([cur, oppD])) {
      result.push(`${FG_GREEN}${l}${RESET}`);
    }
  } else {
    result.push(header);
    for (const l of cur) result.push(`${FG_GREEN}${l}${RESET}`);
  }

  const promo = PROMOTIONS[face];
  if (promo) {
    const names = promo.map(f => { const i = FACE_INFO[f]; return `${i[0]}${f}`; }).join('/');
    result.push(`${FG_RED}${t('hint_promote')}${names}${RESET}`);
    const promoDiags = promo.map(f => buildDiagram(f, owner));
    for (const l of sideBySide(promoDiags)) {
      result.push(`${FG_RED}${l}${RESET}`);
    }
  }

  return result;
}

const ANSI = { BOLD, RESET, FG_GRAY, FG_WHITE, FG_CYAN, FG_GREEN, FG_YELLOW, FG_RED };

function renderTutorial(state, lines) {
  const pages = getTutorialPages(ANSI);
  const page = pages[state.tutorialPage];
  const total = pages.length;
  const num = state.tutorialPage + 1;
  lines.push(`  ${BOLD}${t('tut_title')} (${num}/${total}) - ${page[0]}${RESET}`);
  lines.push('');
  for (let i = 1; i < page.length; i++) {
    lines.push(`  ${page[i]}`);
  }
  lines.push('');
  const nav = [];
  if (num > 1) nav.push(t('tut_prev'));
  if (num < total) nav.push(t('tut_next'));
  nav.push(t('tut_back'));
  lines.push(`  ${FG_GRAY}${nav.join('  ')}${RESET}`);
}

function cleanup() {
  process.stdout.write(SHOW_CURSOR + RESET);
}

module.exports = { render, cleanup };
