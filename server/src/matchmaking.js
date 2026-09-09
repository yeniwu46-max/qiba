const DEFAULT_TURN_MS = 30000;

function normTurnMs(turnMs) {
  return Math.min(120000, Math.max(5000, Number(turnMs) || DEFAULT_TURN_MS));
}

function compatible(a, b) {
  if (!a || !b) return false;
  return a.gameType === b.gameType
    && a.mode === b.mode
    && normTurnMs(a.turnMs) === normTurnMs(b.turnMs);
}

class MatchQueue {
  constructor() {
    this.byUid = new Map();
  }

  enqueue(entry) {
    if (!entry || !entry.uid) return null;
    this.cancel(entry.uid);
    const item = {
      uid: entry.uid,
      name: entry.name || '玩家',
      skin: entry.skin || 'red',
      gameType: entry.gameType || 'gomoku',
      mode: entry.mode || '1v1',
      turnMs: normTurnMs(entry.turnMs),
      totalRounds: entry.totalRounds,
      boardScale: entry.boardScale,
      ws: entry.ws || null,
      at: Number(entry.at) || Date.now(),
    };
    this.byUid.set(item.uid, item);
    return item;
  }

  cancel(uid) {
    if (!uid) return false;
    return this.byUid.delete(uid);
  }

  get(uid) {
    return this.byUid.get(uid) || null;
  }

  size() {
    return this.byUid.size;
  }

  takeCompatible(opts) {
    if (!opts) return null;
    for (const [id, q] of this.byUid) {
      if (id === opts.uid) continue;
      if (!compatible(q, opts)) continue;
      if (q.ws && q.ws.readyState != null && q.ws.readyState !== 1) {
        this.byUid.delete(id);
        continue;
      }
      this.byUid.delete(id);
      return q;
    }
    return null;
  }
}

/**
 * 优先加入已有公开等候房；否则与队列中兼容玩家配对建房；再否则入队。
 */
function tryQuickMatch(manager, queue, opts = {}) {
  const found = manager.quickMatch(opts);
  if (found && found.ok && found.matched) {
    queue.cancel(opts.uid);
    return {
      ok: true,
      matched: true,
      queued: false,
      via: 'lobby',
      playerId: found.playerId,
      room: found.room,
    };
  }

  const other = queue.takeCompatible({
    uid: opts.uid,
    gameType: opts.gameType || 'gomoku',
    mode: opts.mode || '1v1',
    turnMs: opts.turnMs,
  });
  if (other) {
    queue.cancel(opts.uid);
    const created = manager.create({
      gameType: other.gameType || opts.gameType,
      mode: other.mode || opts.mode,
      name: other.name,
      skin: other.skin,
      totalRounds: other.totalRounds != null ? other.totalRounds : opts.totalRounds,
      boardScale: other.boardScale || opts.boardScale,
      turnMs: other.turnMs || opts.turnMs,
      visibility: 'public',
      uid: other.uid,
      joinPass: '',
    });
    if (!created.ok) {
      queue.enqueue(other);
      return created;
    }
    const joined = manager.join(created.room.code, {
      name: opts.name,
      skin: opts.skin,
      uid: opts.uid,
      asSpectator: false,
      joinPass: '',
    });
    if (!joined.ok) {
      queue.enqueue({ ...opts, ws: opts.ws || null });
      return joined;
    }
    return {
      ok: true,
      matched: true,
      queued: false,
      via: 'queue',
      room: created.room,
      host: { playerId: created.playerId, entry: other },
      guest: { playerId: joined.playerId, entry: opts },
    };
  }

  const queued = queue.enqueue({ ...opts, ws: opts.ws || null });
  return {
    ok: true,
    matched: false,
    queued: true,
    startedAt: queued.at,
  };
}

module.exports = {
  MatchQueue,
  tryQuickMatch,
  compatible,
  normTurnMs,
};
