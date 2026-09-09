const fs = require('fs');
const path = require('path');
const { getProfileById } = require('./stats');

const DATA_DIR = process.env.QIBA_DATA_DIR
  ? path.resolve(process.env.QIBA_DATA_DIR)
  : path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'clubs.json');

const MIN_MEMBERS = 1;
const MAX_MEMBERS = 20;
const MAX_NAME = 12;
const MAX_SHORT = 4;

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ clubs: {} }, null, 2), 'utf8');
  }
}

function loadAll() {
  try {
    ensureStore();
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '{}');
    if (!raw.clubs || typeof raw.clubs !== 'object') return { clubs: {} };
    return { clubs: raw.clubs };
  } catch {
    return { clubs: {} };
  }
}

function saveAll(all) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify({ clubs: all.clubs || {} }, null, 2), 'utf8');
}

function genId() {
  return `cl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function genJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function normalizeName(name) {
  return String(name || '').trim().slice(0, MAX_NAME);
}

function normalizeShort(name, shortName) {
  const s = String(shortName || '').trim().slice(0, MAX_SHORT);
  if (s) return s;
  const base = normalizeName(name).replace(/\s+/g, '');
  return base.slice(0, 2) || '社';
}

function publicClub(club, { includeMembers = true } = {}) {
  if (!club) return null;
  const members = Array.isArray(club.memberUids) ? club.memberUids : [];
  const memberRows = includeMembers
    ? members.map((uid) => {
      const p = getProfileById(uid, '');
      return {
        uid,
        name: p.name || uid,
        seasonWins: Number(p.seasonWins) || 0,
        rankLabel: p.rankLabel || '一阶',
        mentorUid: p.mentorUid || '',
        mentorName: p.mentorName || '',
      };
    }).sort((a, b) => b.seasonWins - a.seasonWins || a.name.localeCompare(b.name, 'zh'))
    : undefined;
  const teamScore = (memberRows || members.map((uid) => {
    const p = getProfileById(uid, '');
    return Number(p.seasonWins) || 0;
  })).reduce((sum, row) => sum + (typeof row === 'number' ? row : (row.seasonWins || 0)), 0);
  const lineage = [];
  if (includeMembers && memberRows) {
    const memberSet = new Set(members);
    memberRows.forEach((m) => {
      if (m.mentorUid && memberSet.has(m.mentorUid)) {
        const mentor = memberRows.find((x) => x.uid === m.mentorUid);
        lineage.push({
          mentorUid: m.mentorUid,
          mentorName: (mentor && mentor.name) || m.mentorName || '师傅',
          apprenticeUid: m.uid,
          apprenticeName: m.name,
        });
      }
    });
  }
  return {
    id: club.id,
    name: club.name,
    shortName: club.shortName,
    joinCode: club.joinCode || '',
    ownerUid: club.ownerUid,
    memberCount: members.length,
    maxMembers: MAX_MEMBERS,
    teamScore,
    members: memberRows,
    lineage,
    createdAt: club.createdAt || null,
  };
}

function getClub(id) {
  if (!id) return null;
  const all = loadAll();
  return all.clubs[id] || null;
}

function getByMember(uid) {
  if (!uid) return null;
  const all = loadAll();
  for (const club of Object.values(all.clubs)) {
    if (club && Array.isArray(club.memberUids) && club.memberUids.includes(uid)) return club;
  }
  return null;
}

function createClub({ uid, name, shortName, joinCode }) {
  if (!uid) return { ok: false, error: '请先登录' };
  const existing = getByMember(uid);
  if (existing) return { ok: false, error: '你已加入棋社', club: publicClub(existing) };
  const clubName = normalizeName(name);
  if (clubName.length < 2) return { ok: false, error: '棋社名至少 2 字' };
  const all = loadAll();
  for (const c of Object.values(all.clubs)) {
    if (c && c.name === clubName) return { ok: false, error: '棋社名已被占用' };
  }
  const code = String(joinCode || '').trim();
  const club = {
    id: genId(),
    name: clubName,
    shortName: normalizeShort(clubName, shortName),
    joinCode: code ? code.slice(0, 8) : genJoinCode(),
    ownerUid: uid,
    memberUids: [uid],
    createdAt: Date.now(),
  };
  if (club.joinCode && !/^[A-Za-z0-9]{4,8}$/.test(club.joinCode)) {
    return { ok: false, error: '加入码需为 4–8 位字母或数字' };
  }
  all.clubs[club.id] = club;
  saveAll(all);
  return { ok: true, club: publicClub(club) };
}

function joinClub({ uid, clubId, joinCode, name }) {
  if (!uid) return { ok: false, error: '请先登录' };
  const existing = getByMember(uid);
  if (existing) return { ok: false, error: '你已加入棋社', club: publicClub(existing) };
  const all = loadAll();
  let club = clubId ? all.clubs[clubId] : null;
  const code = String(joinCode || '').trim();
  const qName = normalizeName(name);
  if (!club && code) {
    club = Object.values(all.clubs).find((c) => c && c.joinCode === code) || null;
  }
  if (!club && qName) {
    club = Object.values(all.clubs).find((c) => c && c.name === qName) || null;
  }
  if (!club) return { ok: false, error: '棋社不存在' };
  if (club.joinCode && code && club.joinCode !== code) {
    return { ok: false, error: '加入码错误' };
  }
  if (club.joinCode && !code) return { ok: false, error: '需要加入码' };
  const members = Array.isArray(club.memberUids) ? club.memberUids.slice() : [];
  if (members.length >= MAX_MEMBERS) return { ok: false, error: `棋社最多 ${MAX_MEMBERS} 人` };
  members.push(uid);
  club.memberUids = members;
  all.clubs[club.id] = club;
  saveAll(all);
  return { ok: true, club: publicClub(club) };
}

function leaveClub({ uid }) {
  if (!uid) return { ok: false, error: '请先登录' };
  const all = loadAll();
  const club = Object.values(all.clubs).find(
    (c) => c && Array.isArray(c.memberUids) && c.memberUids.includes(uid)
  );
  if (!club) return { ok: false, error: '未加入棋社' };
  club.memberUids = club.memberUids.filter((id) => id !== uid);
  if (club.ownerUid === uid) {
    club.ownerUid = club.memberUids[0] || uid;
  }
  if (club.memberUids.length < MIN_MEMBERS) {
    delete all.clubs[club.id];
  } else {
    all.clubs[club.id] = club;
  }
  saveAll(all);
  return { ok: true };
}

function mine(uid) {
  const club = getByMember(uid);
  return club ? publicClub(club) : null;
}

function ranking(limit = 20) {
  const all = loadAll();
  const cap = Math.max(1, Math.min(50, Number(limit) || 20));
  return Object.values(all.clubs)
    .map((c) => publicClub(c, { includeMembers: false }))
    .filter(Boolean)
    .sort((a, b) => b.teamScore - a.teamScore || b.memberCount - a.memberCount)
    .slice(0, cap);
}

module.exports = {
  createClub,
  joinClub,
  leaveClub,
  getClub,
  getByMember,
  mine,
  ranking,
  publicClub,
  MAX_MEMBERS,
};
