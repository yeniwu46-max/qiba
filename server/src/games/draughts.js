/**
 * 8×8 深色格跳棋（大厅名「国际跳棋」）
 * 兵仅前进斜走；跳吃可向斜前方；连跳；底线升王（王可前后斜走一格）。
 * 非 10×10 国际跳棋飞王规则。
 */
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const BLACK_KING = 3;
const WHITE_KING = 4;
const SIZES = { small: 8, large: 8 };
const SIZE = 8;
const DIAG = [
  [1, -1],
  [1, 1],
  [-1, -1],
  [-1, 1],
];

function isDark(r, c) {
  return (r + c) % 2 === 1;
}

function colorOf(v) {
  if (v === BLACK || v === BLACK_KING) return BLACK;
  if (v === WHITE || v === WHITE_KING) return WHITE;
  return EMPTY;
}

function isKing(v) {
  return v === BLACK_KING || v === WHITE_KING;
}

function kingOf(color) {
  return color === BLACK ? BLACK_KING : WHITE_KING;
}

function manOf(color) {
  return color === BLACK ? BLACK : WHITE;
}

function inBounds(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function manDirs(color) {
  return color === BLACK ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]];
}

function createEngine() {
  function createBoard() {
    const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if (isDark(r, c)) board[r][c] = BLACK;
      }
    }
    for (let r = 5; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if (isDark(r, c)) board[r][c] = WHITE;
      }
    }
    return board;
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function jumpsFrom(board, r, c) {
    const v = board[r][c];
    const col = colorOf(v);
    if (!col) return [];
    const dirs = isKing(v) ? DIAG : manDirs(col);
    const jumps = [];
    for (const [dr, dc] of dirs) {
      const mr = r + dr;
      const mc = c + dc;
      const lr = r + dr * 2;
      const lc = c + dc * 2;
      if (!inBounds(lr, lc) || !inBounds(mr, mc)) continue;
      if (!isDark(lr, lc)) continue;
      const mid = board[mr][mc];
      if (!mid || colorOf(mid) === col) continue;
      if (board[lr][lc] !== EMPTY) continue;
      jumps.push({ r: lr, c: lc, captured: { r: mr, c: mc } });
    }
    return jumps;
  }

  function stepsFrom(board, r, c) {
    const v = board[r][c];
    const col = colorOf(v);
    if (!col) return [];
    const dirs = isKing(v) ? DIAG : manDirs(col);
    const steps = [];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc) || !isDark(nr, nc)) continue;
      if (board[nr][nc] === EMPTY) steps.push({ r: nr, c: nc });
    }
    return steps;
  }

  function listColor(board, color) {
    const list = [];
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if (colorOf(board[r][c]) === color) list.push({ r, c, v: board[r][c] });
      }
    }
    return list;
  }

  function allJumps(board, color) {
    const jumps = [];
    for (const p of listColor(board, color)) {
      for (const j of jumpsFrom(board, p.r, p.c)) {
        jumps.push({ fromR: p.r, fromC: p.c, toR: j.r, toC: j.c, captured: j.captured });
      }
    }
    return jumps;
  }

  function allSteps(board, color) {
    const steps = [];
    for (const p of listColor(board, color)) {
      for (const s of stepsFrom(board, p.r, p.c)) {
        steps.push({ fromR: p.r, fromC: p.c, toR: s.r, toC: s.c });
      }
    }
    return steps;
  }

  function hasMoves(board, color) {
    return allJumps(board, color).length > 0 || allSteps(board, color).length > 0;
  }

  function countColor(board, color) {
    return listColor(board, color).length;
  }

  function maybeKing(piece, r) {
    if (isKing(piece)) return piece;
    if (colorOf(piece) === BLACK && r === SIZE - 1) return BLACK_KING;
    if (colorOf(piece) === WHITE && r === 0) return WHITE_KING;
    return piece;
  }

  function move(board, fromR, fromC, toR, toC, color, continueFrom) {
    fromR = Number(fromR);
    fromC = Number(fromC);
    toR = Number(toR);
    toC = Number(toC);
    if (!inBounds(fromR, fromC) || !inBounds(toR, toC)) {
      return { ok: false, error: '超出棋盘' };
    }
    if (!isDark(toR, toC)) return { ok: false, error: '只能走深色格' };
    const piece = board[fromR][fromC];
    if (colorOf(piece) !== color) return { ok: false, error: '请选择己方棋子' };
    if (board[toR][toC] !== EMPTY) return { ok: false, error: '目标格有子' };
    if (continueFrom) {
      if (fromR !== continueFrom.r || fromC !== continueFrom.c) {
        return { ok: false, error: '必须继续跳吃同一颗棋' };
      }
    }

    const jumps = jumpsFrom(board, fromR, fromC);
    const jump = jumps.find((j) => j.r === toR && j.c === toC);
    if (continueFrom && !jump) return { ok: false, error: '连跳中只能跳吃' };

    const next = cloneBoard(board);
    if (jump) {
      next[jump.captured.r][jump.captured.c] = EMPTY;
      next[fromR][fromC] = EMPTY;
      const crowned = maybeKing(piece, toR);
      next[toR][toC] = crowned;
      const more = isKing(crowned) === isKing(piece)
        ? jumpsFrom(next, toR, toC)
        : [];
      // 升王当回合结束（英美跳棋常见）
      const moreJumps = !isKing(piece) && isKing(crowned) ? [] : more;
      const enemy = color === BLACK ? WHITE : BLACK;
      const win = countColor(next, enemy) === 0 || !hasMoves(next, enemy);
      return {
        ok: true,
        board: next,
        captured: [jump.captured],
        kinged: crowned !== piece,
        moreJumps: moreJumps.length > 0,
        continueAt: moreJumps.length ? { r: toR, c: toC } : null,
        win,
        draw: false,
      };
    }

    if (allJumps(board, color).length) {
      return { ok: false, error: '有跳吃时必须跳吃' };
    }
    const steps = stepsFrom(board, fromR, fromC);
    if (!steps.some((s) => s.r === toR && s.c === toC)) {
      return { ok: false, error: '非法走子' };
    }
    next[fromR][fromC] = EMPTY;
    const crowned = maybeKing(piece, toR);
    next[toR][toC] = crowned;
    const enemy = color === BLACK ? WHITE : BLACK;
    const win = countColor(next, enemy) === 0 || !hasMoves(next, enemy);
    return {
      ok: true,
      board: next,
      captured: [],
      kinged: crowned !== piece,
      moreJumps: false,
      continueAt: null,
      win,
      draw: false,
    };
  }

  function place(board, r, c, color, extra = {}) {
    return move(board, extra.fromR, extra.fromC, r, c, color, extra.continueFrom);
  }

  function trySwallow() {
    return { ok: false, error: '跳棋模式不可使用吞噬' };
  }

  function legalMoves(board, color, continueFrom) {
    if (continueFrom) {
      return jumpsFrom(board, continueFrom.r, continueFrom.c).map((j) => ({
        fromR: continueFrom.r,
        fromC: continueFrom.c,
        toR: j.r,
        toC: j.c,
        jump: true,
      }));
    }
    const jumps = allJumps(board, color);
    if (jumps.length) {
      return jumps.map((j) => ({
        fromR: j.fromR,
        fromC: j.fromC,
        toR: j.toR,
        toC: j.toC,
        jump: true,
      }));
    }
    return allSteps(board, color).map((s) => ({
      fromR: s.fromR,
      fromC: s.fromC,
      toR: s.toR,
      toC: s.toC,
      jump: false,
    }));
  }

  return {
    SIZE,
    EMPTY,
    BLACK,
    WHITE,
    BLACK_KING,
    WHITE_KING,
    createBoard,
    cloneBoard,
    place,
    move,
    trySwallow,
    hasMoves,
    legalMoves,
    jumpsFrom,
    colorOf,
    isKing,
    isDark,
    RULE_NOTE: '8×8 深色格跳棋：前进斜走、有跳必跳、可连跳、底线升王（短王）。非 10×10 飞王。',
  };
}

module.exports = {
  createEngine,
  SIZES,
  SIZE,
  ...createEngine(),
};
