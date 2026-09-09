const fs = require('fs');
const path = require('path');
const social = require('./social');

const DATA_DIR = process.env.QIBA_DATA_DIR
  ? path.resolve(process.env.QIBA_DATA_DIR)
  : path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'stats.json');
const WORLD_LORE_FILE = path.join(DATA_DIR, 'world_lore.json');

const RANK_LABELS = ['一阶', '二阶', '三阶', '四阶', '五阶', '六阶', '七阶'];
/** 升到该阶所需累计胜场：下标 0=一阶 … 6=七阶 */
const RANK_THRESHOLDS = [0, 1, 4, 8, 15, 25, 40];
/** 无独立 PRD；赛季按 28 天一轮（类第五人格段位周期），起点 2026-01-05 00:00 CST */
const SEASON_EPOCH_MS = Date.parse('2026-01-05T00:00:00+08:00');
const SEASON_MS = 28 * 24 * 60 * 60 * 1000;
const CST_OFFSET_MS = 8 * 60 * 60 * 1000;

const ITEM_TYPES = ['cookies', 'cakes', 'lollipops'];
const ITEM_LABELS = {
  cookies: '🍪 饼干',
  cakes: '🍰 蛋糕',
  lollipops: '🍭 棒棒糖',
};

const GAME_WIN_TYPES = ['gomoku', 'reversi', 'go', 'draughts', 'flying'];
/**
 * 全能王加权分：五子 / 黑白 / 围棋 ×1.0；国际跳棋、飞行棋 ×1.2（少人棋种加成）。
 * allroundScore = Σ (该棋种生涯胜场 × 权重)
 */
const ALLROUND_WEIGHTS = {
  gomoku: 1,
  reversi: 1,
  go: 1,
  draughts: 1.2,
  flying: 1.2,
};
const QUICK_CHAT_SLOTS = 7;
const QUICK_CHAT_MAX_LEN = 24;
const MENTOR_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_APPRENTICES = 3;
const RIVAL_STREAK = 3;

const DAILY_TASK_DEFS = [
  { id: 'first_win', label: '今日首胜', target: 1, reward: { cookies: 1 }, track: 'dailyWin' },
  { id: 'games_3', label: '完成 3 局', target: 3, reward: { cakes: 1 }, track: 'dailyGames' },
  { id: 'spectate_1', label: '观战 1 局', target: 1, reward: { lollipops: 1 }, track: 'dailySpectate' },
  { id: 'all_daily', label: '完成全部每日', target: 1, reward: { rankProtect: 1 }, track: 'allDaily' },
];

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}', 'utf8');
}

function loadAll() {
  try {
    ensureStore();
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function saveAll(all) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(all, null, 2), 'utf8');
}

function keyOf(name) {
  return String(name || '').trim().toLowerCase() || 'anonymous';
}

function blank(extra = {}) {
  return {
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    name: '',
    signature: '',
    cookies: 0,
    cakes: 0,
    lollipops: 0,
    seasonId: 0,
    seasonWins: 0,
    careerWins: 0,
    weeklyWins: 0,
    weekId: 0,
    lastSettle: null,
    recentMatches: [],
    friends: [],
    rankProtect: 0,
    gameWins: emptyGameWins(),
    gameLosses: emptyGameWins(),
    quickChats: emptyQuickChats(),
    mutedUids: [],
    mentorUid: '',
    mentorName: '',
    mentorUntil: 0,
    apprenticeUids: [],
    pendingMentorInvite: null,
    vsStreaks: {},
    rivals: null,
    pet: 'fox',
    jobPref: '',
    lore: [],
    ...extra,
  };
}

function emptyGameWins() {
  const o = {};
  GAME_WIN_TYPES.forEach((t) => { o[t] = 0; });
  return o;
}

function normalizeGameWins(raw) {
  const o = emptyGameWins();
  if (!raw || typeof raw !== 'object') return o;
  GAME_WIN_TYPES.forEach((t) => {
    o[t] = Math.max(0, Number(raw[t]) || 0);
  });
  return o;
}

function allroundScore(gameWins) {
  const g = normalizeGameWins(gameWins);
  let sum = 0;
  GAME_WIN_TYPES.forEach((t) => {
    sum += g[t] * (ALLROUND_WEIGHTS[t] || 1);
  });
  return Math.round(sum * 10) / 10;
}

function emptyQuickChats() {
  return Array.from({ length: QUICK_CHAT_SLOTS }, () => '');
}

function normalizeQuickChats(raw) {
  const out = emptyQuickChats();
  if (!Array.isArray(raw)) return out;
  for (let i = 0; i < QUICK_CHAT_SLOTS; i += 1) {
    out[i] = String(raw[i] == null ? '' : raw[i]).trim().slice(0, QUICK_CHAT_MAX_LEN);
  }
  return out;
}

function normalizeMutedUids(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const id of raw) {
    const s = String(id || '').trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= 100) break;
  }
  return out;
}

const RECENT_MATCH_LIMIT = 12;

function normalizeRecentMatch(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const outcome = ['win', 'loss', 'draw'].includes(raw.outcome) ? raw.outcome : 'draw';
  const opp = raw.opponent || {};
  return {
    id: String(raw.id || `m_${Date.now().toString(36)}`),
    at: Number(raw.at) || Date.now(),
    gameType: raw.gameType || 'gomoku',
    mode: raw.mode || '1v1',
    boardScale: raw.boardScale === 'small' ? 'small' : 'large',
    totalRounds: Math.min(5, Math.max(1, Number(raw.totalRounds) || 1)),
    turnMs: Math.min(120000, Math.max(5000, Number(raw.turnMs) || 30000)),
    outcome,
    opponent: {
      id: opp.id || opp.uid || null,
      uid: opp.uid || opp.id || null,
      name: String(opp.name || '对手').slice(0, 12),
    },
  };
}

/**
 * 记录一局结束后的「最近对局」对手信息（按登录 uid 或游客档案 id）
 */
function recordRecentMatch({ id, name, outcome, opponent, gameType, mode, boardScale, totalRounds, turnMs }) {
  const all = loadAll();
  let found = findEntry(all, { id, name });
  let key;
  let cur;
  if (found) {
    key = found.key;
    cur = { ...blank(), ...found.data };
  } else if (id) {
    key = id;
    cur = blank({ id, name });
  } else {
    key = keyOf(name);
    cur = blank({ name });
  }
  if (!cur.name && name) cur.name = name;
  if (id) cur.id = id;
  const entry = normalizeRecentMatch({
    id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    at: Date.now(),
    outcome,
    opponent,
    gameType,
    mode,
    boardScale,
    totalRounds,
    turnMs,
  });
  const list = Array.isArray(cur.recentMatches) ? cur.recentMatches.slice() : [];
  list.unshift(entry);
  cur.recentMatches = list.slice(0, RECENT_MATCH_LIMIT);
  all[key] = cur;
  saveAll(all);
  return toProfile({ ...cur, id: cur.id || key }, cur.name || name);
}

function getRecentMatches({ id, name }, limit = 10) {
  const all = loadAll();
  const found = findEntry(all, { id, name });
  if (!found) return [];
  const list = Array.isArray(found.data.recentMatches) ? found.data.recentMatches : [];
  const cap = Math.max(1, Math.min(20, Number(limit) || 10));
  return list.map(normalizeRecentMatch).filter(Boolean).slice(0, cap);
}

function getSeasonInfo(now = Date.now()) {
  const elapsed = Math.max(0, now - SEASON_EPOCH_MS);
  const index = Math.floor(elapsed / SEASON_MS);
  const startedAt = SEASON_EPOCH_MS + index * SEASON_MS;
  const endsAt = startedAt + SEASON_MS;
  return {
    id: index + 1,
    label: `S${index + 1}`,
    startedAt,
    endsAt,
    remainingMs: Math.max(0, endsAt - now),
  };
}

function getWeekId(now = Date.now()) {
  const shifted = new Date(now + CST_OFFSET_MS);
  const day = shifted.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  return Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() - diffToMonday
  );
}

/** 北京时间自然日 id，用于每日任务重置 */
function getDayId(now = Date.now()) {
  const shifted = new Date(now + CST_OFFSET_MS);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
}

function ensureDailyFields(cur, now = Date.now()) {
  const dayId = getDayId(now);
  if (!cur.dailyDayId) {
    cur.dailyDayId = dayId;
    cur.dailyGames = 0;
    cur.dailyWin = false;
    cur.dailySpectate = 0;
    cur.dailyClaimed = {};
  } else if (cur.dailyDayId !== dayId) {
    cur.dailyDayId = dayId;
    cur.dailyGames = 0;
    cur.dailyWin = false;
    cur.dailySpectate = 0;
    cur.dailyClaimed = {};
  }
  if (!cur.dailyClaimed || typeof cur.dailyClaimed !== 'object') cur.dailyClaimed = {};
  return cur;
}

function dailyTaskProgress(cur, task) {
  if (task.track === 'dailyGames') return Number(cur.dailyGames) || 0;
  if (task.track === 'dailyWin') return cur.dailyWin ? 1 : 0;
  if (task.track === 'dailySpectate') return Number(cur.dailySpectate) || 0;
  if (task.track === 'allDaily') {
    const others = DAILY_TASK_DEFS.filter((t) => t.track !== 'allDaily');
    return others.every((t) => dailyTaskProgress(cur, t) >= t.target) ? 1 : 0;
  }
  return 0;
}

function unclaimedDoneIds(cur) {
  return buildDailyTasksPublic(cur)
    .filter((t) => t.done && !t.claimed)
    .map((t) => t.id);
}

function justCompletedTaskIds(beforeCur, afterCur) {
  const before = new Set(unclaimedDoneIds(beforeCur));
  return unclaimedDoneIds(afterCur).filter((id) => !before.has(id));
}

function makeRankChange(fromRank, toRank, type) {
  const from = Math.max(1, Math.min(7, Number(fromRank) || 1));
  const to = Math.max(1, Math.min(7, Number(toRank) || 1));
  return {
    from,
    to,
    fromLabel: RANK_LABELS[from - 1],
    toLabel: RANK_LABELS[to - 1],
    type,
    at: Date.now(),
  };
}

function buildDailyTasksPublic(cur) {
  ensureDailyFields(cur);
  return DAILY_TASK_DEFS.map((task) => {
    const progress = dailyTaskProgress(cur, task);
    const done = progress >= task.target;
    const claimed = !!cur.dailyClaimed[task.id];
    return {
      id: task.id,
      label: task.label,
      target: task.target,
      progress,
      done,
      claimed,
      reward: { ...task.reward },
    };
  });
}

function formatRemain(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}天 ${h}小时`;
  if (h > 0) return `${h}小时 ${m}分`;
  return `${Math.max(1, m)}分钟`;
}

function decayRank(rank) {
  const r = Math.max(1, Math.min(7, Number(rank) || 1));
  if (r >= 7) return 5;
  if (r >= 6) return 4;
  return Math.max(1, r - 1);
}

function decayPreview(rank) {
  const fromRank = Math.max(1, Math.min(7, Number(rank) || 1));
  const toRank = decayRank(fromRank);
  let note = '一阶保留';
  if (fromRank >= 7) note = '七阶结算为五阶，冲分清零';
  else if (fromRank >= 6) note = '六阶结算为四阶';
  else if (fromRank > 1) note = '赛季结算降一阶';
  return {
    fromRank,
    toRank,
    fromLabel: RANK_LABELS[fromRank - 1],
    toLabel: RANK_LABELS[toRank - 1],
    note,
  };
}

function publicSeason(now = Date.now()) {
  const s = getSeasonInfo(now);
  return {
    id: s.id,
    label: s.label,
    startedAt: s.startedAt,
    endsAt: s.endsAt,
    remainingMs: s.remainingMs,
    remainingText: formatRemain(s.remainingMs),
    lengthDays: 28,
    decayRules: [
      '七阶结算为五阶，冲分清零',
      '六阶结算为四阶',
      '五阶及以下各降一阶',
      '一阶保留',
    ],
  };
}

function ensureSeasonFields(cur, now = Date.now()) {
  ensureDailyFields(cur, now);
  const season = getSeasonInfo(now);
  const wid = getWeekId(now);
  const lifetime = Number(cur.wins) || 0;
  if (cur.careerWins == null) cur.careerWins = lifetime;
  if (cur.seasonWins == null) cur.seasonWins = lifetime;
  if (cur.weeklyWins == null) cur.weeklyWins = 0;
  if (!cur.seasonId) {
    cur.seasonId = season.id;
  } else if (cur.seasonId !== season.id) {
    const fromRank = rankFromWins(cur.seasonWins);
    let toRank = fromRank;
    const passed = Math.min(12, Math.max(1, season.id - cur.seasonId));
    for (let i = 0; i < passed; i += 1) toRank = decayRank(toRank);
    const fromWins = Number(cur.seasonWins) || 0;
    cur.seasonWins = RANK_THRESHOLDS[toRank - 1];
    cur.lastSettle = {
      fromSeason: cur.seasonId,
      toSeason: season.id,
      fromRank,
      toRank,
      fromWins,
      toWins: cur.seasonWins,
      fromLabel: RANK_LABELS[fromRank - 1],
      toLabel: RANK_LABELS[toRank - 1],
      at: now,
    };
    cur.seasonId = season.id;
  }
  if (!cur.weekId) {
    cur.weekId = wid;
  } else if (cur.weekId !== wid) {
    cur.weekId = wid;
    cur.weeklyWins = 0;
  }
  return cur;
}

function rankFromWins(wins) {
  let rank = 1;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (wins >= RANK_THRESHOLDS[i]) {
      rank = i + 1;
      break;
    }
  }
  return rank;
}

function progressInfo(wins) {
  const rank = rankFromWins(wins);
  if (rank >= 7) {
    return {
      winsToNextRank: 0,
      nextRank: null,
      nextRankLabel: null,
      nextThreshold: null,
      maxRank: true,
    };
  }
  const nextThreshold = RANK_THRESHOLDS[rank];
  return {
    winsToNextRank: Math.max(0, nextThreshold - wins),
    nextRank: rank + 1,
    nextRankLabel: RANK_LABELS[rank],
    nextThreshold,
    maxRank: false,
  };
}

function inventoryOf(s) {
  return {
    cookies: Math.max(0, Number(s.cookies) || 0),
    cakes: Math.max(0, Number(s.cakes) || 0),
    lollipops: Math.max(0, Number(s.lollipops) || 0),
  };
}

function toProfile(raw, fallbackName = '未知') {
  const s = ensureSeasonFields({ ...blank(), ...(raw || {}) });
  const matches = s.matches || 0;
  const wins = s.wins || 0;
  const seasonWins = Number(s.seasonWins) || 0;
  const rank = rankFromWins(seasonWins);
  const progress = progressInfo(seasonWins);
  const inv = inventoryOf(s);
  const rushScore = rank >= 7 ? Math.max(0, seasonWins - RANK_THRESHOLDS[6]) : 0;
  return {
    id: s.id || null,
    name: s.name || fallbackName || '未知',
    signature: s.signature || '',
    matches,
    wins,
    seasonWins,
    careerWins: Number(s.careerWins) || wins,
    weeklyWins: Number(s.weeklyWins) || 0,
    rushScore,
    losses: s.losses || 0,
    draws: s.draws || 0,
    winRate: matches ? Math.round((wins / matches) * 1000) / 10 : 0,
    rank,
    rankLabel: RANK_LABELS[rank - 1],
    ...progress,
    rankThresholds: RANK_THRESHOLDS,
    season: publicSeason(),
    decayPreview: decayPreview(rank),
    lastSettle: s.lastSettle || null,
    practiceCounts: true,
    recentMatches: (Array.isArray(s.recentMatches) ? s.recentMatches : [])
      .map(normalizeRecentMatch)
      .filter(Boolean)
      .slice(0, RECENT_MATCH_LIMIT),
    ...inv,
    inventory: inv,
    dailyTasks: buildDailyTasksPublic(s),
    friends: Array.isArray(s.friends) ? s.friends.slice() : [],
    rankProtect: Math.max(0, Number(s.rankProtect) || 0),
    gameWins: normalizeGameWins(s.gameWins),
    gameLosses: normalizeGameWins(s.gameLosses),
    allroundScore: allroundScore(s.gameWins),
    quickChats: normalizeQuickChats(s.quickChats),
    mutedUids: normalizeMutedUids(s.mutedUids),
    mentorUid: publicMentor(s).mentorUid,
    mentorName: publicMentor(s).mentorName,
    mentorUntil: publicMentor(s).mentorUntil,
    apprenticeUids: publicApprentices(s),
    pendingMentorInvite: s.pendingMentorInvite || null,
    rivals: normalizeRival(s.rivals),
    pet: social.normalizePet(s.pet),
    jobPref: social.normalizeJob(s.jobPref),
    lore: normalizeLoreList(s.lore),
  };
}

function publicMentor(s) {
  const until = Number(s && s.mentorUntil) || 0;
  const uid = String((s && s.mentorUid) || '');
  if (!uid || until < Date.now()) {
    return { mentorUid: '', mentorName: '', mentorUntil: 0 };
  }
  return {
    mentorUid: uid,
    mentorName: String((s && s.mentorName) || ''),
    mentorUntil: until,
  };
}

function publicApprentices(s) {
  return Array.isArray(s && s.apprenticeUids) ? s.apprenticeUids.map(String).filter(Boolean).slice(0, MAX_APPRENTICES) : [];
}

function normalizeRival(raw) {
  if (!raw || typeof raw !== 'object' || !raw.uid) return null;
  return {
    uid: String(raw.uid),
    name: String(raw.name || '对手').slice(0, 12),
    streak: Math.max(0, Number(raw.streak) || 0),
    since: Number(raw.since) || Date.now(),
    lastOutcome: raw.lastOutcome === 'loss' ? 'loss' : 'win',
  };
}

/**
 * 记录完成一局（ seated 玩家），用于「完成 3 局」「今日首胜」
 */
function recordDailyGame({ id, name, won }) {
  const all = loadAll();
  let found = findEntry(all, { id, name });
  let key;
  let cur;
  if (found) {
    key = found.key;
    cur = { ...blank(), ...found.data };
  } else if (id) {
    key = id;
    cur = blank({ id, name });
  } else {
    key = keyOf(name);
    cur = blank({ name });
  }
  ensureDailyFields(cur);
  const before = { ...cur, dailyClaimed: { ...(cur.dailyClaimed || {}) } };
  cur.dailyGames = (Number(cur.dailyGames) || 0) + 1;
  if (won) cur.dailyWin = true;
  if (!cur.name && name) cur.name = name;
  if (id) cur.id = id;
  const justCompleted = justCompletedTaskIds(before, cur);
  all[key] = cur;
  saveAll(all);
  return {
    ...toProfile({ ...cur, id: cur.id || key }, cur.name || name),
    dailyTaskJustCompleted: justCompleted,
  };
}

/**
 * 记录观战/解说加入，用于「观战 1 局」
 */
function recordDailySpectate({ id, name }) {
  const all = loadAll();
  let found = findEntry(all, { id, name });
  let key;
  let cur;
  if (found) {
    key = found.key;
    cur = { ...blank(), ...found.data };
  } else if (id) {
    key = id;
    cur = blank({ id, name });
  } else {
    key = keyOf(name);
    cur = blank({ name });
  }
  ensureDailyFields(cur);
  const before = { ...cur, dailyClaimed: { ...(cur.dailyClaimed || {}) } };
  cur.dailySpectate = Math.max(Number(cur.dailySpectate) || 0, 1);
  if (!cur.name && name) cur.name = name;
  if (id) cur.id = id;
  const justCompleted = justCompletedTaskIds(before, cur);
  all[key] = cur;
  saveAll(all);
  return {
    ...toProfile({ ...cur, id: cur.id || key }, cur.name || name),
    dailyTaskJustCompleted: justCompleted,
  };
}

function claimDailyTask({ id, name, taskId }) {
  const task = DAILY_TASK_DEFS.find((t) => t.id === taskId);
  if (!task) return { ok: false, error: '未知任务' };
  const all = loadAll();
  const found = findEntry(all, { id, name });
  if (!found && !id) return { ok: false, error: '档案不存在' };
  const key = found ? found.key : id;
  const cur = ensureDailyFields({ ...blank(), ...(found ? found.data : {}), id, name });
  if (cur.dailyClaimed[task.id]) return { ok: false, error: '奖励已领取' };
  const progress = dailyTaskProgress(cur, task);
  if (progress < task.target) return { ok: false, error: '任务尚未完成' };
  cur.dailyClaimed[task.id] = true;
  const rewards = { cookies: 0, cakes: 0, lollipops: 0, rankProtect: 0 };
  for (const [item, n] of Object.entries(task.reward)) {
    if (item === 'rankProtect') {
      cur.rankProtect = (Number(cur.rankProtect) || 0) + n;
      rewards.rankProtect = n;
      continue;
    }
    if (!ITEM_TYPES.includes(item)) continue;
    cur[item] = (Number(cur[item]) || 0) + n;
    rewards[item] = n;
  }
  if (!cur.name && name) cur.name = name;
  if (id) cur.id = id;
  all[key] = cur;
  saveAll(all);
  return {
    ok: true,
    taskId: task.id,
    rewards,
    profile: toProfile({ ...cur, id: cur.id || key }, cur.name || name),
  };
}

function persistTouched(all, key, before, after) {
  all[key] = after;
  try {
    if (JSON.stringify(before) !== JSON.stringify(after)) saveAll(all);
  } catch {
    saveAll(all);
  }
}

function findEntry(all, { id, name }) {
  if (id && all[id]) return { key: id, data: all[id] };
  if (name) {
    const nk = keyOf(name);
    // legacy: keyed by name
    if (all[nk] && !all[nk].id) return { key: nk, data: all[nk] };
    for (const [k, v] of Object.entries(all)) {
      if (v && keyOf(v.name) === nk) return { key: k, data: v };
    }
  }
  return null;
}

function getProfile(name) {
  const all = loadAll();
  const found = findEntry(all, { name });
  if (found) {
    const next = ensureSeasonFields({ ...blank(), ...found.data });
    persistTouched(all, found.key, found.data, next);
    return toProfile({ ...next, id: next.id || found.key }, name);
  }
  return toProfile(blank({ name }), name);
}

function getProfileById(id, nameHint) {
  const all = loadAll();
  if (id && all[id]) {
    const next = ensureSeasonFields({ ...blank(), ...all[id], id });
    persistTouched(all, id, all[id], next);
    return toProfile(next, next.name || nameHint);
  }
  // migrate legacy name-keyed record into this id
  if (nameHint) {
    const legacyKey = keyOf(nameHint);
    if (all[legacyKey] && !all[legacyKey].id) {
      const migrated = ensureSeasonFields({
        ...blank(),
        ...all[legacyKey],
        id,
        name: nameHint,
        signature: all[legacyKey].signature || '',
      });
      all[id] = migrated;
      delete all[legacyKey];
      saveAll(all);
      return toProfile(migrated, nameHint);
    }
  }
  return toProfile(blank({ id, name: nameHint || '' }), nameHint || '未知');
}

function saveProfile({ id, name, signature, quickChats, mutedUids, pet, jobPref }) {
  if (!id) return { ok: false, error: '缺少档案 ID' };
  const cleanName = String(name || '').trim().slice(0, 12);
  if (!cleanName) return { ok: false, error: '昵称不能为空' };
  const cleanSig = String(signature || '').trim().slice(0, 40);
  const all = loadAll();

  // conflict: another uid already uses this display name
  for (const [k, v] of Object.entries(all)) {
    if (k === id) continue;
    if (v && keyOf(v.name || '') === keyOf(cleanName)) {
      return { ok: false, error: '该昵称已被占用' };
    }
    if (keyOf(k) === keyOf(cleanName) && !v.id) {
      return { ok: false, error: '该昵称已被占用' };
    }
  }

  const prev = all[id] || blank();
  // pull legacy if first save
  const legacyKey = keyOf(cleanName);
  if (!all[id] && all[legacyKey] && !all[legacyKey].id) {
    Object.assign(prev, all[legacyKey]);
    delete all[legacyKey];
  }

  const next = ensureSeasonFields({
    ...blank(),
    ...prev,
    id,
    name: cleanName,
    signature: cleanSig,
  });
  if (quickChats !== undefined) next.quickChats = normalizeQuickChats(quickChats);
  else next.quickChats = normalizeQuickChats(prev.quickChats);
  if (mutedUids !== undefined) next.mutedUids = normalizeMutedUids(mutedUids);
  else next.mutedUids = normalizeMutedUids(prev.mutedUids);
  if (pet !== undefined) next.pet = social.normalizePet(pet);
  else next.pet = social.normalizePet(prev.pet);
  if (jobPref !== undefined) next.jobPref = social.normalizeJob(jobPref);
  else next.jobPref = social.normalizeJob(prev.jobPref);
  next.lore = normalizeLoreList(prev.lore);
  next.gameWins = normalizeGameWins(prev.gameWins);
  next.gameLosses = normalizeGameWins(prev.gameLosses);
  all[id] = next;
  saveAll(all);
  return { ok: true, profile: toProfile(all[id], cleanName) };
}

/**
 * 胜利奖励：每胜 +1🍪；胜场为 3 的倍数再 +1🍰；为 5 的倍数再 +1🍭
 */
function grantWinRewards(cur) {
  const rewards = { cookies: 1, cakes: 0, lollipops: 0 };
  cur.cookies = (Number(cur.cookies) || 0) + 1;
  if (cur.wins > 0 && cur.wins % 3 === 0) {
    cur.cakes = (Number(cur.cakes) || 0) + 1;
    rewards.cakes = 1;
  }
  if (cur.wins > 0 && cur.wins % 5 === 0) {
    cur.lollipops = (Number(cur.lollipops) || 0) + 1;
    rewards.lollipops = 1;
  }
  return rewards;
}

function recordOutcome(name, outcome, opts = {}) {
  const all = loadAll();
  const id = opts.id || null;
  let found = findEntry(all, { id, name });
  let key;
  let cur;
  if (found) {
    key = found.key;
    cur = { ...blank(), ...found.data };
  } else if (id) {
    key = id;
    cur = blank({ id, name });
  } else {
    key = keyOf(name);
    cur = blank({ name });
  }
  ensureSeasonFields(cur);
  if (cur.rankProtect == null) cur.rankProtect = 0;
  const fromRank = rankFromWins(Number(cur.seasonWins) || 0);
  cur.matches += 1;
  let rewards = null;
  let rankChange = null;
  if (outcome === 'win') {
    cur.wins += 1;
    cur.careerWins = (Number(cur.careerWins) || 0) + 1;
    cur.seasonWins = (Number(cur.seasonWins) || 0) + 1;
    cur.weeklyWins = (Number(cur.weeklyWins) || 0) + 1;
    cur.gameWins = normalizeGameWins(cur.gameWins);
    const gt = GAME_WIN_TYPES.includes(opts.gameType) ? opts.gameType : '';
    if (gt) cur.gameWins[gt] = (Number(cur.gameWins[gt]) || 0) + 1;
    rewards = grantWinRewards(cur);
    const toRank = rankFromWins(Number(cur.seasonWins) || 0);
    if (toRank > fromRank) rankChange = makeRankChange(fromRank, toRank, 'up');
  } else if (outcome === 'loss') {
    cur.losses += 1;
    cur.gameLosses = normalizeGameWins(cur.gameLosses);
    const lossGt = GAME_WIN_TYPES.includes(opts.gameType) ? opts.gameType : '';
    if (lossGt) cur.gameLosses[lossGt] = (Number(cur.gameLosses[lossGt]) || 0) + 1;
    const nextWins = Math.max(0, (Number(cur.seasonWins) || 0) - 1);
    const wouldRank = rankFromWins(nextWins);
    if (wouldRank < fromRank) {
      const cards = Math.max(0, Number(cur.rankProtect) || 0);
      if (cards > 0) {
        cur.rankProtect = cards - 1;
        rankChange = makeRankChange(fromRank, fromRank, 'protected');
      } else {
        cur.seasonWins = nextWins;
        rankChange = makeRankChange(fromRank, wouldRank, 'down');
      }
    } else {
      cur.seasonWins = nextWins;
    }
  } else {
    cur.draws += 1;
  }
  if (!cur.name) cur.name = name;
  if (id) cur.id = id;
  all[key] = cur;
  saveAll(all);
  const profile = toProfile({ ...cur, id: cur.id || key }, cur.name || name);
  const extra = {};
  if (rewards) extra.lastRewards = rewards;
  if (rankChange) extra.rankChange = rankChange;
  if (rankChange && rankChange.type === 'up') {
    const gift = grantMentorRankGift(cur.id || key, cur.name || name, all);
    if (gift) extra.mentorGift = gift;
  }
  return Object.keys(extra).length ? { ...profile, ...extra } : profile;
}

function giftItem({ fromId, fromName, toId, toName, item }) {
  if (!ITEM_TYPES.includes(item)) return { ok: false, error: '未知物品' };
  const all = loadAll();

  function ensureEntry(id, name) {
    let found = findEntry(all, { id, name });
    if (found) return found;
    const key = id || keyOf(name);
    all[key] = blank({ id: id || null, name: name || '' });
    return { key, data: all[key] };
  }

  const fromFound = ensureEntry(fromId, fromName);
  const toFound = ensureEntry(toId, toName);

  const from = { ...blank(), ...fromFound.data };
  const to = { ...blank(), ...toFound.data };
  const count = Number(from[item]) || 0;
  if (count <= 0) return { ok: false, error: '背包中没有该物品' };

  from[item] = count - 1;
  to[item] = (Number(to[item]) || 0) + 1;
  if (fromId) from.id = fromId;
  if (toId) to.id = toId;
  if (fromName && !from.name) from.name = fromName;
  if (toName && !to.name) to.name = toName;
  all[fromFound.key] = from;
  all[toFound.key] = to;
  saveAll(all);

  return {
    ok: true,
    item,
    itemLabel: ITEM_LABELS[item],
    fromProfile: toProfile({ ...from, id: from.id || fromFound.key }, from.name || fromName),
    toProfile: toProfile({ ...to, id: to.id || toFound.key }, to.name || toName),
  };
}

function leaderboardRow(profile) {
  return {
    id: profile.id,
    name: profile.name,
    rank: profile.rank,
    rankLabel: profile.rankLabel,
    rushScore: profile.rushScore,
    seasonWins: profile.seasonWins,
    weeklyWins: profile.weeklyWins,
    wins: profile.wins,
    cookies: profile.cookies || 0,
    cakes: profile.cakes || 0,
    lollipops: profile.lollipops || 0,
    gameWins: profile.gameWins || emptyGameWins(),
    allroundScore: profile.allroundScore || 0,
  };
}

function getLeaderboard(limit = 20) {
  const all = loadAll();
  let dirty = false;
  const profiles = [];
  for (const [key, data] of Object.entries(all)) {
    if (!data || typeof data !== 'object') continue;
    const next = ensureSeasonFields({ ...blank(), ...data });
    if (JSON.stringify(next) !== JSON.stringify({ ...blank(), ...data })) {
      all[key] = next;
      dirty = true;
    }
    const name = next.name || key;
    if (!name && !(next.matches || next.wins || next.seasonWins)) continue;
    profiles.push(toProfile({ ...next, id: next.id || key }, name));
  }
  if (dirty) saveAll(all);
  const cap = Math.max(1, Math.min(50, Number(limit) || 20));
  const rush = profiles
    .filter((p) => p.rank >= 7)
    .sort((a, b) => b.rushScore - a.rushScore || b.seasonWins - a.seasonWins || b.weeklyWins - a.weeklyWins)
    .slice(0, cap)
    .map(leaderboardRow);
  const weekly = profiles
    .filter((p) => (p.weeklyWins || 0) > 0)
    .sort((a, b) => b.weeklyWins - a.weeklyWins || b.rank - a.rank || b.seasonWins - a.seasonWins)
    .slice(0, cap)
    .map(leaderboardRow);
  const allround = profiles
    .filter((p) => (p.allroundScore || 0) > 0)
    .sort((a, b) => (b.allroundScore || 0) - (a.allroundScore || 0)
      || (b.wins || 0) - (a.wins || 0)
      || (b.seasonWins || 0) - (a.seasonWins || 0))
    .slice(0, cap)
    .map(leaderboardRow);
  return {
    ok: true,
    season: publicSeason(),
    rush,
    weekly,
    allround,
    decayRules: publicSeason().decayRules,
  };
}

function searchProfiles(query, limit = 8) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const cap = Math.max(1, Math.min(20, Number(limit) || 8));
  const all = loadAll();
  const out = [];
  const seen = new Set();
  for (const [k, v] of Object.entries(all)) {
    if (!v) continue;
    const name = String(v.name || '').toLowerCase();
    const id = String(v.id || k);
    if (name.includes(q) || id.toLowerCase() === q || String(v.username || '').toLowerCase().includes(q)) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(toProfile({ ...v, id }, v.name || id));
    }
    if (out.length >= cap) break;
  }
  return out;
}

function addFriend({ uid, name, targetUid, targetName }) {
  if (!uid) return { ok: false, error: '请先登录' };
  const all = loadAll();
  let target = null;
  if (targetUid && all[targetUid]) {
    target = { uid: targetUid, data: all[targetUid] };
  } else if (targetUid) {
    const found = findEntry(all, { id: targetUid, name: targetName });
    if (found) target = { uid: found.data.id || found.key, data: found.data };
  }
  if (!target && targetName) {
    const found = findEntry(all, { name: targetName });
    if (found) target = { uid: found.data.id || found.key, data: found.data };
  }
  if (!target && targetUid) {
    target = { uid: targetUid, data: { id: targetUid, name: targetName || targetUid } };
  }
  if (!target || !target.uid) return { ok: false, error: '找不到该玩家' };
  if (target.uid === uid) return { ok: false, error: '不能添加自己' };
  const me = findEntry(all, { id: uid, name });
  const key = me ? me.key : uid;
  const cur = { ...blank(), ...(me ? me.data : {}), id: uid, name: (me && me.data.name) || name || '' };
  const list = Array.isArray(cur.friends) ? cur.friends.slice() : [];
  if (list.includes(target.uid)) return { ok: false, error: '已在好友列表' };
  if (list.length >= 50) return { ok: false, error: '好友已满' };
  list.push(target.uid);
  cur.friends = list;
  if (!cur.name && name) cur.name = name;
  all[key] = cur;
  saveAll(all);
  return { ok: true, friends: listFriends({ uid, name: cur.name }) };
}

function removeFriend({ uid, name, targetUid }) {
  if (!uid) return { ok: false, error: '请先登录' };
  if (!targetUid) return { ok: false, error: '缺少目标' };
  const all = loadAll();
  const me = findEntry(all, { id: uid, name });
  if (!me) return { ok: false, error: '档案不存在' };
  const cur = { ...blank(), ...me.data, id: uid };
  cur.friends = (Array.isArray(cur.friends) ? cur.friends : []).filter((id) => id !== targetUid);
  all[me.key] = cur;
  saveAll(all);
  return { ok: true, friends: listFriends({ uid, name: cur.name }) };
}

function normalizeLoreList(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const text = String(row.text || '').trim().slice(0, 80);
    if (!text) continue;
    out.push({
      id: String(row.id || social.rumorId()),
      text,
      kind: String(row.kind || 'story').slice(0, 24),
      at: Number(row.at) || Date.now(),
    });
    if (out.length >= social.PROFILE_LORE_MAX) break;
  }
  return out;
}

function loadWorldFeed() {
  try {
    if (!fs.existsSync(WORLD_LORE_FILE)) return [];
    const raw = JSON.parse(fs.readFileSync(WORLD_LORE_FILE, 'utf8') || '[]');
    return Array.isArray(raw) ? raw : (raw.entries || []);
  } catch {
    return [];
  }
}

function saveWorldFeed(entries) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(WORLD_LORE_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

function normalizeWorldEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const text = String(raw.text || '').trim().slice(0, 80);
  if (!text) return null;
  return {
    id: String(raw.id || social.rumorId()),
    text,
    kind: String(raw.kind || 'story').slice(0, 24),
    at: Number(raw.at) || Date.now(),
    name: String(raw.name || '').slice(0, 12),
    uid: raw.uid ? String(raw.uid) : '',
    roomCode: String(raw.roomCode || '').slice(0, 6),
  };
}

function listWorldFeed(limit = 20) {
  const max = Math.min(social.LORE_MAX, Math.max(1, Number(limit) || 20));
  return loadWorldFeed()
    .map(normalizeWorldEntry)
    .filter(Boolean)
    .slice(0, max);
}

function appendWorldRumor({ text, kind, uid, name, roomCode }) {
  const clean = String(text || '').trim().slice(0, 80);
  if (!clean) return { ok: false, error: '传闻为空' };
  const entry = normalizeWorldEntry({
    id: social.rumorId(),
    text: clean,
    kind: kind || 'story',
    at: Date.now(),
    uid: uid || '',
    name: name || '',
    roomCode: roomCode || '',
  });
  const next = [entry, ...loadWorldFeed().map(normalizeWorldEntry).filter(Boolean)]
    .slice(0, social.LORE_MAX);
  saveWorldFeed(next);
  return { ok: true, entry, feed: next };
}

function appendLore({ id, name, text, kind }) {
  const clean = String(text || '').trim().slice(0, 80);
  if (!clean) return { ok: false, error: '传闻为空' };
  const all = loadAll();
  let found = findEntry(all, { id, name });
  let key;
  let cur;
  if (found) {
    key = found.key;
    cur = { ...blank(), ...found.data };
  } else if (id) {
    key = id;
    cur = blank({ id, name: name || '' });
  } else if (name) {
    key = keyOf(name);
    cur = blank({ name });
  } else {
    return { ok: false, error: '缺少档案' };
  }
  const entry = {
    id: social.rumorId(),
    text: clean,
    kind: String(kind || 'story').slice(0, 24),
    at: Date.now(),
  };
  cur.lore = [entry, ...normalizeLoreList(cur.lore)].slice(0, social.PROFILE_LORE_MAX);
  if (id) cur.id = id;
  if (name && !cur.name) cur.name = name;
  all[key] = cur;
  saveAll(all);
  return { ok: true, lore: cur.lore, profile: toProfile({ ...cur, id: cur.id || key }, cur.name || name) };
}

function spendItem({ id, name, item, n = 1 }, allIn) {
  if (!ITEM_TYPES.includes(item)) return { ok: false, error: '未知物品' };
  const take = Math.max(1, Number(n) || 1);
  const all = allIn || loadAll();
  let found = findEntry(all, { id, name });
  if (!found) return { ok: false, error: '档案不存在' };
  const cur = { ...blank(), ...found.data };
  const have = Number(cur[item]) || 0;
  if (have < take) return { ok: false, error: '背包数量不足' };
  cur[item] = have - take;
  if (id) cur.id = id;
  all[found.key] = cur;
  if (!allIn) saveAll(all);
  return {
    ok: true,
    item,
    n: take,
    profile: toProfile({ ...cur, id: cur.id || found.key }, cur.name || name),
  };
}

/** 从背包按饼干→蛋糕→棒棒糖顺序扣任意物品，库存不足则能扣多少扣多少。 */
function takeAnyItems({ id, name, count = 3 } = {}) {
  const want = Math.max(0, Math.min(99, Number(count) || 0));
  if (!want) return { ok: true, taken: [], shortfall: 0, profile: null };
  const all = loadAll();
  const found = findEntry(all, { id, name });
  if (!found) return { ok: false, error: '档案不存在', taken: [], shortfall: want };
  const cur = { ...blank(), ...found.data };
  const taken = [];
  for (const item of ITEM_TYPES) {
    while (taken.length < want && (Number(cur[item]) || 0) > 0) {
      cur[item] -= 1;
      taken.push(item);
    }
  }
  if (id) cur.id = id;
  if (name && !cur.name) cur.name = name;
  all[found.key] = cur;
  saveAll(all);
  return {
    ok: true,
    taken,
    shortfall: want - taken.length,
    profile: toProfile({ ...cur, id: cur.id || found.key }, cur.name || name),
  };
}

function persistPrefs({ id, name, pet, jobPref }) {
  if (!id && !name) return { ok: false, error: '缺少档案' };
  const all = loadAll();
  let found = findEntry(all, { id, name });
  let key;
  let cur;
  if (found) {
    key = found.key;
    cur = { ...blank(), ...found.data };
  } else if (id) {
    key = id;
    cur = blank({ id, name: name || '' });
  } else {
    key = keyOf(name);
    cur = blank({ name });
  }
  if (pet !== undefined) cur.pet = social.normalizePet(pet);
  if (jobPref !== undefined) cur.jobPref = social.normalizeJob(jobPref);
  if (id) cur.id = id;
  if (name && !cur.name) cur.name = name;
  all[key] = cur;
  saveAll(all);
  return { ok: true, profile: toProfile({ ...cur, id: cur.id || key }, cur.name || name) };
}

function grantItem({ id, name, item, n = 1 }, allIn) {
  if (!ITEM_TYPES.includes(item)) return { ok: false, error: '未知物品' };
  const all = allIn || loadAll();
  let found = findEntry(all, { id, name });
  let key;
  let cur;
  if (found) {
    key = found.key;
    cur = { ...blank(), ...found.data };
  } else if (id) {
    key = id;
    cur = blank({ id, name });
  } else {
    key = keyOf(name);
    cur = blank({ name });
  }
  const add = Math.max(1, Number(n) || 1);
  cur[item] = (Number(cur[item]) || 0) + add;
  if (id) cur.id = id;
  if (name && !cur.name) cur.name = name;
  all[key] = cur;
  if (!allIn) saveAll(all);
  return {
    ok: true,
    item,
    n: add,
    profile: toProfile({ ...cur, id: cur.id || key }, cur.name || name),
  };
}

function expireMentorFields(cur, now = Date.now()) {
  if (!cur) return cur;
  if (cur.mentorUid && Number(cur.mentorUntil) && Number(cur.mentorUntil) < now) {
    cur.mentorUid = '';
    cur.mentorName = '';
    cur.mentorUntil = 0;
  }
  if (!Array.isArray(cur.apprenticeUids)) cur.apprenticeUids = [];
  return cur;
}

function grantMentorRankGift(apprenticeId, apprenticeName, allIn) {
  if (!apprenticeId) return null;
  const all = allIn || loadAll();
  const me = findEntry(all, { id: apprenticeId, name: apprenticeName });
  if (!me) return null;
  const cur = expireMentorFields({ ...blank(), ...me.data });
  if (!cur.mentorUid || Number(cur.mentorUntil) < Date.now()) return null;
  const gifted = grantItem({
    id: cur.mentorUid,
    name: cur.mentorName,
    item: 'cakes',
    n: 1,
  }, all);
  saveAll(all);
  if (!gifted.ok) return null;
  return {
    toUid: cur.mentorUid,
    toName: cur.mentorName || '师傅',
    item: 'cakes',
    fromUid: apprenticeId,
    fromName: cur.name || apprenticeName,
  };
}

function inviteMentor({ fromUid, fromName, toUid, toName }) {
  if (!fromUid || !toUid) return { ok: false, error: '请先登录' };
  if (fromUid === toUid) return { ok: false, error: '不能收自己为徒' };
  const all = loadAll();
  const now = Date.now();
  const mentorFound = findEntry(all, { id: fromUid, name: fromName });
  const apprenticeFound = findEntry(all, { id: toUid, name: toName });
  const mentor = expireMentorFields({
    ...blank(),
    ...(mentorFound ? mentorFound.data : {}),
    id: fromUid,
    name: (mentorFound && mentorFound.data.name) || fromName || '',
  }, now);
  const apprentice = expireMentorFields({
    ...blank(),
    ...(apprenticeFound ? apprenticeFound.data : {}),
    id: toUid,
    name: (apprenticeFound && apprenticeFound.data.name) || toName || '',
  }, now);
  if (apprentice.mentorUid) return { ok: false, error: '对方已有师傅' };
  const apps = Array.isArray(mentor.apprenticeUids) ? mentor.apprenticeUids.filter(Boolean) : [];
  if (apps.length >= MAX_APPRENTICES) return { ok: false, error: `最多收 ${MAX_APPRENTICES} 名徒弟` };
  if (apps.includes(toUid)) return { ok: false, error: '已是你的徒弟' };
  apprentice.pendingMentorInvite = {
    fromUid,
    fromName: mentor.name || fromName || '棋友',
    at: now,
  };
  all[apprenticeFound ? apprenticeFound.key : toUid] = apprentice;
  if (mentorFound) all[mentorFound.key] = mentor;
  else all[fromUid] = mentor;
  saveAll(all);
  return { ok: true, invite: apprentice.pendingMentorInvite };
}

function respondMentor({ uid, name, accept }) {
  if (!uid) return { ok: false, error: '请先登录' };
  const all = loadAll();
  const now = Date.now();
  const found = findEntry(all, { id: uid, name });
  if (!found) return { ok: false, error: '档案不存在' };
  const cur = expireMentorFields({ ...blank(), ...found.data, id: uid }, now);
  const inv = cur.pendingMentorInvite;
  if (!inv || !inv.fromUid) return { ok: false, error: '没有待处理的师徒邀请' };
  cur.pendingMentorInvite = null;
  if (!accept) {
    all[found.key] = cur;
    saveAll(all);
    return { ok: true, declined: true, profile: toProfile(cur, cur.name || name) };
  }
  if (cur.mentorUid) {
    all[found.key] = cur;
    saveAll(all);
    return { ok: false, error: '你已有师傅' };
  }
  const mentorFound = findEntry(all, { id: inv.fromUid, name: inv.fromName });
  const mentor = expireMentorFields({
    ...blank(),
    ...(mentorFound ? mentorFound.data : {}),
    id: inv.fromUid,
    name: (mentorFound && mentorFound.data.name) || inv.fromName || '',
  }, now);
  const apps = Array.isArray(mentor.apprenticeUids) ? mentor.apprenticeUids.filter(Boolean) : [];
  if (apps.length >= MAX_APPRENTICES) {
    all[found.key] = cur;
    saveAll(all);
    return { ok: false, error: '对方徒弟已满' };
  }
  if (!apps.includes(uid)) apps.push(uid);
  mentor.apprenticeUids = apps.slice(0, MAX_APPRENTICES);
  cur.mentorUid = inv.fromUid;
  cur.mentorName = mentor.name || inv.fromName || '';
  cur.mentorUntil = now + MENTOR_MS;
  all[found.key] = cur;
  all[mentorFound ? mentorFound.key : inv.fromUid] = mentor;
  saveAll(all);
  return {
    ok: true,
    profile: toProfile(cur, cur.name || name),
    mentor: toProfile(mentor, mentor.name),
  };
}

function recordVsOutcome({ uid, name, oppUid, oppName, outcome }) {
  if (!uid || !oppUid || uid === oppUid) return { ok: false };
  if (outcome !== 'win' && outcome !== 'loss') return { ok: false };
  const all = loadAll();
  const now = Date.now();

  function applyOne(id, displayName, otherId, otherName, result) {
    const found = findEntry(all, { id, name: displayName });
    const key = found ? found.key : id;
    const cur = { ...blank(), ...(found ? found.data : {}), id, name: (found && found.data.name) || displayName || '' };
    const streaks = (cur.vsStreaks && typeof cur.vsStreaks === 'object') ? { ...cur.vsStreaks } : {};
    const prev = streaks[otherId] || { outcome: '', count: 0, since: now };
    if (prev.outcome === result) {
      prev.count = (Number(prev.count) || 0) + 1;
    } else {
      prev.outcome = result;
      prev.count = 1;
      prev.since = now;
    }
    streaks[otherId] = prev;
    cur.vsStreaks = streaks;
    if (prev.count >= RIVAL_STREAK) {
      cur.rivals = {
        uid: otherId,
        name: otherName || '对手',
        streak: prev.count,
        since: prev.since,
        lastOutcome: result,
      };
    } else if (cur.rivals && cur.rivals.uid === otherId) {
      cur.rivals.streak = prev.count;
      cur.rivals.lastOutcome = result;
    }
    all[key] = cur;
    return { profile: toProfile(cur, cur.name), rivals: cur.rivals, streak: prev };
  }

  const a = applyOne(uid, name, oppUid, oppName, outcome);
  const bOutcome = outcome === 'win' ? 'loss' : 'win';
  applyOne(oppUid, oppName, uid, name, bOutcome);
  saveAll(all);
  return {
    ok: true,
    unlocked: !!(a.rivals && a.rivals.uid === oppUid && a.streak.count >= RIVAL_STREAK),
    rivals: a.rivals,
    streak: a.streak,
    self: a.profile,
  };
}

function resetRivalry({ uid, name, oppUid }) {
  if (!uid || !oppUid) return { ok: false };
  const all = loadAll();
  function clearOne(id, displayName, otherId) {
    const found = findEntry(all, { id, name: displayName });
    if (!found) return;
    const cur = { ...blank(), ...found.data, id };
    if (cur.vsStreaks && cur.vsStreaks[otherId]) {
      const next = { ...cur.vsStreaks };
      delete next[otherId];
      cur.vsStreaks = next;
    }
    if (cur.rivals && cur.rivals.uid === otherId) cur.rivals = null;
    all[found.key] = cur;
  }
  clearOne(uid, name, oppUid);
  clearOne(oppUid, '', uid);
  saveAll(all);
  return { ok: true };
}

function isMentorOf(mentorUid, apprenticeUid) {
  if (!mentorUid || !apprenticeUid) return false;
  const p = getProfileById(apprenticeUid, '');
  return !!(p.mentorUid === mentorUid && Number(p.mentorUntil) > Date.now());
}

function listFriends({ uid, name }) {
  const all = loadAll();
  const me = findEntry(all, { id: uid, name });
  const ids = me && Array.isArray(me.data.friends) ? me.data.friends : [];
  return ids.map((fid) => {
    const found = findEntry(all, { id: fid });
    const p = found
      ? toProfile({ ...found.data, id: found.data.id || found.key }, found.data.name || fid)
      : toProfile(blank({ id: fid }), fid);
    return {
      uid: fid,
      name: p.name || fid,
      rankLabel: p.rankLabel || '一阶',
      seasonWins: Number(p.seasonWins) || 0,
    };
  });
}

module.exports = {
  getProfile,
  getProfileById,
  saveProfile,
  recordOutcome,
  recordRecentMatch,
  getRecentMatches,
  giftItem,
  grantItem,
  spendItem,
  takeAnyItems,
  appendLore,
  appendWorldRumor,
  listWorldFeed,
  persistPrefs,
  normalizeLoreList,
  getLeaderboard,
  publicSeason,
  recordDailyGame,
  recordDailySpectate,
  claimDailyTask,
  buildDailyTasksPublic,
  searchProfiles,
  addFriend,
  removeFriend,
  listFriends,
  inviteMentor,
  respondMentor,
  recordVsOutcome,
  resetRivalry,
  isMentorOf,
  DAILY_TASK_DEFS,
  ITEM_TYPES,
  ITEM_LABELS,
  RANK_LABELS,
  RANK_THRESHOLDS,
  RECENT_MATCH_LIMIT,
  GAME_WIN_TYPES,
  ALLROUND_WEIGHTS,
  MENTOR_MS,
  MAX_APPRENTICES,
  RIVAL_STREAK,
  allroundScore,
  normalizeGameWins,
  normalizeQuickChats,
  QUICK_CHAT_SLOTS,
  QUICK_CHAT_MAX_LEN,
};
