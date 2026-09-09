const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const SIZES = { small: 6, large: 8 };

const DIRS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function createEngine(size = SIZES.large) {
  const SIZE = size % 2 === 0 ? size : size + 1;

  function createBoard() {
    const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
    const mid = SIZE / 2;
    board[mid - 1][mid - 1] = WHITE;
    board[mid - 1][mid] = BLACK;
    board[mid][mid - 1] = BLACK;
    board[mid][mid] = WHITE;
    return board;
  }

  function inBounds(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function opponent(color) {
    return color === BLACK ? WHITE : BLACK;
  }

  function flipsAt(board, r, c, color) {
    if (board[r][c] !== EMPTY) return [];
    const enemy = opponent(color);
    const flips = [];
    for (const [dr, dc] of DIRS) {
      const line = [];
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc) && board[nr][nc] === enemy) {
        line.push({ r: nr, c: nc });
        nr += dr;
        nc += dc;
      }
      if (line.length && inBounds(nr, nc) && board[nr][nc] === color) {
        flips.push(...line);
      }
    }
    return flips;
  }

  function legalMoves(board, color) {
    const moves = [];
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if (flipsAt(board, r, c, color).length) moves.push({ r, c });
      }
    }
    return moves;
  }

  function countPieces(board) {
    let black = 0;
    let white = 0;
    for (const row of board) {
      for (const cell of row) {
        if (cell === BLACK) black += 1;
        if (cell === WHITE) white += 1;
      }
    }
    return { black, white };
  }

  function place(board, r, c, color, extra = {}) {
    if (!inBounds(r, c)) return { ok: false, error: '越界' };
    const flips = flipsAt(board, r, c, color);
    if (!flips.length) return { ok: false, error: '非法落子' };
    const next = cloneBoard(board);
    next[r][c] = color;
    const protect = new Set((extra.protected || []).map((p) => `${p.r},${p.c}`));
    const consumed = [];
    const applied = [];
    for (const p of flips) {
      const key = `${p.r},${p.c}`;
      if (protect.has(key)) {
        consumed.push(p);
        continue;
      }
      next[p.r][p.c] = color;
      applied.push(p);
    }

    const myMoves = legalMoves(next, color);
    const oppMoves = legalMoves(next, opponent(color));
    let nextColor = opponent(color);
    let skipped = false;
    if (!oppMoves.length) {
      if (myMoves.length) {
        nextColor = color;
        skipped = true;
      } else {
        nextColor = null;
      }
    }

    const counts = countPieces(next);
    const finished = nextColor === null;
    let winner = null;
    if (finished) {
      if (counts.black > counts.white) winner = BLACK;
      else if (counts.white > counts.black) winner = WHITE;
      else winner = 0;
    }

    return {
      ok: true,
      board: next,
      flips: applied,
      protectedFlips: consumed,
      nextColor,
      skipped,
      finished,
      winner,
      counts,
    };
  }

  function listPieces(board, color) {
    const list = [];
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if (board[r][c] === color) list.push({ r, c });
      }
    }
    return list;
  }

  function trySwallow(board, selfColor, enemyColor, maxTries = 20) {
    const pieces = listPieces(board, enemyColor);
    if (!pieces.length) return { ok: false, error: '对方无可吞噬棋子' };
    const shuffled = pieces.slice().sort(() => Math.random() - 0.5);
    const tries = Math.min(maxTries, shuffled.length);
    for (let i = 0; i < tries; i += 1) {
      const { r, c } = shuffled[i];
      const next = cloneBoard(board);
      next[r][c] = EMPTY;
      const counts = countPieces(next);
      const my = selfColor === BLACK ? counts.black : counts.white;
      const opp = selfColor === BLACK ? counts.white : counts.black;
      const noMoves =
        !legalMoves(next, BLACK).length && !legalMoves(next, WHITE).length;
      if (noMoves && my > opp) continue;
      return { ok: true, board: next, removed: { r, c } };
    }
    return { ok: false, error: '无法找到不直接致胜的吞噬目标' };
  }

  return {
    SIZE,
    EMPTY,
    BLACK,
    WHITE,
    createBoard,
    place,
    legalMoves,
    trySwallow,
    countPieces,
    opponent,
    cloneBoard,
  };
}

module.exports = {
  createEngine,
  SIZES,
  ...createEngine(SIZES.large),
};
