const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const BLACK2 = 3;
const WHITE2 = 4;
const SIZES = { small: 9, large: 13 };

function createEngine(size = SIZES.small, opts = {}) {
  const SIZE = size;
  const allied = !!(opts && opts.allied);

  function createBoard() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
  }

  function inBounds(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function teamOf(color) {
    if (!color) return 0;
    if (!allied) return color === BLACK || color === WHITE ? color : 0;
    if (color === BLACK || color === BLACK2) return BLACK;
    if (color === WHITE || color === WHITE2) return WHITE;
    return 0;
  }

  function sameTeam(a, b) {
    if (!a || !b) return false;
    if (!allied) return a === b;
    return teamOf(a) === teamOf(b) && teamOf(a) !== 0;
  }

  function opponent(color) {
    const t = teamOf(color) || color;
    return t === BLACK ? WHITE : BLACK;
  }

  function neighbors(r, c) {
    return [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ].filter(([nr, nc]) => inBounds(nr, nc));
  }

  function getGroup(board, r, c) {
    const color = board[r][c];
    const stones = [];
    const liberties = new Set();
    const visited = new Set();
    const key = (x, y) => `${x},${y}`;
    const stack = [[r, c]];
    visited.add(key(r, c));
    while (stack.length) {
      const [cr, cc] = stack.pop();
      stones.push({ r: cr, c: cc, color: board[cr][cc] });
      for (const [nr, nc] of neighbors(cr, cc)) {
        if (board[nr][nc] === EMPTY) liberties.add(key(nr, nc));
        else if (sameTeam(board[nr][nc], color) && !visited.has(key(nr, nc))) {
          visited.add(key(nr, nc));
          stack.push([nr, nc]);
        }
      }
    }
    return { stones, libertyCount: liberties.size, team: teamOf(color) };
  }

  function removeGroup(board, stones) {
    for (const { r, c } of stones) board[r][c] = EMPTY;
  }

  function boardHash(board) {
    return board.map((row) => row.join('')).join('|');
  }

  function place(board, r, c, color, lastBoardHash = null) {
    if (r === -1 && c === -1) {
      return { ok: true, board: cloneBoard(board), pass: true, captured: 0, capturedStones: [] };
    }
    if (!inBounds(r, c) || board[r][c] !== EMPTY) {
      return { ok: false, error: '非法落子' };
    }
    const next = cloneBoard(board);
    next[r][c] = color;
    let captured = 0;
    const capturedStones = [];
    const seenGroups = new Set();
    for (const [nr, nc] of neighbors(r, c)) {
      const cell = next[nr][nc];
      if (!cell || sameTeam(cell, color)) continue;
      const group = getGroup(next, nr, nc);
      const gk = group.stones.map((s) => `${s.r},${s.c}`).sort().join(';');
      if (seenGroups.has(gk)) continue;
      seenGroups.add(gk);
      if (group.libertyCount === 0) {
        for (const stone of group.stones) {
          capturedStones.push({ r: stone.r, c: stone.c, color: stone.color });
        }
        removeGroup(next, group.stones);
        captured += group.stones.length;
      }
    }
    const selfGroup = getGroup(next, r, c);
    if (selfGroup.libertyCount === 0) {
      return { ok: false, error: '禁着点（自杀）' };
    }
    const hash = boardHash(next);
    if (lastBoardHash && hash === lastBoardHash) {
      return { ok: false, error: '禁止全局同形（简化劫）' };
    }
    return { ok: true, board: next, pass: false, captured, capturedStones, hash };
  }

  function listPieces(board, color) {
    const list = [];
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if (!allied) {
          if (board[r][c] === color) list.push({ r, c });
        } else if (teamOf(board[r][c]) === teamOf(color)) {
          list.push({ r, c });
        }
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
      return { ok: true, board: next, removed: { r, c } };
    }
    return { ok: false, error: '吞噬失败' };
  }

  function score(board) {
    const owned = { black: 0, white: 0 };
    const visited = new Set();
    const key = (r, c) => `${r},${c}`;

    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        const team = teamOf(board[r][c]);
        if (team === BLACK) owned.black += 1;
        if (team === WHITE) owned.white += 1;
      }
    }

    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if (board[r][c] !== EMPTY || visited.has(key(r, c))) continue;
        const stack = [[r, c]];
        const region = [];
        const borders = new Set();
        visited.add(key(r, c));
        while (stack.length) {
          const [cr, cc] = stack.pop();
          region.push([cr, cc]);
          for (const [nr, nc] of neighbors(cr, cc)) {
            if (board[nr][nc] === EMPTY && !visited.has(key(nr, nc))) {
              visited.add(key(nr, nc));
              stack.push([nr, nc]);
            } else if (board[nr][nc] !== EMPTY) {
              const t = teamOf(board[nr][nc]);
              if (t) borders.add(t);
            }
          }
        }
        if (borders.size === 1) {
          const owner = [...borders][0];
          if (owner === BLACK) owned.black += region.length;
          else owned.white += region.length;
        }
      }
    }
    return owned;
  }

  return {
    SIZE,
    EMPTY,
    BLACK,
    WHITE,
    BLACK2,
    WHITE2,
    allied,
    createBoard,
    place,
    trySwallow,
    score,
    boardHash,
    opponent,
    teamOf,
    sameTeam,
    getGroup,
    cloneBoard,
  };
}

module.exports = {
  createEngine,
  SIZES,
  BLACK2,
  WHITE2,
  ...createEngine(SIZES.small),
};
