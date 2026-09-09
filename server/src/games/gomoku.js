const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const SIZES = { small: 9, large: 15 };

function createEngine(size = SIZES.large) {
  const SIZE = size;

  function createBoard() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
  }

  function inBounds(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function checkWin(board, r, c, color) {
    const dirs = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];
    for (const [dr, dc] of dirs) {
      let count = 1;
      for (const sign of [1, -1]) {
        let nr = r + dr * sign;
        let nc = c + dc * sign;
        while (inBounds(nr, nc) && board[nr][nc] === color) {
          count += 1;
          nr += dr * sign;
          nc += dc * sign;
        }
      }
      if (count >= 5) return true;
    }
    return false;
  }

  function hasFive(board, color) {
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if (board[r][c] === color && checkWin(board, r, c, color)) return true;
      }
    }
    return false;
  }

  function place(board, r, c, color) {
    if (!inBounds(r, c) || board[r][c] !== EMPTY) {
      return { ok: false, error: '非法落子' };
    }
    const next = cloneBoard(board);
    next[r][c] = color;
    const win = checkWin(next, r, c, color);
    const full = next.every((row) => row.every((cell) => cell !== EMPTY));
    return {
      ok: true,
      board: next,
      win,
      draw: !win && full,
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
      if (!hasFive(next, selfColor)) {
        return { ok: true, board: next, removed: { r, c } };
      }
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
    trySwallow,
    hasFive,
    cloneBoard,
  };
}

module.exports = {
  createEngine,
  SIZES,
  ...createEngine(SIZES.large),
};
