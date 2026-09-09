const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.QIBA_DATA_DIR
  ? path.resolve(process.env.QIBA_DATA_DIR)
  : path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'invites.json');
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ invites: {} }, null, 2), 'utf8');
  }
}

function loadAll() {
  try {
    ensureStore();
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '{}');
    if (!raw.invites || typeof raw.invites !== 'object') return { invites: {} };
    return { invites: raw.invites };
  } catch {
    return { invites: {} };
  }
}

function saveAll(all) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify({ invites: all.invites || {} }, null, 2), 'utf8');
}

function isFresh(inv, now = Date.now()) {
  if (!inv) return false;
  const at = Number(inv.createdAt) || 0;
  return now - at <= INVITE_TTL_MS;
}

function purgeExpired(all, now = Date.now()) {
  let dirty = false;
  const invites = all.invites || {};
  for (const [id, inv] of Object.entries(invites)) {
    if (!isFresh(inv, now)) {
      delete invites[id];
      dirty = true;
    }
  }
  return dirty;
}

function genId() {
  return `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function create({ fromUid, fromName, toUid, roomCode, gameType, mode, createdAt }) {
  if (!fromUid || !toUid || !roomCode) return { ok: false, error: '邀请不完整' };
  const all = loadAll();
  purgeExpired(all);
  const id = genId();
  const invite = {
    id,
    fromUid,
    fromName: String(fromName || '好友').slice(0, 12),
    toUid,
    roomCode: String(roomCode).toUpperCase(),
    gameType: gameType || 'gomoku',
    mode: mode || '1v1',
    createdAt: Number(createdAt) || Date.now(),
  };
  all.invites[id] = invite;
  saveAll(all);
  return { ok: true, invite };
}

function get(id) {
  if (!id) return null;
  const all = loadAll();
  purgeExpired(all);
  const inv = all.invites[id] || null;
  if (!inv) return null;
  if (!isFresh(inv)) {
    delete all.invites[id];
    saveAll(all);
    return null;
  }
  return inv;
}

function remove(id) {
  if (!id) return false;
  const all = loadAll();
  if (!all.invites[id]) return false;
  delete all.invites[id];
  saveAll(all);
  return true;
}

function listForUid(toUid) {
  if (!toUid) return [];
  const all = loadAll();
  const dirty = purgeExpired(all);
  if (dirty) saveAll(all);
  return Object.values(all.invites || {})
    .filter((inv) => inv && inv.toUid === toUid && isFresh(inv))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

function deliverPayloads(toUid) {
  return listForUid(toUid).map((inv) => ({
    inviteId: inv.id,
    fromUid: inv.fromUid,
    fromName: inv.fromName,
    code: inv.roomCode,
    gameType: inv.gameType,
    mode: inv.mode,
    pending: true,
    createdAt: inv.createdAt,
  }));
}

module.exports = {
  INVITE_TTL_MS,
  create,
  get,
  remove,
  listForUid,
  deliverPayloads,
};
