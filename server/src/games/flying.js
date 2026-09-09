/**
 * 飞行棋（Aeroplane Chess / Ludo 风格）
 * 2～4 人，红黄蓝绿，每人 4 机；骰子 1–6，掷 6 出舱；
 * 环形轨道后进本色航道；走到对方格子将其打回基地。
 */
const SIZES = { small: 1, large: 1 };
const TRACK_LEN = 52;
const HOME_LEN = 6;
const PLANES_EACH = 4;
const START = { 1: 0, 2: 13, 3: 26, 4: 39 };
const COLOR_KEYS = { 1: 'red', 2: 'yellow', 3: 'blue', 4: 'green' };
const COLOR_LABELS = { 1: '红', 2: '黄', 3: '蓝', 4: '绿' };

function createEngine(playerCount = 2) {
  const SIZE = 1;
  const seats = Math.min(4, Math.max(2, Number(playerCount) || 2));

  function makePlanes() {
    const planes = [];
    for (let color = 1; color <= seats; color += 1) {
      for (let i = 0; i < PLANES_EACH; i += 1) {
        planes.push({
          id: `${color}-${i}`,
          color,
          index: i,
          loc: 'base',
          pos: i,
        });
      }
    }
    return planes;
  }

  function createBoard() {
    return {
      playerCount: seats,
      planes: makePlanes(),
      dice: null,
      lastDice: null,
      rolled: false,
      sixStreak: 0,
    };
  }

  function cloneBoard(board) {
    return JSON.parse(JSON.stringify(board));
  }

  function planeById(board, id) {
    return (board.planes || []).find((p) => p.id === id) || null;
  }

  function occupancyTrack(board, pos, exceptId) {
    return (board.planes || []).filter(
      (p) => p.loc === 'track' && p.pos === pos && p.id !== exceptId
    );
  }

  function destFor(plane, dice) {
    if (!plane || plane.loc === 'done') return null;
    if (plane.loc === 'base') {
      if (dice !== 6) return null;
      return { loc: 'track', pos: START[plane.color] };
    }
    if (plane.loc === 'home') {
      const np = plane.pos + dice;
      if (np === HOME_LEN - 1) return { loc: 'done', pos: HOME_LEN - 1 };
      if (np > HOME_LEN - 1) return null;
      return { loc: 'home', pos: np };
    }
    if (plane.loc === 'track') {
      const start = START[plane.color];
      const dist = (plane.pos - start + TRACK_LEN) % TRACK_LEN;
      const next = dist + dice;
      if (next <= 50) {
        return { loc: 'track', pos: (start + next) % TRACK_LEN };
      }
      const homePos = next - 51;
      if (homePos > HOME_LEN - 1) return null;
      if (homePos === HOME_LEN - 1) return { loc: 'done', pos: HOME_LEN - 1 };
      return { loc: 'home', pos: homePos };
    }
    return null;
  }

  function nextCell(plane) {
    if (!plane || plane.loc === 'done') return null;
    if (plane.loc === 'base') {
      return { loc: 'track', pos: START[plane.color] };
    }
    if (plane.loc === 'track') {
      const start = START[plane.color];
      const dist = (plane.pos - start + TRACK_LEN) % TRACK_LEN;
      if (dist === 50) return { loc: 'home', pos: 0 };
      return { loc: 'track', pos: (plane.pos + 1) % TRACK_LEN };
    }
    if (plane.loc === 'home') {
      const np = plane.pos + 1;
      if (np >= HOME_LEN - 1) return { loc: 'done', pos: HOME_LEN - 1 };
      return { loc: 'home', pos: np };
    }
    return null;
  }

  function walkPath(plane, dest) {
    if (!plane || !dest) return [];
    const path = [];
    let cur = { loc: plane.loc, pos: plane.pos, color: plane.color };
    for (let i = 0; i < 16; i += 1) {
      const step = nextCell(cur);
      if (!step) break;
      path.push(step);
      cur = { loc: step.loc, pos: step.pos, color: plane.color };
      if (step.loc === dest.loc && step.pos === dest.pos) break;
    }
    return path;
  }

  function canUse(board, plane, dice) {
    const dest = destFor(plane, dice);
    if (!dest) return false;
    if (dest.loc === 'track') {
      const same = occupancyTrack(board, dest.pos, plane.id).filter((p) => p.color === plane.color);
      if (same.length) return false;
    }
    return true;
  }

  function legalPlanes(board, color, dice) {
    if (!dice) return [];
    return (board.planes || []).filter((p) => p.color === color && canUse(board, p, dice));
  }

  function roll(board, forcedDice) {
    let dice;
    if (forcedDice != null) {
      dice = Math.min(6, Math.max(1, Number(forcedDice) || 0));
      if (!Number.isInteger(dice) || dice < 1 || dice > 6) {
        return { ok: false, error: '点数须为 1–6' };
      }
    } else {
      dice = 1 + Math.floor(Math.random() * 6);
    }
    const next = cloneBoard(board);
    next.dice = dice;
    next.rolled = true;
    next.lastDice = dice;
    if (dice === 6) next.sixStreak = (board.sixStreak || 0) + 1;
    else next.sixStreak = 0;
    return { ok: true, board: next, dice };
  }

  function movePlane(board, planeId, color, extra = {}) {
    if (!board || !board.rolled || !board.dice) {
      return { ok: false, error: '请先掷骰子' };
    }
    const plane = planeById(board, planeId);
    if (!plane || plane.color !== color) return { ok: false, error: '请选择自己的飞机' };
    const dice = board.dice;
    if (!canUse(board, plane, dice)) return { ok: false, error: '该飞机无法按此点数移动' };
    const dest = destFor(plane, dice);
    const from = { loc: plane.loc, pos: plane.pos, color: plane.color, index: plane.index };
    const path = walkPath(plane, dest);
    const next = cloneBoard(board);
    const me = planeById(next, planeId);
    const captured = [];
    const blocked = [];
    const shields = extra.shields || {};
    if (dest.loc === 'track') {
      const foes = occupancyTrack(next, dest.pos, planeId).filter((p) => p.color !== color);
      foes.forEach((f) => {
        if ((Number(shields[f.color]) || 0) > 0) {
          blocked.push({ id: f.id, color: f.color, index: f.index });
          return;
        }
        captured.push({
          id: f.id,
          color: f.color,
          index: f.index,
          from: { loc: f.loc, pos: f.pos },
        });
        f.loc = 'base';
        f.pos = f.index;
      });
    }
    me.loc = dest.loc;
    me.pos = dest.pos;
    next.dice = null;
    next.rolled = false;
    next.lastDice = dice;
    const extraTurn = dice === 6 && (board.sixStreak || 0) < 3;
    if (!extraTurn) next.sixStreak = 0;
    const mine = next.planes.filter((p) => p.color === color);
    const win = mine.every((p) => p.loc === 'done');
    return {
      ok: true,
      board: next,
      dice,
      dest,
      from,
      path,
      captured,
      blocked,
      extraTurn,
      win,
      planeId,
    };
  }

  function skipIfStuck(board, color) {
    if (!board.rolled || !board.dice) return { ok: false };
    if (legalPlanes(board, color, board.dice).length) return { ok: false };
    const next = cloneBoard(board);
    const extraTurn = board.dice === 6 && (board.sixStreak || 0) < 3;
    next.dice = null;
    next.rolled = false;
    next.lastDice = board.dice;
    if (!extraTurn) next.sixStreak = 0;
    return { ok: true, board: next, extraTurn, stuck: true, dice: board.dice };
  }

  function place() {
    return { ok: false, error: '飞行棋请使用掷骰与选择飞机' };
  }

  function trySwallow() {
    return { ok: false, error: '飞行棋不可使用吞噬' };
  }

  return {
    SIZE,
    TRACK_LEN,
    HOME_LEN,
    PLANES_EACH,
    START,
    COLOR_KEYS,
    COLOR_LABELS,
    createBoard,
    cloneBoard,
    place,
    roll,
    movePlane,
    legalPlanes,
    destFor,
    nextCell,
    walkPath,
    skipIfStuck,
    trySwallow,
    planeById,
    RULE_NOTE: '2～4 人飞行棋：掷 6 出舱，沿环道走，进本色航道；踩到对手送回基地。同色跳跃未启用。',
  };
}

module.exports = {
  createEngine,
  SIZES,
  TRACK_LEN,
  HOME_LEN,
  PLANES_EACH,
  START,
  COLOR_KEYS,
  COLOR_LABELS,
  ...createEngine(4),
};
