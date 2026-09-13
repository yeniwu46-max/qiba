const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { RoomManager } = require('./room');
const gomoku = require('./games/gomoku');
const clubs = require('./clubs');
const {
  getProfile,
  getProfileById,
  saveProfile,
  upgradeJob,
  recordOutcome,
  getRecentMatches,
  getLeaderboard,
  publicSeason,
  recordDailySpectate,
  claimDailyTask,
  addFriend,
  removeFriend,
  listFriends,
  searchProfiles,
  inviteMentor,
  respondMentor,
  listWorldFeed,
} = require('./stats');
const auth = require('./auth');
const invites = require('./invites');
const { MatchQueue, tryQuickMatch } = require('./matchmaking');

const PORT = process.env.PORT || 3000;
const WEB_ROOT = path.join(__dirname, '../../web');
const DATA_DIR = path.join(__dirname, '../data');
const REPLAYS_FILE = path.join(DATA_DIR, 'replays.json');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

let persistTimer = null;
function schedulePersistRooms() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    saveRoomsToDisk();
  }, 400);
}

function ensureRoomsStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ROOMS_FILE)) {
    fs.writeFileSync(ROOMS_FILE, JSON.stringify({ version: 1, rooms: [] }), 'utf8');
  }
}

function saveRoomsToDisk() {
  try {
    ensureRoomsStore();
    const payload = manager.serializeAll();
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (e) {
    console.error('save rooms failed', e);
  }
}

function loadRoomsFromDisk() {
  try {
    ensureRoomsStore();
    const raw = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8') || '{}');
    return manager.loadFromData(raw);
  } catch (e) {
    console.error('load rooms failed', e);
    return { loaded: 0 };
  }
}

const manager = new RoomManager({ onChange: schedulePersistRooms });

/** @type {Map<string, import('ws').WebSocket>} */
const sockets = new Map();
/** @type {Map<string, Set<import('ws').WebSocket>>} */
const uidSockets = new Map();
const matchQueue = new MatchQueue();
/** @type {Map<string, NodeJS.Timeout>} */
const botTimers = new Map();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.wasm': 'application/wasm',
};

function send(ws, type, payload = {}) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ type, ...payload }));
  }
}

function roomPlayerIds(room) {
  const ids = new Set();
  for (const s of room.seats) {
    if (s.player) ids.add(s.player.id);
  }
  for (const s of room.spectators) ids.add(s.id);
  for (const s of room.commentators) ids.add(s.id);
  return ids;
}

function bindUid(ws, uid) {
  if (!ws || !uid) return;
  if (ws.uid && ws.uid !== uid) unbindUid(ws);
  ws.uid = uid;
  let set = uidSockets.get(uid);
  if (!set) {
    set = new Set();
    uidSockets.set(uid, set);
  }
  set.add(ws);
}

function unbindUid(ws) {
  if (!ws || !ws.uid) return;
  const set = uidSockets.get(ws.uid);
  if (set) {
    set.delete(ws);
    if (!set.size) uidSockets.delete(ws.uid);
  }
  ws.uid = null;
}

function isUidOnline(uid) {
  const set = uidSockets.get(uid);
  if (!set) return false;
  for (const w of set) {
    if (w.readyState === 1) return true;
  }
  return false;
}

function sendToUid(uid, type, payload = {}) {
  const set = uidSockets.get(uid);
  if (!set) return 0;
  let n = 0;
  for (const w of set) {
    if (w.readyState === 1) {
      send(w, type, payload);
      n += 1;
    }
  }
  return n;
}

function deliverPendingInvites(ws, uid) {
  if (!ws || !uid) return;
  for (const payload of invites.deliverPayloads(uid)) {
    send(ws, 'inviteReceived', payload);
  }
}

function friendsWithOnline(uid, name) {
  return listFriends({ uid, name }).map((f) => ({ ...f, online: isUidOnline(f.uid) }));
}

function clearBotTimer(room) {
  if (!room || !room.code) return;
  const t = botTimers.get(room.code);
  if (t) {
    clearTimeout(t);
    botTimers.delete(room.code);
  }
}

function scheduleBotIfNeeded(room) {
  if (!room) return;
  clearBotTimer(room);
  if (room.phase !== 'playing') return;
  const seat = room.currentSeat && room.currentSeat();
  if (!seat || !seat.player || !seat.player.bot) return;
  const delay = room.gameType === 'gomoku' ? 3200 : 700;
  const timer = setTimeout(() => {
    botTimers.delete(room.code);
    if (room.phase !== 'playing') return;
    const cur = room.currentSeat();
    if (!cur || !cur.player || !cur.player.bot) return;
    const r = room.playBotMove();
    if (r && r.ok) {
      broadcastRoom(room);
      scheduleBotIfNeeded(room);
    }
  }, delay);
  botTimers.set(room.code, timer);
}

function broadcastRoom(room) {
  if (!room) return;
  const ids = roomPlayerIds(room);
  for (const id of ids) {
    const ws = sockets.get(id);
    if (ws) send(ws, 'stateSync', { state: room.publicState(id) });
  }
  schedulePersistRooms();
  scheduleBotIfNeeded(room);
}

function broadcastChat(room, chat) {
  if (!room || !chat) return;
  const ids = roomPlayerIds(room);
  for (const id of ids) {
    const ws = sockets.get(id);
    if (ws) send(ws, 'chat', { chat });
  }
}

function broadcastDanmaku(room, danmaku) {
  if (!room || !danmaku) return;
  const ids = roomPlayerIds(room);
  for (const id of ids) {
    const ws = sockets.get(id);
    if (ws) send(ws, 'danmaku', { danmaku });
  }
}

function broadcastWorldRumor(entry) {
  if (!entry) return;
  for (const ws of sockets.values()) {
    if (ws && ws.readyState === 1) send(ws, 'worldRumor', { entry });
  }
}

function syncOne(ws, room, playerId) {
  send(ws, 'stateSync', { state: room.publicState(playerId) });
}

function readJsonBody(req, limit = 200000) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > limit) {
        req.destroy();
        reject(new Error('body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('无效 JSON'));
      }
    });
    req.on('error', reject);
  });
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function ensureReplaysStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(REPLAYS_FILE)) fs.writeFileSync(REPLAYS_FILE, '{}', 'utf8');
}

function loadReplays() {
  try {
    ensureReplaysStore();
    return JSON.parse(fs.readFileSync(REPLAYS_FILE, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function saveReplays(all) {
  ensureReplaysStore();
  fs.writeFileSync(REPLAYS_FILE, JSON.stringify(all), 'utf8');
}

function genReplayId() {
  return `rp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function replayPracticeMoves(moves, boardSize = 15) {
  const size = Number(boardSize) === 9 ? 9 : 15;
  const engine = gomoku.createEngine(size);
  let board = engine.createBoard();
  let turn = 1;
  let winner = null;
  let draw = false;
  for (let i = 0; i < moves.length; i += 1) {
    const m = moves[i] || {};
    const r = Number(m.r);
    const c = Number(m.c);
    const color = Number(m.color);
    if (color !== turn) return { ok: false, error: '落子顺序不正确' };
    const placed = engine.place(board, r, c, color);
    if (!placed.ok) return { ok: false, error: placed.error || '非法落子' };
    board = placed.board;
    if (placed.win) {
      winner = color;
      if (i !== moves.length - 1) return { ok: false, error: '胜负后仍有多余手数' };
      break;
    }
    if (placed.draw) {
      draw = true;
      if (i !== moves.length - 1) return { ok: false, error: '终局后仍有多余手数' };
      break;
    }
    turn = turn === 1 ? 2 : 1;
  }
  return { ok: true, winner, draw, size };
}

function finishPracticeGame(data = {}) {
  const id = data.id || null;
  const name = String(data.name || '').trim().slice(0, 12);
  if (!id && !name) return { ok: false, error: '缺少练习者身份' };
  const outcome = data.outcome;
  if (!['win', 'loss', 'draw'].includes(outcome)) {
    return { ok: false, error: '无效结果' };
  }
  const moves = Array.isArray(data.moves) ? data.moves : [];
  if (data.resigned) {
    if (outcome !== 'loss') return { ok: false, error: '认输只能记负' };
  } else {
    const replay = replayPracticeMoves(moves, data.boardSize);
    if (!replay.ok) return replay;
    if (outcome === 'win' && replay.winner !== 1) {
      return { ok: false, error: '棋谱无法证明黑方（练习者）获胜' };
    }
    if (outcome === 'loss' && replay.winner !== 2) {
      return { ok: false, error: '棋谱无法证明白方（AI）获胜' };
    }
    if (outcome === 'draw' && !replay.draw) {
      return { ok: false, error: '棋谱未形成和棋' };
    }
  }
  const profile = recordOutcome(name || '练习者', outcome, { id, gameType: 'gomoku' });
  return {
    ok: true,
    profile,
    countsForRank: true,
    source: 'practice',
  };
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(WEB_ROOT, urlPath));
  if (!filePath.startsWith(WEB_ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  try {
    if (url.pathname === '/api/health') {
      json(res, 200, { ok: true, name: '棋霸' });
      return;
    }

    if (url.pathname === '/api/rooms' && req.method === 'GET') {
      json(res, 200, { ok: true, rooms: manager.listPublicRooms() });
      return;
    }

    if (url.pathname === '/api/world/feed' && req.method === 'GET') {
      const limit = Number(url.searchParams.get('limit')) || 20;
      json(res, 200, { ok: true, feed: listWorldFeed(limit) });
      return;
    }

    if (url.pathname === '/api/auth/register' && req.method === 'POST') {
      const data = await readJsonBody(req);
      const result = await auth.register(data);
      json(res, result.ok ? 200 : 400, result);
      return;
    }

    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      const data = await readJsonBody(req);
      const result = await auth.login(data);
      json(res, result.ok ? 200 : 400, result);
      return;
    }

    if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
      json(res, 200, getLeaderboard());
      return;
    }

    if (url.pathname === '/api/season' && req.method === 'GET') {
      json(res, 200, { ok: true, season: publicSeason() });
      return;
    }

    if (url.pathname === '/api/practice/finish' && req.method === 'POST') {
      const data = await readJsonBody(req);
      const result = finishPracticeGame(data);
      json(res, result.ok ? 200 : 400, result);
      return;
    }

    if (url.pathname === '/api/profile' && req.method === 'GET') {
      const id = url.searchParams.get('id');
      const name = url.searchParams.get('name');
      const profile = id ? getProfileById(id, name) : getProfile(name);
      json(res, 200, { ok: true, profile });
      return;
    }

    if (url.pathname === '/api/recent-matches' && req.method === 'GET') {
      const id = url.searchParams.get('id');
      const name = url.searchParams.get('name');
      const matches = getRecentMatches({ id, name }, 12);
      json(res, 200, { ok: true, matches });
      return;
    }

    if (url.pathname === '/api/profile' && req.method === 'POST') {
      const data = await readJsonBody(req);
      const result = saveProfile({
        id: data.id,
        name: data.name,
        signature: data.signature,
        quickChats: data.quickChats,
        mutedUids: data.mutedUids,
      });
      if (result.ok && data.username) {
        auth.bindNickname(data.username, data.name);
      }
      json(res, result.ok ? 200 : 400, result);
      return;
    }

    if (url.pathname === '/api/daily/claim' && req.method === 'POST') {
      const data = await readJsonBody(req);
      const result = claimDailyTask({
        id: data.id,
        name: data.name,
        taskId: data.taskId,
      });
      json(res, result.ok ? 200 : 400, result);
      return;
    }

    if (url.pathname === '/api/friends' && req.method === 'GET') {
      const uid = url.searchParams.get('uid');
      const name = url.searchParams.get('name') || '';
      json(res, 200, { ok: true, friends: friendsWithOnline(uid, name) });
      return;
    }

    if (url.pathname === '/api/friends/search' && req.method === 'GET') {
      const q = url.searchParams.get('q') || '';
      const fromAuth = auth.searchUsers(q, 8);
      const fromStats = searchProfiles(q, 8);
      const seen = new Set();
      const users = [];
      for (const u of fromAuth) {
        if (!u || seen.has(u.uid)) continue;
        seen.add(u.uid);
        users.push({ uid: u.uid, name: u.nickname || u.username, username: u.username });
      }
      for (const p of fromStats) {
        const id = p.id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        users.push({ uid: id, name: p.name, username: '' });
      }
      json(res, 200, { ok: true, users });
      return;
    }

    if (url.pathname === '/api/friends/add' && req.method === 'POST') {
      const data = await readJsonBody(req);
      let targetUid = data.targetUid;
      if (!targetUid && data.targetName) {
        const u = auth.searchUsers(data.targetName, 5).find((x) =>
          (x.nickname || '') === data.targetName || (x.username || '') === String(data.targetName).toLowerCase()
        );
        if (u) targetUid = u.uid;
      }
      const result = addFriend({
        uid: data.uid,
        name: data.name,
        targetUid,
        targetName: data.targetName,
      });
      if (result.ok) result.friends = friendsWithOnline(data.uid, data.name);
      json(res, result.ok ? 200 : 400, result);
      return;
    }

    if (url.pathname === '/api/friends/remove' && req.method === 'POST') {
      const data = await readJsonBody(req);
      const result = removeFriend({ uid: data.uid, name: data.name, targetUid: data.targetUid });
      if (result.ok) result.friends = friendsWithOnline(data.uid, data.name);
      json(res, result.ok ? 200 : 400, result);
      return;
    }

    if (url.pathname === '/api/clubs/mine' && req.method === 'GET') {
      const uid = url.searchParams.get('uid');
      json(res, 200, { ok: true, club: clubs.mine(uid) });
      return;
    }

    if (url.pathname === '/api/clubs/rank' && req.method === 'GET') {
      json(res, 200, { ok: true, clubs: clubs.ranking() });
      return;
    }

    if (url.pathname === '/api/clubs/create' && req.method === 'POST') {
      const data = await readJsonBody(req);
      const result = clubs.createClub(data);
      json(res, result.ok ? 200 : 400, result);
      return;
    }

    if (url.pathname === '/api/clubs/join' && req.method === 'POST') {
      const data = await readJsonBody(req);
      const result = clubs.joinClub(data);
      json(res, result.ok ? 200 : 400, result);
      return;
    }

    if (url.pathname === '/api/clubs/leave' && req.method === 'POST') {
      const data = await readJsonBody(req);
      const result = clubs.leaveClub(data);
      json(res, result.ok ? 200 : 400, result);
      return;
    }

    if (url.pathname === '/api/replay' && req.method === 'POST') {
      const data = await readJsonBody(req, 500000);
      if (!data || !data.moves) {
        json(res, 400, { ok: false, error: '无效棋谱' });
        return;
      }
      const id = genReplayId();
      const all = loadReplays();
      all[id] = {
        ...data,
        id,
        savedAt: Date.now(),
      };
      // 简单上限：最多保留 200 份
      const keys = Object.keys(all);
      if (keys.length > 200) {
        keys
          .sort((a, b) => (all[a].savedAt || 0) - (all[b].savedAt || 0))
          .slice(0, keys.length - 200)
          .forEach((k) => delete all[k]);
      }
      saveReplays(all);
      json(res, 200, { ok: true, id, url: `/replay.html?id=${id}` });
      return;
    }

    if (url.pathname.startsWith('/api/replay/') && req.method === 'GET') {
      const id = decodeURIComponent(url.pathname.slice('/api/replay/'.length));
      const all = loadReplays();
      const replay = all[id];
      if (!replay) {
        json(res, 404, { ok: false, error: '棋谱不存在' });
        return;
      }
      json(res, 200, { ok: true, replay });
      return;
    }
  } catch (e) {
    json(res, 400, { ok: false, error: e.message || '请求失败' });
    return;
  }

  serveStatic(req, res);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.playerId = null;
  ws.voluntaryLeave = false;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      send(ws, 'error', { error: '无效JSON' });
      return;
    }
    try {
      handle(ws, msg.type, msg);
    } catch (e) {
      console.error(e);
      send(ws, 'error', { error: e.message || '服务器错误' });
    }
  });

  ws.on('close', () => {
    if (ws.uid) matchQueue.cancel(ws.uid);
    unbindUid(ws);
    if (!ws.playerId) return;
    const playerId = ws.playerId;
    // 若 socket 已被新连接替换，则不要触发离席
    if (sockets.get(playerId) !== ws) return;
    sockets.delete(playerId);
    if (ws.voluntaryLeave) {
      const room = manager.leaveImmediate(playerId);
      if (room) broadcastRoom(room);
      return;
    }
    const room = manager.scheduleLeave(playerId, (leftRoom) => {
      if (leftRoom) broadcastRoom(leftRoom);
    });
    if (room) broadcastRoom(room);
  });
});

function bindSocket(ws, playerId) {
  const prev = sockets.get(playerId);
  if (prev && prev !== ws) {
    prev.playerId = null;
    try {
      prev.close();
    } catch {
      /* ignore */
    }
  }
  ws.playerId = playerId;
  ws.voluntaryLeave = false;
  sockets.set(playerId, ws);
  manager.cancelPendingLeave(playerId);
}

function handle(ws, type, msg) {
  if (type === 'ping') {
    send(ws, 'pong', { t: Date.now() });
    return;
  }

  if (type === 'listRooms') {
    send(ws, 'roomList', { rooms: manager.listPublicRooms() });
    return;
  }

  if (type === 'hello') {
    const uid = msg.uid;
    if (uid && auth.getUserByUid(uid)) {
      bindUid(ws, uid);
      send(ws, 'helloOk', { ok: true });
      deliverPendingInvites(ws, uid);
    }
    return;
  }

  if (type === 'friendList') {
    const uid = msg.uid || ws.uid;
    if (!uid) {
      send(ws, 'error', { error: '请先登录' });
      return;
    }
    bindUid(ws, uid);
    send(ws, 'friendList', { friends: friendsWithOnline(uid, msg.name) });
    return;
  }

  if (type === 'friendAdd') {
    const uid = msg.uid || ws.uid;
    if (!uid || !auth.getUserByUid(uid)) {
      send(ws, 'error', { error: '请先登录' });
      return;
    }
    bindUid(ws, uid);
    let targetUid = msg.targetUid;
    if (!targetUid && msg.targetName) {
      const hit = auth.searchUsers(msg.targetName, 8).find((x) =>
        (x.nickname || '') === msg.targetName
        || (x.username || '') === String(msg.targetName).toLowerCase()
      );
      if (hit) targetUid = hit.uid;
    }
    const result = addFriend({
      uid,
      name: msg.name,
      targetUid,
      targetName: msg.targetName,
    });
    if (!result.ok) send(ws, 'error', { error: result.error });
    else send(ws, 'friendList', { friends: friendsWithOnline(uid, msg.name) });
    return;
  }

  if (type === 'friendRemove') {
    const uid = msg.uid || ws.uid;
    if (!uid) {
      send(ws, 'error', { error: '请先登录' });
      return;
    }
    const result = removeFriend({ uid, name: msg.name, targetUid: msg.targetUid });
    if (!result.ok) send(ws, 'error', { error: result.error });
    else send(ws, 'friendList', { friends: friendsWithOnline(uid, msg.name) });
    return;
  }

  if (type === 'mentorInvite') {
    const uid = msg.uid || ws.uid;
    if (!uid || !auth.getUserByUid(uid)) {
      send(ws, 'error', { error: '请先登录' });
      return;
    }
    const result = inviteMentor({
      fromUid: uid,
      fromName: msg.name,
      toUid: msg.toUid,
      toName: msg.toName,
    });
    if (!result.ok) send(ws, 'error', { error: result.error });
    else {
      send(ws, 'mentorInvited', { ok: true, toUid: msg.toUid });
      sendToUid(msg.toUid, 'mentorInviteReceived', {
        fromUid: uid,
        fromName: msg.name || '棋友',
        invite: result.invite,
      });
    }
    return;
  }

  if (type === 'mentorRespond') {
    const uid = msg.uid || ws.uid;
    if (!uid) {
      send(ws, 'error', { error: '请先登录' });
      return;
    }
    const result = respondMentor({ uid, name: msg.name, accept: msg.accept !== false });
    if (!result.ok) send(ws, 'error', { error: result.error });
    else {
      send(ws, 'mentorBond', result);
      if (result.mentor && result.mentor.id) {
        sendToUid(result.mentor.id, 'mentorBond', result);
      }
    }
    return;
  }

  if (type === 'friendInvite') {
    const uid = msg.uid || ws.uid;
    if (!uid || !auth.getUserByUid(uid)) {
      send(ws, 'error', { error: '请先登录' });
      return;
    }
    bindUid(ws, uid);
    const toUid = msg.toUid;
    if (!toUid) {
      send(ws, 'error', { error: '请选择好友' });
      return;
    }
    const mine = listFriends({ uid, name: msg.name }).some((f) => f.uid === toUid);
    if (!mine) {
      send(ws, 'error', { error: '只能邀请好友' });
      return;
    }
    let room = ws.playerId ? manager.getByPlayer(ws.playerId) : null;
    if (!room || room.visibility !== 'private' || room.phase !== 'lobby') {
      const club = clubs.getByMember(uid);
      const created = manager.create({
        gameType: msg.gameType || 'gomoku',
        mode: msg.mode || '1v1',
        name: msg.name,
        skin: msg.skin,
        totalRounds: msg.totalRounds,
        boardScale: msg.boardScale,
        turnMs: msg.turnMs,
        visibility: 'private',
        uid,
        fillBots: !!msg.fillBots,
        clubTag: club ? club.shortName : '',
        clubId: club ? club.id : '',
        clubName: club ? club.name : '',
      });
      if (!created.ok) {
        send(ws, 'error', { error: created.error });
        return;
      }
      bindSocket(ws, created.playerId);
      bindUid(ws, uid);
      room = created.room;
      send(ws, 'created', {
        playerId: created.playerId,
        code: room.code,
        hasJoinPass: room.hasJoinPass(),
      });
      syncOne(ws, room, created.playerId);
    }
    const saved = invites.create({
      fromUid: uid,
      fromName: msg.name || '好友',
      toUid,
      roomCode: room.code,
      gameType: room.gameType,
      mode: room.mode,
    });
    if (!saved.ok) {
      send(ws, 'error', { error: saved.error || '邀请失败' });
      return;
    }
    const inviteId = saved.invite.id;
    const payload = {
      inviteId,
      fromUid: uid,
      fromName: msg.name || '好友',
      code: room.code,
      gameType: room.gameType,
      mode: room.mode,
    };
    const online = isUidOnline(toUid);
    if (online) sendToUid(toUid, 'inviteReceived', payload);
    send(ws, 'inviteSent', { inviteId, toUid, code: room.code, online });
    return;
  }

  if (type === 'inviteAccept') {
    const uid = msg.uid || ws.uid;
    if (!uid || !auth.getUserByUid(uid)) {
      send(ws, 'error', { error: '请先登录' });
      return;
    }
    bindUid(ws, uid);
    const inv = invites.get(msg.inviteId);
    if (!inv || inv.toUid !== uid) {
      send(ws, 'error', { error: '邀请无效或已过期' });
      return;
    }
    invites.remove(msg.inviteId);
    const result = manager.join(inv.roomCode, {
      name: msg.name,
      skin: msg.skin,
      uid,
      asSpectator: false,
      joinPass: '',
    });
    if (!result.ok) {
      const gone = /不存在|解散|结束/.test(result.error || '');
      send(ws, 'error', {
        error: gone ? '房间已解散' : result.error,
        needPass: !!result.needPass,
        code: inv.roomCode,
      });
      return;
    }
    bindSocket(ws, result.playerId);
    send(ws, 'joined', { playerId: result.playerId, code: result.room.code });
    broadcastRoom(result.room);
    return;
  }

  if (type === 'inviteDecline') {
    const uid = msg.uid || ws.uid;
    if (!uid) {
      send(ws, 'error', { error: '请先登录' });
      return;
    }
    const inv = invites.get(msg.inviteId);
    if (inv && inv.toUid === uid) invites.remove(msg.inviteId);
    send(ws, 'inviteDeclined', { inviteId: msg.inviteId });
    return;
  }

  if (type === 'clubCreate') {
    const uid = msg.uid || ws.uid;
    const result = clubs.createClub({ uid, name: msg.name, shortName: msg.shortName, joinCode: msg.joinCode });
    if (!result.ok) send(ws, 'error', { error: result.error });
    else send(ws, 'clubInfo', { club: result.club });
    return;
  }

  if (type === 'clubJoin') {
    const uid = msg.uid || ws.uid;
    const result = clubs.joinClub({
      uid,
      clubId: msg.clubId,
      joinCode: msg.joinCode,
      name: msg.clubName,
    });
    if (!result.ok) send(ws, 'error', { error: result.error });
    else send(ws, 'clubInfo', { club: result.club });
    return;
  }

  if (type === 'clubLeave') {
    const uid = msg.uid || ws.uid;
    const result = clubs.leaveClub({ uid });
    if (!result.ok) send(ws, 'error', { error: result.error });
    else send(ws, 'clubInfo', { club: null });
    return;
  }

  if (type === 'clubMine') {
    const uid = msg.uid || ws.uid;
    send(ws, 'clubInfo', { club: clubs.mine(uid), ranking: clubs.ranking() });
    return;
  }

  if (type === 'getProfile') {
    const profile = msg.id
      ? getProfileById(msg.id, msg.name)
      : getProfile(msg.name);
    send(ws, 'profile', { profile });
    return;
  }

  if (type === 'saveProfile') {
    const result = saveProfile({
      id: msg.id,
      name: msg.name,
      signature: msg.signature,
      quickChats: msg.quickChats,
      mutedUids: msg.mutedUids,
    });
    if (!result.ok) send(ws, 'error', { error: result.error });
    else send(ws, 'profileSaved', { profile: result.profile });
    return;
  }

  if (type === 'upgradeJob') {
    const uid = msg.uid || ws.uid;
    if (!uid || !auth.getUserByUid(uid)) {
      send(ws, 'error', { error: '请先登录后再升级职业' });
      return;
    }
    const result = upgradeJob({ id: uid, name: msg.name, job: msg.job });
    if (!result.ok) send(ws, 'error', { error: result.error });
    else send(ws, 'jobUpgraded', { profile: result.profile, job: result.job, level: result.level, spent: result.spent });
    return;
  }

  if (type === 'create') {
    const {
      gameType, mode, name, skin, totalRounds, boardScale, turnMs, roomCode, visibility, uid,
      joinPass, password, roomPass, fillBots, friendshipStake, celestial, weather, grudgeMatch,
    } = msg;
    if (!uid || !auth.getUserByUid(uid)) {
      send(ws, 'error', { error: '请先登录账号后再匹配真人' });
      return;
    }
    const club = clubs.getByMember(uid);
    const result = manager.create({
      gameType,
      mode,
      name,
      skin,
      totalRounds,
      boardScale,
      turnMs,
      roomCode,
      visibility,
      uid,
      joinPass: joinPass || password || roomPass || '',
      fillBots: !!fillBots,
      clubTag: club ? club.shortName : '',
      clubId: club ? club.id : '',
      clubName: club ? club.name : '',
      friendshipStake,
      celestial,
      weather,
      grudgeMatch,
    });
    if (!result.ok) {
      send(ws, 'error', { error: result.error });
      return;
    }
    bindSocket(ws, result.playerId);
    bindUid(ws, uid);
    send(ws, 'created', {
      playerId: result.playerId,
      code: result.room.code,
      hasJoinPass: result.room.hasJoinPass(),
    });
    syncOne(ws, result.room, result.playerId);
    return;
  }

  if (type === 'quickMatch') {
    const {
      gameType, mode, name, skin, totalRounds, boardScale, turnMs, uid,
    } = msg;
    if (!uid || !auth.getUserByUid(uid)) {
      send(ws, 'error', { error: '请先登录账号后再匹配真人' });
      return;
    }
    bindUid(ws, uid);
    const result = tryQuickMatch(manager, matchQueue, {
      gameType,
      mode,
      name,
      skin,
      totalRounds,
      boardScale,
      turnMs,
      uid,
      ws,
    });
    if (!result.ok) {
      send(ws, 'error', { error: result.error });
      return;
    }
    if (result.queued) {
      send(ws, 'queueing', { startedAt: result.startedAt || Date.now() });
      return;
    }
    if (result.via === 'queue' && result.host && result.guest) {
      const hostWs = result.host.entry && result.host.entry.ws;
      if (hostWs && hostWs.readyState === 1) {
        bindSocket(hostWs, result.host.playerId);
        bindUid(hostWs, result.host.entry.uid);
        send(hostWs, 'matched', {
          playerId: result.host.playerId,
          code: result.room.code,
          matched: true,
          hasJoinPass: result.room.hasJoinPass(),
        });
        syncOne(hostWs, result.room, result.host.playerId);
      }
      bindSocket(ws, result.guest.playerId);
      send(ws, 'matched', {
        playerId: result.guest.playerId,
        code: result.room.code,
        matched: true,
        hasJoinPass: result.room.hasJoinPass(),
      });
      syncOne(ws, result.room, result.guest.playerId);
      broadcastRoom(result.room);
      return;
    }
    bindSocket(ws, result.playerId);
    send(ws, 'matched', {
      playerId: result.playerId,
      code: result.room.code,
      matched: true,
      hasJoinPass: result.room.hasJoinPass(),
    });
    syncOne(ws, result.room, result.playerId);
    broadcastRoom(result.room);
    return;
  }

  if (type === 'cancelQuickMatch') {
    const uid = msg.uid || ws.uid;
    if (uid) matchQueue.cancel(uid);
    send(ws, 'queueCancelled', {});
    return;
  }

  if (type === 'claimDailyTask') {
    if (!msg.uid) {
      send(ws, 'error', { error: '请先登录' });
      return;
    }
    const result = claimDailyTask({
      id: msg.uid,
      name: msg.name,
      taskId: msg.taskId,
    });
    if (!result.ok) send(ws, 'error', { error: result.error });
    else send(ws, 'dailyTaskClaimed', result);
    return;
  }

  if (type === 'join') {
    if (!msg.uid || !auth.getUserByUid(msg.uid)) {
      send(ws, 'error', { error: '请先登录账号后再匹配真人' });
      return;
    }
    const result = manager.join(msg.code, {
      name: msg.name,
      skin: msg.skin,
      asSpectator: !!msg.asSpectator,
      asCommentator: !!msg.asCommentator,
      seatIndex: msg.seatIndex,
      uid: msg.uid,
      joinPass: msg.joinPass || msg.password || msg.roomPass || '',
    });
    if (!result.ok) {
      send(ws, 'error', {
        error: result.error,
        needPass: !!result.needPass,
        code: msg.code,
      });
      return;
    }
    let specProfile = null;
    if (msg.uid && (msg.asSpectator || msg.asCommentator)) {
      try {
        specProfile = recordDailySpectate({ id: msg.uid, name: msg.name });
      } catch {
        /* ignore */
      }
    }
    bindSocket(ws, result.playerId);
    if (msg.uid) bindUid(ws, msg.uid);
    send(ws, 'joined', {
      playerId: result.playerId,
      code: result.room.code,
      profile: specProfile || undefined,
      dailyTaskJustCompleted: (specProfile && specProfile.dailyTaskJustCompleted) || [],
    });
    broadcastRoom(result.room);
    return;
  }

  if (type === 'rejoin' || type === 'reconnect') {
    const result = manager.rejoin(msg.code, {
      playerKey: msg.playerKey || msg.playerId,
      uid: msg.uid,
      name: msg.name,
      skin: msg.skin,
      joinPass: msg.joinPass || msg.password || msg.roomPass || '',
    });
    if (!result.ok) {
      send(ws, 'rejoinFailed', { error: result.error, needPass: !!result.needPass });
      return;
    }
    bindSocket(ws, result.playerId);
    if (msg.uid) bindUid(ws, msg.uid);
    send(ws, 'rejoined', { playerId: result.playerId, code: result.room.code });
    broadcastRoom(result.room);
    return;
  }

  if (type === 'leave') {
    const uid = ws.uid || msg.uid;
    if (uid) matchQueue.cancel(uid);
    const playerId = ws.playerId || msg.playerId;
    if (!playerId) {
      send(ws, 'left', {});
      return;
    }
    ws.voluntaryLeave = true;
    const current = manager.getByPlayer(playerId);
    if (current && current.phase === 'playing' && current.findSeatByPlayer(playerId)) {
      current.forceQuit(playerId);
      broadcastRoom(current);
    }
    const room = manager.leaveImmediate(playerId);
    sockets.delete(playerId);
    ws.playerId = null;
    if (room) broadcastRoom(room);
    send(ws, 'left', {});
    return;
  }

  const playerId = ws.playerId || msg.playerId;
  if (!playerId) {
    send(ws, 'error', { error: '请先创建或加入房间' });
    return;
  }
  const room = manager.getByPlayer(playerId);
  if (!room) {
    send(ws, 'error', { error: '不在房间内' });
    return;
  }

  room.checkTimeout();

  if (type === 'ready') {
    const r = room.setReady(playerId, msg.ready !== false);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'setSkin') {
    room.setSkin(playerId, msg.skin);
    broadcastRoom(room);
    return;
  }

  if (type === 'switchSeat') {
    const r = room.switchSeat(playerId, msg.target);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'requestSwap') {
    const r = room.requestSwap(playerId, msg.targetId);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'respondSwap') {
    const r = room.respondSwap(playerId, !!msg.accept);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'roomChat') {
    const r = room.roomChat(playerId, msg.text);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastChat(room, r.chat);
    return;
  }

  if (type === 'danmaku') {
    const r = room.sendDanmaku(playerId, msg.text);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastDanmaku(room, r.danmaku);
    return;
  }

  if (type === 'giftItem') {
    const r = room.giftItem(playerId, msg.toPlayerId, msg.item);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else {
      broadcastRoom(room);
      broadcastChat(room, r.chat);
      if (r.rumor) broadcastWorldRumor(r.rumor);
      send(ws, 'giftResult', {
        ok: true,
        fromProfile: r.fromProfile,
        toProfile: r.toProfile,
        item: msg.item,
      });
    }
    return;
  }

  if (type === 'setSeatJob') {
    const r = room.setSeatJob(playerId, msg.job);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'useJob') {
    const r = room.useJob(playerId);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else {
      if (r.chat) broadcastChat(room, r.chat);
      if (r.rumor) broadcastWorldRumor(r.rumor);
      broadcastRoom(room);
    }
    return;
  }

  if (type === 'start') {
    const r = room.start(playerId);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'setFillBots') {
    const r = room.setFillBots(playerId, !!msg.enabled);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'setCelestial') {
    const r = room.setCelestial(playerId, !!msg.enabled);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'startGrudge') {
    const r = room.startGrudge(playerId);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'nextRound') {
    const r = room.nextRound(playerId);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'truthPick') {
    const r = room.truthPick(playerId, msg.index);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'truthAsk') {
    const r = room.truthAsk(playerId, msg.text);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'truthAnswer') {
    const r = room.truthAnswer(playerId, msg.text);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'truthRefuse') {
    const r = room.truthRefuse(playerId);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'resign') {
    const r = room.resign(playerId);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'forceQuit') {
    const r = room.forceQuit(playerId);
    if (!r.ok) {
      send(ws, 'error', { error: r.error });
      return;
    }
    broadcastRoom(room);
    ws.voluntaryLeave = true;
    const left = manager.leaveImmediate(playerId);
    sockets.delete(playerId);
    ws.playerId = null;
    if (left) broadcastRoom(left);
    send(ws, 'left', { forceQuit: true });
    return;
  }

  if (type === 'rematchVote') {
    const r = room.rematchVote(playerId, msg.accept !== false);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'startRematch') {
    if (playerId !== room.hostId) {
      send(ws, 'error', { error: '仅房主可确认再来一局' });
      return;
    }
    const r = room.startRematch();
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'coachSuggest') {
    const r = room.coachSuggest(playerId, msg.r, msg.c);
    if (!r.ok) {
      send(ws, 'error', { error: r.error });
      return;
    }
    const turn = room.currentSeat();
    if (turn && turn.player) {
      const targetWs = sockets.get(turn.player.id);
      if (targetWs) {
        send(targetWs, 'coachHint', r.hint);
        send(targetWs, 'stateSync', { state: room.publicState(turn.player.id) });
      }
    }
    return;
  }

  if (type === 'kick') {
    const r = manager.kick(playerId, msg.targetId);
    if (!r.ok) {
      send(ws, 'error', { error: r.error });
      return;
    }
    const kickedWs = sockets.get(r.kickedId);
    if (kickedWs) {
      kickedWs.voluntaryLeave = true;
      send(kickedWs, 'kicked', { reason: '被房主移出房间' });
      kickedWs.playerId = null;
      sockets.delete(r.kickedId);
    }
    if (manager.rooms.has(r.room.code)) broadcastRoom(r.room);
    return;
  }

  if (type === 'emote') {
    const r = room.sendEmote(playerId, msg.emote);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastChat(room, r.chat || r.emote);
    return;
  }

  if (type === 'quickText') {
    const r = room.sendQuickText(playerId, msg.textId);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastChat(room, r.chat);
    return;
  }

  if (type === 'place') {
    const r = room.applyPlace(playerId, msg.r, msg.c, {
      aid: false,
      fromR: msg.fromR,
      fromC: msg.fromC,
      planeId: msg.planeId,
    });
    if (!r.ok) send(ws, 'error', { error: r.error });
    broadcastRoom(room);
    return;
  }

  if (type === 'rollDice') {
    const r = room.rollDice(playerId);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'setBoardTheme') {
    const r = room.setBoardTheme(playerId, msg.themeId || msg.boardTheme);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'aidMove') {
    const r = room.applyPlace(playerId, msg.r, msg.c, {
      aid: true,
      fromR: msg.fromR,
      fromC: msg.fromC,
      planeId: msg.planeId,
    });
    if (!r.ok) send(ws, 'error', { error: r.error });
    broadcastRoom(room);
    return;
  }

  if (type === 'undo') {
    const r = room.undo(playerId);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'useProp') {
    const r = room.useProp(playerId, msg.propType, msg);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'botPlace') {
    const r = room.botPlace(playerId, msg.r, msg.c, {
      auto: !!msg.auto,
      fromR: msg.fromR,
      fromC: msg.fromC,
      planeId: msg.planeId,
    });
    if (!r.ok) {
      if (!/人机|未轮到|不在对局/.test(r.error || '')) send(ws, 'error', { error: r.error });
    } else broadcastRoom(room);
    return;
  }

  if (type === 'requestAid') {
    const r = room.requestAid(playerId);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'cancelAid') {
    const r = room.cancelAid(playerId);
    if (!r.ok) send(ws, 'error', { error: r.error });
    else broadcastRoom(room);
    return;
  }

  if (type === 'sync') {
    syncOne(ws, room, playerId);
    return;
  }

  send(ws, 'error', { error: `未知消息类型: ${type}` });
}

setInterval(() => {
  for (const room of manager.rooms.values()) {
    let changed = false;
    if (room.checkTimeout()) changed = true;
    if (room.checkRematchTimeout()) changed = true;
    if (room.checkTruthTimeout()) changed = true;
    if (changed) {
      broadcastRoom(room);
      schedulePersistRooms();
    }
  }
}, 500);

setInterval(() => {
  saveRoomsToDisk();
}, 15000);

const restored = loadRoomsFromDisk();

const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`棋霸网页版已启动`);
  console.log(`打开浏览器: http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}`);
  console.log(`WebSocket: ws://127.0.0.1:${PORT}`);
  if (restored.loaded) console.log(`已恢复持久化房间 ${restored.loaded} 个`);
});

process.on('SIGINT', () => {
  saveRoomsToDisk();
  process.exit(0);
});
process.on('SIGTERM', () => {
  saveRoomsToDisk();
  process.exit(0);
});
