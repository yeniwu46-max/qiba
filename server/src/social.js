/** 房间社交：职业、传闻、真心话、主持（不改棋规则） */

const JOB_IDS = ['chef', 'spy', 'gardener', 'archaeologist'];
const JOB_META = {
  chef: { id: 'chef', label: '厨师', icon: '🍳' },
  spy: { id: 'spy', label: '间谍', icon: '🕶' },
  gardener: { id: 'gardener', label: '园丁', icon: '🌱' },
  archaeologist: { id: 'archaeologist', label: '考古学家', icon: '⛏' },
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
  normalizePet,
  normalizeBgm,
  pickTruthQuestion,
  formatMoveHint,
  emptyGarden,
  normalizeGarden,
  rumorId,
};
