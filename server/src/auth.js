const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEYLEN = 64;

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}', 'utf8');
}

function loadUsers() {
  try {
    ensureStore();
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function saveUsers(all) {
  ensureStore();
  fs.writeFileSync(USERS_FILE, JSON.stringify(all, null, 2), 'utf8');
}

function normalizeUsername(username) {
  return String(username || '')
    .trim()
    .toLowerCase()
    .slice(0, 24);
}

function validateUsername(username) {
  const u = normalizeUsername(username);
  if (u.length < 3) return { ok: false, error: '账号至少 3 位' };
  if (!/^[a-z0-9_\u4e00-\u9fa5]+$/i.test(u)) {
    return { ok: false, error: '账号仅支持字母数字下划线与中文' };
  }
  return { ok: true, username: u };
}

function validatePassword(password) {
  const p = String(password || '');
  if (p.length < 6) return { ok: false, error: '密码至少 6 位' };
  if (p.length > 64) return { ok: false, error: '密码过长' };
  return { ok: true, password: p };
}

async function hashPassword(password, salt) {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, useSalt, KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return {
    salt: useSalt,
    hash: Buffer.isBuffer(derived) ? derived.toString('hex') : Buffer.from(derived).toString('hex'),
  };
}

async function verifyPassword(password, salt, hash) {
  const { hash: check } = await hashPassword(password, salt);
  const a = Buffer.from(check, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function publicUser(user) {
  if (!user) return null;
  return {
    username: user.username,
    uid: user.uid,
    nickname: user.nickname || '',
    createdAt: user.createdAt || null,
  };
}

async function register({ username, password, nickname, uid }) {
  const uCheck = validateUsername(username);
  if (!uCheck.ok) return uCheck;
  const pCheck = validatePassword(password);
  if (!pCheck.ok) return pCheck;

  const all = loadUsers();
  if (all[uCheck.username]) return { ok: false, error: '账号已存在' };

  const { salt, hash } = await hashPassword(pCheck.password);
  const userUid = uid || `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const nick = String(nickname || uCheck.username).trim().slice(0, 12) || uCheck.username;

  all[uCheck.username] = {
    username: uCheck.username,
    passwordHash: hash,
    salt,
    uid: userUid,
    nickname: nick,
    createdAt: Date.now(),
  };
  saveUsers(all);
  return { ok: true, user: publicUser(all[uCheck.username]) };
}

async function login({ username, password }) {
  const uCheck = validateUsername(username);
  if (!uCheck.ok) return uCheck;
  const pCheck = validatePassword(password);
  if (!pCheck.ok) return pCheck;

  const all = loadUsers();
  const user = all[uCheck.username];
  if (!user) return { ok: false, error: '账号或密码错误' };

  const ok = await verifyPassword(pCheck.password, user.salt, user.passwordHash);
  if (!ok) return { ok: false, error: '账号或密码错误' };
  return { ok: true, user: publicUser(user) };
}

function getUserByUid(uid) {
  if (!uid) return null;
  const all = loadUsers();
  for (const user of Object.values(all)) {
    if (user && user.uid === uid) return publicUser(user);
  }
  return null;
}

function bindNickname(username, nickname) {
  const uCheck = validateUsername(username);
  if (!uCheck.ok) return uCheck;
  const nick = String(nickname || '').trim().slice(0, 12);
  if (!nick) return { ok: false, error: '昵称不能为空' };
  const all = loadUsers();
  const user = all[uCheck.username];
  if (!user) return { ok: false, error: '账号不存在' };
  user.nickname = nick;
  saveUsers(all);
  return { ok: true, user: publicUser(user) };
}

function searchUsers(query, limit = 8) {
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 1) return [];
  const cap = Math.max(1, Math.min(20, Number(limit) || 8));
  const all = loadUsers();
  const out = [];
  for (const user of Object.values(all)) {
    if (!user) continue;
    const nick = String(user.nickname || '').toLowerCase();
    const un = String(user.username || '').toLowerCase();
    if (nick.includes(q) || un.includes(q) || user.uid === query) {
      out.push(publicUser(user));
    }
    if (out.length >= cap) break;
  }
  return out;
}

function getUserByUsername(username) {
  const uCheck = validateUsername(username);
  if (!uCheck.ok) return null;
  const all = loadUsers();
  return publicUser(all[uCheck.username] || null);
}

module.exports = {
  register,
  login,
  getUserByUid,
  bindNickname,
  publicUser,
  searchUsers,
  getUserByUsername,
};
