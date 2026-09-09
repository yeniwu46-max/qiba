/**
 * 非五子棋 / 无 Wasm 时的简单人机：随机合法着。
 */
function inBounds(board, r, c) {
  return Array.isArray(board) && r >= 0 && r < board.length && c >= 0 && c < board[r].length;
}

function pick(list) {
  if (!list || !list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function gomokuMove(board) {
  if (!Array.isArray(board) || !board.length) return null;
  const n = board.length;
  const near = [];
  const empty = [];
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (board[r][c] !== 0) continue;
      empty.push({ r, c });
      let adj = false;
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (!dr && !dc) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (inBounds(board, nr, nc) && board[nr][nc]) adj = true;
        }
      }
      if (adj) near.push({ r, c });
    }
  }
  return pick(near.length ? near : empty);
}

function reversiMove(engine, board, color) {
  const moves = engine.legalMoves ? engine.legalMoves(board, color) : [];
  return pick(moves);
}

function goMove(engine, board, color, prevHash) {
  if (!Array.isArray(board)) return null;
  const n = board.length;
  const cells = [];
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (board[r][c] === 0) cells.push({ r, c });
    }
  }
  const shuffled = cells.slice().sort(() => Math.random() - 0.5);
  const tries = Math.min(40, shuffled.length);
  for (let i = 0; i < tries; i += 1) {
    const { r, c } = shuffled[i];
    const placed = engine.place(board, r, c, color, prevHash);
    if (placed && placed.ok) return { r, c };
  }
  return { r: -1, c: -1, pass: true };
}

function draughtsMove(engine, board, color, cont) {
  const moves = engine.legalMoves ? engine.legalMoves(board, color, cont) : [];
  const m = pick(moves);
  if (!m) return null;
  return { r: m.toR, c: m.toC, fromR: m.fromR, fromC: m.fromC };
}

function flyingAction(engine, board, color) {
  if (!board) return null;
  if (!board.rolled) return { roll: true };
  const planes = engine.legalPlanes ? engine.legalPlanes(board, color, board.dice) : [];
  const p = pick(planes);
  if (!p) return { stuck: true };
  return { planeId: p.id };
}

function pickMove(room) {
  const gt = room.gameType;
  const board = room.board;
  const color = room.turnColor;
  const engine = room.engine;
  if (gt === 'flying') return flyingAction(engine, board, color);
  if (gt === 'reversi') {
    const m = reversiMove(engine, board, color);
    return m || { pass: true };
  }
  if (gt === 'go') return goMove(engine, board, color, room.prevBoardHash);
  if (gt === 'draughts') return draughtsMove(engine, board, color, room.draughtsContinue);
  return gomokuMove(board);
}

module.exports = {
  pickMove,
  gomokuMove,
};
