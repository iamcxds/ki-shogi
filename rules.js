// Ki Shogi - Core rule engine
const { BLACK, WHITE, CUBE_GYOKU, CUBE_KI, FACE_CUBE, MOVES, OPPOSITES, PROMOTIONS, CUBE_FACES, resolveDirs } = require('./types');
const { MODE } = require('./state');

// Chebyshev distance
function chebDist(x1, y1, x2, y2) {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

// Is position adjacent to any Gyoku or supported Ki on the board?
function isAdjacentToAnyGyoku(state, x, y) {
  for (const p of state.pieces) {
    if (p.cube === CUBE_GYOKU && p.onBoard && chebDist(x, y, p.x, p.y) === 1) return true;
  }
  // Check adjacency to supported Ki cubes
  for (const ki of getSupportedKi(state)) {
    if (chebDist(x, y, ki.x, ki.y) === 1) return true;
  }
  return false;
}

// BFS: find all Ki cubes connected to a Gyoku via adjacent Ki chain
function getSupportedKi(state) {
  const kiPieces = state.pieces.filter(p => p.cube === CUBE_KI && p.onBoard);
  if (kiPieces.length === 0) return [];
  const supported = new Set();
  const queue = [];
  for (const ki of kiPieces) {
    for (const g of state.pieces) {
      if (g.cube === CUBE_GYOKU && g.onBoard && chebDist(ki.x, ki.y, g.x, g.y) <= 2) {
        supported.add(ki.id);
        queue.push(ki);
        break;
      }
    }
  }
  while (queue.length > 0) {
    const cur = queue.shift();
    for (const ki of kiPieces) {
      if (!supported.has(ki.id) && chebDist(ki.x, ki.y, cur.x, cur.y) === 1) {
        supported.add(ki.id);
        queue.push(ki);
      }
    }
  }
  return kiPieces.filter(p => supported.has(p.id));
}

// Is position supported for a given cube type?
function isPieceSupported(state, x, y, cube) {
  if (cube === CUBE_KI) {
    for (const p of state.pieces) {
      if (p.cube === CUBE_GYOKU && p.onBoard && chebDist(x, y, p.x, p.y) <= 2) return true;
    }
    for (const ki of getSupportedKi(state)) {
      if (chebDist(x, y, ki.x, ki.y) === 1) return true;
    }
    return false;
  }
  return isAdjacentToAnyGyoku(state, x, y);
}

// Is position adjacent to a specific Gyoku?
function isAdjacentToGyoku(gyoku, x, y) {
  return gyoku.onBoard && chebDist(x, y, gyoku.x, gyoku.y) === 1;
}

// Get all direction vectors for a face+owner
function getMoveVectors(face, owner) {
  const moveDef = MOVES[face];
  if (!moveDef) return [];
  const result = [];
  for (const comp of moveDef) {
    for (const cat of comp.dirs) {
      for (const [dx, dy] of resolveDirs(cat, owner)) {
        result.push({ dx, dy, slide: comp.mode === 'slide' });
      }
    }
  }
  return result;
}

// Generate legal moves for a piece on the board
function getLegalMoves(state, piece) {
  if (!piece.onBoard) return [];
  const boardMap = state.buildBoardMap();
  const vectors = getMoveVectors(piece.face, piece.owner);
  const moves = [];
  const opponent = piece.owner === BLACK ? WHITE : BLACK;

  for (const { dx, dy, slide } of vectors) {
    const maxDist = slide ? 20 : 1;
    for (let d = 1; d <= maxDist; d++) {
      const nx = piece.x + dx * d;
      const ny = piece.y + dy * d;
      const key = `${nx},${ny}`;
      const target = boardMap.get(key);

      if (target) {
        // Can capture opponent's non-Gyoku piece
        if (target.owner === opponent) {
          // Gyoku special: can capture if it's not the opponent Gyoku... wait
          // Actually Gyoku CAN be captured? No - "The Gyoku cannot be left on an attacked position"
          // So we can move to capture any opponent piece
          if (wouldBeLegal(state, piece, nx, ny, target)) {
            moves.push({ x: nx, y: ny, capture: target });
          }
        }
        break; // blocked
      }

      // Empty square - check adjacency and legality
      if (wouldBeLegal(state, piece, nx, ny, null)) {
        moves.push({ x: nx, y: ny, capture: null });
      }
    }
  }
  return moves;
}

// Check if moving piece to (tx,ty) capturing target would be legal
function wouldBeLegal(state, piece, tx, ty, capturedPiece) {
  // Simulate the move
  const origX = piece.x, origY = piece.y;
  const origFace = piece.face;
  piece.x = tx; piece.y = ty;

  if (capturedPiece) {
    capturedPiece.x = null; capturedPiece.y = null;
    // Promotion face doesn't matter for legality check
  } else {
    // Flip to opposite
    if (piece.cube !== CUBE_GYOKU && OPPOSITES[piece.face]) {
      piece.face = OPPOSITES[piece.face];
    }
  }

  let legal = true;

  // Gyoku distance constraint
  if (piece.cube === CUBE_GYOKU) {
    const otherGyoku = state.pieces.find(p => p.cube === CUBE_GYOKU && p.id !== piece.id && p.onBoard);
    if (otherGyoku && chebDist(tx, ty, otherGyoku.x, otherGyoku.y) !== 2) {
      legal = false;
    }
  }

  // Piece must land adjacent to some Gyoku (unless it IS a Gyoku, or capturing Gyoku/Ki cube)
  if (legal && piece.cube !== CUBE_GYOKU && !(capturedPiece && (capturedPiece.cube === CUBE_GYOKU || capturedPiece.cube === CUBE_KI))) {
    if (!isPieceSupported(state, tx, ty, piece.cube)) legal = false;
  }

  // Own Gyoku must not be in check after move
  if (legal) {
    if (isInCheck(state, piece.owner)) legal = false;
  }

  // Restore
  piece.x = origX; piece.y = origY; piece.face = origFace;
  if (capturedPiece) {
    capturedPiece.x = tx; capturedPiece.y = ty;
  }

  return legal;
}

// Is the given player's Gyoku under attack?
function isInCheck(state, owner) {
  const gyoku = state.getGyoku(owner);
  if (!gyoku || !gyoku.onBoard) return false;
  const opponent = owner === BLACK ? WHITE : BLACK;

  for (const p of state.pieces) {
    if (p.owner !== opponent || !p.onBoard) continue;
    const vectors = getMoveVectors(p.face, p.owner);
    const boardMap = state.buildBoardMap();
    for (const { dx, dy, slide } of vectors) {
      const maxDist = slide ? 20 : 1;
      for (let d = 1; d <= maxDist; d++) {
        const nx = p.x + dx * d;
        const ny = p.y + dy * d;
        if (nx === gyoku.x && ny === gyoku.y) return true;
        if (boardMap.has(`${nx},${ny}`)) break;
      }
    }
  }
  return false;
}

// Get legal drop positions for a piece with a given face
function getLegalDrops(state, owner, face) {
  const gyoku = state.getGyoku(owner);
  if (!gyoku || !gyoku.onBoard) return [];
  const opponent = owner === BLACK ? WHITE : BLACK;
  const otherGyoku = state.getGyoku(opponent);
  const drops = [];

  // Ki cube can drop at distance 1 or 2 from own Gyoku; others only distance 1
  const isKi = FACE_CUBE[face] === CUBE_KI;
  const range = isKi ? 2 : 1;

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      if (dx === 0 && dy === 0) continue;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      if (dist > range) continue;
      const nx = gyoku.x + dx;
      const ny = gyoku.y + dy;

      if (state.getPieceAt(nx, ny)) continue;
      if (otherGyoku && otherGyoku.onBoard && chebDist(nx, ny, otherGyoku.x, otherGyoku.y) <= 1) continue;

      if (wouldDropCauseCheck(state, owner, face, nx, ny)) continue;

      // Drop must resolve own check if in check
      const tempPiece = { owner, face, onBoard: true, x: nx, y: ny, cube: FACE_CUBE[face] || 'temp', id: -2, key: `${nx},${ny}` };
      state.pieces.push(tempPiece);
      const stillInCheck = isInCheck(state, owner);
      state.pieces.pop();
      if (stillInCheck) continue;

      drops.push({ x: nx, y: ny });
    }
  }
  return drops;
}

function wouldDropCauseCheck(state, owner, face, x, y) {
  const opponent = owner === BLACK ? WHITE : BLACK;
  if (isInCheck(state, opponent)) return false; // already in check, drop didn't cause it
  const tempPiece = { owner, face, onBoard: true, x, y, cube: 'temp', id: -1, key: `${x},${y}` };
  state.pieces.push(tempPiece);
  const check = isInCheck(state, opponent);
  state.pieces.pop();
  return check;
}

// Find stranded pieces after a move and capture them
function handleStranding(state) {
  const captured = [];
  for (const p of state.pieces) {
    if (!p.onBoard || p.cube === CUBE_GYOKU || p.owner !== state.turn) continue;
    if (!isPieceSupported(state, p.x, p.y, p.cube)) {
      captured.push(p);
    }
  }
  const opponent = state.turn === BLACK ? WHITE : BLACK;
  for (const p of captured) {
    // Stranded pieces captured by opponent of the piece's owner
    const captor = p.owner === state.turn ? opponent : state.turn;
    p.x = null; p.y = null;
    p.owner = captor;
    // Reset to default face of cube
    const defaults = { hi: 'Hi', kaku: 'Kaku', ki: 'Ki' };
    if (defaults[p.cube]) p.face = defaults[p.cube];
  }
  return captured;
}

// Check if player has any legal action (move or drop)
function hasLegalAction(state, owner) {
  // Check board moves
  for (const p of state.pieces) {
    if (p.owner === owner && p.onBoard) {
      if (getLegalMoves(state, p).length > 0) return true;
    }
  }
  // Check drops
  const hand = state.getHandPieces(owner);
  for (const p of hand) {
    const faces = p.cube === CUBE_GYOKU ? ['Gyoku'] : require('./types').CUBE_FACES[p.cube];
    for (const face of faces) {
      if (getLegalDrops(state, owner, face).length > 0) return true;
    }
  }
  return false;
}

// Valid positions for White Gyoku placement (Chebyshev distance exactly 2 from Black Gyoku)
function getWhiteGyokuPositions(state) {
  const bg = state.getGyoku(BLACK);
  if (!bg || !bg.onBoard) return [];
  const positions = [];
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) === 2) {
        positions.push({ x: bg.x + dx, y: bg.y + dy });
      }
    }
  }
  return positions;
}

module.exports = {
  chebDist, isAdjacentToAnyGyoku, isAdjacentToGyoku, isPieceSupported,
  getLegalMoves, getLegalDrops, isInCheck, handleStranding,
  hasLegalAction, getWhiteGyokuPositions, getMoveVectors,
};
