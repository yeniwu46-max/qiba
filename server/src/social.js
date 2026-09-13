/** 房间社交：职业、传闻、真心话、主持（不改棋规则） */

const JOB_IDS = ['chef', 'spy', 'gardener', 'archaeologist'];
const JOB_META = {
  chef: { id: 'chef', label: '厨师', icon: '🍳' },
  spy: { id: 'spy', label: '间谍', icon: '🕶' },
  gardener: { id: 'gardener', label: '园丁', icon: '🌱' },
  archaeologist: { id: 'archaeologist', label: '考古学家', icon: '⛏' },
};

const JOB_MAX_LEVEL = 10;

const JOB_DOSSIER = {
  chef: {
    title: '暖心司厨',
    intro: '棋房点心官。用饼干、蛋糕和棒棒糖把对局气氛烘热，不改棋规，只改心情。',
    skill: '暖心点心：向房间分发氛围加成，持续随等级延长。',
    attrNames: ['亲和', '补给', '氛围'],
  },
  spy: {
    title: '窥子密探',
    intro: '戴单片镜的情报棋手。专偷看上一手落子，冷却长、信息准。',
    skill: '间谍窥视：对局中查看上一手提示，持续随等级延长。',
    attrNames: ['洞察', '隐蔽', '冷静'],
  },
  gardener: {
    title: '庭院守望',
    intro: '给房间浇水的园丁。庭院攒满会开花，并把传闻写进世界频道。',
    skill: '浇灌庭院：增加庭院生长值，满格开花并发布传闻。',
    attrNames: ['生长', '耐心', '生机'],
  },
  archaeologist: {
    title: '传闻发掘',
    intro: '背着卷轴的考古棋手。从聊天、礼物和落子里挖出一条房间传闻。',
    skill: '发掘传闻：从本房近期记录随机出土一条档案传闻。',
    attrNames: ['博识', '发掘', '毅力'],
  },
};

const PET_IDS = ['fox', 'cat', 'owl', 'slime'];
const PET_META = {
  fox: { id: 'fox', label: '火狐', icon: '🦊' },
  cat: { id: 'cat', label: '夜猫', icon: '🐱' },
  owl: { id: 'owl', label: '智库', icon: '🦉' },
  slime: { id: 'slime', label: '软泥', icon: '🟢' },
};

const BGM_TRACKS = [
  { id: 'embers', label: '余烬' },
  { id: 'tidehum', label: '潮 hum' },
  { id: 'pulse', label: '脉冲' },
  { id: 'off', label: '静音' },
];

const JOB_COOLDOWN_MS = {
  chef: 20000,
  spy: 45000,
  gardener: 12000,
  archaeologist: 25000,
};

const TREAT_MS = 15000;
const SPY_PEEK_MS = 8000;
const CUE_MS = 8000;
const VOTE_MS = 20000;
const PARTY_MS = 30000;
const GARDEN_WATER = 18;
const GARDEN_BLOOM = 100;
const LORE_MAX = 40;
const PROFILE_LORE_MAX = 8;

const TRUTH_QUESTIONS = [
  '上一手棋你在想什么？',
  '如果只能带一种点心进房，你选什么？',
  '你最近一次认输是因为什么？',
  '最怕对面下出哪一手？',
  '如果棋盘会说话，它会骂你什么？',
  '你更想当厨师、间谍、园丁还是考古学家？',
  '真心话：你有没有偷看过对手表情？',
  '如果下一局必须用非惯用手点棋，你还敢开吗？',
  '房间里谁最像会送蛋糕的人？',
  '讲一句你刚想说但没发出去的弹幕。',
  '如果庭院开花了，你想在旁边摆什么？',
  '用三个字评价刚才那局。',
];

function normalizeJob(id) {
  return JOB_IDS.includes(id) ? id : '';
}

function clampJobLevel(n) {
  const v = Number(n) || 1;
  return Math.max(1, Math.min(JOB_MAX_LEVEL, Math.floor(v)));
}

function emptyJobLevels() {
  const o = {};
  JOB_IDS.forEach((id) => { o[id] = 1; });
  return o;
}

function normalizeJobLevels(raw) {
  const o = emptyJobLevels();
  if (!raw || typeof raw !== 'object') return o;
  JOB_IDS.forEach((id) => {
    o[id] = clampJobLevel(raw[id]);
  });
  return o;
}

function jobAttrPoints(job, level) {
  const L = clampJobLevel(level);
  if (job === 'chef') return [6 + L * 2, 8 + L, 10 + L * 2];
  if (job === 'spy') return [8 + L * 2, 7 + L * 2, 9 + L];
  if (job === 'gardener') return [7 + L * 3, 8 + L, 6 + L * 2];
  if (job === 'archaeologist') return [9 + L * 2, 6 + L * 2, 8 + L];
  return [8 + L, 8 + L, 8 + L];
}

function jobPower(job, level) {
  const id = normalizeJob(job);
  const L = clampJobLevel(level);
  const lore = JOB_DOSSIER[id] || JOB_DOSSIER.chef;
  const baseCd = JOB_COOLDOWN_MS[id] || 20000;
  const cooldownMs = Math.max(Math.round(baseCd * 0.4), baseCd - (L - 1) * 1400);
  const names = lore.attrNames || ['力', '敏', '智'];
  const values = jobAttrPoints(id, L);
  return {
    id,
    label: (JOB_META[id] && JOB_META[id].label) || id,
    icon: (JOB_META[id] && JOB_META[id].icon) || '',
    title: lore.title,
    intro: lore.intro,
    skill: lore.skill,
    portrait: id ? `/assets/ip/${id}.png` : '/assets/ip/qiba.png',
    level: L,
    maxLevel: JOB_MAX_LEVEL,
    cooldownMs,
    treatMs: TREAT_MS + (L - 1) * 1500,
    peekMs: SPY_PEEK_MS + (L - 1) * 600,
    water: GARDEN_WATER + (L - 1) * 2,
    attrs: names.map((name, i) => ({ name, value: values[i] })),
    costToNext: L >= JOB_MAX_LEVEL ? 0 : L,
    costItem: 'cookies',
    costLabel: '饼干',
  };
}

function jobCards(levels) {
  const lv = normalizeJobLevels(levels);
  return JOB_IDS.map((id) => jobPower(id, lv[id]));
}

function normalizePet(id) {
  return PET_IDS.includes(id) ? id : 'fox';
}

function normalizeBgm(id) {
  return BGM_TRACKS.some((t) => t.id === id) ? id : 'embers';
}

function pickTruthQuestion(exclude) {
  const pool = TRUTH_QUESTIONS.filter((q) => q !== exclude);
  const list = pool.length ? pool : TRUTH_QUESTIONS;
  return list[Math.floor(Math.random() * list.length)];
}

function formatMoveHint(move) {
  if (!move) return '最近没有落子';
  if (move.pass) return '上一手是停着';
  if (move.planeId) return `上一手飞机 ${move.planeId}`;
  if (Number.isInteger(move.r) && Number.isInteger(move.c)) {
    return `上一手 ${move.r + 1} 行 ${move.c + 1} 列`;
  }
  if (move.dice) return `上一手骰子 ${move.dice}`;
  return '上一手坐标已记录';
}

function emptyGarden() {
  return { growth: 0, bloomCount: 0, lastWaterAt: 0 };
}

function normalizeGarden(raw) {
  const g = emptyGarden();
  if (!raw || typeof raw !== 'object') return g;
  g.growth = Math.max(0, Math.min(GARDEN_BLOOM, Number(raw.growth) || 0));
  g.bloomCount = Math.max(0, Number(raw.bloomCount) || 0);
  g.lastWaterAt = Number(raw.lastWaterAt) || 0;
  return g;
}

function rumorId() {
  return `lore_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

module.exports = {
  JOB_IDS,
  JOB_META,
  JOB_MAX_LEVEL,
  JOB_DOSSIER,
  PET_IDS,
  PET_META,
  BGM_TRACKS,
  JOB_COOLDOWN_MS,
  TREAT_MS,
  SPY_PEEK_MS,
  CUE_MS,
  VOTE_MS,
  PARTY_MS,
  GARDEN_WATER,
  GARDEN_BLOOM,
  LORE_MAX,
  PROFILE_LORE_MAX,
  TRUTH_QUESTIONS,
  normalizeJob,
  clampJobLevel,
  emptyJobLevels,
  normalizeJobLevels,
  jobAttrPoints,
  jobPower,
  jobCards,
  normalizePet,
  normalizeBgm,
  pickTruthQuestion,
  formatMoveHint,
  emptyGarden,
  normalizeGarden,
  rumorId,
};
