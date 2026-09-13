const gomoku = require('./games/gomoku');
const reversi = require('./games/reversi');
const go9 = require('./games/go9');
const draughts = require('./games/draughts');
const flying = require('./games/flying');
const bots = require('./bots');
const social = require('./social');
const {
  getProfile,
  getProfileById,
  recordOutcome,
  recordRecentMatch,
  recordDailyGame,
  giftItem: giftInventoryItem,
  takeAnyItems,
  ITEM_TYPES,
  ITEM_LABELS,
  QUICK_CHAT_MAX_LEN,
  recordVsOutcome,
  resetRivalry,
  isMentorOf,
  appendLore,
  appendWorldRumor,
  persistPrefs,
  upgradeJob,
} = require('./stats');

const SPEC_SEAT_COUNT = 5;
const COMMENTATOR_SEAT_COUNT = 2;

const GAME_MODS = {
  gomoku,
  reversi,
  go: go9,
  draughts,
  flying,
};

const BOARD_THEME_IDS = ['default', 'theme-1', 'theme-2', 'theme-3', 'theme-4'];
const BOARD_THEME_COOLDOWN_MS = 5000;
const BOARD_THEME_LOCKED = new Set(['draughts', 'flying']);
const FLYING_COLORS = { 1: '红', 2: '黄', 3: '蓝', 4: '绿' };

const TURN_MS = 30000;
const PROP_TIME_CAP_MS = 5000;
const PASS_REWARD_MS = 15000;
const GENERIC_PROP_IDS = ['swallow', 'timeCut', 'undoPlus'];
const GAME_PROP_IDS = {
  gomoku: ['forbiddenPoint', 'fog'],
  reversi: ['flipProtect', 'forceSwap'],
  go: ['komiAdjust', 'passReward'],
  flying: ['remoteDice', 'shield'],
  draughts: GENERIC_PROP_IDS,
};
const ALL_PROP_IDS = [
  ...GENERIC_PROP_IDS,
  'forbiddenPoint', 'fog',
  'flipProtect', 'forceSwap',
  'komiAdjust', 'passReward',
  'remoteDice', 'shield',
];

function emptyProps() {
  const p = {};
  ALL_PROP_IDS.forEach((id) => { p[id] = 0; });
  return p;
}

function starterProps(gameType) {
  const p = emptyProps();
  const ids = GAME_PROP_IDS[gameType] || GENERIC_PROP_IDS;
  ids.forEach((id) => { p[id] = 1; });
  return p;
}

function propsForMode(gameType, mode) {
  return mode === 'props' ? starterProps(gameType) : emptyProps();
}

/** 断线后座位/观战席保留时长，超时才真正 leave */
const RECONNECT_GRACE_MS = 60000;
const DANMAKU_MAX_LEN = 20;
const DANMAKU_COOLDOWN_MS = 3000;

const QUICK_TEXTS = [
  { id: 1, text: '你的棋下的真不错' },
  { id: 2, text: '好一手烂棋' },
  { id: 3, text: '看我秒了你' },
  { id: 4, text: '会不会玩啊你' },
  { id: 5, text: '菜就多练' },
  { id: 6, text: '多沉淀沉淀' },
  { id: 7, text: '快点啊，我等得花都谢了' },
];
const REMATCH_MS = 30000;
const TRUTH_PICK_MS = 30000;
const TRUTH_ANSWER_MS = 45000;
const TRUTH_PENALTY = 3;
const TRUTH_BANK = [
  '最近一次对TA隐瞒的事是什么？',
  '你最不想被TA翻到的聊天记录是哪条？',
  '如果现在必须坦白一个秘密，你会说哪个？',
  '你觉得TA哪个习惯最让人受不了？',
  '有没有把今天这局的锅甩给过运气？',
  '你上次嘴硬其实已经认输是什么时候？',
  '如果只能夸TA一句真心的，你会说？',
  '你有没有在对局里偷偷希望TA断线？',
  '你最怕TA用什么话题回敬你？',
  '如果这局赌注是一件糗事，你赌什么？',
  '你觉得自己刚才最臭的一手是哪步？',
  '如果要给这段友谊打分，现在几分？',
  '你有没有装作没看见TA的杀棋？',
  '此刻最想对TA说、但平时说不出口的是？',
  '如果再来一局，你想先道歉还是先嘲讽？',
];
const COACH_COOLDOWN_MS = 3000;
const MENTOR_COACH_COOLDOWN_MS = 400;
const QUICK_MAX_LEN = QUICK_CHAT_MAX_LEN || 24;
const SPIRIT_SPAWN_AFTER = 4;
const FOG_SPREAD_N = 3;
const TIDE_TURNS = 6;
const METEOR_BONUS_MS = 8000;
const WEATHER_TYPES = {
  fogSpread: { id: 'fogSpread', label: '迷雾扩散', icon: '🌫' },
  tide: { id: 'tide', label: '潮汐', icon: '🌊' },
  meteor: { id: 'meteor', label: '流星', icon: '☄' },
};

function defaultCelestial({ mode, visibility, gameType }) {
  const gt = normalizeGameType(gameType);
  if (gt === 'draughts' || gt === 'flying') return false;
  if (mode === 'props' || mode === 'aid') return true;
  if (mode === '2v2' && visibility !== 'private') return true;
  return false;
}

function rollWeather(forced) {
  if (forced && WEATHER_TYPES[forced]) return { ...WEATHER_TYPES[forced] };
  const ids = Object.keys(WEATHER_TYPES);
  const id = ids[Math.floor(Math.random() * ids.length)];
  return { ...WEATHER_TYPES[id] };
}

function weatherPublic(w) {
  if (!w || !w.id) return null;
  const meta = WEATHER_TYPES[w.id] || w;
  return { id: meta.id, label: meta.label, icon: meta.icon || '' };
}

function shuffleCopy(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function pickTruthChoices(n = 3) {
  return shuffleCopy(TRUTH_BANK).slice(0, Math.max(1, n));
}

function sanitizeTruthText(raw, max) {
  return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeFriendshipStake(item) {
  if (!item) return '';
  return ITEM_TYPES.includes(item) ? item : '';
}

function resolveQuickText(textId, customList) {
  const id = Number(textId);
  const preset = QUICK_TEXTS.find((t) => t.id === id);
  if (!preset) return null;
  const list = Array.isArray(customList) ? customList : [];
  const raw = String(list[id - 1] == null ? '' : list[id - 1]).trim().slice(0, QUICK_MAX_LEN);
  return { id: preset.id, text: raw || preset.text };
}

const ALLOWED_EMOTES = [
  'smile', 'cry', 'angry', 'confused', 'flower', 'egg',
  'sneer', 'clap', 'sweat', 'heart', 'speechless',
];

function normalizeGameType(gameType) {
  if (GAME_MODS[gameType]) return gameType;
  return 'gomoku';
}

function normalizeMode(gameType, mode) {
  const gt = normalizeGameType(gameType);
  if (gt === 'draughts') return '1v1';
  if (gt === 'flying') {
    if (mode === '2v2' || mode === '3p' || mode === '1v1') return mode;
    return '1v1';
  }
  if (mode === '3p') return '1v1';
  if (mode === 'youjin') return gt === 'gomoku' ? 'youjin' : '1v1';
  if (['1v1', '2v2', 'props', 'aid'].includes(mode)) return mode;
  return '1v1';
}

function resolveBoardSize(gameType, boardScale) {
  const gt = normalizeGameType(gameType);
  if (gt === 'draughts') return 8;
  if (gt === 'flying') return 1;
  const mod = GAME_MODS[gt] || gomoku;
  const scale = boardScale === 'small' ? 'small' : 'large';
  const sizes = mod.SIZES || { small: 9, large: 15 };
  return sizes[scale] || sizes.large || 15;
}

function makeEngine(gameType, boardScale, extra = {}) {
  const gt = normalizeGameType(gameType);
  if (gt === 'flying') {
    return flying.createEngine(extra.seatCount || 2);
  }
  const mod = GAME_MODS[gt] || gomoku;
  const size = resolveBoardSize(gt, boardScale);
  if (gt === 'go') {
    return go9.createEngine(size, { allied: !!extra.allied });
  }
  if (typeof mod.createEngine === 'function') return mod.createEngine(size);
  return mod;
}

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function normalizeRoomCode(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

function normalizeJoinPass(pass) {
  const s = String(pass || '').trim();
  if (!s) return '';
  if (!/^[A-Za-z0-9]{4,8}$/.test(s)) return null;
  return s;
}

function genId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

class Room {
  constructor({
    code,
    gameType,
    mode,
    hostId,
    hostName,
    hostSkin,
    totalRounds,
    boardScale,
    turnMs,
    visibility,
    joinPass,
    skipHost,
    boardTheme,
    fillBots,
    clubTag,
    clubId,
    clubName,
    friendshipStake,
    celestial,
    weather,
    grudgeMatch,
    grudgeVsUid,
  }) {
    this.code = code;
    this.gameType = normalizeGameType(gameType);
    this.mode = normalizeMode(this.gameType, mode);
    this.phase = 'lobby'; // lobby | playing | truth | roundEnd | seriesEnd
    this.hostId = hostId;
    this.visibility = visibility === 'private' ? 'private' : 'public';
    this.boardScale = boardScale === 'small' ? 'small' : 'large';
    this.turnMs = Math.min(120000, Math.max(5000, Number(turnMs) || TURN_MS));
    this.joinPass = normalizeJoinPass(joinPass) || '';
    this.boardTheme = BOARD_THEME_IDS.includes(boardTheme) ? boardTheme : 'default';
    this.boardThemeAt = 0;
    this.fillBots = !!fillBots;
    this.clubTag = String(clubTag || '').slice(0, 4);
    this.clubId = clubId || '';
    this.clubName = String(clubName || '').slice(0, 12);
    this.friendshipStake = normalizeFriendshipStake(friendshipStake);
    this.celestial = celestial == null
      ? defaultCelestial({ mode: this.mode, visibility: this.visibility, gameType: this.gameType })
      : !!celestial;
    this.forcedWeather = weather && WEATHER_TYPES[weather] ? weather : '';
    this.weather = null;
    this.event = null;
    this.spirit = null;
    this.grudgeMatch = !!grudgeMatch;
    this.grudgeVsUid = String(grudgeVsUid || '');
    this.extraTimeForColor = null;
    this.draughtsContinue = null;
    this.rematchOpen = false;
    this.rematchVotes = {};
    this.rematchDeadline = null;
    this.truth = null;
    this.coachHint = null;
    this.settleHint = '';
    this.coachCooldown = new Map();
    this.seats = this.createSeats();
    this.specSeats = this.createSpecSeats();
    this.commentatorSeats = this.createCommentatorSeats();
    this.pendingSwap = null; // { fromId, toId, id, at }
    this.board = null;
    this.turnColor = 1; // BLACK
    this.turnSeatIndex = 0;
    this.history = [];
    this.winner = null; // 1 | 2 | 0 draw | null
    this.turnDeadline = null;
    this.nextTurnTimeCapMs = null;
    this.passCount = 0;
    this.prevBoardHash = null;
    this.aidRequest = null; // { seatIndex, requesterId }
    this.engine = makeEngine(this.gameType, this.boardScale, {
      seatCount: this.seats.length,
      allied: this.isGoTeam(),
    });
    this.messages = [];
    this.chatLog = [];
    this.garden = social.emptyGarden();
    this.roomLore = [];
    this.socialBuffs = [];
    /** @type {Map<string, Object>} playerId -> { chef, spy, gardener, archaeologist: ts } */
    this.jobCooldowns = new Map();
    /** @type {Map<string, { move, until }>} */
    this.spyPeeks = new Map();
    /** @type {Map<string, { count, lastAt }>} */
    this.giftStreaks = new Map();
    this.totalRounds = this.grudgeMatch
      ? 3
      : Math.min(5, Math.max(1, Number(totalRounds) || 1));
    this.currentRound = 0;
    this.seriesScore = { black: 0, white: 0 };
    this.roundResults = [];
    this.lastMove = null;
    this.lastEffects = null;
    this.recentEmotes = [];
    this.komi = 0;
    this.captureBonus = { 1: 0, 2: 0 };
    this.forbiddenCells = [];
    this.fogHidden = null;
    this.protectedCells = [];
    this.shields = {};
    /** @type {Map<string, number>} playerId -> last danmaku ts */
    this.danmakuCooldown = new Map();
    /** @type {Map<string, NodeJS.Timeout>} playerId -> leave timer */
    this.disconnectTimers = new Map();
    if (!skipHost) {
      this.addPlayerToSeat(0, { id: hostId, name: hostName, skin: hostSkin });
    }
  }

  hasJoinPass() {
    return !!this.joinPass;
  }

  checkJoinPass(pass) {
    if (!this.joinPass) return { ok: true };
    const got = String(pass || '').trim();
    if (got !== this.joinPass) return { ok: false, error: '进房口令错误', needPass: true };
    return { ok: true };
  }

  markOffline(playerId) {
    const seat = this.findSeatByPlayer(playerId);
    if (seat && seat.player) seat.player.online = false;
    const spec = this.findSpectator(playerId);
    if (spec) spec.online = false;
    const commentator = this.findCommentator(playerId);
    if (commentator) commentator.online = false;
  }

  markOnline(playerId) {
    const seat = this.findSeatByPlayer(playerId);
    if (seat && seat.player) seat.player.online = true;
    const spec = this.findSpectator(playerId);
    if (spec) spec.online = true;
    const commentator = this.findCommentator(playerId);
    if (commentator) commentator.online = true;
  }

  clearDisconnectTimer(playerId) {
    const t = this.disconnectTimers.get(playerId);
    if (t) {
      clearTimeout(t);
      this.disconnectTimers.delete(playerId);
    }
  }

  /**
   * 用房间码 + playerKey / uid 找回座位或观战席
   * @returns {{ ok: boolean, error?: string, playerId?: string, role?: string }}
   */
  rejoin({ playerKey, uid, name, skin, joinPass }) {
    if (this.phase === 'seriesEnd' && !this.rematchOpen) {
      return { ok: false, error: '系列赛已结束' };
    }
    let foundId = null;
    const match = (p) => {
      if (!p) return false;
      if (playerKey && p.id === playerKey) return true;
      if (uid && p.uid && p.uid === uid) return true;
      return false;
    };
    for (const seat of this.seats) {
      if (seat.player && match(seat.player)) {
        foundId = seat.player.id;
        if (name) seat.player.name = name;
        if (skin) seat.player.skin = skin;
        seat.player.online = true;
        break;
      }
    }
    if (!foundId) {
      for (let i = 0; i < this.specSeats.length; i += 1) {
        const s = this.specSeats[i];
        if (s && match(s)) {
          foundId = s.id;
          if (name) s.name = name;
          if (skin) s.skin = skin;
          s.online = true;
          break;
        }
      }
    }
    if (!foundId) {
      for (let i = 0; i < this.commentatorSeats.length; i += 1) {
        const s = this.commentatorSeats[i];
        if (s && match(s)) {
          foundId = s.id;
          if (name) s.name = name;
          if (skin) s.skin = skin;
          s.online = true;
          break;
        }
      }
    }
    if (!foundId) {
      const passCheck = this.checkJoinPass(joinPass);
      if (!passCheck.ok) return passCheck;
      return { ok: false, error: '原座位已失效，请重新加入' };
    }
    this.clearDisconnectTimer(foundId);
    return { ok: true, playerId: foundId };
  }

  /** 兼容旧字段：观战者列表（不含解说） */
  get spectators() {
    return this.specSeats.filter(Boolean);
  }

  get commentators() {
    return this.commentatorSeats.filter(Boolean);
  }

  createSpecSeats() {
    return Array.from({ length: SPEC_SEAT_COUNT }, () => null);
  }

  createCommentatorSeats() {
    return Array.from({ length: COMMENTATOR_SEAT_COUNT }, () => null);
  }

  findCommentatorSeatIndex(playerId) {
    return this.commentatorSeats.findIndex((s) => s && s.id === playerId);
  }

  findEmptyCommentatorSeat() {
    return this.commentatorSeats.findIndex((s) => !s);
  }

  findCommentator(playerId) {
    return this.commentatorSeats.find((s) => s && s.id === playerId) || null;
  }

  /** 观战或解说（可聊天/弹幕，仅观战可外援代下） */
  findWatcher(playerId) {
    return this.findSpectator(playerId) || this.findCommentator(playerId);
  }

  isRoomEmpty() {
    return this.seats.every((s) => !s.player)
      && this.spectators.length === 0
      && this.commentators.length === 0;
  }

  findSpecSeatIndex(playerId) {
    return this.specSeats.findIndex((s) => s && s.id === playerId);
  }

  findEmptySpecSeat() {
    return this.specSeats.findIndex((s) => !s);
  }

  addSpectator(player) {
    const idx = this.findEmptySpecSeat();
    if (idx < 0) return { ok: false, error: '观战席已满' };
    const name = player.name || `观战${idx + 1}`;
    const profile = player.uid
      ? getProfileById(player.uid, name)
      : getProfile(name);
    this.specSeats[idx] = {
      id: player.id,
      uid: player.uid || null,
      name,
      skin: player.skin || 'blue',
      aidUsed: 0,
      profile,
      seatIndex: idx,
      online: true,
    };
    return { ok: true, role: 'spectator', specIndex: idx };
  }

  addCommentator(player) {
    const idx = this.findEmptyCommentatorSeat();
    if (idx < 0) return { ok: false, error: '解说席已满' };
    const name = player.name || `解说${idx + 1}`;
    const profile = player.uid
      ? getProfileById(player.uid, name)
      : getProfile(name);
    this.commentatorSeats[idx] = {
      id: player.id,
      uid: player.uid || null,
      name,
      skin: player.skin || 'blue',
      profile,
      seatIndex: idx,
      online: true,
      role: 'commentator',
    };
    return { ok: true, role: 'commentator', commentatorIndex: idx };
  }

  needsProps() {
    return this.mode === 'props';
  }

  needsAid() {
    return this.mode === 'aid';
  }

  isYoujin() {
    return this.mode === 'youjin' && this.gameType === 'gomoku';
  }

  seatCount() {
    if (this.gameType === 'flying') {
      if (this.mode === '2v2') return 4;
      if (this.mode === '3p') return 3;
      return 2;
    }
    if (this.gameType === 'draughts') return 2;
    return this.mode === '2v2' ? 4 : 2;
  }

  createSeats() {
    const n = this.seatCount();
    const flyingGame = this.gameType === 'flying';
    const goTeam = this.gameType === 'go' && n === 4;
    const seats = [];
    for (let i = 0; i < n; i += 1) {
      seats.push({
        index: i,
        team: flyingGame ? String(i + 1) : (i % 2 === 0 ? 'A' : 'B'),
        color: flyingGame ? (i + 1) : (goTeam ? (i + 1) : (i % 2 === 0 ? 1 : 2)),
        player: null,
        ready: false,
        undoLeft: 1,
        props: propsForMode(this.gameType, this.mode),
        job: '',
      });
    }
    return seats;
  }

  isGoTeam() {
    return this.gameType === 'go' && this.mode === '2v2';
  }

  colorTeam(color) {
    if (this.isGoTeam()) {
      if (color === 1 || color === 3) return 1;
      if (color === 2 || color === 4) return 2;
    }
    return color === 1 ? 1 : (color === 2 ? 2 : color);
  }

  supportsBoardEvents() {
    return this.gameType === 'gomoku' || this.gameType === 'go' || this.gameType === 'reversi';
  }

  supportsSpirit() {
    return this.mode === 'props' && (this.gameType === 'gomoku' || this.gameType === 'reversi');
  }

  findSeatByPlayer(playerId) {
    return this.seats.find((s) => s.player && s.player.id === playerId) || null;
  }

  findSpectator(playerId) {
    return this.specSeats.find((s) => s && s.id === playerId) || null;
  }

  addPlayerToSeat(index, player) {
    if (index < 0 || index >= this.seats.length) return { ok: false, error: '座位不存在' };
    if (this.seats[index].player) return { ok: false, error: '座位已有人' };
    const name = player.name || `玩家${index + 1}`;
    const profile = player.uid
      ? getProfileById(player.uid, name)
      : getProfile(name);
    this.seats[index].player = {
      id: player.id,
      uid: player.uid || null,
      name,
      skin: player.skin || 'red',
      profile,
      online: player.online !== false,
      bot: !!player.bot,
    };
    this.seats[index].ready = !!player.bot;
    if (this.mode === 'props') {
      this.seats[index].props = starterProps(this.gameType);
    }
    this.seats[index].undoLeft = 1;
    return { ok: true };
  }

  join({ playerId, name, skin, asSpectator, asCommentator, seatIndex, uid, joinPass }) {
    const passCheck = this.checkJoinPass(joinPass);
    if (!passCheck.ok) return passCheck;
    if (this.findSeatByPlayer(playerId) || this.findWatcher(playerId)) {
      return { ok: true, rejoined: true };
    }
    if (asCommentator) {
      return this.addCommentator({ id: playerId, name, skin, uid });
    }
    if (asSpectator || this.needsAid()) {
      if (asSpectator || this.seats.every((s) => s.player)) {
        return this.addSpectator({ id: playerId, name, skin, uid });
      }
    }
    let idx = typeof seatIndex === 'number' ? seatIndex : this.seats.findIndex((s) => !s.player);
    if (idx < 0) {
      if (this.needsAid()) {
        return this.addSpectator({ id: playerId, name, skin, uid });
      }
      const spec = this.addSpectator({ id: playerId, name, skin, uid });
      if (spec.ok) return spec;
      return { ok: false, error: '房间已满' };
    }
    return this.addPlayerToSeat(idx, { id: playerId, name, skin, uid });
  }

  opponentWinnerColor(loserSeat) {
    if (!loserSeat) return 1;
    if (this.gameType === 'flying') {
      const other = this.seats.find((s) => s.player && (!loserSeat.player || s.player.id !== loserSeat.player.id));
      return other ? other.color : (loserSeat.color === 1 ? 2 : 1);
    }
    const team = this.colorTeam(loserSeat.color);
    return team === 1 ? 2 : 1;
  }

  leave(playerId) {
    this.clearDisconnectTimer(playerId);
    this.danmakuCooldown.delete(playerId);
    const seat = this.findSeatByPlayer(playerId);
    if (seat) {
      if (this.phase === 'playing') {
        this.finishRound(this.opponentWinnerColor(seat), { reason: 'leave' });
      }
      if (this.phase === 'truth' && this.truth && this.truth.stage !== 'done') {
        if (playerId === this.truth.loserId) this.failTruth('离开未答');
        else if (playerId === this.truth.winnerId && this.truth.stage === 'pick') {
          this.applyTruthQuestion(this.truth.choices[0], 'random');
          this.pushSystemChat('出题方离开，系统随机选题');
        }
      }
      seat.player = null;
      seat.ready = false;
    }
    const specIdx = this.findSpecSeatIndex(playerId);
    if (specIdx >= 0) this.specSeats[specIdx] = null;
    const commentatorIdx = this.findCommentatorSeatIndex(playerId);
    if (commentatorIdx >= 0) this.commentatorSeats[commentatorIdx] = null;
    if (this.aidRequest && this.aidRequest.requesterId === playerId) {
      this.aidRequest = null;
    }
    if (this.pendingSwap && (this.pendingSwap.fromId === playerId || this.pendingSwap.toId === playerId)) {
      this.pendingSwap = null;
    }
    if (playerId === this.hostId) {
      const next = this.seats.find((s) => s.player);
      if (next) this.hostId = next.player.id;
    }
  }

  kick(hostId, targetId) {
    if (hostId !== this.hostId) return { ok: false, error: '仅房主可踢人' };
    if (!targetId || targetId === hostId) return { ok: false, error: '不能踢自己' };
    const seat = this.findSeatByPlayer(targetId);
    const spec = this.findSpectator(targetId);
    const commentator = this.findCommentator(targetId);
    if (!seat && !spec && !commentator) return { ok: false, error: '目标不在房间' };
    this.leave(targetId);
    return { ok: true, kickedId: targetId };
  }

  forceQuit(playerId) {
    if (this.phase !== 'playing') return { ok: false, error: '仅对局中可强制退出' };
    const seat = this.findSeatByPlayer(playerId);
    if (!seat || !seat.player) return { ok: false, error: '观战或解说离开不记罚' };
    if (seat.player.bot) return { ok: false, error: '人机不能强制退出' };
    const winner = this.opponentWinnerColor(seat);
    const name = seat.player.name;
    this.finishRound(winner, {
      reason: 'forceQuit',
      forceQuit: true,
      quitPlayerId: playerId,
      quitName: name,
      endSeries: true,
    });
    this.pushSystemChat(`${name} 强制退出，判负两局`);
    return { ok: true };
  }

  resign(playerId) {
    if (this.phase !== 'playing') return { ok: false, error: '仅对局中可认输' };
    const seat = this.findSeatByPlayer(playerId);
    if (!seat || !seat.player) return { ok: false, error: '仅入座玩家可认输' };
    if (seat.player.bot) return { ok: false, error: '人机不能认输' };
    const winner = this.opponentWinnerColor(seat);
    this.finishRound(winner, {
      reason: 'resign',
      resigned: true,
      quitPlayerId: playerId,
      quitName: seat.player.name,
    });
    this.pushSystemChat(`${seat.player.name} 认输`);
    return { ok: true };
  }

  setReady(playerId, ready) {
    const seat = this.findSeatByPlayer(playerId);
    if (!seat) return { ok: false, error: '不在座位上' };
    seat.ready = !!ready;
    return { ok: true };
  }

  setSkin(playerId, skin) {
    const seat = this.findSeatByPlayer(playerId);
    if (seat) seat.player.skin = skin;
    const spec = this.findSpectator(playerId);
    if (spec) spec.skin = skin;
    const commentator = this.findCommentator(playerId);
    if (commentator) commentator.skin = skin;
    return { ok: true };
  }

  /** 从座位/观战席取出玩家对象（不删除座位结构） */
  detachPlayer(playerId) {
    const seat = this.findSeatByPlayer(playerId);
    if (seat) {
      const player = { ...seat.player, ready: seat.ready, from: 'seat', seatIndex: seat.index };
      seat.player = null;
      seat.ready = false;
      return player;
    }
    const specIdx = this.findSpecSeatIndex(playerId);
    if (specIdx >= 0) {
      const player = { ...this.specSeats[specIdx], from: 'spec', specIndex: specIdx };
      this.specSeats[specIdx] = null;
      return player;
    }
    const commentatorIdx = this.findCommentatorSeatIndex(playerId);
    if (commentatorIdx >= 0) {
      const player = {
        ...this.commentatorSeats[commentatorIdx],
        from: 'commentator',
        commentatorIndex: commentatorIdx,
      };
      this.commentatorSeats[commentatorIdx] = null;
      return player;
    }
    return null;
  }

  /**
   * lobby 自由换到空座位、观战席或解说席
   * target: { kind: 'seat'|'spec'|'commentator', index: number }
   */
  switchSeat(playerId, target) {
    if (this.phase !== 'lobby') return { ok: false, error: '仅大厅阶段可换位' };
    if (!target || !['seat', 'spec', 'commentator'].includes(target.kind)) {
      return { ok: false, error: '无效目标' };
    }
    const me = this.findSeatByPlayer(playerId) || this.findWatcher(playerId);
    if (!me) return { ok: false, error: '不在房间内' };

    if (target.kind === 'seat') {
      const idx = Number(target.index);
      if (idx < 0 || idx >= this.seats.length) return { ok: false, error: '座位不存在' };
      if (this.seats[idx].player) {
        if (this.seats[idx].player.id === playerId) return { ok: true };
        return { ok: false, error: '座位已有人，请申请换位' };
      }
      const detached = this.detachPlayer(playerId);
      if (!detached) return { ok: false, error: '不在房间内' };
      return this.addPlayerToSeat(idx, detached);
    }

    if (target.kind === 'commentator') {
      const idx = Number(target.index);
      if (idx < 0 || idx >= this.commentatorSeats.length) {
        return { ok: false, error: '解说席不存在' };
      }
      if (this.commentatorSeats[idx]) {
        if (this.commentatorSeats[idx].id === playerId) return { ok: true };
        return { ok: false, error: '解说席已有人，请申请换位' };
      }
      const detached = this.detachPlayer(playerId);
      if (!detached) return { ok: false, error: '不在房间内' };
      this.commentatorSeats[idx] = {
        id: detached.id,
        uid: detached.uid || null,
        name: detached.name,
        skin: detached.skin || 'blue',
        profile: detached.profile || getProfile(detached.name),
        seatIndex: idx,
        online: true,
        role: 'commentator',
      };
      return { ok: true };
    }

    const idx = Number(target.index);
    if (idx < 0 || idx >= this.specSeats.length) return { ok: false, error: '观战席不存在' };
    if (this.specSeats[idx]) {
      if (this.specSeats[idx].id === playerId) return { ok: true };
      return { ok: false, error: '观战席已有人，请申请换位' };
    }
    const detached = this.detachPlayer(playerId);
    if (!detached) return { ok: false, error: '不在房间内' };
    this.specSeats[idx] = {
      id: detached.id,
      uid: detached.uid || null,
      name: detached.name,
      skin: detached.skin || 'blue',
      aidUsed: 0,
      profile: detached.profile || getProfile(detached.name),
      seatIndex: idx,
      online: true,
    };
    return { ok: true };
  }

  requestSwap(playerId, targetId) {
    if (this.phase !== 'lobby') return { ok: false, error: '仅大厅阶段可申请换位' };
    if (!targetId || targetId === playerId) return { ok: false, error: '无效目标' };
    const fromSeat = this.findSeatByPlayer(playerId);
    const fromSpec = this.findSpectator(playerId);
    const fromCommentator = this.findCommentator(playerId);
    const toSeat = this.findSeatByPlayer(targetId);
    const toSpec = this.findSpectator(targetId);
    const toCommentator = this.findCommentator(targetId);
    if ((!fromSeat && !fromSpec && !fromCommentator) || (!toSeat && !toSpec && !toCommentator)) {
      return { ok: false, error: '双方需都在房间内' };
    }
    if (this.pendingSwap) return { ok: false, error: '已有换位申请进行中' };
    this.pendingSwap = {
      id: `swap_${Date.now().toString(36)}`,
      fromId: playerId,
      toId: targetId,
      fromName: fromSeat ? fromSeat.player.name : (fromSpec ? fromSpec.name : fromCommentator.name),
      toName: toSeat ? toSeat.player.name : (toSpec ? toSpec.name : toCommentator.name),
      at: Date.now(),
    };
    return { ok: true, pendingSwap: this.pendingSwap };
  }

  respondSwap(playerId, accept) {
    if (this.phase !== 'lobby') return { ok: false, error: '仅大厅阶段可换位' };
    if (!this.pendingSwap) return { ok: false, error: '没有待处理的换位申请' };
    if (this.pendingSwap.toId !== playerId) return { ok: false, error: '你不是换位目标' };
    const swap = this.pendingSwap;
    this.pendingSwap = null;
    if (!accept) return { ok: true, accepted: false };

    const aSeat = this.findSeatByPlayer(swap.fromId);
    const bSeat = this.findSeatByPlayer(swap.toId);
    const aSpecIdx = this.findSpecSeatIndex(swap.fromId);
    const bSpecIdx = this.findSpecSeatIndex(swap.toId);

    const aCommentatorIdx = this.findCommentatorSeatIndex(swap.fromId);
    const bCommentatorIdx = this.findCommentatorSeatIndex(swap.toId);

    const a = aSeat
      ? { kind: 'seat', index: aSeat.index, player: { ...aSeat.player }, ready: aSeat.ready }
      : aSpecIdx >= 0
        ? { kind: 'spec', index: aSpecIdx, player: { ...this.specSeats[aSpecIdx] } }
        : aCommentatorIdx >= 0
          ? { kind: 'commentator', index: aCommentatorIdx, player: { ...this.commentatorSeats[aCommentatorIdx] } }
          : null;
    const b = bSeat
      ? { kind: 'seat', index: bSeat.index, player: { ...bSeat.player }, ready: bSeat.ready }
      : bSpecIdx >= 0
        ? { kind: 'spec', index: bSpecIdx, player: { ...this.specSeats[bSpecIdx] } }
        : bCommentatorIdx >= 0
          ? { kind: 'commentator', index: bCommentatorIdx, player: { ...this.commentatorSeats[bCommentatorIdx] } }
          : null;
    if (!a || !b) return { ok: false, error: '换位双方状态已变化' };

    if (a.kind === 'seat') {
      this.seats[a.index].player = null;
      this.seats[a.index].ready = false;
    } else if (a.kind === 'spec') this.specSeats[a.index] = null;
    else this.commentatorSeats[a.index] = null;
    if (b.kind === 'seat') {
      this.seats[b.index].player = null;
      this.seats[b.index].ready = false;
    } else if (b.kind === 'spec') this.specSeats[b.index] = null;
    else this.commentatorSeats[b.index] = null;

    const place = (slot, person) => {
      if (slot.kind === 'seat') {
        this.addPlayerToSeat(slot.index, person.player);
        this.seats[slot.index].ready = false;
      } else if (slot.kind === 'spec') {
        this.specSeats[slot.index] = {
          id: person.player.id,
          uid: person.player.uid || null,
          name: person.player.name,
          skin: person.player.skin || 'blue',
          aidUsed: person.player.aidUsed || 0,
          profile: person.player.profile || getProfile(person.player.name),
          seatIndex: slot.index,
          online: true,
        };
      } else {
        this.commentatorSeats[slot.index] = {
          id: person.player.id,
          uid: person.player.uid || null,
          name: person.player.name,
          skin: person.player.skin || 'blue',
          profile: person.player.profile || getProfile(person.player.name),
          seatIndex: slot.index,
          online: true,
          role: 'commentator',
        };
      }
    };
    place(b, a);
    place(a, b);
    return { ok: true, accepted: true };
  }

  roomChat(playerId, text) {
    if (this.phase !== 'lobby') {
      return { ok: false, error: '对局中不可自由聊天，请使用表情或快捷语' };
    }
    const clean = String(text || '').trim().slice(0, 80);
    if (!clean) return { ok: false, error: '消息不能为空' };
    const seat = this.findSeatByPlayer(playerId);
    const watcher = this.findWatcher(playerId);
    if (!seat && !watcher) return { ok: false, error: '不在房间内' };
    const name = seat ? seat.player.name : watcher.name;
    const skin = seat ? seat.player.skin : watcher.skin;
    const team = seat ? seat.team : 'S';
    const item = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind: 'text',
      text: clean,
      free: true,
      playerId,
      uid: seat ? (seat.player.uid || null) : (watcher.uid || null),
      name,
      skin,
      team,
      at: Date.now(),
    };
    this.chatLog = [...this.chatLog.slice(-30), item];
    return { ok: true, chat: item };
  }

  /**
   * 观战/解说/座位弹幕：对局中可用，不进大厅自由聊天流
   */
  sendDanmaku(playerId, text) {
    if (!['playing', 'roundEnd'].includes(this.phase)) {
      return { ok: false, error: '当前阶段不能发弹幕' };
    }
    const clean = String(text || '').trim().slice(0, DANMAKU_MAX_LEN);
    if (!clean) return { ok: false, error: '弹幕不能为空' };
    const seat = this.findSeatByPlayer(playerId);
    const watcher = this.findWatcher(playerId);
    if (!seat && !watcher) return { ok: false, error: '不在房间内' };
    const last = this.danmakuCooldown.get(playerId) || 0;
    const now = Date.now();
    if (now - last < DANMAKU_COOLDOWN_MS) {
      const wait = Math.ceil((DANMAKU_COOLDOWN_MS - (now - last)) / 1000);
      return { ok: false, error: `弹幕冷却中（${wait}s）` };
    }
    this.danmakuCooldown.set(playerId, now);
    const name = seat ? seat.player.name : watcher.name;
    const skin = seat ? seat.player.skin : watcher.skin;
    const team = seat ? seat.team : 'S';
    const item = {
      id: `dm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind: 'danmaku',
      text: clean,
      playerId,
      uid: seat ? (seat.player.uid || null) : (watcher.uid || null),
      name,
      skin,
      team,
      at: now,
    };
    return { ok: true, danmaku: item };
  }

  giftItem(fromPlayerId, toPlayerId, item) {
    if (!['playing', 'roundEnd', 'seriesEnd', 'lobby'].includes(this.phase)) {
      return { ok: false, error: '当前阶段不能赠送' };
    }
    if (!ITEM_TYPES.includes(item)) return { ok: false, error: '未知物品' };
    if (!toPlayerId || toPlayerId === fromPlayerId) return { ok: false, error: '无效接收方' };

    const fromSeat = this.findSeatByPlayer(fromPlayerId);
    const fromWatcher = this.findWatcher(fromPlayerId);
    const toSeat = this.findSeatByPlayer(toPlayerId);
    const toWatcher = this.findWatcher(toPlayerId);
    if ((!fromSeat && !fromWatcher) || (!toSeat && !toWatcher)) {
      return { ok: false, error: '双方需都在房间内' };
    }

    const fromPlayer = fromSeat ? fromSeat.player : fromWatcher;
    const toPlayer = toSeat ? toSeat.player : toWatcher;
    const result = giftInventoryItem({
      fromId: fromPlayer.uid || null,
      fromName: fromPlayer.name,
      toId: toPlayer.uid || null,
      toName: toPlayer.name,
      item,
    });
    if (!result.ok) return result;

    fromPlayer.profile = result.fromProfile;
    toPlayer.profile = result.toProfile;

    const streakKey = `${fromPlayerId}->${toPlayerId}`;
    const now = Date.now();
    let streak = this.giftStreaks.get(streakKey) || { count: 0, lastAt: 0 };
    if (now - streak.lastAt <= 60000) streak.count += 1;
    else streak = { count: 1, lastAt: now };
    streak.lastAt = now;
    this.giftStreaks.set(streakKey, streak);

    const chat = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind: 'gift',
      item,
      itemLabel: ITEM_LABELS[item] || item,
      text: `赠送了 ${ITEM_LABELS[item] || item}`,
      playerId: fromPlayerId,
      uid: fromPlayer.uid || null,
      toPlayerId,
      name: fromPlayer.name,
      toName: toPlayer.name,
      skin: fromPlayer.skin,
      team: fromSeat ? fromSeat.team : 'S',
      at: Date.now(),
    };
    this.chatLog = [...this.chatLog.slice(-30), chat];
    let rumor = null;
    if (streak.count >= 3) {
      rumor = this.publishRumor({
        uid: fromPlayer.uid || null,
        name: fromPlayer.name,
        text: `【${this.code}】${fromPlayer.name} 向 ${toPlayer.name} 连送 ${streak.count} 份${ITEM_LABELS[item] || item}`,
        kind: 'gift_streak',
        roomCode: this.code,
      });
      this.giftStreaks.set(streakKey, { count: 0, lastAt: now });
    }
    return { ok: true, chat, fromProfile: result.fromProfile, toProfile: result.toProfile, rumor };
  }

  canStart() {
    if (this.fillBots) {
      const humans = this.seats.filter((s) => s.player && !s.player.bot);
      if (!humans.length) return false;
      return humans.every((s) => s.ready);
    }
    return this.seats.every((s) => s.player && s.ready);
  }

  fillEmptyWithBots() {
    const skins = ['blue', 'green', 'yellow', 'pink'];
    this.seats.forEach((seat, i) => {
      if (seat.player) {
        if (seat.player.bot) seat.ready = true;
        return;
      }
      const id = genId();
      this.addPlayerToSeat(i, {
        id,
        name: `人机${i + 1}`,
        skin: skins[i % skins.length],
        bot: true,
        online: true,
      });
      if (this.seats[i].player) this.seats[i].player.bot = true;
      this.seats[i].ready = true;
    });
  }

  setFillBots(playerId, enabled) {
    if (playerId !== this.hostId) return { ok: false, error: '仅房主可设置' };
    if (this.phase !== 'lobby') return { ok: false, error: '仅大厅可设置人机补位' };
    this.fillBots = !!enabled;
    return { ok: true, fillBots: this.fillBots };
  }

  setCelestial(playerId, enabled) {
    if (playerId !== this.hostId) return { ok: false, error: '仅房主可设置' };
    if (this.phase !== 'lobby') return { ok: false, error: '仅大厅可设置天象' };
    this.celestial = !!enabled;
    if (!this.celestial) {
      this.weather = null;
      this.event = null;
    }
    return { ok: true, celestial: this.celestial };
  }

  startGrudge(playerId) {
    if (this.phase !== 'lobby') return { ok: false, error: '仅大厅可发起了结' };
    const seat = this.findSeatByPlayer(playerId);
    if (!seat || !seat.player || !seat.player.uid) return { ok: false, error: '仅入座玩家可了结' };
    const seated = this.seats.filter((s) => s.player && s.player.uid);
    if (this.mode !== '1v1' || seated.length !== 2) {
      return { ok: false, error: '了结仅限 1v1 双人' };
    }
    const me = getProfileById(seat.player.uid, seat.player.name);
    const foe = seated.find((s) => s.player.uid !== seat.player.uid);
    if (!foe) return { ok: false, error: '找不到对手' };
    const rivalUid = me.rivals && me.rivals.uid;
    if (!rivalUid || rivalUid !== foe.player.uid) {
      return { ok: false, error: '对方还不是你的宿敌' };
    }
    this.grudgeMatch = true;
    this.grudgeVsUid = foe.player.uid;
    this.totalRounds = 3;
    this.pushSystemChat(`宿敌了结 · ${seat.player.name} 向 ${foe.player.name} 发起三番棋`);
    return { ok: true, totalRounds: 3, grudgeMatch: true };
  }

  isTideCell(r, c) {
    if (!this.event || this.event.kind !== 'tide') return false;
    if ((Number(this.event.turnsLeft) || 0) <= 0) return false;
    const size = this.engine && this.engine.SIZE;
    if (!size) return false;
    const margin = Math.max(1, Number(this.event.margin) || 1);
    return r < margin || c < margin || r >= size - margin || c >= size - margin;
  }

  pickEmptyCell(exclude) {
    if (!this.board || !this.engine) return null;
    const size = this.engine.SIZE;
    const skip = exclude ? `${exclude.r},${exclude.c}` : '';
    const empty = [];
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (this.board[r][c] !== 0) continue;
        if (skip && `${r},${c}` === skip) continue;
        if (this.isTideCell(r, c)) continue;
        empty.push({ r, c });
      }
    }
    if (!empty.length) return null;
    return empty[Math.floor(Math.random() * empty.length)];
  }

  rollBoardWeather() {
    this.weather = null;
    this.event = null;
    if (!this.celestial || !this.supportsBoardEvents()) return;
    const w = rollWeather(this.forcedWeather);
    this.weather = w;
    if (w.id === 'tide') {
      this.event = { kind: 'tide', margin: 1, turnsLeft: TIDE_TURNS };
    } else if (w.id === 'meteor') {
      const cell = this.pickEmptyCell();
      this.event = cell ? { kind: 'meteor', r: cell.r, c: cell.c } : { kind: 'meteor' };
    } else if (w.id === 'fogSpread') {
      this.event = { kind: 'fogSpread', n: FOG_SPREAD_N };
    }
  }

  clearSpiritForbidden() {
    this.forbiddenCells = (this.forbiddenCells || []).filter((p) => p.source !== 'spirit');
  }

  applySpiritEffect() {
    const sp = this.spirit;
    if (!sp || !this.board) return;
    this.clearSpiritForbidden();
    const cell = this.board[sp.r] && this.board[sp.r][sp.c];
    const owner = sp.ownerColor || 1;
    if (this.gameType === 'reversi') {
      if (cell && cell !== owner) {
        this.board[sp.r][sp.c] = owner;
        sp.nibble = { r: sp.r, c: sp.c, from: cell, to: owner };
        this.lastEffects = {
          ...(this.lastEffects || {}),
          flipped: [...((this.lastEffects && this.lastEffects.flipped) || []), { r: sp.r, c: sp.c }],
          spiritNibble: { r: sp.r, c: sp.c, color: owner },
        };
      }
      return;
    }
    if (this.gameType === 'gomoku') {
      if (cell) {
        sp.bounced = true;
        return;
      }
      this.forbiddenCells = [
        ...(this.forbiddenCells || []),
        { r: sp.r, c: sp.c, againstColor: 1, source: 'spirit', turnsLeft: 2 },
        { r: sp.r, c: sp.c, againstColor: 2, source: 'spirit', turnsLeft: 2 },
      ];
    }
  }

  tickSpirit(ownerColor) {
    if (!this.supportsSpirit() || this.phase !== 'playing' || !this.board) return;
    const size = this.engine.SIZE;
    if (!this.spirit) {
      const placed = this.history.filter((h) => h.move && !h.move.pass && h.move.r != null).length;
      if (placed < SPIRIT_SPAWN_AFTER) return;
      const cell = this.pickEmptyCell();
      if (!cell) return;
      this.spirit = {
        r: cell.r,
        c: cell.c,
        prevR: cell.r,
        prevC: cell.c,
        ownerColor: ownerColor || this.turnColor,
        at: Date.now(),
      };
      this.applySpiritEffect();
      return;
    }
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const shuffled = dirs.slice().sort(() => Math.random() - 0.5);
    let dest = null;
    for (const [dr, dc] of shuffled) {
      const nr = this.spirit.r + dr;
      const nc = this.spirit.c + dc;
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      if (this.gameType === 'gomoku' && this.board[nr][nc]) continue;
      dest = { r: nr, c: nc };
      break;
    }
    if (!dest) {
      this.spirit.ownerColor = ownerColor || this.spirit.ownerColor;
      this.applySpiritEffect();
      return;
    }
    this.spirit.prevR = this.spirit.r;
    this.spirit.prevC = this.spirit.c;
    this.spirit.r = dest.r;
    this.spirit.c = dest.c;
    this.spirit.ownerColor = ownerColor || this.spirit.ownerColor;
    this.spirit.at = Date.now();
    this.spirit.nibble = null;
    this.spirit.bounced = false;
    this.applySpiritEffect();
  }

  start(playerId) {
    if (playerId !== this.hostId) return { ok: false, error: '仅房主可开局' };
    if (this.fillBots) this.fillEmptyWithBots();
    if (!this.canStart()) return { ok: false, error: this.fillBots ? '仍有真人未准备' : '仍有座位未准备' };
    if (this.gameType === 'flying') {
      this.seriesScore = {};
      this.seats.forEach((s) => {
        this.seriesScore[s.color] = 0;
      });
    } else {
      this.seriesScore = { black: 0, white: 0 };
    }
    this.roundResults = [];
    this.currentRound = 0;
    this.recentEmotes = [];
    this.truth = null;
    this.clearRematch();
    return this.beginRound();
  }

  beginRound() {
    this.coachHint = null;
    this.settleHint = '';
    this.truth = null;
    this.currentRound += 1;
    if (this.gameType === 'flying') {
      this.engine = makeEngine(this.gameType, this.boardScale, { seatCount: this.seats.length });
    } else if (this.isGoTeam()) {
      this.engine = makeEngine(this.gameType, this.boardScale, { allied: true });
    }
    this.board = this.engine.createBoard();
    this.turnColor = 1;
    this.turnSeatIndex = 0;
    this.history = [];
    this.winner = null;
    this.phase = 'playing';
    this.passCount = 0;
    this.prevBoardHash = null;
    this.aidRequest = null;
    this.draughtsContinue = null;
    this.nextTurnTimeCapMs = null;
    this.lastMove = null;
    this.lastEffects = null;
    if (this.board && typeof this.board === 'object' && !Array.isArray(this.board)) {
      this.board.lastDice = null;
      this.board.dice = null;
      this.board.rolled = false;
    }
    this.komi = 0;
    this.captureBonus = { 1: 0, 2: 0 };
    this.forbiddenCells = [];
    this.fogHidden = null;
    this.protectedCells = [];
    this.shields = {};
    this.spirit = null;
    this.extraTimeForColor = null;
    this.rollBoardWeather();
    this.seats.forEach((seat) => {
      seat.undoLeft = 1;
      if (this.mode === 'props') {
        seat.props = starterProps(this.gameType);
      }
    });
    this.armTimer();
    if (this.weather) {
      this.pushSystemChat(`本局天象：${this.weather.icon || ''} ${this.weather.label}`);
    }
    return { ok: true };
  }

  nextRound(playerId) {
    if (this.phase !== 'roundEnd') return { ok: false, error: '当前不能进入下一局' };
    if (playerId !== this.hostId) return { ok: false, error: '仅房主可开下一局' };
    if (this.currentRound >= this.totalRounds) return { ok: false, error: '系列赛已结束' };
    this.recentEmotes = [];
    return this.beginRound();
  }

  finishRound(winner, extra = {}) {
    this.winner = winner;
    this.turnDeadline = null;
    if (this.gameType === 'flying') {
      if (winner && this.seriesScore && this.seriesScore[winner] != null) {
        this.seriesScore[winner] += 1;
      }
    } else if (winner === 1) this.seriesScore.black += 1;
    else if (winner === 2) this.seriesScore.white += 1;
    this.roundResults.push({
      round: this.currentRound,
      winner,
      moves: this.history.length,
      ...extra,
    });
    if (extra.forceQuit) {
      this.settleHint = `${extra.quitName || '对方'} 强制退出，你方获胜，对方本模式记两负`;
    } else if (extra.resigned) {
      this.settleHint = `${extra.quitName || '对方'} 认输`;
    } else {
      this.settleHint = extra.reason === 'leave' ? '对方离开对局，本局结束' : '';
    }
    const seated = this.seats.filter((s) => s.player);
    for (const seat of seated) {
      if (!seat.player) continue;
      let outcome = 'draw';
      if (winner) {
        outcome = this.colorTeam(seat.color) === winner ? 'win' : 'loss';
      }
      const penaltyTimes = (extra.forceQuit && extra.quitPlayerId === seat.player.id && outcome === 'loss') ? 2 : 1;
      let merged = null;
      let rankChange = null;
      let lastRewards = null;
      let dailyJust = [];
      const foes = seated
        .filter((s) => s.player && s.color !== seat.color)
        .map((s) => s.player);
      const opp = foes[0] || seated.find((s) => s.player && s.player.id !== seat.player.id)?.player;
      for (let n = 0; n < penaltyTimes; n += 1) {
        merged = recordOutcome(seat.player.name, outcome, {
          id: seat.player.uid || null,
          gameType: this.gameType,
        });
        const gift = merged && merged.mentorGift;
        if (gift) {
          this.pushSystemChat(`${gift.fromName} 晋级，师傅 ${gift.toName} 获得蛋糕`);
        }
        if (merged && merged.rankChange) rankChange = merged.rankChange;
        if (merged && merged.lastRewards) lastRewards = merged.lastRewards;
        if (seat.player.uid) {
          try {
            merged = recordDailyGame({
              id: seat.player.uid,
              name: seat.player.name,
              won: outcome === 'win',
            });
            dailyJust = (merged && merged.dailyTaskJustCompleted) || dailyJust;
          } catch {
            /* ignore daily task errors */
          }
        }
        if (opp) {
          try {
            merged = recordRecentMatch({
              id: seat.player.uid || null,
              name: seat.player.name,
              outcome,
              opponent: {
                id: opp.uid || opp.id,
                uid: opp.uid || null,
                name: opp.name,
              },
              gameType: this.gameType,
              mode: this.mode,
              boardScale: this.boardScale,
              totalRounds: this.totalRounds,
              turnMs: this.turnMs,
            });
          } catch {
            /* ignore recent match errors */
          }
        }
      }
      if (
        this.mode === '1v1'
        && this.seats.length === 2
        && outcome === 'win'
        && seat.player.uid
        && opp
        && opp.uid
      ) {
        try {
          const vs = recordVsOutcome({
            uid: seat.player.uid,
            name: seat.player.name,
            oppUid: opp.uid,
            oppName: opp.name,
            outcome,
          });
          if (vs && vs.unlocked) {
            this.pushSystemChat(`${seat.player.name} 与 ${opp.name} 结成宿敌`);
          }
        } catch {
          /* ignore rival errors */
        }
      }
      seat.player.profile = {
        ...merged,
        rankChange: rankChange || null,
        lastRewards: lastRewards || null,
        dailyTaskJustCompleted: dailyJust,
      };
    }
    if (this.shouldStartTruth(winner, extra)) {
      this.openTruth(winner);
      return;
    }
    this.enterPostRound(extra);
  }

  shouldStartTruth(winner, extra) {
    if (!this.isYoujin()) return false;
    if (extra && extra.forceQuit) return false;
    return winner === 1 || winner === 2;
  }

  enterPostRound(extra = {}) {
    if (extra.endSeries || this.currentRound >= this.totalRounds) {
      this.phase = 'seriesEnd';
      this.applyFriendshipStake();
      if (this.grudgeMatch) {
        const pair = this.seats.filter((s) => s.player && s.player.uid);
        if (pair.length === 2) {
          try {
            resetRivalry({
              uid: pair[0].player.uid,
              name: pair[0].player.name,
              oppUid: pair[1].player.uid,
            });
            this.pushSystemChat('了结结束，宿敌连胜已重置');
          } catch {
            /* ignore */
          }
        }
        this.grudgeMatch = false;
        this.grudgeVsUid = '';
      }
      this.openRematchVote();
    } else {
      this.phase = 'roundEnd';
      this.clearRematch();
    }
  }

  openTruth(winnerColor) {
    const winners = this.seats.filter((s) => s.player && this.colorTeam(s.color) === winnerColor);
    const losers = this.seats.filter((s) => s.player && this.colorTeam(s.color) !== winnerColor);
    const winner = winners[0] && winners[0].player;
    const loser = losers[0] && losers[0].player;
    if (!winner || !loser) {
      this.enterPostRound({});
      return;
    }
    const choices = pickTruthChoices(3);
    this.truth = {
      round: this.currentRound,
      stage: 'pick',
      winnerId: winner.id,
      loserId: loser.id,
      winnerUid: winner.uid || null,
      loserUid: loser.uid || null,
      winnerName: winner.name,
      loserName: loser.name,
      choices,
      question: '',
      questionSource: '',
      answer: '',
      deadline: Date.now() + TRUTH_PICK_MS,
      penalty: null,
    };
    this.phase = 'truth';
    this.clearRematch();
    this.pushSystemChat(`友尽赛真心话：${winner.name} 出题，${loser.name} 作答，拒答扣 ${TRUTH_PENALTY} 件背包`);
    if (winner.bot) {
      this.applyTruthQuestion(choices[0], 'random');
      this.pushSystemChat('人机随机出题');
    }
  }

  applyTruthQuestion(text, source) {
    if (!this.truth || this.phase !== 'truth' || this.truth.stage !== 'pick') {
      return { ok: false, error: '当前不能出题' };
    }
    const question = sanitizeTruthText(text, 40);
    if (!question) return { ok: false, error: '题目不能为空' };
    this.truth.question = question;
    this.truth.questionSource = source === 'custom' ? 'custom' : 'random';
    this.truth.stage = 'answer';
    this.truth.deadline = Date.now() + TRUTH_ANSWER_MS;
    const loserSeat = this.findSeatByPlayer(this.truth.loserId);
    if (loserSeat && loserSeat.player && loserSeat.player.bot) {
      this.succeedTruth('人机选择坦白：刚才那局我尽力了');
    }
    return { ok: true };
  }

  truthPick(playerId, index) {
    if (!this.truth || this.phase !== 'truth' || this.truth.stage !== 'pick') {
      return { ok: false, error: '当前不能选题' };
    }
    if (playerId !== this.truth.winnerId) return { ok: false, error: '仅赢家可出题' };
    const choices = this.truth.choices || [];
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= choices.length) {
      return { ok: false, error: '无效题目' };
    }
    return this.applyTruthQuestion(choices[i], 'random');
  }

  truthAsk(playerId, text) {
    if (!this.truth || this.phase !== 'truth' || this.truth.stage !== 'pick') {
      return { ok: false, error: '当前不能出题' };
    }
    if (playerId !== this.truth.winnerId) return { ok: false, error: '仅赢家可出题' };
    return this.applyTruthQuestion(text, 'custom');
  }

  truthAnswer(playerId, text) {
    if (!this.truth || this.phase !== 'truth' || this.truth.stage !== 'answer') {
      return { ok: false, error: '当前不能作答' };
    }
    if (playerId !== this.truth.loserId) return { ok: false, error: '仅输家可作答' };
    const answer = sanitizeTruthText(text, 80);
    if (!answer) return { ok: false, error: '回答不能为空' };
    this.succeedTruth(answer);
    return { ok: true };
  }

  truthRefuse(playerId) {
    if (!this.truth || this.phase !== 'truth' || this.truth.stage === 'done') {
      return { ok: false, error: '当前不能拒绝' };
    }
    if (playerId !== this.truth.loserId) return { ok: false, error: '仅输家可拒绝' };
    this.failTruth('拒绝作答');
    return { ok: true };
  }

  succeedTruth(answer) {
    if (!this.truth) return;
    this.truth.answer = sanitizeTruthText(answer, 80);
    this.truth.stage = 'done';
    this.truth.penalty = null;
    this.truth.deadline = null;
    this.pushSystemChat(`${this.truth.loserName} 回答：${this.truth.answer}`);
    this.enterPostRound({});
  }

  failTruth(reason) {
    if (!this.truth || this.truth.stage === 'done') return;
    const penalty = this.applyTruthPenalty();
    this.truth.stage = 'done';
    this.truth.penalty = penalty;
    this.truth.deadline = null;
    const n = (penalty.taken || []).length;
    if (n > 0) {
      const labels = penalty.taken.map((id) => ITEM_LABELS[id] || id).join('、');
      this.pushSystemChat(`${this.truth.loserName} ${reason}，扣除 ${labels}`);
    } else {
      this.pushSystemChat(`${this.truth.loserName} ${reason}，背包已空，未扣物品`);
    }
    this.enterPostRound({});
  }

  applyTruthPenalty() {
    const empty = { taken: [], shortfall: TRUTH_PENALTY };
    if (!this.truth) return empty;
    const seat = this.findSeatByPlayer(this.truth.loserId);
    const player = seat && seat.player;
    if (!player || player.bot) return empty;
    try {
      const result = takeAnyItems({
        id: player.uid || this.truth.loserUid || null,
        name: player.name,
        count: TRUTH_PENALTY,
      });
      if (!result.ok) return empty;
      if (result.profile) player.profile = result.profile;
      return { taken: result.taken || [], shortfall: result.shortfall || 0 };
    } catch {
      return empty;
    }
  }

  checkTruthTimeout() {
    if (this.phase !== 'truth' || !this.truth || this.truth.stage === 'done') return false;
    if (!this.truth.deadline || Date.now() < this.truth.deadline) return false;
    if (this.truth.stage === 'pick') {
      const q = (this.truth.choices && this.truth.choices[0]) || TRUTH_BANK[0];
      this.applyTruthQuestion(q, 'random');
      this.pushSystemChat('出题超时，系统随机选题');
      return true;
    }
    if (this.truth.stage === 'answer') {
      this.failTruth('超时未答');
      return true;
    }
    return false;
  }

  pushSystemChat(text) {
    const chat = {
      id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind: 'system',
      text: String(text || '').slice(0, 80),
      playerId: '',
      uid: null,
      name: '系统',
      skin: 'blue',
      team: 'S',
      at: Date.now(),
    };
    this.chatLog = [...this.chatLog.slice(-30), chat];
    return chat;
  }

  activeSocialBuffs() {
    const now = Date.now();
    this.socialBuffs = (this.socialBuffs || []).filter((b) => b && b.until > now);
    return this.socialBuffs.map((b) => ({
      id: b.id,
      kind: b.kind,
      label: b.label,
      icon: b.icon || '',
      fromName: b.fromName || '',
      until: b.until,
    }));
  }

  jobCooldownsFor(playerId) {
    const raw = this.jobCooldowns.get(playerId) || {};
    const now = Date.now();
    const out = {};
    const seat = this.findSeatByPlayer(playerId);
    Object.keys(social.JOB_COOLDOWN_MS).forEach((job) => {
      const power = this.seatJobPower(seat, job);
      const until = (Number(raw[job]) || 0) + power.cooldownMs;
      if (until > now) out[job] = until;
    });
    return out;
  }

  seatJobPower(seat, jobId) {
    const job = social.normalizeJob(jobId || (seat && seat.job));
    let level = 1;
    const player = seat && seat.player;
    if (job && player && player.uid) {
      try {
        const profile = getProfileById(player.uid, player.name);
        const levels = social.normalizeJobLevels(profile && profile.jobLevels);
        level = levels[job] || 1;
      } catch {
        level = 1;
      }
    }
    return social.jobPower(job || 'chef', level);
  }

  touchJobCooldown(playerId, job) {
    const cur = { ...(this.jobCooldowns.get(playerId) || {}) };
    cur[job] = Date.now();
    this.jobCooldowns.set(playerId, cur);
  }

  checkJobCooldown(playerId, job) {
    const raw = this.jobCooldowns.get(playerId) || {};
    const seat = this.findSeatByPlayer(playerId);
    const power = this.seatJobPower(seat, job);
    const until = (Number(raw[job]) || 0) + power.cooldownMs;
    const now = Date.now();
    if (until > now) {
      return { ok: false, error: `技能冷却中（${Math.ceil((until - now) / 1000)}秒）` };
    }
    return { ok: true };
  }

  publishRumor({ uid, name, text, kind, roomCode }) {
    const entry = {
      id: social.rumorId(),
      text: String(text || '').trim().slice(0, 80),
      kind: String(kind || 'story').slice(0, 24),
      at: Date.now(),
      name: String(name || '').slice(0, 12),
      uid: uid || '',
      roomCode: roomCode || this.code,
    };
    if (!entry.text) return null;
    appendWorldRumor({
      text: entry.text,
      kind: entry.kind,
      uid: entry.uid,
      name: entry.name,
      roomCode: entry.roomCode,
    });
    if (entry.uid) {
      appendLore({ id: entry.uid, name: entry.name, text: entry.text, kind: entry.kind });
    }
    this.roomLore = [entry, ...(this.roomLore || [])].slice(0, social.LORE_MAX);
    return entry;
  }

  touchGarden(amount) {
    const g = social.normalizeGarden(this.garden);
    g.growth = Math.min(social.GARDEN_BLOOM, g.growth + Math.max(0, Number(amount) || 0));
    g.lastWaterAt = Date.now();
    let bloomed = false;
    if (g.growth >= social.GARDEN_BLOOM) {
      g.growth -= social.GARDEN_BLOOM;
      g.bloomCount += 1;
      bloomed = true;
    }
    this.garden = g;
    return { garden: g, bloomed };
  }

  setSeatJob(playerId, jobId) {
    if (!['lobby', 'playing', 'roundEnd', 'seriesEnd'].includes(this.phase)) {
      return { ok: false, error: '当前不可更换职业' };
    }
    const seat = this.findSeatByPlayer(playerId);
    if (!seat || !seat.player) return { ok: false, error: '仅入座玩家可选职业' };
    const job = social.normalizeJob(jobId);
    if (jobId && !job) return { ok: false, error: '未知职业' };
    seat.job = job;
    if (seat.player.uid) {
      persistPrefs({ id: seat.player.uid, name: seat.player.name, jobPref: job });
    }
    return { ok: true, job };
  }

  useJob(playerId) {
    const seat = this.findSeatByPlayer(playerId);
    if (!seat || !seat.player) return { ok: false, error: '仅入座玩家可发动技能' };
    const job = social.normalizeJob(seat.job);
    if (!job) return { ok: false, error: '请先选择席位职业' };
    const cd = this.checkJobCooldown(playerId, job);
    if (!cd.ok) return cd;

    const name = seat.player.name;
    const uid = seat.player.uid || null;
    const power = this.seatJobPower(seat, job);
    let rumor = null;
    let chat = null;

    if (job === 'chef') {
      const now = Date.now();
      this.activeSocialBuffs();
      this.socialBuffs.push({
        id: social.rumorId(),
        kind: 'treat',
        label: '暖心点心',
        icon: '🍪',
        fromName: name,
        until: now + power.treatMs,
      });
      chat = this.pushSystemChat(`${name} 分发暖心点心（${Math.round(power.treatMs / 1000)} 秒氛围加成，不影响棋局）`);
    } else if (job === 'spy') {
      if (this.phase !== 'playing') return { ok: false, error: '间谍仅在对局中可偷看上一手' };
      if (!this.lastMove) return { ok: false, error: '暂无落子可偷看' };
      const until = Date.now() + power.peekMs;
      this.spyPeeks.set(playerId, { move: { ...this.lastMove }, until });
      chat = this.pushSystemChat(`${name} 启动间谍窥视（${Math.round(power.peekMs / 1000)} 秒）`);
    } else if (job === 'gardener') {
      const { garden, bloomed } = this.touchGarden(power.water);
      chat = this.pushSystemChat(`${name} 浇灌庭院 +${power.water}（${garden.growth}/${social.GARDEN_BLOOM}）`);
      if (bloomed) {
        rumor = this.publishRumor({
          uid,
          name,
          text: `【${this.code}】庭院开花啦，已绽放 ${garden.bloomCount} 次`,
          kind: 'garden_bloom',
          roomCode: this.code,
        });
      }
    } else if (job === 'archaeologist') {
      const sources = [];
      (this.chatLog || []).slice(-20).forEach((c) => {
        if (!c || !c.text) return;
        if (c.kind === 'gift') {
          sources.push(`${c.name} ${c.text}`);
        } else if (c.kind === 'text' || c.kind === 'quick') {
          sources.push(`${c.name}：${c.text}`);
        } else if (c.kind === 'system') {
          sources.push(c.text);
        }
      });
      (this.history || []).slice(-12).forEach((h) => {
        if (h && h.move) sources.push(social.formatMoveHint(h.move));
      });
      if (!sources.length) return { ok: false, error: '本房暂无可挖掘的聊天/礼物/落子记录' };
      const pick = sources[Math.floor(Math.random() * sources.length)];
      const text = `【${this.code}】${name} 挖出传闻：${pick}`;
      rumor = this.publishRumor({
        uid,
        name,
        text,
        kind: 'archaeologist',
        roomCode: this.code,
      });
      chat = this.pushSystemChat(`${name} 发布档案传闻`);
    }

    this.touchJobCooldown(playerId, job);
    return {
      ok: true,
      job,
      chat,
      rumor,
      garden: social.normalizeGarden(this.garden),
      socialBuffs: this.activeSocialBuffs(),
    };
  }

  seatedHumans() {
    return this.seats.filter((s) => s.player && !s.player.bot);
  }

  clearRematch() {
    this.rematchOpen = false;
    this.rematchVotes = {};
    this.rematchDeadline = null;
  }

  openRematchVote() {
    this.rematchOpen = true;
    this.rematchVotes = {};
    this.rematchDeadline = Date.now() + REMATCH_MS;
  }

  resetSeriesForLobby() {
    this.currentRound = 0;
    this.roundResults = [];
    this.winner = null;
    this.board = null;
    this.turnDeadline = null;
    this.history = [];
    this.lastMove = null;
    this.lastEffects = null;
    this.aidRequest = null;
    this.coachHint = null;
    if (this.gameType === 'flying') {
      this.seriesScore = {};
      this.seats.forEach((s) => {
        this.seriesScore[s.color] = 0;
      });
    } else {
      this.seriesScore = { black: 0, white: 0 };
    }
    this.seats.forEach((s) => {
      s.ready = !!(s.player && s.player.bot);
    });
  }

  returnToLobby() {
    this.clearRematch();
    this.phase = 'lobby';
    this.resetSeriesForLobby();
    return { ok: true, lobby: true };
  }

  checkRematchTimeout() {
    if (!this.rematchOpen || this.phase !== 'seriesEnd') return false;
    if (!this.rematchDeadline || Date.now() < this.rematchDeadline) return false;
    this.returnToLobby();
    this.pushSystemChat('再来一局已超时，回到房间大厅');
    return true;
  }

  startRematch() {
    if (this.phase !== 'seriesEnd') return { ok: false, error: '当前不能再来一局' };
    this.clearRematch();
    this.resetSeriesForLobby();
    this.seats.forEach((s) => {
      if (s.player) s.ready = true;
    });
    this.recentEmotes = [];
    return this.beginRound();
  }

  rematchVote(playerId, accept) {
    if (this.checkRematchTimeout()) return { ok: true, lobby: true, timeout: true };
    if (this.phase !== 'seriesEnd' || !this.rematchOpen) {
      return { ok: false, error: '当前不能投票再来一局' };
    }
    const seat = this.findSeatByPlayer(playerId);
    if (!seat || !seat.player) return { ok: false, error: '仅入座玩家可投票' };
    if (seat.player.bot) return { ok: false, error: '人机无需投票' };
    if (!accept) {
      this.returnToLobby();
      this.pushSystemChat(`${seat.player.name} 拒绝再来一局，回到大厅`);
      return { ok: true, lobby: true };
    }
    this.rematchVotes[playerId] = true;
    const humans = this.seatedHumans();
    const allYes = humans.every((s) => this.rematchVotes[s.player.id]);
    if (playerId === this.hostId || allYes) {
      const started = this.startRematch();
      if (!started.ok) return started;
      return { ok: true, started: true };
    }
    return { ok: true, voted: true };
  }

  applyFriendshipStake() {
    const item = this.friendshipStake;
    if (!item || !ITEM_TYPES.includes(item)) return [];
    const winnerColor = this.winner;
    if (winnerColor !== 1 && winnerColor !== 2 && this.gameType !== 'flying') return [];
    if (this.gameType === 'flying' && !winnerColor) return [];
    const winners = this.seats.filter((s) => s.player && !s.player.bot && this.colorTeam(s.color) === winnerColor);
    const losers = this.seats.filter((s) => s.player && !s.player.bot && this.colorTeam(s.color) !== winnerColor);
    if (!winners.length || !losers.length) return [];
    const chats = [];
    const label = ITEM_LABELS[item] || item;
    losers.forEach((loserSeat, i) => {
      const winnerSeat = winners[i % winners.length];
      const from = loserSeat.player;
      const to = winnerSeat.player;
      const result = giftInventoryItem({
        fromId: from.uid || null,
        fromName: from.name,
        toId: to.uid || null,
        toName: to.name,
        item,
      });
      if (!result.ok) {
        chats.push(this.pushSystemChat(`${from.name} 背包没有${label}，友谊赌注跳过`));
        return;
      }
      from.profile = result.fromProfile;
      to.profile = result.toProfile;
      const chat = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        kind: 'gift',
        item,
        itemLabel: label,
        text: `友谊赌注赠送了 ${label}`,
        playerId: from.id,
        uid: from.uid || null,
        toPlayerId: to.id,
        name: from.name,
        toName: to.name,
        skin: from.skin,
        team: loserSeat.team,
        at: Date.now(),
        stake: true,
      };
      this.chatLog = [...this.chatLog.slice(-30), chat];
      chats.push(chat);
    });
    return chats;
  }

  coachSuggest(playerId, r, c) {
    if (this.phase !== 'playing') return { ok: false, error: '仅对局中可建议' };
    if (this.findCommentator(playerId)) return { ok: false, error: '解说席不能建议一手' };
    const spec = this.findSpectator(playerId);
    if (!spec) return { ok: false, error: '仅观战席可建议一手' };
    if (this.aidRequest) return { ok: false, error: '外援代下时不能建议' };
    const rr = Number(r);
    const cc = Number(c);
    if (!Number.isInteger(rr) || !Number.isInteger(cc) || rr < 0 || cc < 0) {
      return { ok: false, error: '无效坐标' };
    }
    const size = this.engine && this.engine.SIZE;
    if (size && (rr >= size || cc >= size)) return { ok: false, error: '超出棋盘' };
    const turn = this.currentSeat();
    const mentorHint = !!(
      spec.uid
      && turn
      && turn.player
      && turn.player.uid
      && isMentorOf(spec.uid, turn.player.uid)
    );
    const now = Date.now();
    const last = this.coachCooldown.get(playerId) || 0;
    const cd = mentorHint ? MENTOR_COACH_COOLDOWN_MS : COACH_COOLDOWN_MS;
    if (now - last < cd) {
      return { ok: false, error: '建议太频繁，请稍候' };
    }
    this.coachCooldown.set(playerId, now);
    const hint = {
      r: rr,
      c: cc,
      fromName: spec.name,
      fromId: playerId,
      fromMentor: mentorHint,
      at: now,
    };
    this.coachHint = hint;
    return { ok: true, hint };
  }

  sendEmote(playerId, emote) {
    if (!ALLOWED_EMOTES.includes(emote)) return { ok: false, error: '未知表情' };
    if (!['lobby', 'playing', 'roundEnd', 'seriesEnd'].includes(this.phase)) {
      return { ok: false, error: '当前阶段不能发表情' };
    }
    const seat = this.findSeatByPlayer(playerId);
    const watcher = this.findWatcher(playerId);
    if (!seat && !watcher) return { ok: false, error: '不在房间内' };
    const name = seat ? seat.player.name : watcher.name;
    const skin = seat ? seat.player.skin : watcher.skin;
    const team = seat ? seat.team : 'S';
    const item = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind: 'emote',
      emote,
      playerId,
      uid: seat ? (seat.player.uid || null) : (watcher.uid || null),
      name,
      skin,
      team,
      at: Date.now(),
    };
    this.recentEmotes = [...this.recentEmotes.slice(-20), item];
    this.chatLog = [...this.chatLog.slice(-30), item];
    return { ok: true, emote: item, chat: item };
  }

  sendQuickText(playerId, textId) {
    if (!['playing', 'roundEnd', 'seriesEnd'].includes(this.phase)) {
      return { ok: false, error: '当前阶段不能发消息' };
    }
    const seat = this.findSeatByPlayer(playerId);
    const watcher = this.findWatcher(playerId);
    if (!seat && !watcher) return { ok: false, error: '不在房间内' };
    const person = seat ? seat.player : watcher;
    let custom = [];
    if (person.uid) {
      const p = getProfileById(person.uid, person.name);
      custom = (p && p.quickChats) || [];
    } else if (person.profile && person.profile.quickChats) {
      custom = person.profile.quickChats;
    }
    const resolved = resolveQuickText(textId, custom);
    if (!resolved) return { ok: false, error: '未知快捷语' };
    const name = person.name;
    const skin = person.skin;
    const team = seat ? seat.team : 'S';
    const item = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind: 'text',
      textId: resolved.id,
      text: resolved.text,
      playerId,
      uid: person.uid || null,
      name,
      skin,
      team,
      at: Date.now(),
    };
    this.chatLog = [...this.chatLog.slice(-30), item];
    return { ok: true, chat: item };
  }

  teamNames() {
    if (this.gameType === 'flying') {
      const names = {};
      this.seats.forEach((s) => {
        names[s.color] = (s.player && s.player.name) || `${FLYING_COLORS[s.color] || s.color}方`;
      });
      return names;
    }
    const black = this.seats.filter((s) => this.colorTeam(s.color) === 1 && s.player).map((s) => s.player.name);
    const white = this.seats.filter((s) => this.colorTeam(s.color) === 2 && s.player).map((s) => s.player.name);
    return {
      black: black.length ? black.join(' / ') : '黑方',
      white: white.length ? white.join(' / ') : '白方',
    };
  }

  currentSeat() {
    return this.seats[this.turnSeatIndex];
  }

  armTimer() {
    let cap = this.nextTurnTimeCapMs || this.turnMs || TURN_MS;
    this.nextTurnTimeCapMs = null;
    const seat = this.currentSeat();
    if (this.extraTimeForColor && seat && seat.color === this.extraTimeForColor.color) {
      cap += this.extraTimeForColor.ms;
      this.extraTimeForColor = null;
    }
    this.turnDeadline = Date.now() + cap;
  }

  setBoardTheme(playerId, themeId) {
    const seat = this.findSeatByPlayer(playerId);
    const watcher = this.findWatcher(playerId);
    if (!seat && !watcher) return { ok: false, error: '不在房间内' };
    if (BOARD_THEME_LOCKED.has(this.gameType)) {
      return { ok: false, error: '当前棋类不可更换棋盘背景' };
    }
    const id = BOARD_THEME_IDS.includes(themeId) ? themeId : '';
    if (!id) return { ok: false, error: '未知棋盘背景' };
    const now = Date.now();
    if (this.boardThemeAt && now - this.boardThemeAt < BOARD_THEME_COOLDOWN_MS) {
      return { ok: false, error: '请稍后再换' };
    }
    this.boardTheme = id;
    this.boardThemeAt = now;
    return { ok: true, boardTheme: id, cooldownMs: BOARD_THEME_COOLDOWN_MS };
  }

  rollDice(playerId) {
    const turnCheck = this.assertTurn(playerId, false);
    if (!turnCheck.ok) return turnCheck;
    if (this.gameType !== 'flying') return { ok: false, error: '当前模式不能掷骰' };
    if (!this.board) return { ok: false, error: '对局未开始' };
    if (this.board.rolled) return { ok: false, error: '已经掷过，请选择飞机' };
    const rolled = this.engine.roll(this.board);
    this.board = rolled.board;
    this.lastMove = { color: this.turnColor, dice: rolled.dice, roll: true };
    this.lastEffects = { kind: 'dice', dice: rolled.dice, at: Date.now() };
    const stuck = this.engine.skipIfStuck(this.board, this.turnColor);
    if (stuck.ok) {
      this.board = stuck.board;
      this.lastMove = {
        color: this.turnColor,
        dice: stuck.dice,
        roll: true,
        stuck: true,
      };
      this.lastEffects = {
        kind: 'dice',
        dice: stuck.dice,
        stuck: true,
        at: Date.now(),
      };
      if (stuck.extraTurn) this.armTimer();
      else this.advanceTurn();
    }
    return { ok: true, dice: rolled.dice, stuck: !!stuck.ok };
  }

  advanceTurn() {
    this.draughtsContinue = null;
    const n = this.seats.length;
    this.turnSeatIndex = (this.turnSeatIndex + 1) % n;
    this.turnColor = this.seats[this.turnSeatIndex].color;
    this.armTimer();
  }

  publicState(forPlayerId) {
    const names = this.teamNames();
    const youSeat = this.findSeatByPlayer(forPlayerId);
    const youSpec = this.findSpectator(forPlayerId);
    const youPerson = (youSeat && youSeat.player) || youSpec || this.findCommentator(forPlayerId);
    const hideFog = !!(
      this.fogHidden
      && youSeat
      && youSeat.color === this.fogHidden.hideFromColor
    );
    const fogSpreadOn = !!(this.weather && this.weather.id === 'fogSpread' && youSeat);
    let board = this.board;
    let lastMove = this.lastMove;
    const cloneViewBoard = () => {
      try {
        return this.engine.cloneBoard(this.board);
      } catch {
        return JSON.parse(JSON.stringify(this.board));
      }
    };
    if ((hideFog || fogSpreadOn) && board) {
      board = cloneViewBoard();
      if (hideFog && this.fogHidden
        && board[this.fogHidden.r]
        && board[this.fogHidden.r][this.fogHidden.c] === this.fogHidden.color) {
        board[this.fogHidden.r][this.fogHidden.c] = 0;
        lastMove = null;
      }
      if (fogSpreadOn) {
        const n = (this.event && this.event.n) || FOG_SPREAD_N;
        const moves = this.history
          .map((h) => h.move)
          .filter((m) => m && !m.pass && m.r != null && this.colorTeam(m.color) !== this.colorTeam(youSeat.color))
          .slice(-n);
        moves.forEach((m) => {
          if (board[m.r] && board[m.r][m.c] === m.color) board[m.r][m.c] = 0;
        });
        if (lastMove && lastMove.r != null && this.colorTeam(lastMove.color) !== this.colorTeam(youSeat.color)) {
          lastMove = null;
        }
      }
    }
    const youUid = youPerson && youPerson.uid;
    const youProfile = youUid ? getProfileById(youUid, youPerson.name || '') : null;
    const rivalUid = youProfile && youProfile.rivals && youProfile.rivals.uid;
    const rivalInRoom = !!(rivalUid && this.seats.some((s) => s.player && s.player.uid === rivalUid));
    const turn = this.currentSeat();
    let mentorCoaching = null;
    if (this.phase === 'playing' && turn && turn.player && turn.player.uid) {
      const specMentor = this.spectators.find((s) => s.uid && isMentorOf(s.uid, turn.player.uid));
      if (specMentor) {
        mentorCoaching = { name: specMentor.name, uid: specMentor.uid };
      }
    }
    return {
      code: this.code,
      gameType: this.gameType,
      mode: this.mode,
      phase: this.phase,
      hostId: this.hostId,
      visibility: this.visibility,
      hasJoinPass: this.hasJoinPass(),
      fillBots: !!this.fillBots,
      celestial: !!this.celestial,
      weather: weatherPublic(this.weather),
      event: this.event,
      spirit: this.spirit,
      grudgeMatch: !!this.grudgeMatch,
      clubTag: this.clubTag || '',
      clubId: this.clubId || '',
      clubName: this.clubName || '',
      friendshipStake: this.friendshipStake || '',
      seats: this.seats,
      specSeats: this.specSeats.map((s, i) => (s ? { ...s, seatIndex: i } : null)),
      spectators: this.spectators.map((s) => ({
        id: s.id,
        name: s.name,
        skin: s.skin,
        aidUsed: s.aidUsed,
        seatIndex: s.seatIndex,
        profile: s.profile || getProfile(s.name),
      })),
      commentatorSeats: this.commentatorSeats.map((s, i) => (s ? { ...s, seatIndex: i } : null)),
      commentators: this.commentators.map((s) => ({
        id: s.id,
        name: s.name,
        skin: s.skin,
        seatIndex: s.seatIndex,
        role: 'commentator',
        profile: s.profile || getProfile(s.name),
      })),
      pendingSwap: this.pendingSwap,
      board,
      turnColor: this.turnColor,
      turnSeatIndex: this.turnSeatIndex,
      turnDeadline: this.turnDeadline,
      winner: this.winner,
      aidRequest: this.aidRequest,
      boardSize: this.engine.SIZE,
      boardScale: this.boardScale,
      turnMs: this.turnMs,
      lastMove,
      lastEffects: hideFog ? null : this.lastEffects,
      totalRounds: this.totalRounds,
      currentRound: this.currentRound,
      seriesScore: this.seriesScore,
      roundResults: this.roundResults,
      recentEmotes: this.recentEmotes.slice(-12),
      chatLog: this.chatLog.slice(-20),
      quickTexts: QUICK_TEXTS,
      teamNames: names,
      boardTheme: this.boardTheme || 'default',
      boardThemeAt: this.boardThemeAt || 0,
      boardThemeCooldownMs: BOARD_THEME_COOLDOWN_MS,
      draughtsContinue: this.draughtsContinue,
      legalMoves: (this.gameType === 'draughts' && this.board && this.phase === 'playing' && this.engine.legalMoves)
        ? this.engine.legalMoves(this.board, this.turnColor, this.draughtsContinue)
        : [],
      flyingLegalIds: (this.gameType === 'flying' && this.board && this.board.rolled && this.engine.legalPlanes)
        ? this.engine.legalPlanes(this.board, this.turnColor, this.board.dice).map((p) => p.id)
        : [],
      lastDice: this.board && this.board.lastDice != null ? this.board.lastDice : null,
      moveLog: this.history.map((h) => h.move).filter(Boolean),
      boardHistory: this.history.map((h) => h.board).concat(
        this.board ? [this.engine.cloneBoard(this.board)] : []
      ),
      forbiddenCells: this.forbiddenCells || [],
      protectedCells: this.protectedCells || [],
      fogActive: hideFog || fogSpreadOn,
      komi: Number(this.komi) || 0,
      captureBonus: this.captureBonus || { 1: 0, 2: 0 },
      shields: this.shields || {},
      propCatalog: GAME_PROP_IDS[this.gameType] || GENERIC_PROP_IDS,
      rematchOpen: !!this.rematchOpen,
      rematchDeadline: this.rematchDeadline || null,
      rematchVotes: { ...this.rematchVotes },
      truth: this.truth ? { ...this.truth, choices: (this.truth.choices || []).slice() } : null,
      rivalUid: rivalUid || '',
      rivalInRoom,
      settleHint: this.settleHint || '',
      mentorCoaching,
      goTeam: this.isGoTeam(),
      garden: social.normalizeGarden(this.garden),
      roomLore: (this.roomLore || []).slice(0, 8),
      socialBuffs: this.activeSocialBuffs(),
      jobCatalog: social.jobCards(youProfile && youProfile.jobLevels),
      jobCooldowns: this.jobCooldownsFor(forPlayerId),
      spyReveal: (() => {
        const peek = this.spyPeeks.get(forPlayerId);
        if (!peek || peek.until <= Date.now()) return null;
        return {
          move: peek.move,
          until: peek.until,
          hint: social.formatMoveHint(peek.move),
        };
      })(),
      coachHint: (() => {
        const cur = this.currentSeat();
        if (!this.coachHint || !cur || !cur.player || cur.player.id !== forPlayerId) return null;
        return {
          r: this.coachHint.r,
          c: this.coachHint.c,
          fromName: this.coachHint.fromName,
          fromMentor: !!this.coachHint.fromMentor,
        };
      })(),
      you: {
        playerId: forPlayerId,
        seat: this.findSeatByPlayer(forPlayerId),
        spectator: this.findSpectator(forPlayerId),
        commentator: this.findCommentator(forPlayerId),
      },
    };
  }

  assertTurn(playerId, forAid = false) {
    if (this.phase !== 'playing') return { ok: false, error: '不在对局中' };
    if (this.turnDeadline && Date.now() > this.turnDeadline) {
      this.onTimeout();
      return { ok: false, error: '已超时' };
    }
    if (this.aidRequest && !forAid) {
      return { ok: false, error: '等待外援代下' };
    }
    const seat = this.currentSeat();
    if (!forAid && (!seat.player || seat.player.id !== playerId)) {
      return { ok: false, error: '未轮到你' };
    }
    return { ok: true, seat };
  }

  onTimeout() {
    if (this.phase !== 'playing') return;
    if (this.gameType === 'flying') {
      if (this.board) {
        this.board.dice = null;
        this.board.rolled = false;
        this.board.sixStreak = 0;
      }
      this.lastMove = { color: this.turnColor, timeoutSkip: true };
      this.advanceTurn();
      return;
    }
    const loserColor = this.turnColor;
    this.finishRound(loserColor === 1 ? 2 : 1, { reason: 'timeout' });
  }

  checkTimeout() {
    if (this.phase === 'playing' && this.turnDeadline && Date.now() > this.turnDeadline) {
      this.onTimeout();
      return true;
    }
    return false;
  }

  applyDraughtsMove(playerId, r, c, opts, color, aid) {
    const snapshot = {
      board: this.engine.cloneBoard(this.board),
      turnColor: this.turnColor,
      turnSeatIndex: this.turnSeatIndex,
      passCount: this.passCount,
      prevBoardHash: this.prevBoardHash,
      seatsUndo: this.seats.map((s) => s.undoLeft),
      draughtsContinue: this.draughtsContinue ? { ...this.draughtsContinue } : null,
    };
    const result = this.engine.move(
      this.board,
      opts.fromR,
      opts.fromC,
      r,
      c,
      color,
      this.draughtsContinue
    );
    if (!result.ok) return result;
    this.history.push({
      ...snapshot,
      move: {
        r,
        c,
        fromR: opts.fromR,
        fromC: opts.fromC,
        color,
        captured: result.captured || [],
      },
    });
    this.board = result.board;
    this.lastMove = {
      r,
      c,
      fromR: opts.fromR,
      fromC: opts.fromC,
      color,
      pass: false,
    };
    this.lastEffects = {
      placed: { r, c, color },
      flipped: [],
      captured: (result.captured || []).map((p) => ({ ...p, color: color === 1 ? 2 : 1 })),
      at: Date.now(),
    };
    if (aid) {
      const spec = this.findSpectator(playerId);
      if (spec) spec.aidUsed += 1;
      this.aidRequest = null;
    }
    if (result.moreJumps && result.continueAt) {
      this.draughtsContinue = result.continueAt;
      this.armTimer();
      return { ok: true, moreJumps: true };
    }
    this.draughtsContinue = null;
    if (result.win) {
      this.finishRound(color);
      return { ok: true, finished: true };
    }
    this.advanceTurn();
    return { ok: true };
  }

  applyFlyingMove(playerId, opts, color, aid) {
    const snapshot = {
      board: this.engine.cloneBoard(this.board),
      turnColor: this.turnColor,
      turnSeatIndex: this.turnSeatIndex,
      passCount: this.passCount,
      prevBoardHash: this.prevBoardHash,
      seatsUndo: this.seats.map((s) => s.undoLeft),
    };
    const result = this.engine.movePlane(this.board, opts.planeId, color, {
      shields: this.shields || {},
    });
    if (!result.ok) return result;
    this.history.push({
      ...snapshot,
      move: {
        planeId: opts.planeId,
        color,
        dice: result.dice,
        dest: result.dest,
        captured: result.captured,
      },
    });
    this.board = result.board;
    this.lastMove = {
      planeId: opts.planeId,
      color,
      dice: result.dice,
      dest: result.dest,
      from: result.from,
      path: result.path,
      captured: result.captured,
    };
    this.lastEffects = {
      kind: 'flying',
      placed: result.dest,
      planeId: result.planeId,
      from: result.from,
      path: result.path || [],
      dest: result.dest,
      flipped: [],
      captured: result.captured || [],
      blocked: result.blocked || [],
      at: Date.now(),
    };
    (result.blocked || []).forEach((b) => {
      const n = Number(this.shields[b.color]) || 0;
      if (n > 0) this.shields[b.color] = n - 1;
    });
    if (aid) {
      const spec = this.findSpectator(playerId);
      if (spec) spec.aidUsed += 1;
      this.aidRequest = null;
    }
    if (result.win) {
      this.finishRound(color);
      return { ok: true, finished: true };
    }
    if (result.extraTurn) {
      this.armTimer();
      return { ok: true, extraTurn: true };
    }
    this.advanceTurn();
    return { ok: true };
  }

  applyPlace(playerId, r, c, opts = {}) {
    const aid = !!opts.aid;
    const turnCheck = this.assertTurn(playerId, aid);
    if (!turnCheck.ok) return turnCheck;
    this.coachHint = null;

    let actorSeat = turnCheck.seat;
    if (aid) {
      if (!this.needsAid()) return { ok: false, error: '非外援赛' };
      if (!this.aidRequest) return { ok: false, error: '无人请求外援' };
      if (this.findCommentator(playerId)) return { ok: false, error: '解说不可代下' };
      const spec = this.findSpectator(playerId);
      if (!spec) return { ok: false, error: '仅观战者可代下' };
      if (spec.aidUsed >= 5) return { ok: false, error: '外援步数已用尽(5)' };
      actorSeat = this.currentSeat();
    }

    const color = actorSeat.color;
    if (this.fogHidden && this.fogHidden.hideFromColor === color) {
      this.fogHidden = null;
    }
    if (this.gameType === 'draughts') {
      return this.applyDraughtsMove(playerId, r, c, opts, color, aid);
    }
    if (this.gameType === 'flying') {
      return this.applyFlyingMove(playerId, opts, color, aid);
    }
    if (r !== -1 && this.isTideCell(r, c)) {
      return { ok: false, error: '潮汐封锁：边线不可落子' };
    }
    const snapshot = {
      board: this.engine.cloneBoard(this.board),
      turnColor: this.turnColor,
      turnSeatIndex: this.turnSeatIndex,
      passCount: this.passCount,
      prevBoardHash: this.prevBoardHash,
      seatsUndo: this.seats.map((s) => s.undoLeft),
    };

    if (this.gameType === 'go' && r === -1 && c === -1) {
      const result = this.engine.place(this.board, -1, -1, color);
      this.board = result.board;
      this.passCount += 1;
      this.lastMove = { r: -1, c: -1, color, pass: true };
      this.lastEffects = { placed: null, flipped: [], captured: [] };
      this.history.push({ ...snapshot, move: { r: -1, c: -1, color, pass: true } });
      if (aid) {
        const spec = this.findSpectator(playerId);
        if (spec) spec.aidUsed += 1;
        this.aidRequest = null;
      }
      if (this.passCount >= 2) {
        const scores = this.goFinalScores();
        const winner = scores.winner;
        this.finishRound(winner, { scores });
        return { ok: true, finished: true, scores };
      }
      this.advanceTurn();
      return { ok: true };
    }

    let result;
    if (this.gameType === 'gomoku') {
      const banned = (this.forbiddenCells || []).some(
        (p) => p.againstColor === color && p.r === r && p.c === c
      );
      if (banned) return { ok: false, error: '禁手点不可落子' };
      result = this.engine.place(this.board, r, c, color);
    } else if (this.gameType === 'go') {
      result = this.engine.place(this.board, r, c, color, this.prevBoardHash);
    } else if (this.gameType === 'reversi') {
      result = this.engine.place(this.board, r, c, color, {
        protected: this.protectedCells || [],
      });
    } else {
      result = this.engine.place(this.board, r, c, color);
    }
    if (!result.ok) return result;

    this.history.push({
      ...snapshot,
      move: { r, c, color, pass: false },
    });
    this.board = result.board;
    this.lastMove = { r, c, color, pass: false };
    const flipped = (result.flips || []).map((p) => ({ r: p.r, c: p.c }));
    const captured = (result.capturedStones || []).map((p) => ({
      r: p.r,
      c: p.c,
      color: p.color,
    }));
    this.lastEffects = {
      placed: { r, c, color },
      flipped,
      captured,
      at: Date.now(),
    };
    this.forbiddenCells = (this.forbiddenCells || []).filter((p) => p.source === 'spirit' || p.againstColor !== color);
    if (result.protectedFlips && result.protectedFlips.length) {
      const consumed = new Set(result.protectedFlips.map((p) => `${p.r},${p.c}`));
      this.protectedCells = (this.protectedCells || []).filter((p) => !consumed.has(`${p.r},${p.c}`));
    }
    this.passCount = 0;
    if (result.hash) {
      this.prevBoardHash = this.engine.boardHash
        ? this.engine.boardHash(snapshot.board)
        : null;
    }

    if (this.event && this.event.kind === 'tide' && this.event.turnsLeft > 0) {
      this.event.turnsLeft -= 1;
      if (this.event.turnsLeft <= 0) this.event.turnsLeft = 0;
    }
    if (this.event && this.event.kind === 'meteor' && this.event.r === r && this.event.c === c) {
      this.extraTimeForColor = { color, ms: METEOR_BONUS_MS };
      const nextMeteor = this.pickEmptyCell({ r, c });
      this.event = nextMeteor
        ? { kind: 'meteor', r: nextMeteor.r, c: nextMeteor.c }
        : { kind: 'meteor' };
      this.lastEffects = { ...(this.lastEffects || {}), meteorBonus: METEOR_BONUS_MS };
    }
    this.tickSpirit(color);

    if (aid) {
      const spec = this.findSpectator(playerId);
      if (spec) spec.aidUsed += 1;
      this.aidRequest = null;
    }

    if (this.gameType === 'gomoku') {
      if (result.win) {
        this.finishRound(color);
        return { ok: true, finished: true };
      }
      if (result.draw) {
        this.finishRound(0);
        return { ok: true, finished: true };
      }
      this.advanceTurn();
      return { ok: true };
    }

    if (this.gameType === 'reversi') {
      if (result.finished) {
        this.finishRound(result.winner, { counts: result.counts });
        return { ok: true, finished: true, counts: result.counts };
      }
      if (result.nextColor === color) {
        this.turnColor = color;
        this.armTimer();
      } else {
        this.advanceTurn();
      }
      return { ok: true, skipped: result.skipped };
    }

    this.advanceTurn();
    return { ok: true, captured: result.captured, lastEffects: this.lastEffects };
  }

  undo(playerId) {
    if (this.phase !== 'playing') return { ok: false, error: '不在对局中' };
    const seat = this.findSeatByPlayer(playerId);
    if (!seat) return { ok: false, error: '不在座位上' };
    if (seat.undoLeft <= 0) return { ok: false, error: '悔棋次数不足' };
    if (!this.history.length) return { ok: false, error: '无可悔棋步' };
    const last = this.history[this.history.length - 1];
    if (last.move.color !== seat.color) return { ok: false, error: '只能悔本方上一步' };
    seat.undoLeft -= 1;
    const snap = this.history.pop();
    this.board = snap.board;
    this.turnColor = snap.turnColor;
    this.turnSeatIndex = snap.turnSeatIndex;
    this.passCount = snap.passCount;
    this.prevBoardHash = snap.prevBoardHash;
    this.aidRequest = null;
    this.draughtsContinue = snap.draughtsContinue || null;
    const prev = this.history[this.history.length - 1];
    this.lastMove = prev && prev.move && !prev.move.prop
      ? { r: prev.move.r, c: prev.move.c, color: prev.move.color, pass: !!prev.move.pass }
      : null;
    this.lastEffects = null;
    this.armTimer();
    return { ok: true };
  }

  useProp(playerId, propType, extra = {}) {
    if (this.phase !== 'playing') return { ok: false, error: '不在对局中' };
    if (this.mode !== 'props') return { ok: false, error: '非道具赛' };
    const seat = this.findSeatByPlayer(playerId);
    if (!seat) return { ok: false, error: '不在座位上' };
    if (!seat.props[propType] || seat.props[propType] <= 0) {
      return { ok: false, error: '道具次数不足' };
    }

    if (propType === 'undoPlus') {
      seat.props.undoPlus -= 1;
      seat.undoLeft += 1;
      return { ok: true, effect: 'undoPlus' };
    }

    if (propType === 'timeCut') {
      seat.props.timeCut -= 1;
      const cur = this.currentSeat();
      if (cur.color !== seat.color) {
        const remain = Math.max(0, (this.turnDeadline || Date.now()) - Date.now());
        this.turnDeadline = Date.now() + Math.min(remain, PROP_TIME_CAP_MS);
      } else {
        this.nextTurnTimeCapMs = PROP_TIME_CAP_MS;
      }
      return { ok: true, effect: 'timeCut' };
    }

    if (propType === 'swallow') {
      const enemyColor = seat.color === 1 ? 2 : 1;
      const result = this.engine.trySwallow(this.board, seat.color, enemyColor);
      if (!result.ok) return result;
      seat.props.swallow -= 1;
      this.history.push({
        board: this.engine.cloneBoard(this.board),
        turnColor: this.turnColor,
        turnSeatIndex: this.turnSeatIndex,
        passCount: this.passCount,
        prevBoardHash: this.prevBoardHash,
        move: { prop: 'swallow', removed: result.removed, color: seat.color },
      });
      this.board = result.board;
      return { ok: true, effect: 'swallow', removed: result.removed };
    }

    if (propType === 'forbiddenPoint') {
      if (this.gameType !== 'gomoku') return { ok: false, error: '仅五子棋可用禁手点' };
      const r = Number(extra.r);
      const c = Number(extra.c);
      if (!Number.isInteger(r) || !Number.isInteger(c)) return { ok: false, error: '请选择禁手点' };
      if (!this.board || !this.board[r] || this.board[r][c] !== 0) {
        return { ok: false, error: '只能在空点设置禁手' };
      }
      const againstColor = seat.color === 1 ? 2 : 1;
      if ((this.forbiddenCells || []).some((p) => p.r === r && p.c === c)) {
        return { ok: false, error: '该点已是禁手' };
      }
      seat.props.forbiddenPoint -= 1;
      this.forbiddenCells = [...(this.forbiddenCells || []), { r, c, againstColor, byColor: seat.color }];
      return { ok: true, effect: 'forbiddenPoint', cell: { r, c } };
    }

    if (propType === 'fog') {
      if (this.gameType !== 'gomoku') return { ok: false, error: '仅五子棋可用迷雾' };
      if (!this.lastMove || this.lastMove.pass || this.lastMove.r == null) {
        return { ok: false, error: '没有可隐藏的落子' };
      }
      if (this.lastMove.color !== seat.color) {
        return { ok: false, error: '只能隐藏己方刚落下的棋' };
      }
      seat.props.fog -= 1;
      this.fogHidden = {
        r: this.lastMove.r,
        c: this.lastMove.c,
        color: this.lastMove.color,
        hideFromColor: seat.color === 1 ? 2 : 1,
      };
      return { ok: true, effect: 'fog' };
    }

    if (propType === 'flipProtect') {
      if (this.gameType !== 'reversi') return { ok: false, error: '仅黑白棋可用翻转保护' };
      const r = Number(extra.r);
      const c = Number(extra.c);
      if (!this.board || !this.board[r] || this.board[r][c] !== seat.color) {
        return { ok: false, error: '请选择己方棋子' };
      }
      if ((this.protectedCells || []).some((p) => p.r === r && p.c === c)) {
        return { ok: false, error: '该子已受保护' };
      }
      seat.props.flipProtect -= 1;
      this.protectedCells = [...(this.protectedCells || []), { r, c, color: seat.color }];
      return { ok: true, effect: 'flipProtect', cell: { r, c } };
    }

    if (propType === 'forceSwap') {
      if (this.gameType !== 'reversi') return { ok: false, error: '仅黑白棋可用强制换位' };
      const r = Number(extra.r);
      const c = Number(extra.c);
      const r2 = Number(extra.r2);
      const c2 = Number(extra.c2);
      if (!this.board || !this.board[r] || !this.board[r2]) {
        return { ok: false, error: '请选择两个位置' };
      }
      const a = this.board[r][c];
      const b = this.board[r2][c2];
      if (!a || !b) return { ok: false, error: '只能交换已有棋子' };
      if (a === b) return { ok: false, error: '请选择一黑一白' };
      if (a !== seat.color && b !== seat.color) return { ok: false, error: '须包含己方一子' };
      seat.props.forceSwap -= 1;
      const next = this.engine.cloneBoard(this.board);
      next[r][c] = b;
      next[r2][c2] = a;
      this.history.push({
        board: this.engine.cloneBoard(this.board),
        turnColor: this.turnColor,
        turnSeatIndex: this.turnSeatIndex,
        passCount: this.passCount,
        prevBoardHash: this.prevBoardHash,
        move: { prop: 'forceSwap', cells: [{ r, c }, { r: r2, c: c2 }], color: seat.color },
      });
      this.board = next;
      this.protectedCells = (this.protectedCells || []).map((p) => {
        if (p.r === r && p.c === c) return { ...p, r: r2, c: c2 };
        if (p.r === r2 && p.c === c2) return { ...p, r, c };
        return p;
      });
      return { ok: true, effect: 'forceSwap', cells: [{ r, c }, { r: r2, c: c2 }] };
    }

    if (propType === 'komiAdjust') {
      if (this.gameType !== 'go') return { ok: false, error: '仅围棋可用贴目调整' };
      const sign = Number(extra.delta) < 0 ? -1 : 1;
      seat.props.komiAdjust -= 1;
      this.komi = (Number(this.komi) || 0) + sign * 2.5;
      return { ok: true, effect: 'komiAdjust', komi: this.komi };
    }

    if (propType === 'passReward') {
      if (this.gameType !== 'go') return { ok: false, error: '仅围棋可用虚手奖励' };
      const turnCheck = this.assertTurn(playerId, false);
      if (!turnCheck.ok) return turnCheck;
      seat.props.passReward -= 1;
      this.captureBonus[seat.color] = (Number(this.captureBonus[seat.color]) || 0) + 1;
      this.extraTimeForColor = { color: seat.color, ms: PASS_REWARD_MS };
      const pass = this.applyPlace(playerId, -1, -1, {});
      if (!pass.ok) {
        seat.props.passReward += 1;
        this.captureBonus[seat.color] = Math.max(0, (this.captureBonus[seat.color] || 0) - 1);
        return pass;
      }
      return { ok: true, effect: 'passReward', ...pass };
    }

    if (propType === 'remoteDice') {
      if (this.gameType !== 'flying') return { ok: false, error: '仅飞行棋可用遥控骰子' };
      const turnCheck = this.assertTurn(playerId, false);
      if (!turnCheck.ok) return turnCheck;
      if (!this.board) return { ok: false, error: '对局未开始' };
      if (this.board.rolled) return { ok: false, error: '已经掷过' };
      const dice = Math.min(6, Math.max(1, Number(extra.dice) || 0));
      if (!Number.isInteger(dice) || dice < 1) return { ok: false, error: '请选择 1–6 点' };
      const rolled = this.engine.roll(this.board, dice);
      if (!rolled.ok) return rolled;
      seat.props.remoteDice -= 1;
      this.board = rolled.board;
      this.lastMove = { color: this.turnColor, dice: rolled.dice, roll: true, remote: true };
      this.lastEffects = { kind: 'dice', dice: rolled.dice, remote: true, at: Date.now() };
      const stuck = this.engine.skipIfStuck(this.board, this.turnColor);
      if (stuck.ok) {
        this.board = stuck.board;
        this.lastMove = {
          color: this.turnColor,
          dice: stuck.dice,
          roll: true,
          stuck: true,
          remote: true,
        };
        this.lastEffects = {
          kind: 'dice',
          dice: stuck.dice,
          stuck: true,
          remote: true,
          at: Date.now(),
        };
        if (stuck.extraTurn) this.armTimer();
        else this.advanceTurn();
      }
      return { ok: true, effect: 'remoteDice', dice: rolled.dice, stuck: !!stuck.ok };
    }

    if (propType === 'shield') {
      if (this.gameType !== 'flying') return { ok: false, error: '仅飞行棋可用护盾' };
      seat.props.shield -= 1;
      this.shields[seat.color] = (Number(this.shields[seat.color]) || 0) + 1;
      return { ok: true, effect: 'shield', shields: this.shields[seat.color] };
    }

    return { ok: false, error: '未知道具' };
  }

  goFinalScores() {
    const raw = this.engine.score(this.board);
    const black = (raw.black || 0) + (Number(this.captureBonus[1]) || 0);
    const white = (raw.white || 0) + (Number(this.captureBonus[2]) || 0) + (Number(this.komi) || 0);
    let winner = 0;
    if (black > white) winner = 1;
    else if (white > black) winner = 2;
    return { black, white, komi: Number(this.komi) || 0, winner };
  }

  botPlace(byPlayerId, r, c, opts = {}) {
    const bySeat = this.findSeatByPlayer(byPlayerId);
    const byWatch = this.findWatcher(byPlayerId);
    if (!bySeat && !byWatch) return { ok: false, error: '不在房间内' };
    if (bySeat && bySeat.player && bySeat.player.bot) {
      return { ok: false, error: '人机不能代下' };
    }
    const cur = this.currentSeat();
    if (!cur || !cur.player || !cur.player.bot) {
      return { ok: false, error: '当前不是人机座位' };
    }
    if (opts.auto || r == null) return this.playBotMove();
    return this.applyPlace(cur.player.id, r, c, opts);
  }

  playBotMove() {
    const cur = this.currentSeat();
    if (!cur || !cur.player || !cur.player.bot) {
      return { ok: false, error: '当前不是人机座位' };
    }
    const pick = bots.pickMove(this);
    if (!pick) return { ok: false, error: '人机无棋可下' };
    if (this.gameType === 'flying') {
      if (pick.roll) return this.rollDice(cur.player.id);
      if (pick.stuck) {
        const stuck = this.engine.skipIfStuck(this.board, this.turnColor);
        if (stuck.ok) {
          this.board = stuck.board;
          if (stuck.extraTurn) this.armTimer();
          else this.advanceTurn();
          return { ok: true, stuck: true };
        }
        return { ok: false, error: '人机卡住' };
      }
      return this.applyPlace(cur.player.id, 0, 0, { planeId: pick.planeId });
    }
    if (pick.pass) return this.applyPlace(cur.player.id, -1, -1, {});
    return this.applyPlace(cur.player.id, pick.r, pick.c, {
      fromR: pick.fromR,
      fromC: pick.fromC,
    });
  }

  requestAid(playerId) {
    if (!this.needsAid()) return { ok: false, error: '非外援赛' };
    if (this.phase !== 'playing') return { ok: false, error: '不在对局中' };
    const seat = this.currentSeat();
    if (!seat.player || seat.player.id !== playerId) {
      return { ok: false, error: '仅当前执子方可请求外援' };
    }
    if (!this.spectators.length) return { ok: false, error: '暂无观战者' };
    this.aidRequest = { seatIndex: this.turnSeatIndex, requesterId: playerId };
    return { ok: true };
  }

  cancelAid(playerId) {
    if (!this.aidRequest) return { ok: true };
    if (this.aidRequest.requesterId !== playerId && playerId !== this.hostId) {
      return { ok: false, error: '无权取消' };
    }
    this.aidRequest = null;
    return { ok: true };
  }

  /** 序列化以便持久化（不含 timer） */
  serialize() {
    const cloneBoard = (b) => {
      if (!b) return null;
      try {
        return this.engine.cloneBoard(b);
      } catch {
        return JSON.parse(JSON.stringify(b));
      }
    };
    return {
      code: this.code,
      gameType: this.gameType,
      mode: this.mode,
      phase: this.phase,
      hostId: this.hostId,
      visibility: this.visibility,
      boardScale: this.boardScale,
      turnMs: this.turnMs,
      joinPass: this.joinPass || '',
      totalRounds: this.totalRounds,
      currentRound: this.currentRound,
      seriesScore: this.seriesScore,
      roundResults: this.roundResults,
      winner: this.winner,
      turnColor: this.turnColor,
      turnSeatIndex: this.turnSeatIndex,
      turnDeadline: this.turnDeadline,
      nextTurnTimeCapMs: this.nextTurnTimeCapMs,
      passCount: this.passCount,
      prevBoardHash: this.prevBoardHash,
      aidRequest: this.aidRequest,
      lastMove: this.lastMove,
      lastEffects: this.lastEffects,
      pendingSwap: null,
      chatLog: this.chatLog.slice(-20),
      recentEmotes: this.recentEmotes.slice(-12),
      boardTheme: this.boardTheme || 'default',
      boardThemeAt: this.boardThemeAt || 0,
      draughtsContinue: this.draughtsContinue,
      fillBots: !!this.fillBots,
      clubTag: this.clubTag || '',
      clubId: this.clubId || '',
      clubName: this.clubName || '',
      friendshipStake: this.friendshipStake || '',
      celestial: !!this.celestial,
      forcedWeather: this.forcedWeather || '',
      weather: this.weather,
      event: this.event,
      spirit: this.spirit,
      grudgeMatch: !!this.grudgeMatch,
      grudgeVsUid: this.grudgeVsUid || '',
      komi: Number(this.komi) || 0,
      captureBonus: this.captureBonus || { 1: 0, 2: 0 },
      forbiddenCells: this.forbiddenCells || [],
      fogHidden: this.fogHidden,
      protectedCells: this.protectedCells || [],
      shields: this.shields || {},
      garden: social.normalizeGarden(this.garden),
      roomLore: (this.roomLore || []).slice(0, social.LORE_MAX),
      socialBuffs: (this.socialBuffs || []).filter((b) => b && b.until > Date.now()),
      jobCooldowns: Object.fromEntries(this.jobCooldowns.entries()),
      spyPeeks: Array.from(this.spyPeeks.entries()).map(([playerId, v]) => ({
        playerId,
        move: v.move,
        until: v.until,
      })),
      giftStreaks: Object.fromEntries(this.giftStreaks.entries()),
      truth: this.truth ? { ...this.truth, choices: (this.truth.choices || []).slice() } : null,
      board: cloneBoard(this.board),
      history: this.history.map((h) => ({
        board: cloneBoard(h.board),
        turnColor: h.turnColor,
        turnSeatIndex: h.turnSeatIndex,
        passCount: h.passCount,
        prevBoardHash: h.prevBoardHash,
        seatsUndo: h.seatsUndo,
        move: h.move,
      })),
      seats: this.seats.map((s) => ({
        index: s.index,
        team: s.team,
        color: s.color,
        ready: false,
        undoLeft: s.undoLeft,
        props: s.props,
        job: social.normalizeJob(s.job),
        player: s.player
          ? {
              id: s.player.id,
              uid: s.player.uid || null,
              name: s.player.name,
              skin: s.player.skin,
              online: false,
              bot: !!s.player.bot,
            }
          : null,
      })),
      specSeats: this.specSeats.map((s) => (s
        ? {
            id: s.id,
            uid: s.uid || null,
            name: s.name,
            skin: s.skin,
            aidUsed: s.aidUsed || 0,
            seatIndex: s.seatIndex,
            online: false,
          }
        : null)),
      commentatorSeats: this.commentatorSeats.map((s) => (s
        ? {
            id: s.id,
            uid: s.uid || null,
            name: s.name,
            skin: s.skin,
            seatIndex: s.seatIndex,
            online: false,
            role: 'commentator',
          }
        : null)),
      savedAt: Date.now(),
    };
  }

  static restore(data) {
    if (!data || !data.code) return null;
    const room = new Room({
      code: data.code,
      gameType: data.gameType || 'gomoku',
      mode: data.mode || '1v1',
      hostId: data.hostId || genId(),
      hostName: '恢复中',
      hostSkin: 'red',
      totalRounds: data.totalRounds,
      boardScale: data.boardScale,
      turnMs: data.turnMs,
      visibility: data.visibility,
      joinPass: data.joinPass || '',
      skipHost: true,
      fillBots: data.fillBots,
      clubTag: data.clubTag,
      clubId: data.clubId,
      clubName: data.clubName,
      friendshipStake: data.friendshipStake,
      celestial: data.celestial,
      weather: data.forcedWeather || (data.weather && data.weather.id),
      grudgeMatch: data.grudgeMatch,
      grudgeVsUid: data.grudgeVsUid,
    });
    room.phase = data.phase || 'lobby';
    if (room.phase === 'seriesEnd') return null;
    room.currentRound = Number(data.currentRound) || 0;
    room.seriesScore = data.seriesScore || { black: 0, white: 0 };
    room.roundResults = Array.isArray(data.roundResults) ? data.roundResults : [];
    room.winner = data.winner ?? null;
    room.truth = data.truth && typeof data.truth === 'object' ? { ...data.truth } : null;
    room.turnColor = data.turnColor || 1;
    room.turnSeatIndex = Number(data.turnSeatIndex) || 0;
    room.passCount = Number(data.passCount) || 0;
    room.prevBoardHash = data.prevBoardHash || null;
    room.aidRequest = data.aidRequest || null;
    room.lastMove = data.lastMove || null;
    room.lastEffects = data.lastEffects || null;
    room.chatLog = Array.isArray(data.chatLog) ? data.chatLog.slice(-20) : [];
    room.recentEmotes = Array.isArray(data.recentEmotes) ? data.recentEmotes.slice(-12) : [];
    room.nextTurnTimeCapMs = data.nextTurnTimeCapMs || null;
    room.boardTheme = BOARD_THEME_IDS.includes(data.boardTheme) ? data.boardTheme : 'default';
    room.boardThemeAt = Number(data.boardThemeAt) || 0;
    room.draughtsContinue = data.draughtsContinue || null;
    room.fillBots = !!data.fillBots;
    room.clubTag = data.clubTag || '';
    room.clubId = data.clubId || '';
    room.clubName = data.clubName || '';
    room.friendshipStake = normalizeFriendshipStake(data.friendshipStake);
    room.celestial = !!data.celestial;
    room.forcedWeather = data.forcedWeather || '';
    room.weather = data.weather || null;
    room.event = data.event || null;
    room.spirit = data.spirit || null;
    room.grudgeMatch = !!data.grudgeMatch;
    room.grudgeVsUid = data.grudgeVsUid || '';
    room.komi = Number(data.komi) || 0;
    room.captureBonus = data.captureBonus || { 1: 0, 2: 0 };
    room.forbiddenCells = Array.isArray(data.forbiddenCells) ? data.forbiddenCells : [];
    room.fogHidden = data.fogHidden || null;
    room.protectedCells = Array.isArray(data.protectedCells) ? data.protectedCells : [];
    room.shields = data.shields && typeof data.shields === 'object' ? data.shields : {};
    room.garden = social.normalizeGarden(data.garden);
    room.roomLore = Array.isArray(data.roomLore) ? data.roomLore.slice(0, social.LORE_MAX) : [];
    room.socialBuffs = Array.isArray(data.socialBuffs) ? data.socialBuffs : [];
    room.jobCooldowns = new Map();
    if (data.jobCooldowns && typeof data.jobCooldowns === 'object') {
      Object.entries(data.jobCooldowns).forEach(([pid, row]) => {
        if (row && typeof row === 'object') room.jobCooldowns.set(pid, row);
      });
    }
    room.spyPeeks = new Map();
    if (Array.isArray(data.spyPeeks)) {
      data.spyPeeks.forEach((row) => {
        if (row && row.playerId) room.spyPeeks.set(row.playerId, { move: row.move, until: row.until });
      });
    }
    room.giftStreaks = new Map();
    if (data.giftStreaks && typeof data.giftStreaks === 'object') {
      Object.entries(data.giftStreaks).forEach(([k, v]) => {
        if (v && typeof v === 'object') room.giftStreaks.set(k, v);
      });
    }

    if (Array.isArray(data.seats)) {
      data.seats.forEach((s, i) => {
        if (!room.seats[i] || !s) return;
        room.seats[i].undoLeft = s.undoLeft != null ? s.undoLeft : 1;
        if (s.props) room.seats[i].props = s.props;
        room.seats[i].job = social.normalizeJob(s.job);
        if (s.player) {
          room.addPlayerToSeat(i, {
            id: s.player.id,
            uid: s.player.uid,
            name: s.player.name,
            skin: s.player.skin,
            online: false,
            bot: !!s.player.bot,
          });
          if (room.seats[i].player) room.seats[i].player.online = false;
        }
      });
    }
    if (Array.isArray(data.specSeats)) {
      data.specSeats.forEach((s, i) => {
        if (!s || i >= room.specSeats.length) return;
        const name = s.name || `观战${i + 1}`;
        const profile = s.uid ? getProfileById(s.uid, name) : getProfile(name);
        room.specSeats[i] = {
          id: s.id,
          uid: s.uid || null,
          name,
          skin: s.skin || 'blue',
          aidUsed: s.aidUsed || 0,
          profile,
          seatIndex: i,
          online: false,
        };
      });
    }
    if (Array.isArray(data.commentatorSeats)) {
      data.commentatorSeats.forEach((s, i) => {
        if (!s || i >= room.commentatorSeats.length) return;
        const name = s.name || `解说${i + 1}`;
        const profile = s.uid ? getProfileById(s.uid, name) : getProfile(name);
        room.commentatorSeats[i] = {
          id: s.id,
          uid: s.uid || null,
          name,
          skin: s.skin || 'blue',
          profile,
          seatIndex: i,
          online: false,
          role: 'commentator',
        };
      });
    }

    if (room.gameType === 'flying') {
      room.engine = makeEngine('flying', room.boardScale, { seatCount: room.seats.length });
    } else if (room.isGoTeam()) {
      room.engine = makeEngine('go', room.boardScale, { allied: true });
    }

    if (data.board && ['playing', 'roundEnd'].includes(room.phase)) {
      room.board = data.board;
      room.history = Array.isArray(data.history) ? data.history : [];
      if (room.phase === 'playing') {
        const remain = data.turnDeadline ? Math.max(5000, data.turnDeadline - Date.now()) : room.turnMs;
        room.turnDeadline = Date.now() + Math.min(room.turnMs, Math.max(10000, remain));
      } else {
        room.turnDeadline = null;
      }
    } else if (room.phase === 'playing') {
      room.phase = 'lobby';
      room.board = null;
      room.history = [];
      room.turnDeadline = null;
      room.currentRound = Math.max(0, room.currentRound - 1);
    }

    const hostStill = room.seats.find((s) => s.player && s.player.id === room.hostId);
    if (!hostStill) {
      const next = room.seats.find((s) => s.player);
      if (next) room.hostId = next.player.id;
    }
    return room;
  }
}

class RoomManager {
  constructor(opts = {}) {
    this.rooms = new Map();
    this.playerRoom = new Map();
    /** @type {Map<string, { roomCode: string, timer: NodeJS.Timeout }>} */
    this.pendingLeaves = new Map();
    this.onChange = typeof opts.onChange === 'function' ? opts.onChange : null;
  }

  notifyChange() {
    if (this.onChange) {
      try {
        this.onChange();
      } catch {
        /* ignore */
      }
    }
  }

  create({ gameType, mode, name, skin, totalRounds, boardScale, turnMs, roomCode, visibility, uid, joinPass, fillBots, clubTag, clubId, clubName, friendshipStake, celestial, weather, grudgeMatch, grudgeVsUid }) {
    const passNorm = normalizeJoinPass(joinPass);
    if (joinPass && passNorm === null) {
      return { ok: false, error: '进房口令需为 4–8 位字母或数字' };
    }
    let code;
    const custom = normalizeRoomCode(roomCode);
    if (custom) {
      if (custom.length < 4) return { ok: false, error: '自定义房间号至少 4 位' };
      if (this.rooms.has(custom)) return { ok: false, error: '房间号已存在' };
      code = custom;
    } else {
      code = genCode();
      while (this.rooms.has(code)) code = genCode();
    }
    const playerId = genId();
    const room = new Room({
      code,
      gameType: gameType || 'gomoku',
      mode: mode || '1v1',
      hostId: playerId,
      hostName: name || '房主',
      hostSkin: skin || 'red',
      totalRounds,
      boardScale,
      turnMs,
      visibility,
      joinPass: passNorm || '',
      fillBots: !!fillBots,
      clubTag,
      clubId,
      clubName,
      friendshipStake,
      celestial,
      weather,
      grudgeMatch,
      grudgeVsUid,
    });
    const hostSeat = room.seats[0];
    if (hostSeat && hostSeat.player && uid) {
      hostSeat.player.uid = uid;
      hostSeat.player.profile = getProfileById(uid, name || '房主');
    }
    this.rooms.set(code, room);
    this.playerRoom.set(playerId, code);
    this.notifyChange();
    return { ok: true, playerId, room };
  }

  join(code, { name, skin, asSpectator, asCommentator, seatIndex, uid, joinPass }) {
    const room = this.rooms.get(normalizeRoomCode(code));
    if (!room) return { ok: false, error: '房间不存在' };
    if (room.phase === 'seriesEnd') return { ok: false, error: '系列赛已结束' };
    const playerId = genId();
    const result = room.join({
      playerId,
      name,
      skin,
      asSpectator,
      asCommentator,
      seatIndex,
      uid,
      joinPass,
    });
    if (!result.ok) return result;
    this.playerRoom.set(playerId, room.code);
    this.notifyChange();
    return { ok: true, playerId, room, role: result.role };
  }

  /**
   * 一键匹配：优先加入兼容的公开等候房间，否则创建新公开房
   */
  quickMatch({
    gameType, mode, name, skin, totalRounds, boardScale, turnMs, uid,
  }) {
    const gt = normalizeGameType(gameType);
    const md = normalizeMode(gt, mode);
    const tm = Math.min(120000, Math.max(5000, Number(turnMs) || TURN_MS));

    const candidates = [];
    for (const room of this.rooms.values()) {
      if (room.visibility !== 'public') continue;
      if (room.hasJoinPass()) continue;
      if (room.phase !== 'lobby') continue;
      if (room.gameType !== gt) continue;
      if (room.mode !== md) continue;
      if (room.turnMs !== tm) continue;
      const seated = room.seats.filter((s) => s.player).length;
      if (seated >= room.seats.length) continue;
      candidates.push({ room, seated });
    }
    candidates.sort((a, b) => b.seated - a.seated);

    for (const { room } of candidates) {
      const playerId = genId();
      const result = room.join({
        playerId,
        name,
        skin,
        uid,
        asSpectator: false,
        asCommentator: false,
        joinPass: '',
      });
      if (result.ok) {
        this.playerRoom.set(playerId, room.code);
        this.notifyChange();
        return { ok: true, playerId, room, matched: true };
      }
    }

    return { ok: true, matched: false, queued: true };
  }

  /**
   * 断线重连：按房间码 + playerKey/uid 回到原座位
   */
  rejoin(code, { playerKey, uid, name, skin, joinPass }) {
    const room = this.rooms.get(normalizeRoomCode(code));
    if (!room) return { ok: false, error: '房间不存在或已解散' };
    const result = room.rejoin({ playerKey, uid, name, skin, joinPass });
    if (!result.ok) return result;
    this.cancelPendingLeave(result.playerId);
    this.playerRoom.set(result.playerId, room.code);
    room.markOnline(result.playerId);
    this.notifyChange();
    return { ok: true, playerId: result.playerId, room };
  }

  listPublicRooms() {
    const list = [];
    for (const room of this.rooms.values()) {
      if (room.visibility !== 'public') continue;
      if (room.phase === 'seriesEnd') continue;
      const seated = room.seats.filter((s) => s.player).length;
      const specs = room.spectators.length;
      list.push({
        code: room.code,
        gameType: room.gameType,
        mode: room.mode,
        phase: room.phase,
        visibility: 'public',
        hasJoinPass: room.hasJoinPass(),
        seated,
        seatCount: room.seats.length,
        spectators: specs,
        specCount: SPEC_SEAT_COUNT,
        totalRounds: room.totalRounds,
        currentRound: room.currentRound,
        boardScale: room.boardScale,
        hostName: (() => {
          const host = room.seats.find((s) => s.player && s.player.id === room.hostId)
            || room.seats.find((s) => s.player);
          return (host && host.player && host.player.name) || '未知';
        })(),
        clubTag: room.clubTag || '',
        clubName: room.clubName || '',
        friendshipStake: room.friendshipStake || '',
        celestial: !!room.celestial,
        weather: weatherPublic(room.weather) || (room.celestial && room.phase === 'lobby'
          ? { id: 'ready', label: '天象', icon: '✨' }
          : null),
        grudgeMatch: !!room.grudgeMatch,
        gardenGrowth: social.normalizeGarden(room.garden).growth,
        gardenBloom: social.normalizeGarden(room.garden).bloomCount,
        players: room.seats.filter((s) => s.player).map((s) => ({
          uid: s.player.uid || null,
          name: s.player.name,
        })),
      });
    }
    return list;
  }

  getByPlayer(playerId) {
    const code = this.playerRoom.get(playerId);
    if (!code) return null;
    return this.rooms.get(code) || null;
  }

  cancelPendingLeave(playerId) {
    const pending = this.pendingLeaves.get(playerId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingLeaves.delete(playerId);
    }
    const room = this.getByPlayer(playerId);
    if (room) room.clearDisconnectTimer(playerId);
  }

  /**
   * 闪断：保留座位一段时间，超时再真正离开
   * seriesEnd 立即离开；kick / 主动 leave 走 leaveImmediate
   */
  scheduleLeave(playerId, onDone) {
    const room = this.getByPlayer(playerId);
    if (!room) return null;
    if (room.phase === 'seriesEnd') {
      return this.leaveImmediate(playerId);
    }
    this.cancelPendingLeave(playerId);
    room.markOffline(playerId);
    this.notifyChange();
    const timer = setTimeout(() => {
      this.pendingLeaves.delete(playerId);
      const left = this.leaveImmediate(playerId);
      if (typeof onDone === 'function') onDone(left);
    }, RECONNECT_GRACE_MS);
    this.pendingLeaves.set(playerId, { roomCode: room.code, timer });
    room.disconnectTimers.set(playerId, timer);
    return room;
  }

  leaveImmediate(playerId) {
    this.cancelPendingLeave(playerId);
    const room = this.getByPlayer(playerId);
    if (!room) return null;
    room.leave(playerId);
    this.playerRoom.delete(playerId);
    if (room.isRoomEmpty()) this.rooms.delete(room.code);
    this.notifyChange();
    return room;
  }

  leave(playerId) {
    return this.leaveImmediate(playerId);
  }

  kick(hostId, targetId) {
    const room = this.getByPlayer(hostId);
    if (!room) return { ok: false, error: '不在房间内' };
    this.cancelPendingLeave(targetId);
    const r = room.kick(hostId, targetId);
    if (!r.ok) return r;
    this.playerRoom.delete(targetId);
    if (room.isRoomEmpty()) this.rooms.delete(room.code);
    this.notifyChange();
    return { ok: true, room, kickedId: targetId };
  }

  serializeAll() {
    const rooms = [];
    for (const room of this.rooms.values()) {
      if (room.phase === 'seriesEnd') continue;
      const empty = room.isRoomEmpty();
      if (empty) continue;
      rooms.push(room.serialize());
    }
    return { version: 1, savedAt: Date.now(), rooms };
  }

  loadFromData(data) {
    if (!data || !Array.isArray(data.rooms)) return { loaded: 0 };
    let loaded = 0;
    for (const raw of data.rooms) {
      try {
        const room = Room.restore(raw);
        if (!room) continue;
        if (this.rooms.has(room.code)) continue;
        this.rooms.set(room.code, room);
        for (const seat of room.seats) {
          if (seat.player) this.playerRoom.set(seat.player.id, room.code);
        }
        for (const s of room.specSeats) {
          if (s) this.playerRoom.set(s.id, room.code);
        }
        for (const s of room.commentatorSeats) {
          if (s) this.playerRoom.set(s.id, room.code);
        }
        loaded += 1;
      } catch (e) {
        console.error('restore room failed', e);
      }
    }
    return { loaded };
  }
}

module.exports = {
  RoomManager,
  Room,
  genId,
  TURN_MS,
  QUICK_TEXTS,
  ALLOWED_EMOTES,
  SPEC_SEAT_COUNT,
  COMMENTATOR_SEAT_COUNT,
  RECONNECT_GRACE_MS,
  DANMAKU_MAX_LEN,
  DANMAKU_COOLDOWN_MS,
  BOARD_THEME_IDS,
  BOARD_THEME_COOLDOWN_MS,
  REMATCH_MS,
  TRUTH_PICK_MS,
  TRUTH_ANSWER_MS,
  TRUTH_PENALTY,
  TRUTH_BANK,
  COACH_COOLDOWN_MS,
  normalizeJoinPass,
  normalizeRoomCode,
  normalizeGameType,
  normalizeMode,
  normalizeFriendshipStake,
  resolveQuickText,
  starterProps,
  GAME_PROP_IDS,
  GENERIC_PROP_IDS,
  WEATHER_TYPES,
  defaultCelestial,
  METEOR_BONUS_MS,
  SPIRIT_SPAWN_AFTER,
};
