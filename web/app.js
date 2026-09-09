(() => {
  const GAME_TYPES = [
    { id: 'gomoku', label: '五子棋' },
    { id: 'reversi', label: '黑白棋' },
    { id: 'go', label: '围棋' },
    { id: 'draughts', label: '国际跳棋' },
    { id: 'flying', label: '飞行棋' },
  ];
  const MODES = [
    { id: '1v1', label: '1v1' },
    { id: '3p', label: '3人' },
    { id: '2v2', label: '2v2' },
    { id: 'props', label: '道具赛' },
    { id: 'aid', label: '外援赛' },
    { id: 'youjin', label: '友尽赛' },
  ];
  const SKINS = [
    { id: 'red', label: '赤红', color: '#c62828' },
    { id: 'blue', label: '靛青', color: '#1565c0' },
    { id: 'green', label: '青碧', color: '#2e7d32' },
    { id: 'pink', label: '桃粉', color: '#c2185b' },
    { id: 'yellow', label: '琥珀', color: '#f9a825' },
  ];
  const BOARD_SCALES = [
    { id: 'small', label: '小棋盘' },
    { id: 'large', label: '大棋盘' },
  ];
  const TURN_TIMES = [
    { id: 10000, label: '10秒' },
    { id: 15000, label: '15秒' },
    { id: 30000, label: '30秒' },
    { id: 45000, label: '45秒' },
    { id: 60000, label: '60秒' },
  ];
  const VISIBILITIES = [
    { id: 'public', label: '公开' },
    { id: 'private', label: '私密' },
  ];
  const THEMES = [
    { id: 'orange', label: '橙色' },
    { id: 'blue', label: '蓝色' },
    { id: 'pink', label: '粉色' },
    { id: 'green', label: '绿色' },
    { id: 'yellow', label: '黄色' },
    { id: 'red', label: '红色' },
  ];
  const BOARD_THEMES = [
    { id: 'default', label: '默认' },
    { id: 'theme-1', label: '立绘一', src: '/assets/themes/theme-1.png' },
    { id: 'theme-2', label: '立绘二', src: '/assets/themes/theme-2.png' },
    { id: 'theme-3', label: '立绘三', src: '/assets/themes/theme-3.png' },
    { id: 'theme-4', label: '立绘四', src: '/assets/themes/theme-4.png' },
  ];
  const FLYING_HEX = { 1: '#e53935', 2: '#f9a825', 3: '#1e88e5', 4: '#43a047' };
  const FLYING_LABEL = { 1: '红', 2: '黄', 3: '蓝', 4: '绿' };
  const THEME_LOCKED = new Set(['draughts', 'flying']);
  const EMOTES = [
    { id: 'heart', label: '爱心', icon: '❤️', src: '/assets/emotes/heart.svg' },
    { id: 'egg', label: '鸡蛋', icon: '🥚', src: '/assets/emotes/egg.svg' },
    { id: 'flower', label: '玫瑰', icon: '🌹', src: '/assets/emotes/flower.svg' },
    { id: 'smile', label: '笑脸', icon: '😊', src: '/assets/emotes/smile.svg' },
    { id: 'angry', label: '愤怒', icon: '😠', src: '/assets/emotes/angry.svg' },
    { id: 'cry', label: '哭脸', icon: '😢', src: '/assets/emotes/cry.svg' },
    { id: 'speechless', label: '无语', icon: '😐', src: '/assets/emotes/speechless.svg' },
  ];
  const DEFAULT_QUICK = [
    { id: 1, text: '你的棋下的真不错' },
    { id: 2, text: '好一手烂棋' },
    { id: 3, text: '看我秒了你' },
    { id: 4, text: '会不会玩啊你' },
    { id: 5, text: '菜就多练' },
    { id: 6, text: '多沉淀沉淀' },
    { id: 7, text: '快点啊，我等得花都谢了' },
  ];
  const GIFT_ITEMS = [
    { id: 'cookies', label: '饼干', key: 'cookies', src: '/assets/gifts/cookies.svg' },
    { id: 'cakes', label: '蛋糕', key: 'cakes', src: '/assets/gifts/cakes.svg' },
    { id: 'lollipops', label: '棒棒糖', key: 'lollipops', src: '/assets/gifts/lollipops.svg' },
  ];
  const STAKE_OPTIONS = [
    { id: '', label: '无赌注' },
    { id: 'cookies', label: '饼干' },
    { id: 'cakes', label: '蛋糕' },
    { id: 'lollipops', label: '棒棒糖' },
  ];
  const DAILY_TASK_TOASTS = {
    first_win: '今日首胜已达成，去领取',
    games_3: '完成 3 局已达成，去领取',
    spectate_1: '观战 1 局已达成，去领取',
    all_daily: '全部每日任务已达成，可领取保段卡',
  };
  const WEATHER_LABELS = {
    fogSpread: { label: '迷雾扩散', icon: '🌫' },
    tide: { label: '潮汐', icon: '🌊' },
    meteor: { label: '流星', icon: '☄' },
    ready: { label: '天象', icon: '✨' },
  };
  const SEAT_JOBS = [
    { id: '', label: '无' },
    { id: 'chef', label: '🍳 厨师' },
    { id: 'spy', label: '🕶 间谍' },
    { id: 'gardener', label: '🌱 园丁' },
    { id: 'archaeologist', label: '⛏ 考古学家' },
  ];
  const GARDEN_BLOOM = 100;

  function defaultCelestialOn() {
    if (state.gameType === 'draughts' || state.gameType === 'flying') return false;
    if (state.mode === 'props' || state.mode === 'aid') return true;
    if (state.mode === '2v2' && state.visibility !== 'private') return true;
    return false;
  }

  function resolvedCelestial() {
    const stored = localStorage.getItem('qiba_celestial');
    if (stored === '1') return true;
    if (stored === '0') return false;
    return defaultCelestialOn();
  }

  function stoneIsDark(color) {
    return color === 1 || color === 3;
  }

  function colorWordOf(room, color) {
    if (!room) return color === 1 ? '黑' : '白';
    if (room.gameType === 'flying') return FLYING_LABEL[color] || color;
    if (room.gameType === 'draughts') return color === 1 ? '深' : '浅';
    if (room.goTeam || (room.gameType === 'go' && room.mode === '2v2')) {
      return ({ 1: '黑甲', 2: '白甲', 3: '黑乙', 4: '白乙' }[color]) || '棋';
    }
    return stoneIsDark(color) ? '黑' : '白';
  }

  const ANIM_MS = 320;
  const FLYING_STEP_MS = 240;
  const DICE_FX_MS = 1250;
  const PRACTICE_SIZE = 15;
  /** 与 billzi2016/Gomoku-AI 同一引擎；官网 demo 5s，练习局用 2.5s 降低等待 */
  const PRACTICE_THINK_MS = 2500;
  const PROP_PUBLIC = [
    { id: 'swallow', label: '吞噬' },
    { id: 'timeCut', label: '压时' },
    { id: 'undoPlus', label: '加悔' },
  ];
  const PROP_BY_GAME = {
    gomoku: [
      { id: 'forbiddenPoint', label: '禁手点', needCell: true },
      { id: 'fog', label: '迷雾' },
    ],
    reversi: [
      { id: 'flipProtect', label: '翻转保护', needCell: true },
      { id: 'forceSwap', label: '强制换位', needTwo: true },
    ],
    go: [
      { id: 'komiAdjust', label: '贴目调整', needDelta: true },
      { id: 'passReward', label: '虚手奖励' },
    ],
    flying: [
      { id: 'remoteDice', label: '遥控骰子', needDice: true },
      { id: 'shield', label: '护盾' },
    ],
    draughts: PROP_PUBLIC,
  };
  const PUZZLES = [
    {
      id: 'kill-1',
      title: '入门 · 一子冲四',
      type: 'kill',
      maxMoves: 1,
      timeSec: 45,
      desc: '黑先，1 步内取胜。白已堵住左端，请在右端连成五子。',
      stones: [
        [7, 4, 1], [7, 5, 1], [7, 6, 1], [7, 7, 1],
        [7, 3, 2], [6, 6, 2], [8, 5, 2], [5, 8, 2],
      ],
    },
    {
      id: 'kill-2',
      title: '初级 · 活三取胜',
      type: 'kill',
      maxMoves: 2,
      timeSec: 60,
      desc: '黑先，2 步内取胜。先走活三做成活四，白只能挡一端，再下另一端。',
      stones: [
        [7, 5, 1], [7, 6, 1], [7, 7, 1],
        [6, 4, 2], [8, 4, 2], [5, 8, 2],
      ],
    },
    {
      id: 'kill-3',
      title: '中级 · 冲四追击',
      type: 'kill',
      maxMoves: 3,
      timeSec: 75,
      desc: '黑先，3 步内取胜。先冲四逼白去挡，再走右边活三做成活四取胜。',
      stones: [
        [7, 4, 1], [7, 5, 1], [7, 6, 1], [4, 10, 1], [5, 10, 1], [6, 10, 1],
        [7, 3, 2], [6, 5, 2], [8, 5, 2], [8, 6, 2], [5, 5, 2], [6, 11, 2],
      ],
    },
    {
      id: 'live-1',
      title: '防守 · 拦门做活',
      type: 'survive',
      maxMoves: 1,
      timeSec: 40,
      desc: '白已成冲四，黑必须挡住唯一杀点，否则下一步被连五。',
      stones: [
        [7, 3, 1], [6, 5, 1], [8, 5, 1], [5, 8, 1],
        [7, 4, 2], [7, 5, 2], [7, 6, 2], [7, 7, 2],
      ],
    },
    {
      id: 'kill-4',
      title: '高级 · 斜线追击',
      type: 'kill',
      maxMoves: 3,
      timeSec: 90,
      desc: '黑先，3 步内取胜。斜线冲四逼挡后，再走右侧活三连攻。',
      stones: [
        [5, 5, 1], [6, 6, 1], [7, 7, 1], [5, 10, 1], [6, 10, 1], [7, 10, 1],
        [4, 4, 2], [6, 4, 2], [8, 5, 2], [8, 6, 2], [5, 8, 2], [6, 11, 2],
      ],
    },
  ];

  function propsForGame(gameType) {
    return PROP_BY_GAME[gameType] || PROP_PUBLIC;
  }

  const PracticeAI = {
    worker: null,
    ready: null,
    jobId: 0,
    jobs: new Map(),
    async ensure() {
      if (this.ready) return this.ready;
      this.ready = new Promise((resolve, reject) => {
        let worker;
        try {
          worker = new Worker('/ai-worker.js', { type: 'module' });
        } catch (e) {
          reject(new Error('无法启动 Wasm 五子 AI Worker'));
          return;
        }
        this.worker = worker;
        worker.onmessage = (ev) => {
          const { jobId, ok, result, error } = ev.data || {};
          const job = this.jobs.get(jobId);
          if (!job) return;
          this.jobs.delete(jobId);
          if (ok) job.resolve(result);
          else job.reject(new Error(error || 'AI 搜索失败'));
        };
        worker.onerror = (ev) => {
          const err = new Error(ev.message || 'Wasm 五子 AI 加载失败');
          if (this.jobs.size) {
            for (const job of this.jobs.values()) job.reject(err);
            this.jobs.clear();
          } else {
            reject(err);
          }
        };
        const id = ++this.jobId;
        this.jobs.set(id, { resolve, reject });
        worker.postMessage({ jobId: id, type: 'init' });
      }).catch((e) => {
        this.ready = null;
        throw e;
      });
      return this.ready;
    },
    async search(board, color = 2) {
      await this.ensure();
      const cells = new Int8Array(PRACTICE_SIZE * PRACTICE_SIZE);
      for (let r = 0; r < PRACTICE_SIZE; r += 1) {
        for (let c = 0; c < PRACTICE_SIZE; c += 1) {
          const v = board[r][c];
          cells[r * PRACTICE_SIZE + c] = v === 1 ? 1 : v === 2 ? -1 : 0;
        }
      }
      const id = ++this.jobId;
      return new Promise((resolve, reject) => {
        this.jobs.set(id, { resolve, reject });
        this.worker.postMessage({
          jobId: id,
          type: 'search',
          cells,
          isBlackTurn: color === 1,
          thinkTimeMs: PRACTICE_THINK_MS,
          legalMoves: new Uint8Array(0),
        });
      });
    },
  };

  function ensureUid() {
    let id = localStorage.getItem('qiba_uid');
    if (!id) {
      id = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem('qiba_uid', id);
    }
    return id;
  }

  function loadAuth() {
    try {
      return JSON.parse(localStorage.getItem('qiba_auth') || 'null');
    } catch {
      return null;
    }
  }

  function loadMutedUids() {
    try {
      const arr = JSON.parse(localStorage.getItem('qiba_muted_uids') || '[]');
      return Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  function saveMutedUids() {
    localStorage.setItem('qiba_muted_uids', JSON.stringify(state.mutedUids || []));
  }

  function isMutedUid(uid) {
    if (!uid) return false;
    return (state.mutedUids || []).includes(String(uid));
  }

  function isMutedChat(item) {
    if (!item) return false;
    if (item.uid && isMutedUid(item.uid)) return true;
    const room = state.room;
    if (!room || !item.playerId) return false;
    const seated = (room.seats || []).find((s) => s.player && s.player.id === item.playerId);
    const uid = seated
      ? seated.player.uid
      : ((room.specSeats || room.spectators || []).find((s) => s && s.id === item.playerId)
        || (room.commentatorSeats || room.commentators || []).find((s) => s && s.id === item.playerId)
        || {}).uid;
    return !!(uid && isMutedUid(uid));
  }

  function mutePlayer(uid, name) {
    if (!uid || uid === state.uid) return;
    if (!isMutedUid(uid)) {
      state.mutedUids = [...(state.mutedUids || []), String(uid)];
      saveMutedUids();
    }
    toast(`已屏蔽 ${name || '该玩家'}`);
    persistMuteToProfile();
    if (state.room) {
      if (state.view === 'game') renderChat(state.room);
      if (state.view === 'room') renderLobbyChat(state.room);
    }
  }

  function unmutePlayer(uid) {
    state.mutedUids = (state.mutedUids || []).filter((id) => id !== String(uid));
    saveMutedUids();
    toast('已解除屏蔽');
    persistMuteToProfile();
    renderMuteList();
    if (state.room) {
      if (state.view === 'game') renderChat(state.room);
      if (state.view === 'room') renderLobbyChat(state.room);
    }
  }

  function persistMuteToProfile() {
    if (!state.uid || !isLoggedIn()) return;
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: state.uid,
        name: state.name,
        signature: state.signature,
        mutedUids: state.mutedUids,
        quickChats: collectQuickChats(),
      }),
    }).catch(() => {});
  }

  function collectQuickChats() {
    const inputs = document.querySelectorAll('#quickEditList input');
    if (!inputs.length) {
      return (state.profile && state.profile.quickChats) || Array(7).fill('');
    }
    return Array.from(inputs).map((el) => (el.value || '').trim().slice(0, 24));
  }

  function myQuickList() {
    const custom = (state.profile && state.profile.quickChats) || [];
    return DEFAULT_QUICK.map((t, i) => {
      const text = String(custom[i] || '').trim();
      return { id: t.id, text: text || t.text };
    });
  }

  function muteChatBtn(c) {
    const uid = c && c.uid;
    if (!uid || uid === state.uid || isMutedUid(uid)) return '';
    const name = String(c.name || '').replace(/"/g, '');
    return `<button type="button" class="btn sm ghost chat-line-mute" data-mute-uid="${uid}" data-mute-name="${name}">屏蔽</button>`;
  }

  function bindMuteButtons(container) {
    if (!container) return;
    container.querySelectorAll('[data-mute-uid]').forEach((btn) => {
      btn.onclick = (ev) => {
        ev.stopPropagation();
        mutePlayer(btn.dataset.muteUid, btn.dataset.muteName);
      };
    });
  }

  const state = {
    view: 'home',
    uid: ensureUid(),
    auth: loadAuth(),
    name: localStorage.getItem('qiba_name') || `棋手${Math.floor(Math.random() * 900 + 100)}`,
    signature: localStorage.getItem('qiba_signature') || '',
    skin: localStorage.getItem('qiba_skin') || 'red',
    theme: localStorage.getItem('qiba_theme') || 'orange',
    profile: null,
    gameType: 'gomoku',
    mode: '1v1',
    totalRounds: 1,
    boardScale: 'large',
    turnMs: 30000,
    visibility: localStorage.getItem('qiba_visibility') || 'public',
    customCode: '',
    joinPass: localStorage.getItem('qiba_join_pass') || '',
    pendingJoin: null,
    recentMatches: [],
    roomSettingsOpen: false,
    playerId: '',
    room: null,
    remain: 30,
    ws: null,
    hover: null,
    arrows: [],
    circles: [],
    arrowDraft: null,
    replayIndex: null,
    selectedCell: null,
    worldTab: 'create',
    lastPhase: null,
    lastRound: null,
    lastMoveCount: 0,
    lastEffectsAt: 0,
    pieceAnim: null,
    urgentBeepTimer: null,
    rejoining: false,
    practiceMode: false,
    practiceThinking: false,
    practiceGen: 0,
    leaderboardTab: 'rush',
    season: null,
    fillBots: localStorage.getItem('qiba_fill_bots') === '1',
    celestial: localStorage.getItem('qiba_celestial') !== '0',
    friendshipStake: localStorage.getItem('qiba_friendship_stake') || '',
    mutedUids: loadMutedUids(),
    viewingProfile: null,
    rematchTick: null,
    truthTick: null,
    propTarget: null,
    puzzleMode: false,
    puzzle: null,
    puzzleMoves: 0,
    worldGameFilter: 'all',
    worldRooms: [],
    worldFeed: [],
    pendingInvite: null,
    inviteInbox: [],
    botBusy: false,
    stripCollapsed: { spec: false, commentator: false },
    lastSpyRevealUntil: 0,
    matchQueueAt: 0,
    matchQueueTimer: null,
    lastRankCeremonyKey: '',
    lastDailyToastKey: '',
  };

  if (state.auth && state.auth.uid) {
    state.uid = state.auth.uid;
    localStorage.setItem('qiba_uid', state.uid);
    if (state.auth.nickname) {
      state.name = state.auth.nickname;
      localStorage.setItem('qiba_name', state.name);
    }
  }

  let timer = null;
  let animRaf = null;
  let diceFxTimer = null;
  const boardTexture = new Image();
  boardTexture.src = '/assets/board-texture.png';
  const draughtsBoardImg = new Image();
  draughtsBoardImg.src = '/assets/boards/draughts-board.png';
  const flyingBoardImg = new Image();
  flyingBoardImg.src = '/assets/boards/aeroplane-board.png';
  const themeImages = {};
  BOARD_THEMES.forEach((t) => {
    if (!t.src) return;
    const img = new Image();
    img.src = t.src;
    themeImages[t.id] = img;
  });
  const $ = (id) => document.getElementById(id);

  function isLoggedIn() {
    return !!(state.auth && state.auth.username);
  }

  function requireLogin(action) {
    if (isLoggedIn()) return true;
    toast('请先登录账号后再匹配真人');
    openAuth();
    $('authHint').textContent = action
      ? `请先登录后再${action}`
      : '真人联机需要登录账号';
    return false;
  }

  function saveLastRoom(code, playerKey) {
    if (!code || !playerKey) return;
    try {
      localStorage.setItem('qiba_last_room', JSON.stringify({
        code: String(code).toUpperCase(),
        playerKey,
        uid: state.uid,
        at: Date.now(),
      }));
    } catch {
      /* ignore */
    }
  }

  function loadLastRoom() {
    try {
      return JSON.parse(localStorage.getItem('qiba_last_room') || 'null');
    } catch {
      return null;
    }
  }

  function clearLastRoom() {
    localStorage.removeItem('qiba_last_room');
  }

  function giftMeta(id) {
    return GIFT_ITEMS.find((g) => g.id === id) || { id, label: id, src: '' };
  }

  function iconImg(src, alt, cls = 'asset-icon') {
    if (!src) return alt || '';
    return `<img class="${cls}" src="${src}" alt="${alt || ''}" draggable="false" />`;
  }

  function applyTheme(themeId) {
    const id = THEMES.some((t) => t.id === themeId) ? themeId : 'orange';
    state.theme = id;
    document.documentElement.setAttribute('data-theme', id);
    localStorage.setItem('qiba_theme', id);
  }

  function show(view) {
    state.view = view;
    ['home', 'profile', 'room', 'game'].forEach((v) => {
      $(`view-${v}`).classList.toggle('hidden', v !== view);
    });
  }

  function toast(msg) {
    if (state.view === 'home') $('homeHint').textContent = msg || '';
    else if (state.view === 'profile') $('profileHint').textContent = msg || '';
    else if (state.view === 'room') $('roomHint').textContent = msg || '';
    else $('gameHint').textContent = msg || '';
  }

  function flashToast(msg) {
    if (!msg) return;
    const stack = $('toastStack');
    if (!stack) {
      toast(msg);
      return;
    }
    const el = document.createElement('div');
    el.className = 'flash-toast';
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  function notifyDailyTaskToasts(ids, sourceKey) {
    const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (!list.length) return;
    const key = `${sourceKey || 'x'}:${list.join(',')}`;
    if (state.lastDailyToastKey === key) return;
    state.lastDailyToastKey = key;
    list.forEach((id) => {
      const text = DAILY_TASK_TOASTS[id];
      if (text) flashToast(text);
    });
  }

  function myRoomProfile(room) {
    if (!room || !room.you) return null;
    if (room.you.seat && room.you.seat.player && room.you.seat.player.profile) {
      return room.you.seat.player.profile;
    }
    return null;
  }

  function maybeShowRankCeremony(profile) {
    const rc = profile && profile.rankChange;
    if (!rc || !rc.type) return;
    const key = `${rc.type}:${rc.from}:${rc.to}:${rc.at || ''}`;
    if (state.lastRankCeremonyKey === key) return;
    state.lastRankCeremonyKey = key;
    const overlay = $('rankCeremony');
    const card = overlay && overlay.querySelector('.rank-ceremony-card');
    if (!overlay || !card) {
      if (rc.type === 'protected') flashToast('保段卡已生效');
      else if (rc.type === 'up') flashToast(`晋级 ${rc.fromLabel} → ${rc.toLabel}`);
      else flashToast(`掉段 ${rc.fromLabel} → ${rc.toLabel}`);
      return;
    }
    card.classList.remove('up', 'down', 'protected');
    card.classList.add(rc.type === 'up' ? 'up' : rc.type === 'down' ? 'down' : 'protected');
    const kind = rc.type === 'up' ? '晋级' : rc.type === 'down' ? '掉段' : '保段';
    if ($('rankCeremonyKind')) $('rankCeremonyKind').textContent = kind;
    if ($('rankCeremonyFrom')) $('rankCeremonyFrom').textContent = rc.fromLabel || '';
    if ($('rankCeremonyTo')) $('rankCeremonyTo').textContent = rc.toLabel || '';
    if ($('rankCeremonyHint')) {
      $('rankCeremonyHint').textContent = rc.type === 'protected'
        ? '保段卡已生效'
        : rc.type === 'up'
          ? `${rc.fromLabel} 晋升为 ${rc.toLabel}`
          : `${rc.fromLabel} 掉至 ${rc.toLabel}`;
    }
    overlay.classList.remove('hidden');
    if (window.QibaFx) {
      if (rc.type === 'up') QibaFx.celebrateWin();
      else if (rc.type === 'protected') QibaFx.celebrateDraw();
    }
  }

  function tickMatchQueue() {
    const el = $('matchQueueTimer');
    if (!el || !state.matchQueueAt) return;
    const sec = Math.max(0, Math.floor((Date.now() - state.matchQueueAt) / 1000));
    el.textContent = `${sec} 秒`;
  }

  function startMatchQueueUI(startedAt) {
    state.matchQueueAt = Number(startedAt) || Date.now();
    const overlay = $('matchQueueOverlay');
    if (overlay) overlay.classList.remove('hidden');
    tickMatchQueue();
    if (state.matchQueueTimer) clearInterval(state.matchQueueTimer);
    state.matchQueueTimer = setInterval(tickMatchQueue, 1000);
  }

  function stopMatchQueueUI() {
    if (state.matchQueueTimer) {
      clearInterval(state.matchQueueTimer);
      state.matchQueueTimer = null;
    }
    state.matchQueueAt = 0;
    const overlay = $('matchQueueOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function showInviteModal(msg) {
    if (!msg) return;
    if (state.pendingInvite && $('inviteModal') && !$('inviteModal').classList.contains('hidden')) {
      state.inviteInbox.push(msg);
      return;
    }
    state.pendingInvite = msg;
    if ($('inviteText')) {
      $('inviteText').textContent = `${msg.fromName || '好友'} 邀请你加入私密房 ${msg.code}`;
    }
    if ($('inviteModal')) $('inviteModal').classList.remove('hidden');
    toast(`${msg.fromName || '好友'} 发来对局邀请`);
  }

  function nextInviteOrClose() {
    const next = state.inviteInbox.shift();
    state.pendingInvite = null;
    if ($('inviteModal')) $('inviteModal').classList.add('hidden');
    if (next) showInviteModal(next);
  }

  function updateAuthUI() {
    const logged = isLoggedIn();
    $('btnLogin').innerHTML = `<span>${logged ? '个人档案' : '登录'}</span>`;
    $('homeAuthTip').textContent = logged
      ? `${state.auth.username}`
      : '请先登录';
    const logoutBtn = $('btnLogout');
    if (logoutBtn) logoutBtn.classList.toggle('hidden', !logged);
    updateInboxBadge();
  }

  function wsUrl() {
    const configured = window.QIBA_WS_URL;
    const isVercel = /\.vercel\.app$/i.test(location.hostname);
    if (isVercel && configured) {
      try {
        const u = new URL(configured, location.origin);
        const proto = (u.protocol === 'https:' || u.protocol === 'wss:') ? 'wss:' : 'ws:';
        const path = u.pathname === '/' ? '' : u.pathname;
        return `${proto}//${u.host}${path}`;
      } catch (e) {
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${proto}//${String(configured).replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '')}`;
      }
    }
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}`;
  }

  function connect(opts = {}) {
    const wantRejoin = opts.autoRejoin !== false;
    return new Promise((resolve, reject) => {
      if (state.ws && state.ws.readyState === 1) {
        if (wantRejoin && opts.forceRejoin) tryAutoRejoin();
        resolve(state.ws);
        return;
      }
      const ws = new WebSocket(wsUrl());
      state.ws = ws;
      ws.onopen = () => {
        if (state.uid) {
          try {
            ws.send(JSON.stringify({ type: 'hello', uid: state.uid, name: state.name }));
          } catch {
            /* ignore */
          }
        }
        if (wantRejoin) tryAutoRejoin();
        resolve(ws);
      };
      ws.onerror = () => reject(new Error('无法连接服务器'));
      ws.onclose = () => {
        if (state.matchQueueAt) {
          stopMatchQueueUI();
          if (state.view === 'home') toast('连接已断开，匹配已取消');
        }
        if (state.view !== 'home') toast('连接已断开，正在尝试重连…');
        const last = loadLastRoom();
        if (!last && state.view === 'home') return;
        setTimeout(() => {
          connect({ autoRejoin: true }).catch(() => {});
        }, 1200);
      };
      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        onMessage(msg);
      };
    });
  }

  async function tryAutoRejoin() {
    if (state.rejoining || state.playerId) return;
    const last = loadLastRoom();
    if (!last || !last.code || !last.playerKey) return;
    // 超过 10 分钟的记录不再自动重连
    if (last.at && Date.now() - last.at > 10 * 60 * 1000) {
      clearLastRoom();
      return;
    }
    state.rejoining = true;
    send({
      type: 'rejoin',
      code: last.code,
      playerKey: last.playerKey,
      uid: state.uid,
      name: state.name,
      skin: state.skin,
    });
  }

  function leaveRoomLocal(clearSaved = true) {
    if (state.practiceMode) {
      stopPractice();
      return;
    }
    const room = state.room;
    const seatedPlaying = !!(room && room.phase === 'playing' && room.you && room.you.seat && !state.practiceMode);
    if (seatedPlaying) {
      if (!window.confirm('强制退出将在当前棋种记两场失败（认输只记一场）。确定离开？')) return;
      if (state.ws && state.ws.readyState === 1 && state.playerId) {
        send({ type: 'forceQuit' });
      }
      resetClientToHome(clearSaved);
      return;
    }
    stopUrgentBeep();
    if (state.rematchTick) {
      clearInterval(state.rematchTick);
      state.rematchTick = null;
    }
    if (state.truthTick) {
      clearInterval(state.truthTick);
      state.truthTick = null;
    }
    if (state.matchQueueAt) stopMatchQueueUI();
    if (state.ws && state.ws.readyState === 1 && state.playerId) {
      send({ type: 'leave' });
    }
    resetClientToHome(clearSaved);
  }

  function resetClientToHome(clearSaved = true) {
    stopUrgentBeep();
    if (state.rematchTick) {
      clearInterval(state.rematchTick);
      state.rematchTick = null;
    }
    if (state.truthTick) {
      clearInterval(state.truthTick);
      state.truthTick = null;
    }
    if (state.matchQueueAt) stopMatchQueueUI();
    if (state.ws) {
      try {
        state.ws.close();
      } catch {
        /* ignore */
      }
    }
    state.ws = null;
    state.room = null;
    state.playerId = '';
    state.pieceAnim = null;
    clearBoardMarks();
    if (clearSaved) clearLastRoom();
    show('home');
    toast('');
    refreshProfileQuiet();
  }

  function send(obj) {
    if (!state.ws || state.ws.readyState !== 1) return;
    state.ws.send(JSON.stringify(obj));
  }

  function emoteMeta(id) {
    return EMOTES.find((e) => e.id === id) || { id, label: id, icon: '❔', src: '' };
  }

  function spawnFloatEmote(emote) {
    if (isMutedChat(emote)) return;
    const layer = $('emoteLayer');
    const el = document.createElement('div');
    el.className = 'float-emote';
    const meta = emoteMeta(emote.emote);
    el.innerHTML = meta.src
      ? `${iconImg(meta.src, meta.label, 'float-emote-img')}<span class="float-emote-label">${meta.label}</span>`
      : meta.icon;
    el.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 120)}px`);
    el.style.left = `${40 + Math.random() * 20}%`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1700);
  }

  function spawnFloatText(chat) {
    if (isMutedChat(chat)) return;
    const layer = $('emoteLayer');
    const el = document.createElement('div');
    el.className = 'float-text';
    if (chat.kind === 'gift') {
      const g = giftMeta(chat.item);
      el.innerHTML = `${chat.name} → ${chat.toName}：${iconImg(g.src, g.label, 'inline-icon')} ${g.label || chat.itemLabel || ''}`;
    } else {
      el.textContent = `${chat.name}：${chat.text}`;
    }
    el.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 80)}px`);
    el.style.left = `${30 + Math.random() * 30}%`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  function spawnDanmaku(dm) {
    const layer = $('danmakuLayer');
    if (!layer || !dm) return;
    if (isMutedChat(dm)) return;
    const el = document.createElement('div');
    el.className = 'danmaku-item';
    el.textContent = `${dm.name || ''}：${dm.text || ''}`;
    el.style.top = `${8 + Math.floor(Math.random() * 72)}%`;
    el.style.left = '100%';
    layer.appendChild(el);
    setTimeout(() => el.remove(), 8200);
  }

  function dailyRewardLabel(reward) {
    if (!reward) return '';
    const parts = [];
    if (reward.cookies) parts.push(`🍪×${reward.cookies}`);
    if (reward.cakes) parts.push(`🍰×${reward.cakes}`);
    if (reward.lollipops) parts.push(`🍭×${reward.lollipops}`);
    if (reward.rankProtect) parts.push(`保段卡×${reward.rankProtect}`);
    return parts.join(' ');
  }

  function renderDailyTasks(container, tasks) {
    if (!container) return;
    if (!isLoggedIn()) {
      container.innerHTML = `
        <p class="hint soft">请登录后查看每日任务</p>
        <button class="btn sm primary daily-login-cta" type="button"><span>去登录</span></button>`;
      const cta = container.querySelector('.daily-login-cta');
      if (cta) {
        cta.onclick = () => {
          openAuth();
          $('authHint').textContent = '请先登录后再查看每日任务';
        };
      }
      return;
    }
    const list = Array.isArray(tasks) ? tasks : [];
    if (!list.length) {
      container.innerHTML = '<p class="hint soft">任务加载中…</p>';
      return;
    }
    container.innerHTML = '';
    list.forEach((task) => {
      const row = document.createElement('div');
      row.className = 'daily-row';
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = `
        <strong>${task.label}</strong>
        <span class="reward">奖励 ${dailyRewardLabel(task.reward)}</span>
        <span class="progress">${task.progress}/${task.target}</span>`;
      row.appendChild(meta);
      const btn = document.createElement('button');
      btn.className = 'btn sm';
      if (task.claimed) {
        btn.disabled = true;
        btn.innerHTML = '<span>已领取</span>';
      } else if (task.done) {
        btn.className = 'btn sm primary';
        btn.innerHTML = '<span>领取</span>';
        btn.onclick = () => claimDailyTask(task.id);
      } else {
        btn.disabled = true;
        btn.innerHTML = '<span>未完成</span>';
      }
      row.appendChild(btn);
      container.appendChild(row);
    });
  }

  function paintDailyTasks(tasks) {
    renderDailyTasks($('profileDailyList'), tasks);
  }

  async function claimDailyTask(taskId) {
    if (!requireLogin('领取任务')) return;
    try {
      await connect({ autoRejoin: false });
      send({ type: 'claimDailyTask', uid: state.uid, name: state.name, taskId });
    } catch (e) {
      toast(e.message || '领取失败');
    }
  }

  function showProfile(profile) {
    if (!profile) return;
    state.viewingProfile = profile;
    $('profileName').textContent = profile.name || '未知';
    $('profileSign').textContent = profile.signature || '这个人很懒，还没有签名';
    $('profileRank').textContent = profile.rankLabel || '一阶';
    $('profileNext').textContent = profile.maxRank
      ? `已达最高段位 · 七阶 · 冲分 ${profile.rushScore || 0}`
      : `本赛季距${profile.nextRankLabel}还需 ${profile.winsToNextRank} 胜`;
    const inv = profile.inventory || profile;
    const season = profile.season || state.season;
    $('profileStats').innerHTML = `
      <div><span>历史对局</span><b>${profile.matches || 0}</b></div>
      <div><span>生涯胜场</span><b>${profile.wins || 0}</b></div>
      <div><span>本赛季胜</span><b>${profile.seasonWins != null ? profile.seasonWins : (profile.wins || 0)}</b></div>
      <div><span>周胜场</span><b>${profile.weeklyWins || 0}</b></div>
      <div><span>胜率</span><b>${profile.winRate || 0}%</b></div>
      <div><span>${iconImg('/assets/gifts/cookies.svg', '饼干', 'inline-icon')}</span><b>${inv.cookies || 0}</b></div>
      <div><span>${iconImg('/assets/gifts/cakes.svg', '蛋糕', 'inline-icon')}</span><b>${inv.cakes || 0}</b></div>
      <div><span>${iconImg('/assets/gifts/lollipops.svg', '棒棒糖', 'inline-icon')}</span><b>${inv.lollipops || 0}</b></div>
      <div><span>保段卡</span><b>${profile.rankProtect || 0}</b></div>
      ${season ? `<div><span>${season.label || '赛季'}</span><b>余 ${season.remainingText || '—'}</b></div>` : ''}`;
    const bond = $('profileBond');
    if (bond) {
      const bits = [];
      if (profile.mentorName) bits.push(`师傅 ${profile.mentorName}`);
      if (profile.apprenticeUids && profile.apprenticeUids.length) bits.push(`徒弟 ${profile.apprenticeUids.length} 人`);
      if (profile.rivals && profile.rivals.name) {
        bits.push(`宿敌 ${profile.rivals.name}（连${profile.rivals.lastOutcome === 'loss' ? '负' : '胜'} ${profile.rivals.streak}）`);
      }
      bond.textContent = bits.join(' · ') || '';
    }
    const mentorBtn = $('btnMentorInvite');
    if (mentorBtn) {
      const uid = profile.id;
      const self = !uid || uid === state.uid;
      mentorBtn.classList.toggle('hidden', self || !isLoggedIn());
      mentorBtn.onclick = () => {
        send({ type: 'mentorInvite', uid: state.uid, name: state.name, toUid: uid, toName: profile.name });
        toast(`已向 ${profile.name} 发出师徒邀请`);
      };
    }
    const muteBtn = $('btnMutePlayer');
    if (muteBtn) {
      const uid = profile.id;
      const self = !uid || uid === state.uid;
      muteBtn.classList.toggle('hidden', self);
      muteBtn.querySelector('span').textContent = isMutedUid(uid) ? '取消屏蔽' : '屏蔽该玩家';
      muteBtn.onclick = () => {
        if (isMutedUid(uid)) unmutePlayer(uid);
        else mutePlayer(uid, profile.name);
        showProfile(profile);
      };
    }
    $('profileModal').classList.remove('hidden');
  }

  function renderInventory(profile) {
    const inv = (profile && (profile.inventory || profile)) || {};
    const box = $('inventoryGrid');
    if (!box) return;
    box.innerHTML = `${GIFT_ITEMS.map((item) => `
      <div class="inv-item">
        <span class="inv-icon">${iconImg(item.src, item.label)}</span>
        <span class="inv-name">${item.label}</span>
        <b>${inv[item.key] || 0}</b>
      </div>`).join('')}
      <div class="inv-item">
        <span class="inv-icon">🛡</span>
        <span class="inv-name">保段卡</span>
        <b>${(profile && profile.rankProtect) || 0}</b>
      </div>`;
  }

  function fillArchive(profile) {
    state.profile = profile;
    $('archiveRank').textContent = profile.rankLabel || '一阶';
    $('archiveNext').textContent = profile.maxRank
      ? `已达最高段位 · 七阶 · 冲分 ${profile.rushScore || 0}`
      : `距${profile.nextRankLabel}还需 ${profile.winsToNextRank} 胜`;
    const bar = $('archiveRankBar');
    const seasonWins = profile.seasonWins != null ? profile.seasonWins : profile.wins;
    if (profile.maxRank) {
      bar.style.width = '100%';
    } else {
      const prev = (profile.rankThresholds || [0, 1, 4, 8, 15, 25, 40])[profile.rank - 1] || 0;
      const next = profile.nextThreshold || prev + 1;
      const pct = Math.min(100, Math.max(0, ((seasonWins - prev) / Math.max(1, next - prev)) * 100));
      bar.style.width = `${pct}%`;
    }
    renderSeasonPanel($('archiveSeason'), profile);
    $('archiveStats').innerHTML = `
      <div><span>历史对局</span><b>${profile.matches || 0}</b></div>
      <div><span>生涯胜场</span><b>${profile.wins || 0}</b></div>
      <div><span>本赛季胜</span><b>${seasonWins || 0}</b></div>
      <div><span>周胜场</span><b>${profile.weeklyWins || 0}</b></div>
      <div><span>七阶冲分</span><b>${profile.rushScore || 0}</b></div>
      <div><span>当前段位</span><b>${profile.rankLabel || '一阶'}</b></div>
      <div><span>保段卡</span><b>${profile.rankProtect || 0}</b></div>
      <div><span>师傅</span><b>${profile.mentorName || '无'}</b></div>
      <div><span>宿敌</span><b>${(profile.rivals && profile.rivals.name) || '无'}</b></div>`;
    const gw = profile.gameWins || {};
    const gl = profile.gameLosses || {};
    if ($('archiveStats')) {
      $('archiveStats').innerHTML += `
      <div><span>五子胜</span><b>${gw.gomoku || 0}</b></div>
      <div><span>黑白胜</span><b>${gw.reversi || 0}</b></div>
      <div><span>围棋胜</span><b>${gw.go || 0}</b></div>
      <div><span>跳棋胜</span><b>${gw.draughts || 0}</b></div>
      <div><span>飞行胜</span><b>${gw.flying || 0}</b></div>
      <div><span>五子负</span><b>${gl.gomoku || 0}</b></div>
      <div><span>黑白负</span><b>${gl.reversi || 0}</b></div>
      <div><span>全能王</span><b>${profile.allroundScore || 0}</b></div>`;
    }
    renderQuickEdit(profile);
    renderInventory(profile);
    renderProfileSkins();
    renderRecentList($('archiveRecentList'), profile.recentMatches || state.recentMatches);
    renderLoreFeedList($('archiveLoreList'), profile.lore || [], '完成职业技能或收到传闻后会写入档案');
    paintDailyTasks(profile.dailyTasks);
    updateInboxBadge();
    if (Array.isArray(profile.mutedUids) && profile.mutedUids.length) {
      const merged = new Set([...(state.mutedUids || []), ...profile.mutedUids.map(String)]);
      state.mutedUids = Array.from(merged);
      saveMutedUids();
    }
  }

  function renderQuickEdit(profile) {
    const box = $('quickEditList');
    if (!box) return;
    const custom = (profile && profile.quickChats) || [];
    box.innerHTML = '';
    DEFAULT_QUICK.forEach((t, i) => {
      const input = document.createElement('input');
      input.maxLength = 24;
      input.placeholder = t.text;
      input.value = custom[i] || '';
      box.appendChild(input);
    });
  }

  function renderSeasonPanel(el, profile) {
    if (!el) return;
    const season = (profile && profile.season) || state.season;
    const preview = profile && profile.decayPreview;
    const settle = profile && profile.lastSettle;
    if (!season && !preview) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = `
      ${season ? `<div>${season.label || '赛季'} 剩余 <b>${season.remainingText || '—'}</b></div>` : ''}
      ${preview ? `<div>结算预告：<b>${preview.fromLabel}</b> → <b>${preview.toLabel}</b></div>` : ''}
      ${settle ? `<div>上赛季：${settle.fromLabel} → ${settle.toLabel}</div>` : ''}`;
  }

  function applySeasonChip(season) {
    state.season = season || state.season;
    const text = state.season
      ? `${state.season.label} · 剩余 ${state.season.remainingText}`
      : '赛季信息暂不可用';
    if ($('homeSeasonChip')) $('homeSeasonChip').textContent = text;
    if ($('boardSeasonChip') && state.season) {
      $('boardSeasonChip').textContent = text;
    }
  }

  async function loadSeason() {
    try {
      const res = await fetch('/api/season');
      const data = await res.json();
      if (data.ok && data.season) applySeasonChip(data.season);
    } catch {
      if ($('homeSeasonChip')) $('homeSeasonChip').textContent = '赛季信息暂不可用';
    }
  }

  function renderLeaderboard(data) {
    const tab = ['weekly', 'allround'].includes(state.leaderboardTab) ? state.leaderboardTab : 'rush';
    const rows = (data && data[tab]) || [];
    const box = $('boardList');
    if (!box) return;
    if (!rows.length) {
      box.innerHTML = tab === 'rush'
        ? '<p class="hint">暂无上榜棋手</p>'
        : (tab === 'allround' ? '<p class="hint">暂无全能王记录</p>' : '<p class="hint">本周暂无记录</p>');
    } else {
      box.innerHTML = rows.map((row, i) => {
        let score = `冲分 ${row.rushScore || 0}`;
        if (tab === 'weekly') score = `周胜 ${row.weeklyWins || 0}`;
        if (tab === 'allround') score = `全能 ${row.allroundScore || 0}`;
        const extra = tab === 'allround'
          ? `五子${(row.gameWins && row.gameWins.gomoku) || 0} · 黑白${(row.gameWins && row.gameWins.reversi) || 0} · 围棋${(row.gameWins && row.gameWins.go) || 0} · 跳棋${(row.gameWins && row.gameWins.draughts) || 0} · 飞行${(row.gameWins && row.gameWins.flying) || 0}`
          : `${row.rankLabel || '一阶'} · 本赛季 ${row.seasonWins || 0} 胜 · 礼物 ${row.cookies || 0}/${row.cakes || 0}/${row.lollipops || 0}`;
        return `
        <div class="board-row">
          <span class="pos">${i + 1}</span>
          <div>
            <strong>${row.name || '未知'}</strong>
            <div class="hint soft">${extra}</div>
          </div>
          <span class="meta">${score}</span>
        </div>`;
      }).join('');
    }
    $('boardHint').textContent = tab === 'allround'
      ? '加权：五子/黑白/围棋 ×1.0，跳棋/飞行棋 ×1.2'
      : '';
  }

  async function openLeaderboard(tab) {
    if (tab) state.leaderboardTab = tab;
    $('boardModal').classList.remove('hidden');
    $('boardHint').textContent = '加载中…';
    renderChips('boardTabs', [
      { id: 'rush', label: '七阶冲分榜' },
      { id: 'weekly', label: '周胜场' },
      { id: 'allround', label: '全能王' },
    ], state.leaderboardTab, (id) => {
      state.leaderboardTab = id;
      openLeaderboard(id);
    });
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '加载失败');
      if (data.season) applySeasonChip(data.season);
      renderLeaderboard(data);
    } catch (e) {
      $('boardList').innerHTML = '';
      $('boardHint').textContent = e.message || '排行榜加载失败';
    }
  }

  function emptyBoard(n) {
    return Array.from({ length: n }, () => Array(n).fill(0));
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function practiceHasFive(board, r, c, color) {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    const n = board.length;
    for (const [dr, dc] of dirs) {
      let count = 1;
      for (const sign of [1, -1]) {
        let nr = r + dr * sign;
        let nc = c + dc * sign;
        while (nr >= 0 && nr < n && nc >= 0 && nc < n && board[nr][nc] === color) {
          count += 1;
          nr += dr * sign;
          nc += dc * sign;
        }
      }
      if (count >= 5) return true;
    }
    return false;
  }

  function puzzleFindWins(board, color) {
    const hits = [];
    const n = board.length;
    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) {
        if (board[r][c]) continue;
        board[r][c] = color;
        if (practiceHasFive(board, r, c, color)) hits.push([r, c]);
        board[r][c] = 0;
      }
    }
    return hits;
  }

  function puzzlePickReply(board) {
    const wins = puzzleFindWins(board, 2);
    if (wins.length) return wins[0];
    const blocks = puzzleFindWins(board, 1);
    if (blocks.length) return blocks[0];
    return null;
  }

  function makePracticeRoom() {
    const board = emptyBoard(PRACTICE_SIZE);
    const human = {
      id: state.uid,
      name: state.name,
      skin: state.skin,
      profile: state.profile,
    };
    const ai = {
      id: 'wasm-ai',
      name: '人机',
      skin: 'blue',
      profile: { rankLabel: '人机', name: '人机' },
    };
    const seats = [
      {
        index: 0, team: 'A', color: 1, player: human, ready: true, undoLeft: 0,
        props: { swallow: 0, timeCut: 0, undoPlus: 0 },
      },
      {
        index: 1, team: 'B', color: 2, player: ai, ready: true, undoLeft: 0,
        props: { swallow: 0, timeCut: 0, undoPlus: 0 },
      },
    ];
    return {
      code: 'PRACTICE',
      gameType: 'gomoku',
      mode: 'practice',
      phase: 'playing',
      hostId: state.uid,
      seats,
      specSeats: [],
      spectators: [],
      board,
      turnColor: 1,
      turnSeatIndex: 0,
      turnDeadline: null,
      winner: null,
      boardSize: PRACTICE_SIZE,
      boardScale: 'large',
      lastMove: null,
      lastEffects: null,
      totalRounds: 1,
      currentRound: 1,
      seriesScore: { black: 0, white: 0 },
      roundResults: [],
      recentEmotes: [],
      chatLog: [],
      quickTexts: DEFAULT_QUICK,
      teamNames: { black: state.name, white: '人机' },
      moveLog: [],
      boardHistory: [cloneBoard(board)],
      you: { playerId: state.uid, seat: seats[0], spectator: null },
      practice: true,
      practiceCounts: true,
    };
  }

  function stopPractice() {
    state.practiceGen += 1;
    state.practiceMode = false;
    state.practiceThinking = false;
    state.puzzleMode = false;
    state.puzzle = null;
    state.room = null;
    state.playerId = '';
    state.pieceAnim = null;
    if (timer) clearInterval(timer);
    stopUrgentBeep();
    $('overlay').classList.add('hidden');
    if ($('practiceBanner')) $('practiceBanner').classList.add('hidden');
    if ($('puzzleBanner')) $('puzzleBanner').classList.add('hidden');
    if ($('propBalance')) $('propBalance').classList.add('hidden');
    show('home');
    toast('');
  }

  function syncPracticeYou(room) {
    room.you = { playerId: state.uid, seat: room.seats[0], spectator: null };
  }

  function applyPracticeMove(room, r, c, color) {
    if (!room.board[r] || room.board[r][c]) return { ok: false, error: '该点已有棋' };
    room.board = cloneBoard(room.board);
    room.board[r][c] = color;
    room.lastMove = { r, c, color, pass: false };
    room.lastEffects = { placed: { r, c, color }, flipped: [], captured: [], at: Date.now() };
    room.moveLog = [...(room.moveLog || []), { r, c, color }];
    room.boardHistory = [...(room.boardHistory || []), cloneBoard(room.board)];
    startPieceAnim(room.lastEffects);
    const win = practiceHasFive(room.board, r, c, color);
    const full = room.board.every((row) => row.every((cell) => cell !== 0));
    return { ok: true, win, draw: !win && full };
  }

  async function finishPractice(winner, extra = {}) {
    const room = state.room;
    if (!room || !state.practiceMode) return;
    if (state.puzzleMode) {
      finishPuzzle(winner === 1, extra.resigned ? '认输' : '');
      return;
    }
    room.phase = 'seriesEnd';
    room.winner = winner;
    if (winner === 1) room.seriesScore.black = 1;
    else if (winner === 2) room.seriesScore.white = 1;
    room.roundResults = [{ round: 1, winner, moves: (room.moveLog || []).length, ...extra }];
    room.turnDeadline = null;
    state.practiceThinking = false;
    syncPracticeYou(room);
    fireSettlementFx(room);
    renderGame();
    try {
      const outcome = winner === 1 ? 'win' : winner === 2 ? 'loss' : 'draw';
      const res = await fetch('/api/practice/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: state.uid,
          name: state.name,
          outcome,
          moves: room.moveLog,
          boardSize: PRACTICE_SIZE,
          resigned: !!extra.resigned,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '练习结算失败');
      state.profile = data.profile;
      const p = data.profile;
      $('settleMeta').textContent = `${$('settleMeta').textContent} · ${p.rankLabel}`;
      maybeShowRankCeremony(p);
      notifyDailyTaskToasts(p.dailyTaskJustCompleted, `practice:${Date.now()}`);
    } catch (e) {
      toast(e.message || '结算失败');
    }
  }

  async function practiceAiMove() {
    const room = state.room;
    const gen = state.practiceGen;
    if (!room || !state.practiceMode || room.phase !== 'playing') return;
    state.practiceThinking = true;
    room.turnColor = 2;
    room.turnSeatIndex = 1;
    syncPracticeYou(room);
    $('gameHint').textContent = '思考中…';
    renderGame();
    let result;
    try {
      result = await PracticeAI.search(room.board);
    } catch (e) {
      if (gen !== state.practiceGen) return;
      state.practiceThinking = false;
      $('gameHint').textContent = '人机暂不可用，可重试或返回首页';
      renderToolbar(room);
      return;
    }
    if (gen !== state.practiceGen || !state.practiceMode) return;
    const r = Number(result && result.r);
    const c = Number(result && result.c);
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0) {
      state.practiceThinking = false;
      $('gameHint').textContent = '请重试';
      renderToolbar(room);
      return;
    }
    const placed = applyPracticeMove(room, r, c, 2);
    state.practiceThinking = false;
    if (!placed.ok) {
      $('gameHint').textContent = '请重试';
      renderToolbar(room);
      return;
    }
    if (placed.win) {
      await finishPractice(2);
      return;
    }
    if (placed.draw) {
      await finishPractice(0);
      return;
    }
    room.turnColor = 1;
    room.turnSeatIndex = 0;
    syncPracticeYou(room);
    $('gameHint').textContent = '轮到你';
    renderGame();
  }

  async function practicePlace(r, c) {
    const room = state.room;
    if (!room || !state.practiceMode || room.phase !== 'playing' || state.practiceThinking) return;
    if (room.turnColor !== 1) return;
    const placed = applyPracticeMove(room, r, c, 1);
    if (!placed.ok) {
      toast(placed.error);
      return;
    }
    if (window.QibaFx) QibaFx.play('place');
    if (placed.win) {
      await finishPractice(1);
      return;
    }
    if (placed.draw) {
      await finishPractice(0);
      return;
    }
    await practiceAiMove();
  }

  async function startPractice() {
    toast('');
    if (state.room && !state.practiceMode) {
      toast('请先离开当前房间再进入人机练习');
      return;
    }
    state.practiceMode = true;
    state.practiceThinking = false;
    state.practiceGen += 1;
    state.playerId = state.uid;
    clearBoardMarks();
    state.room = makePracticeRoom();
    show('game');
    if ($('practiceBanner')) $('practiceBanner').classList.remove('hidden');
    $('gameHint').textContent = '加载中…';
    renderGame();
    try {
      await PracticeAI.ensure();
    } catch (e) {
      $('gameHint').textContent = '人机暂不可用';
      renderToolbar(state.room);
      return;
    }
    $('gameHint').textContent = '轮到你';
    renderGame();
  }

  function renderProfileSkins() {
    const sk = $('profileSkins');
    if (!sk) return;
    sk.innerHTML = '';
    SKINS.forEach((s) => {
      const b = document.createElement('button');
      b.className = `skin ${state.skin === s.id ? 'on' : ''}`;
      b.innerHTML = `<span class="coal dark" style="--tone:${s.color}"></span>${s.label}`;
      b.onclick = () => {
        state.skin = s.id;
        localStorage.setItem('qiba_skin', s.id);
        renderProfileSkins();
        if (state.playerId) send({ type: 'setSkin', skin: s.id });
      };
      sk.appendChild(b);
    });
  }

  async function fetchMyProfile() {
    const q = new URLSearchParams({ id: state.uid, name: state.name });
    const res = await fetch(`/api/profile?${q}`);
    const data = await res.json();
    if (!data.ok || !data.profile) throw new Error(data.error || '读取档案失败');
    return data.profile;
  }

  async function openProfilePage() {
    toast('');
    $('profileNameInput').value = state.name;
    $('profileSignatureInput').value = state.signature;
    show('profile');
    loadRecentMatches();
    try {
      const profile = await fetchMyProfile();
      if (profile.name) {
        state.name = profile.name;
        localStorage.setItem('qiba_name', state.name);
        $('profileNameInput').value = state.name;
      }
      if (typeof profile.signature === 'string') {
        state.signature = profile.signature;
        localStorage.setItem('qiba_signature', state.signature);
        $('profileSignatureInput').value = state.signature;
      }
      fillArchive(profile);
    } catch (e) {
      fillArchive({
        name: state.name,
        signature: state.signature,
        matches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        rank: 1,
        rankLabel: '一阶',
        winsToNextRank: 1,
        nextRankLabel: '二阶',
        nextThreshold: 1,
        maxRank: false,
        rankThresholds: [0, 1, 4, 8, 15, 25, 40],
        cookies: 0,
        cakes: 0,
        lollipops: 0,
      });
      toast(e.message || '暂无法同步服务器档案，已显示本地草稿');
    }
  }

  async function saveMyProfile() {
    toast('');
    const name = ($('profileNameInput').value || '').trim().slice(0, 12);
    const signature = ($('profileSignatureInput').value || '').trim().slice(0, 40);
    if (!name) {
      toast('昵称不能为空');
      return;
    }
    try {
      const body = {
        id: state.uid,
        name,
        signature,
        quickChats: collectQuickChats(),
        mutedUids: state.mutedUids || [],
      };
      if (state.auth && state.auth.username) body.username = state.auth.username;
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '保存失败');
      state.name = data.profile.name;
      state.signature = data.profile.signature || '';
      localStorage.setItem('qiba_name', state.name);
      localStorage.setItem('qiba_signature', state.signature);
      if (state.auth) {
        state.auth.nickname = state.name;
        localStorage.setItem('qiba_auth', JSON.stringify(state.auth));
      }
      fillArchive(data.profile);
      updateAuthUI();
      toast('档案已保存');
    } catch (e) {
      toast(e.message || '保存失败');
    }
  }

  function onMessage(msg) {
    if (msg.type === 'error') {
      if (msg.needPass) {
        openPassModal({
          code: msg.code || ($('joinCode').value || '').trim().toUpperCase(),
          asSpectator: !!(state.pendingJoin && state.pendingJoin.asSpectator),
          asCommentator: !!(state.pendingJoin && state.pendingJoin.asCommentator),
          hint: msg.error || '需要进房口令',
        });
        return;
      }
      if (state.matchQueueAt) stopMatchQueueUI();
      toast(msg.error || '错误');
      $('joinHint').textContent = msg.error || '';
      return;
    }
    if (msg.type === 'kicked') {
      toast(msg.reason || '你已被移出房间');
      clearLastRoom();
      state.room = null;
      state.playerId = '';
      state.rejoining = false;
      stopUrgentBeep();
      show('home');
      refreshProfileQuiet();
      return;
    }
    if (msg.type === 'rejoinFailed') {
      state.rejoining = false;
      clearLastRoom();
      if (state.view === 'home') toast(msg.error || '无法回到原房间');
      return;
    }
    if (msg.type === 'left') {
      if (msg.forceQuit && state.view !== 'home') {
        resetClientToHome(true);
        toast('已强制退出，本模式记两负');
      }
      return;
    }
    if (msg.type === 'profile' && msg.profile) {
      showProfile(msg.profile);
      return;
    }
    if (msg.type === 'profileSaved' && msg.profile) {
      state.name = msg.profile.name;
      state.signature = msg.profile.signature || '';
      localStorage.setItem('qiba_name', state.name);
      localStorage.setItem('qiba_signature', state.signature);
      fillArchive(msg.profile);
      toast('档案已保存');
      return;
    }
    if (msg.type === 'created' || msg.type === 'joined' || msg.type === 'rejoined' || msg.type === 'matched') {
      if (msg.type === 'matched') stopMatchQueueUI();
      state.playerId = msg.playerId;
      state.rejoining = false;
      if (msg.code) saveLastRoom(msg.code, msg.playerId);
      $('worldChannelModal').classList.add('hidden');
      if (msg.type === 'rejoined') toast('已回到原房间');
      if (msg.type === 'matched') toast('已匹配到对手');
      if (msg.dailyTaskJustCompleted) notifyDailyTaskToasts(msg.dailyTaskJustCompleted, `join:${msg.code || ''}`);
      if (msg.profile) {
        state.profile = msg.profile;
        paintDailyTasks(msg.profile.dailyTasks);
      }
      return;
    }
    if (msg.type === 'queueing') {
      startMatchQueueUI(msg.startedAt);
      return;
    }
    if (msg.type === 'queueCancelled') {
      stopMatchQueueUI();
      toast('已取消匹配');
      return;
    }
    if (msg.type === 'dailyTaskClaimed' && msg.profile) {
      state.profile = msg.profile;
      paintDailyTasks(msg.profile.dailyTasks);
      renderInventory(msg.profile);
      const parts = [];
      if (msg.rewards) {
        if (msg.rewards.cookies) parts.push(`🍪×${msg.rewards.cookies}`);
        if (msg.rewards.cakes) parts.push(`🍰×${msg.rewards.cakes}`);
        if (msg.rewards.lollipops) parts.push(`🍭×${msg.rewards.lollipops}`);
        if (msg.rewards.rankProtect) parts.push(`保段卡×${msg.rewards.rankProtect}`);
      }
      toast(parts.length ? `领取成功：${parts.join(' ')}` : '领取成功');
      return;
    }
    if (msg.type === 'roomList') {
      renderWorldList(msg.rooms || []);
      return;
    }
    if (msg.type === 'giftResult' && msg.fromProfile) {
      state.profile = msg.fromProfile;
      if (state.view === 'profile') fillArchive(msg.fromProfile);
      return;
    }
    if (msg.type === 'emote' && msg.emote) {
      // 兼容旧协议；新逻辑统一走 chat
      spawnFloatEmote(msg.emote);
      if (window.QibaFx) QibaFx.play('emote');
      return;
    }
    if (msg.type === 'chat' && msg.chat) {
      const chat = msg.chat;
      if (chat.kind === 'emote') {
        if (state.view !== 'room') spawnFloatEmote(chat);
        if (window.QibaFx) QibaFx.play('emote');
      } else if (chat.kind === 'text' || chat.kind === 'gift') {
        spawnFloatText(chat);
        if (window.QibaFx) QibaFx.play('chat');
      }
      if (state.room) {
        const log = state.room.chatLog || [];
        const exists = chat.id && log.some((c) => c.id === chat.id);
        if (!exists) {
          state.room.chatLog = [...log, chat].slice(-20);
        }
        if (chat.kind === 'emote') {
          const emos = state.room.recentEmotes || [];
          if (!chat.id || !emos.some((c) => c.id === chat.id)) {
            state.room.recentEmotes = [...emos, chat].slice(-12);
          }
        }
        if (state.view === 'game') {
          renderChat(state.room);
          if (state.room.phase === 'roundEnd' || state.room.phase === 'seriesEnd' || state.room.phase === 'truth') {
            renderSettlement(state.room);
          }
        }
        if (state.view === 'room') renderLobbyChat(state.room);
      }
      return;
    }
    if (msg.type === 'coachHint' && msg.r != null) {
      if (state.room) {
        state.room.coachHint = { r: msg.r, c: msg.c, fromName: msg.fromName };
        toast(`${msg.fromName || '观战'} 建议一手`);
        if (state.view === 'game' && state.room.board) drawBoard(state.room);
      }
      return;
    }
    if (msg.type === 'danmaku' && msg.danmaku) {
      spawnDanmaku(msg.danmaku);
      return;
    }
    if (msg.type === 'friendList' && msg.friends) {
      renderFriendList(msg.friends);
      return;
    }
    if (msg.type === 'clubInfo') {
      renderClubPanel(msg.club, msg.ranking);
      return;
    }
    if (msg.type === 'mentorInviteReceived') {
      toast(`${msg.fromName || '棋友'} 邀请你成为徒弟（7 天）`);
      if (state.profile) {
        state.profile.pendingMentorInvite = msg.invite || { fromUid: msg.fromUid, fromName: msg.fromName };
      }
      renderMentorPending();
      renderInboxList();
      updateInboxBadge();
      return;
    }
    if (msg.type === 'mentorBond') {
      if (msg.profile && msg.profile.id === state.uid) {
        state.profile = { ...(state.profile || {}), ...msg.profile };
        if (state.view === 'profile') fillArchive(state.profile);
      }
      toast(msg.declined ? '已拒绝师徒邀请' : '师徒契约已缔结，持续 7 天');
      renderMentorPending();
      renderInboxList();
      updateInboxBadge();
      return;
    }
    if (msg.type === 'mentorInvited') {
      toast('师徒邀请已发出');
      return;
    }
    if (msg.type === 'inviteReceived') {
      showInviteModal(msg);
      return;
    }
    if (msg.type === 'inviteSent') {
      toast(msg.online === false
        ? `对方离线，上线后将收到邀请 · 房间 ${msg.code}`
        : `邀请已发送 · 房间 ${msg.code}`);
      return;
    }
    if (msg.type === 'worldRumor' && msg.entry) {
      prependWorldFeed(msg.entry);
      return;
    }
    if (msg.type === 'stateSync' && msg.state) {
      const prevPhase = state.lastPhase;
      const prevRoom = state.room;
      const prevMoves = state.lastMoveCount;
      const prevEffectsAt = state.lastEffectsAt;
      const incoming = msg.state;
      if (isFreshPlayingBoard(prevRoom, prevPhase, incoming)) {
        clearBoardMarks(incoming);
      }
      state.room = incoming;
      if (incoming.you && incoming.you.playerId) {
        state.playerId = incoming.you.playerId;
      }
      if (incoming.code && state.playerId) {
        saveLastRoom(incoming.code, state.playerId);
      }
      const moveCount = (incoming.moveLog || []).length;
      const effects = incoming.lastEffects;
      const effectsAt = effects && effects.at ? effects.at : 0;
      if (moveCount > prevMoves && incoming.phase === 'playing') {
        if (window.QibaFx) QibaFx.play('place');
        if (effects && effectsAt && effectsAt !== prevEffectsAt) {
          startPieceAnim(effects);
        }
      } else if (effects && effectsAt && effectsAt !== prevEffectsAt && effectsAt > state.lastEffectsAt) {
        startPieceAnim(effects);
      }
      if (effectsAt) state.lastEffectsAt = effectsAt;
      if (
        (incoming.phase === 'roundEnd' || incoming.phase === 'seriesEnd' || incoming.phase === 'truth')
        && prevPhase === 'playing'
      ) {
        fireSettlementFx(incoming);
        refreshProfileQuiet();
        loadRecentMatches();
        const settleProfile = myRoomProfile(incoming);
        maybeShowRankCeremony(settleProfile);
        if (incoming.settleHint) flashToast(incoming.settleHint);
        if (settleProfile) {
          notifyDailyTaskToasts(
            settleProfile.dailyTaskJustCompleted,
            `settle:${incoming.code}:${incoming.currentRound}`
          );
        }
      }
      if (incoming.phase === 'seriesEnd') {
        // 系列赛结束仍可短暂留在房间看结算，主动离开时再清
      }
      state.lastPhase = incoming.phase;
      state.lastRound = incoming.currentRound;
      state.lastMoveCount = moveCount;
      if (state.replayIndex != null && incoming.boardHistory) {
        state.replayIndex = Math.min(state.replayIndex, incoming.boardHistory.length - 1);
      }
      if (incoming.phase === 'lobby') {
        clearBoardMarks(incoming);
        show('room');
        renderRoom();
      } else if (
        incoming.phase === 'playing'
        || incoming.phase === 'roundEnd'
        || incoming.phase === 'seriesEnd'
        || incoming.phase === 'truth'
      ) {
        show('game');
        renderGame();
        maybeHostBotMove(incoming);
      }
    }
  }

  function isFreshPlayingBoard(prevRoom, prevPhase, next) {
    if (!next || next.phase !== 'playing') return false;
    if (prevPhase === 'roundEnd' || prevPhase === 'seriesEnd' || prevPhase === 'truth' || prevPhase === 'lobby') {
      return true;
    }
    if (prevRoom && prevRoom.code === next.code && prevRoom.currentRound !== next.currentRound) {
      return true;
    }
    const nextMoves = (next.moveLog || []).length;
    if (prevRoom && prevRoom.code === next.code && nextMoves === 0 && (prevRoom.moveLog || []).length > 0) {
      return true;
    }
    return false;
  }

  function clearBoardMarks(room) {
    state.arrows = [];
    state.circles = [];
    state.arrowDraft = null;
    state.replayIndex = null;
    state.hover = null;
    state.selectedCell = null;
    state.pieceAnim = null;
    if (animRaf) {
      cancelAnimationFrame(animRaf);
      animRaf = null;
    }
    if (state.weatherRaf) {
      cancelAnimationFrame(state.weatherRaf);
      state.weatherRaf = null;
    }
    hideDiceFx();
    if (room) {
      room.coachHint = null;
      room.lastMove = null;
      room.lastEffects = null;
      room.forbiddenCells = [];
      room.protectedCells = [];
      if (room.board && typeof room.board === 'object' && !Array.isArray(room.board)) {
        room.board.lastDice = null;
      }
    }
    const canvas = $('board');
    if (canvas && canvas.getContext) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function hideDiceFx() {
    const wrap = $('diceFx');
    if (wrap) wrap.classList.add('hidden');
    if (diceFxTimer) {
      clearTimeout(diceFxTimer);
      diceFxTimer = null;
    }
  }

  function playDiceFx(n) {
    const wrap = $('diceFx');
    const cube = $('diceCube');
    const face = Math.min(6, Math.max(1, Number(n) || 1));
    if (!wrap || !cube) return;
    wrap.classList.remove('hidden');
    const spinsX = 360 * (2 + Math.floor(Math.random() * 2));
    const spinsY = 360 * (3 + Math.floor(Math.random() * 2));
    const settle = {
      1: [spinsX, spinsY],
      2: [spinsX, spinsY - 90],
      3: [spinsX - 90, spinsY],
      4: [spinsX + 90, spinsY],
      5: [spinsX, spinsY + 90],
      6: [spinsX + 180, spinsY],
    };
    cube.style.transition = 'none';
    cube.style.transform = `rotateX(${Math.floor(Math.random() * 180)}deg) rotateY(${Math.floor(Math.random() * 180)}deg)`;
    void cube.offsetWidth;
    cube.style.transition = 'transform 1.05s cubic-bezier(.15,.85,.25,1)';
    const [rx, ry] = settle[face];
    cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    if (window.QibaFx) QibaFx.play('click');
    if (diceFxTimer) clearTimeout(diceFxTimer);
    diceFxTimer = setTimeout(() => {
      hideDiceFx();
    }, DICE_FX_MS);
  }

  function flyingAnimDuration(anim) {
    if (!anim) return ANIM_MS;
    const steps = Math.max(1, (anim.path || []).length);
    return steps * FLYING_STEP_MS + 80;
  }

  function flyingInterpXY(plane, W) {
    const anim = state.pieceAnim;
    if (!anim || anim.kind !== 'flying') return flyingPlaneXY(plane, W);
    const cap = (anim.captured || []).find((c) => c.id === plane.id);
    if (cap && cap.from) {
      const dur = flyingAnimDuration(anim);
      const t = Math.min(1, Math.max(0, (performance.now() - anim.startedAt) / dur));
      const start = flyingPlaneXY({ ...plane, loc: cap.from.loc, pos: cap.from.pos }, W);
      const end = flyingHangarXY(plane.color, plane.index, W);
      const u = t < 0.72 ? 0 : (t - 0.72) / 0.28;
      const e = 1 - (1 - u) ** 2;
      return { x: start.x + (end.x - start.x) * e, y: start.y + (end.y - start.y) * e };
    }
    if (anim.planeId !== plane.id || !anim.from) return flyingPlaneXY(plane, W);
    const path = [anim.from, ...(anim.path || [])];
    if (path.length === 1) return flyingPlaneXY({ ...plane, ...path[0] }, W);
    const elapsed = performance.now() - anim.startedAt;
    const f = Math.min(path.length - 1, Math.max(0, elapsed / FLYING_STEP_MS));
    const i0 = Math.min(path.length - 2, Math.floor(f));
    const t = Math.min(1, f - i0);
    const e = 1 - (1 - t) ** 2;
    const a = flyingPlaneXY({ ...plane, ...path[i0] }, W);
    const b = flyingPlaneXY({ ...plane, ...path[i0 + 1] }, W);
    return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
  }

  function startPieceAnim(effects) {
    if (!effects) return;
    if (effects.kind === 'dice') {
      playDiceFx(effects.dice);
      return;
    }
    const flyingMove = effects.kind === 'flying' || (effects.path && effects.planeId);
    state.pieceAnim = flyingMove
      ? {
        kind: 'flying',
        startedAt: performance.now(),
        planeId: effects.planeId,
        from: effects.from,
        path: effects.path || [],
        captured: effects.captured || [],
      }
      : {
        startedAt: performance.now(),
        placed: effects.placed || null,
        flipped: effects.flipped || [],
        captured: effects.captured || [],
      };
    if (animRaf) cancelAnimationFrame(animRaf);
    const duration = flyingMove ? flyingAnimDuration(state.pieceAnim) : ANIM_MS + 80;
    const tick = () => {
      if (!state.pieceAnim) return;
      const elapsed = performance.now() - state.pieceAnim.startedAt;
      if (state.room && state.room.board) drawBoard(state.room);
      if (elapsed < duration) {
        animRaf = requestAnimationFrame(tick);
      } else {
        state.pieceAnim = null;
        animRaf = null;
        if (state.room && state.room.board) drawBoard(state.room);
      }
    };
    animRaf = requestAnimationFrame(tick);
  }

  async function refreshProfileQuiet() {
    if (!isLoggedIn()) {
      paintDailyTasks(null);
      return;
    }
    try {
      const profile = await fetchMyProfile();
      state.profile = profile;
      paintDailyTasks(profile.dailyTasks);
      updateInboxBadge();
    } catch {
      paintDailyTasks(state.profile && state.profile.dailyTasks);
    }
  }

  function fireSettlementFx(room) {
    if (!window.QibaFx) return;
    const mySeat = room.you && room.you.seat;
    if (room.winner === 0) {
      QibaFx.celebrateDraw();
      return;
    }
    if (mySeat && mySeat.color === room.winner) QibaFx.celebrateWin();
    else QibaFx.play('lose');
  }

  function renderChips(containerId, items, current, onPick) {
    const box = $(containerId);
    if (!box) return;
    box.innerHTML = '';
    items.forEach((item) => {
      const b = document.createElement('button');
      b.className = `chip ${current === item.id ? 'on' : ''}`;
      b.textContent = item.label;
      b.onclick = () => onPick(item.id);
      box.appendChild(b);
    });
  }

  function jobLabel(jobId) {
    const hit = SEAT_JOBS.find((j) => j.id === jobId);
    return hit ? hit.label : '';
  }

  function renderGardenBar(room, barId, hintId, labelId) {
    const g = (room && room.garden) || { growth: 0, bloomCount: 0 };
    const growth = Math.max(0, Math.min(GARDEN_BLOOM, Number(g.growth) || 0));
    const bloom = Math.max(0, Number(g.bloomCount) || 0);
    const bar = $(barId);
    if (bar) bar.style.width = `${Math.round((growth / GARDEN_BLOOM) * 100)}%`;
    if (hintId && $(hintId)) {
      $(hintId).textContent = `成长值 ${growth} / ${GARDEN_BLOOM}${bloom ? ` · 已开花 ${bloom} 次` : ''}`;
    }
    if (labelId && $(labelId)) {
      $(labelId).textContent = bloom ? `庭院 · 已开花 ${bloom} 次` : '庭院';
    }
    const banner = $('gameGardenBanner');
    if (banner && barId === 'gameGardenBar') {
      banner.classList.remove('hidden');
    }
  }

  function renderLoreFeedList(el, entries, emptyText) {
    if (!el) return;
    const list = Array.isArray(entries) ? entries : [];
    if (!list.length) {
      el.innerHTML = `<p class="hint soft">${emptyText || '暂无传闻'}</p>`;
      return;
    }
    el.innerHTML = '';
    list.forEach((row) => {
      const div = document.createElement('div');
      div.className = 'world-feed-row';
      const when = row.at ? new Date(row.at).toLocaleString('zh-CN', { hour12: false }) : '';
      div.innerHTML = `<div>${row.text || ''}</div><div class="meta">${row.name ? `${row.name} · ` : ''}${row.roomCode ? `房间 ${row.roomCode} · ` : ''}${when}</div>`;
      el.appendChild(div);
    });
  }

  function renderWorldFeed(feed) {
    state.worldFeed = Array.isArray(feed) ? feed : [];
    renderLoreFeedList($('worldFeedList'), state.worldFeed, '世界频道暂无传闻');
  }

  async function fetchWorldFeed() {
    try {
      const res = await fetch('/api/world/feed?limit=20');
      const data = await res.json();
      if (data.ok) renderWorldFeed(data.feed || []);
    } catch {
      renderWorldFeed(state.worldFeed || []);
    }
  }

  function prependWorldFeed(entry) {
    if (!entry || !entry.text) return;
    state.worldFeed = [entry, ...(state.worldFeed || [])].slice(0, 20);
    renderWorldFeed(state.worldFeed);
    const archive = $('archiveLoreList');
    if (archive && state.profile && entry.uid === state.uid) {
      const lore = [{ ...entry }, ...(state.profile.lore || [])].slice(0, 8);
      renderLoreFeedList(archive, lore, '完成职业技能或收到传闻后会写入档案');
    }
  }

  function renderJobPanel(room) {
    const mySeat = room && room.you && room.you.seat;
    const panel = $('roomJobPanel');
    if (!panel) return;
    if (!mySeat) {
      if ($('roomJobHint')) $('roomJobHint').textContent = '入座后可选择职业并发动技能';
      if ($('btnUseJob')) $('btnUseJob').disabled = true;
      renderChips('roomJobChips', SEAT_JOBS, '', () => {});
      return;
    }
    const current = mySeat.job || '';
    renderChips('roomJobChips', SEAT_JOBS, current, (jobId) => {
      send({ type: 'setSeatJob', job: jobId });
    });
    const cds = room.jobCooldowns || {};
    const cdJob = current && cds[current] ? Math.ceil((cds[current] - Date.now()) / 1000) : 0;
    const buffs = (room.socialBuffs || []).filter((b) => b && b.until > Date.now());
    const buffText = buffs.length
      ? ` · 氛围加成 ${buffs.map((b) => `${b.icon || ''}${b.label}`).join(' ')}`
      : '';
    if ($('roomJobHint')) {
      $('roomJobHint').textContent = current
        ? `${jobLabel(current)}${cdJob > 0 ? ` · 冷却 ${cdJob}s` : ' · 可发动技能'}${buffText}`
        : '请选择席位职业';
    }
    if ($('btnUseJob')) {
      $('btnUseJob').disabled = !current || cdJob > 0;
    }
  }

  function setRoomSettingsOpen(open) {
    state.roomSettingsOpen = !!open;
    const body = $('roomSettingsBody');
    const btn = $('btnToggleRoomSettings');
    body.classList.toggle('collapsed', !open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.classList.toggle('open', open);
  }

  function renderHome() {
    renderChips('visibilities', VISIBILITIES, state.visibility, (id) => {
      state.visibility = id;
      localStorage.setItem('qiba_visibility', id);
      renderHome();
    });
    renderChips('gameTypes', GAME_TYPES, state.gameType, (id) => {
      state.gameType = id;
      if (id === 'draughts' && state.mode !== '1v1') state.mode = '1v1';
      if (id === 'flying' && !['1v1', '3p', '2v2'].includes(state.mode)) state.mode = '1v1';
      if (id !== 'flying' && state.mode === '3p') state.mode = '1v1';
      if (id !== 'gomoku' && state.mode === 'youjin') state.mode = '1v1';
      renderHome();
    });
    const modeItems = MODES.filter((m) => {
      if (state.gameType === 'draughts') return m.id === '1v1';
      if (state.gameType === 'flying') return m.id === '1v1' || m.id === '3p' || m.id === '2v2';
      if (state.gameType !== 'gomoku' && m.id === 'youjin') return false;
      return m.id !== '3p';
    }).map((m) => {
      if (state.gameType !== 'flying') return m;
      if (m.id === '1v1') return { ...m, label: '2人' };
      if (m.id === '2v2') return { ...m, label: '4人' };
      return m;
    });
    renderChips('modes', modeItems, state.mode, (id) => {
      state.mode = id;
      renderHome();
    });
    const youjinHint = $('youjinHint');
    if (youjinHint) {
      youjinHint.classList.toggle('hidden', state.mode !== 'youjin');
    }
    renderChips(
      'rounds',
      [1, 2, 3, 4, 5].map((n) => ({ id: n, label: `${n} 局` })),
      state.totalRounds,
      (id) => {
        state.totalRounds = id;
        renderHome();
      }
    );
    renderChips('boardScales', BOARD_SCALES, state.boardScale, (id) => {
      state.boardScale = id;
      renderHome();
    });
    renderChips('turnTimes', TURN_TIMES, state.turnMs, (id) => {
      state.turnMs = id;
      renderHome();
    });
    const scaleField = $('boardScaleField');
    if (scaleField) {
      scaleField.classList.toggle('hidden', state.gameType === 'draughts' || state.gameType === 'flying');
    }
    const custom = $('customCode');
    if (custom) custom.value = state.customCode;
    const jp = $('joinPassInput');
    if (jp) jp.value = state.joinPass || '';
    renderChips('friendshipStakes', STAKE_OPTIONS, state.friendshipStake || '', (id) => {
      state.friendshipStake = id || '';
      localStorage.setItem('qiba_friendship_stake', state.friendshipStake);
      renderHome();
    });
    if ($('celestialToggle')) {
      const on = resolvedCelestial();
      $('celestialToggle').checked = on;
      state.celestial = on;
      const hint = $('celestialHint');
      if (hint) {
        hint.textContent = '道具赛 / 外援赛 / 公开 2v2 默认开启天象；私密 1v1 与公开 1v1 默认关闭，避免影响正经对局。可在此手动开关。';
      }
    }
    updateAuthUI();
  }

  function coalHtml(skin, color) {
    const tone = (SKINS.find((s) => s.id === skin) || SKINS[0]).color;
    const extra = color === 3 || color === 4 ? ' pair' : '';
    return `<span class="coal ${stoneIsDark(color) ? 'dark' : 'light'}${extra}" style="--tone:${tone}"></span>`;
  }

  function bindProfileClick(el, profile, name) {
    el.classList.add('clickable-profile');
    el.onclick = (ev) => {
      ev.stopPropagation();
      if (profile) showProfile(profile);
      else send({ type: 'getProfile', name });
    };
  }

  function otherPlayers(room) {
    const list = [];
    (room.seats || []).forEach((seat) => {
      if (seat.player && seat.player.id !== state.playerId) list.push(seat.player);
    });
    (room.specSeats || room.spectators || []).forEach((s) => {
      if (s && s.id && s.id !== state.playerId) list.push(s);
    });
    (room.commentatorSeats || room.commentators || []).forEach((s) => {
      if (s && s.id && s.id !== state.playerId) list.push(s);
    });
    return list;
  }

  function myInventory() {
    const p = state.profile || {};
    const inv = p.inventory || p;
    return {
      cookies: inv.cookies || 0,
      cakes: inv.cakes || 0,
      lollipops: inv.lollipops || 0,
    };
  }

  function renderGiftBar(container, room) {
    if (!container) return;
    container.innerHTML = '';
    const others = otherPlayers(room);
    if (!others.length) {
      container.innerHTML = '<p class="hint soft">暂无可赠送对象</p>';
      return;
    }
    const inv = myInventory();
    const title = document.createElement('div');
    title.className = 'gift-title';
    title.textContent = '赠送礼物';
    container.appendChild(title);
    const row = document.createElement('div');
    row.className = 'gift-row';
    others.forEach((p) => {
      GIFT_ITEMS.forEach((item) => {
        const count = inv[item.key] || 0;
        const b = document.createElement('button');
        b.className = 'btn sm ghost gift-btn';
        b.disabled = count <= 0;
        b.innerHTML = `<span class="gift-btn-inner">${iconImg(item.src, item.label, 'gift-icon')}→${p.name}（${count}）</span>`;
        b.onclick = () => send({ type: 'giftItem', toPlayerId: p.id, item: item.id });
        row.appendChild(b);
      });
    });
    container.appendChild(row);
  }

  function renderLobbyChat(room) {
    const feed = $('lobbyChatFeed');
    if (!feed) return;
    feed.innerHTML = (room.chatLog || [])
      .slice(-12)
      .filter((c) => !isMutedChat(c))
      .map((c) => {
        if (c.kind === 'system') {
          return `<div class="hint soft">${c.text}</div>`;
        }
        if (c.kind === 'emote') {
          const meta = emoteMeta(c.emote);
          return `<div><b>${c.name}</b> ${iconImg(meta.src, meta.label, 'chat-sticker')} <span class="chat-sticker-label">${meta.label}</span>${muteChatBtn(c)}</div>`;
        }
        if (c.kind === 'gift') {
          const g = giftMeta(c.item);
          return `<div><b>${c.name}</b> 赠送 ${iconImg(g.src, g.label, 'inline-icon')} ${g.label} → ${c.toName}${muteChatBtn(c)}</div>`;
        }
        return `<div><b>${c.name}</b>：${c.text}${muteChatBtn(c)}</div>`;
      })
      .join('');
    feed.scrollTop = feed.scrollHeight;
    bindMuteButtons(feed);
  }

  function closeLobbyEmojiPicker() {
    const picker = $('lobbyEmojiPicker');
    const btn = $('btnLobbyEmoji');
    if (picker) picker.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function toggleLobbyEmojiPicker() {
    const picker = $('lobbyEmojiPicker');
    const btn = $('btnLobbyEmoji');
    if (!picker) return;
    const open = picker.classList.contains('hidden');
    picker.classList.toggle('hidden', !open);
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function sendChatSticker(emoteId) {
    send({ type: 'emote', emote: emoteId });
    closeLobbyEmojiPicker();
  }

  function fillLobbyEmojiPicker() {
    const picker = $('lobbyEmojiPicker');
    if (!picker) return;
    picker.innerHTML = '';
    EMOTES.forEach((e) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'emote-btn';
      b.title = e.label;
      b.setAttribute('role', 'menuitem');
      b.innerHTML = `${iconImg(e.src, e.label, 'emote-icon')}<span>${e.label}</span>`;
      b.onclick = (ev) => {
        ev.stopPropagation();
        sendChatSticker(e.id);
      };
      picker.appendChild(b);
    });
  }

  function specSeatList(room) {
    const specSeats = room.specSeats
      || Array.from({ length: 5 }, (_, i) => (room.spectators || [])[i] || null);
    while (specSeats.length < 5) specSeats.push(null);
    return specSeats.slice(0, 5);
  }

  function commentatorSeatList(room) {
    const seats = room.commentatorSeats
      || Array.from({ length: 2 }, (_, i) => (room.commentators || [])[i] || null);
    while (seats.length < 2) seats.push(null);
    return seats.slice(0, 2);
  }

  function occupiedSeatCount(seats) {
    return (seats || []).filter(Boolean).length;
  }

  function syncSeatStripFold(blockId, kind, title, count) {
    const block = $(blockId);
    if (!block) return;
    const collapsed = !!state.stripCollapsed[kind];
    const btn = block.querySelector('.spec-toggle');
    const label = block.querySelector('.spec-label');
    if (label) label.textContent = `${title} (${count})`;
    block.classList.toggle('collapsed', collapsed);
    if (!btn) return;
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    btn.classList.toggle('open', !collapsed);
    btn.onclick = () => {
      state.stripCollapsed[kind] = !state.stripCollapsed[kind];
      const now = !!state.stripCollapsed[kind];
      block.classList.toggle('collapsed', now);
      btn.setAttribute('aria-expanded', now ? 'false' : 'true');
      btn.classList.toggle('open', !now);
      document.querySelectorAll(`.spec-block[data-strip="${kind}"]`).forEach((other) => {
        if (other === block) return;
        other.classList.toggle('collapsed', now);
        const otherBtn = other.querySelector('.spec-toggle');
        if (otherBtn) {
          otherBtn.setAttribute('aria-expanded', now ? 'false' : 'true');
          otherBtn.classList.toggle('open', !now);
        }
      });
    };
  }

  function renderCommentatorStrip(container, room, opts = {}) {
    if (!container || !room) return;
    const isHost = opts.isHost != null ? opts.isHost : room.hostId === state.playerId;
    const inLobby = opts.inLobby != null ? opts.inLobby : room.phase === 'lobby';
    container.innerHTML = '';
    commentatorSeatList(room).forEach((s, i) => {
      const el = document.createElement('div');
      el.className = 'spec-cell';
      if (s) {
        const nameEl = document.createElement('span');
        nameEl.className = 'player-name';
        nameEl.textContent = s.name || '解说';
        bindProfileClick(nameEl, s.profile, s.name);
        el.appendChild(nameEl);
        const actions = document.createElement('div');
        actions.className = 'seat-actions';
        if (inLobby && s.id !== state.playerId) {
          const swap = document.createElement('button');
          swap.className = 'btn ghost sm';
          swap.innerHTML = '<span>换</span>';
          swap.onclick = () => send({ type: 'requestSwap', targetId: s.id });
          actions.appendChild(swap);
        }
        if (isHost && s.id !== state.playerId) {
          const kick = document.createElement('button');
          kick.className = 'btn danger sm kick-btn';
          kick.innerHTML = '<span>踢</span>';
          kick.onclick = () => send({ type: 'kick', targetId: s.id });
          actions.appendChild(kick);
        }
        if (actions.childNodes.length) el.appendChild(actions);
      } else {
        const empty = document.createElement('span');
        empty.className = 'spec-empty';
        empty.textContent = '空';
        el.appendChild(empty);
        if (inLobby) {
          const sit = document.createElement('button');
          sit.className = 'btn sm ghost';
          sit.innerHTML = '<span>解说</span>';
          sit.onclick = () => send({ type: 'switchSeat', target: { kind: 'commentator', index: i } });
          el.appendChild(sit);
        }
      }
      container.appendChild(el);
    });
  }

  function renderSpecStrip(container, room, opts = {}) {
    if (!container || !room) return;
    const isHost = opts.isHost != null ? opts.isHost : room.hostId === state.playerId;
    const inLobby = opts.inLobby != null ? opts.inLobby : room.phase === 'lobby';
    container.innerHTML = '';
    specSeatList(room).forEach((s, i) => {
      const el = document.createElement('div');
      el.className = 'spec-cell';
      if (s) {
        const nameEl = document.createElement('span');
        nameEl.className = 'player-name';
        nameEl.textContent = s.name || '观战';
        bindProfileClick(nameEl, s.profile, s.name);
        el.appendChild(nameEl);
        const actions = document.createElement('div');
        actions.className = 'seat-actions';
        if (inLobby && s.id !== state.playerId) {
          const swap = document.createElement('button');
          swap.className = 'btn ghost sm';
          swap.innerHTML = '<span>换</span>';
          swap.onclick = () => send({ type: 'requestSwap', targetId: s.id });
          actions.appendChild(swap);
        }
        if (isHost && s.id !== state.playerId) {
          const kick = document.createElement('button');
          kick.className = 'btn danger sm kick-btn';
          kick.innerHTML = '<span>踢</span>';
          kick.onclick = () => send({ type: 'kick', targetId: s.id });
          actions.appendChild(kick);
        }
        if (actions.childNodes.length) el.appendChild(actions);
      } else {
        const empty = document.createElement('span');
        empty.className = 'spec-empty';
        empty.textContent = '空';
        el.appendChild(empty);
        if (inLobby) {
          const sit = document.createElement('button');
          sit.className = 'btn sm ghost';
          sit.innerHTML = '<span>观战</span>';
          sit.onclick = () => send({ type: 'switchSeat', target: { kind: 'spec', index: i } });
          el.appendChild(sit);
        }
      }
      container.appendChild(el);
    });
  }

  function renderRoom() {
    const room = state.room;
    if (!room) return;
    $('roomCode').textContent = room.code;
    const gt = GAME_TYPES.find((g) => g.id === room.gameType);
    const md = MODES.find((m) => m.id === room.mode);
    const scale = (room.gameType === 'draughts' || room.gameType === 'flying')
      ? ''
      : (room.boardScale === 'small' ? '小棋盘' : '大棋盘');
    const sizeTag = (room.gameType === 'gomoku' || room.gameType === 'go' || room.gameType === 'reversi')
      ? (room.boardSize || '')
      : '';
    const sec = Math.round((room.turnMs || 30000) / 1000);
    const vis = room.visibility === 'private' ? '私密' : '公开';
    const pass = room.hasJoinPass ? ' · 需口令' : '';
    const stake = room.friendshipStake
      ? ` · 友谊赌注 ${giftMeta(room.friendshipStake).label}`
      : '';
    const weatherTag = room.weather
      ? ` · 天象 ${room.weather.icon || ''} ${room.weather.label}`
      : (room.celestial ? ' · 天象开启' : '');
    const grudgeTag = room.grudgeMatch ? ' · 了结三番棋' : '';
    $('roomMeta').textContent = `${vis}${pass}${stake}${weatherTag}${grudgeTag} · ${gt ? gt.label : room.gameType} · ${md ? md.label : room.mode} · ${room.totalRounds || 1} 局${scale ? ` · ${scale}` : ''}${sizeTag ? ` · ${sizeTag}` : ''} · ${sec}秒/回合`;

    const seats = $('seats');
    seats.innerHTML = '';
    const isHost = room.hostId === state.playerId;
    const inLobby = room.phase === 'lobby';

    room.seats.forEach((seat) => {
      const el = document.createElement('div');
      el.className = 'seat';
      const isRival = !!(seat.player && room.rivalUid && seat.player.uid === room.rivalUid);
      if (isRival) el.classList.add('rival-seat');
      if (seat.player) {
        const avatar = document.createElement('div');
        avatar.className = 'seat-avatar';
        avatar.innerHTML = coalHtml(seat.player.skin, seat.color);
        bindProfileClick(avatar, seat.player.profile, seat.player.name);

        const info = document.createElement('div');
        info.className = 'info';
        const nameEl = document.createElement('strong');
        nameEl.className = 'player-name';
        nameEl.textContent = `${seat.player.name}${seat.player.id === room.hostId ? ' · 房主' : ''}${seat.player.bot ? ' · 人机' : ''}`;
        bindProfileClick(nameEl, seat.player.profile, seat.player.name);
        if (isRival) {
          const badge = document.createElement('span');
          badge.className = 'rival-badge';
          badge.textContent = '宿敌';
          nameEl.appendChild(badge);
        }
        const meta = document.createElement('span');
        meta.textContent = `座位${seat.index + 1} · 队${seat.team} · ${colorWordOf(room, seat.color)} · ${
          (seat.player.profile && seat.player.profile.rankLabel) || '一阶'
        }${seat.job ? ` · ${jobLabel(seat.job)}` : ''}`;
        const ready = document.createElement('span');
        ready.className = `ready ${seat.ready ? 'on' : ''}`;
        ready.textContent = seat.ready ? '已准备' : '未准备';
        info.appendChild(nameEl);
        info.appendChild(meta);
        info.appendChild(ready);
        el.appendChild(avatar);
        el.appendChild(info);

        const actions = document.createElement('div');
        actions.className = 'seat-actions';
        if (inLobby && seat.player.id !== state.playerId) {
          const swap = document.createElement('button');
          swap.className = 'btn ghost sm';
          swap.innerHTML = '<span>申请换位</span>';
          swap.onclick = () => send({ type: 'requestSwap', targetId: seat.player.id });
          actions.appendChild(swap);
        }
        if (isHost && seat.player.id !== state.playerId) {
          const kick = document.createElement('button');
          kick.className = 'btn danger sm kick-btn';
          kick.innerHTML = '<span>踢出</span>';
          kick.onclick = () => send({ type: 'kick', targetId: seat.player.id });
          actions.appendChild(kick);
        }
        if (actions.childNodes.length) el.appendChild(actions);
      } else {
        el.innerHTML = `<div class="info"><strong>座位${seat.index + 1} · 队${seat.team}</strong><span>空位</span></div>`;
        if (inLobby) {
          const sit = document.createElement('button');
          sit.className = 'btn sm';
          sit.innerHTML = '<span>坐下</span>';
          sit.onclick = () => send({ type: 'switchSeat', target: { kind: 'seat', index: seat.index } });
          el.appendChild(sit);
        }
      }
      seats.appendChild(el);
    });

    if ($('specTitle')) $('specTitle').classList.remove('hidden');
    renderSpecStrip($('specs'), room, { isHost, inLobby });
    renderCommentatorStrip($('commentators'), room, { isHost, inLobby });
    syncSeatStripFold('lobbySpecBlock', 'spec', '观战席', occupiedSeatCount(specSeatList(room)));
    syncSeatStripFold('lobbyCommBlock', 'commentator', '解说席', occupiedSeatCount(commentatorSeatList(room)));

    const banner = $('swapBanner');
    if (room.pendingSwap) {
      const ps = room.pendingSwap;
      banner.classList.remove('hidden');
      if (ps.toId === state.playerId) {
        banner.innerHTML = `
          <span>${ps.fromName} 申请与你换位</span>
          <button class="btn sm" id="btnSwapAccept"><span>同意</span></button>
          <button class="btn ghost sm" id="btnSwapReject"><span>拒绝</span></button>`;
        $('btnSwapAccept').onclick = () => send({ type: 'respondSwap', accept: true });
        $('btnSwapReject').onclick = () => send({ type: 'respondSwap', accept: false });
      } else if (ps.fromId === state.playerId) {
        banner.innerHTML = `<span>已向 ${ps.toName} 发起换位申请，等待回应…</span>`;
      } else {
        banner.innerHTML = `<span>${ps.fromName} 申请与 ${ps.toName} 换位</span>`;
      }
    } else {
      banner.classList.add('hidden');
      banner.innerHTML = '';
    }

    renderLobbyChat(room);
    renderGardenBar(room, 'roomGardenBar', 'roomGardenHint');
    renderJobPanel(room);

    const mySeat = room.you && room.you.seat;
    $('btnReady').innerHTML = `<span>${mySeat && mySeat.ready ? '取消准备' : '准备'}</span>`;
    $('btnReady').style.display = mySeat ? '' : 'none';
    $('btnStart').classList.toggle('hidden', !isHost);
    if ($('btnFillBots')) {
      $('btnFillBots').classList.toggle('hidden', !isHost || !inLobby);
      $('btnFillBots').innerHTML = `<span>${room.fillBots ? '人机补位 · 开' : '人机补位 · 关'}</span>`;
    }
    if ($('btnCelestial')) {
      $('btnCelestial').classList.toggle('hidden', !isHost || !inLobby);
      $('btnCelestial').innerHTML = `<span>${room.celestial ? '天象 · 开' : '天象 · 关'}</span>`;
    }
    if ($('btnGrudge')) {
      const canGrudge = !!(inLobby && mySeat && room.rivalInRoom && !room.grudgeMatch);
      $('btnGrudge').classList.toggle('hidden', !canGrudge);
    }
  }

  function skinMap(room) {
    const map = { 1: 'red', 2: 'blue' };
    (room.seats || []).forEach((s) => {
      if (s.player) map[s.color] = s.player.skin;
    });
    return map;
  }

  function canPlace(room) {
    if (!room || room.phase !== 'playing') return false;
    if (state.practiceMode && state.practiceThinking) return false;
    const cur = room.seats[room.turnSeatIndex];
    const mySeat = room.you && room.you.seat;
    const mySpec = room.you && room.you.spectator;
    const aid = !!room.aidRequest;
    const isMyTurn = !!(mySeat && cur && cur.player && cur.player.id === mySeat.player.id);
    const canAid = !!(mySpec && !room.you.commentator && aid && mySpec.aidUsed < 5);
    return (isMyTurn && !aid) || canAid;
  }

  function canCoachSuggest(room) {
    if (!room || room.phase !== 'playing') return false;
    if (state.practiceMode || state.puzzleMode) return false;
    if (room.you && room.you.commentator) return false;
    const mySpec = room.you && room.you.spectator;
    if (!mySpec) return false;
    if (room.aidRequest) return false;
    if (room.gameType === 'flying' || room.gameType === 'draughts') return false;
    return true;
  }

  function reversiFlipsAt(board, r, c, color) {
    if (!board || !board[r] || board[r][c]) return [];
    const n = board.length;
    const opp = color === 1 ? 2 : 1;
    const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    const flips = [];
    for (const [dr, dc] of dirs) {
      const line = [];
      let rr = r + dr;
      let cc = c + dc;
      while (rr >= 0 && cc >= 0 && rr < n && cc < n && board[rr][cc] === opp) {
        line.push({ r: rr, c: cc });
        rr += dr;
        cc += dc;
      }
      if (line.length && rr >= 0 && cc >= 0 && rr < n && cc < n && board[rr][cc] === color) {
        flips.push(...line);
      }
    }
    return flips;
  }

  function winnerText(winner, room) {
    if (winner === 0) return '本局平局';
    if (room && room.gameType === 'flying') {
      const names = room.teamNames || {};
      return `${names[winner] || FLYING_LABEL[winner] || winner} 获胜`;
    }
    if (winner === 1) return room && room.gameType === 'draughts' ? '深色胜利' : '黑方胜利';
    if (winner === 2) return room && room.gameType === 'draughts' ? '浅色胜利' : '白方胜利';
    return '对局结束';
  }

  function buildReplayPayload(room) {
    if (!room) return null;
    return {
      version: 1,
      gameType: room.gameType,
      boardSize: room.boardSize,
      boardScale: room.boardScale,
      mode: room.mode,
      moves: room.moveLog || [],
      boardHistory: room.boardHistory || [],
      winner: room.winner,
      seriesScore: room.seriesScore,
      teamNames: room.teamNames,
      currentRound: room.currentRound,
      totalRounds: room.totalRounds,
      timestamp: Date.now(),
      code: room.code,
    };
  }

  function exportReplayJson() {
    const payload = buildReplayPayload(state.room);
    if (!payload) {
      toast('暂无可导出棋谱');
      return;
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `qiba-${payload.gameType}-${payload.code || 'replay'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('棋谱 JSON 已导出');
  }

  function encodeReplayData(payload) {
    const json = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(json);
    let bin = '';
    bytes.forEach((b) => {
      bin += String.fromCharCode(b);
    });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function copyShareLink() {
    const payload = buildReplayPayload(state.room);
    if (!payload) {
      toast('暂无棋谱可分享');
      return;
    }
    const encoded = encodeReplayData(payload);
    let url = `${location.origin}/replay.html?data=${encoded}`;
    if (url.length > 1800) {
      try {
        const res = await fetch('/api/replay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || '保存失败');
        url = `${location.origin}${data.url}`;
      } catch (e) {
        toast(e.message || '分享链接生成失败');
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('分享链接已复制');
    } catch {
      toast(url);
    }
  }

  function renderSettlement(room) {
    const seriesEnd = room.phase === 'seriesEnd';
    const inTruth = room.phase === 'truth';
    $('settleCode').textContent = inTruth ? 'TRUTH' : (seriesEnd ? 'FINAL' : `R${room.currentRound}`);
    $('settleTitle').textContent = inTruth ? '友尽赛 · 真心话' : (seriesEnd ? '系列赛结算' : '本局结算');
    $('resultText').textContent = seriesEnd
      ? (room.gameType === 'flying'
        ? winnerText(room.winner, room)
        : (room.seriesScore.black === room.seriesScore.white
          ? '系列赛平局'
          : (room.seriesScore.black > room.seriesScore.white ? '黑方赢得系列赛' : '白方赢得系列赛')))
      : winnerText(room.winner, room);
    if (room.settleHint) {
      $('resultText').textContent = `${$('resultText').textContent} · ${room.settleHint}`;
    }

    if (room.gameType === 'flying') {
      const names = room.teamNames || {};
      const score = room.seriesScore || {};
      $('settleScore').innerHTML = Object.keys(names).map((k) => (
        `<div class="side"><span>${names[k]}</span><b>${score[k] || 0}</b></div>`
      )).join('');
      $('settleTeams').innerHTML = Object.keys(names).map((k) => `${FLYING_LABEL[k] || k}：${names[k]}`).join('<br/>');
    } else {
      $('settleScore').innerHTML = `
      <div class="side"><span>${room.gameType === 'draughts' ? '深色' : '黑方'}</span><b>${room.seriesScore.black}</b></div>
      <div class="side"><span>${room.gameType === 'draughts' ? '浅色' : '白方'}</span><b>${room.seriesScore.white}</b></div>`;
      const names = room.teamNames || { black: '黑方', white: '白方' };
      $('settleTeams').innerHTML = `${room.gameType === 'draughts' ? '深' : '黑'}：${names.black}<br/>${room.gameType === 'draughts' ? '浅' : '白'}：${names.white}`;
    }
    const scoreLine = room.gameType === 'flying'
      ? Object.entries(room.seriesScore || {}).map(([k, v]) => `${FLYING_LABEL[k] || k}${v}`).join(' ')
      : `${room.seriesScore.black}:${room.seriesScore.white}`;
    $('settleMeta').textContent = `第 ${room.currentRound}/${room.totalRounds} 局 · 本局手数 ${
      (room.roundResults && room.roundResults[room.roundResults.length - 1]
        ? room.roundResults[room.roundResults.length - 1].moves
        : 0)
    } · 比分 ${scoreLine}`;

    renderGiftBar($('settleGift'), room);
    if (state.practiceMode && $('settleGift')) {
      $('settleGift').innerHTML = '';
    }

    const bar = $('emoteBar');
    bar.innerHTML = '';
    if (!state.practiceMode) {
      EMOTES.forEach((e) => {
        const b = document.createElement('button');
        b.className = 'emote-btn';
        b.title = e.label;
        b.innerHTML = `${iconImg(e.src, e.label, 'emote-icon')}<span>${e.label}</span>`;
        b.onclick = () => send({ type: 'emote', emote: e.id });
        bar.appendChild(b);
      });
    }

    const feed = $('emoteFeed');
    feed.innerHTML = (room.recentEmotes || [])
      .slice(-8)
      .map((e) => {
        const meta = emoteMeta(e.emote);
        return `<div>${iconImg(meta.src, meta.label, 'inline-icon')} ${e.name} 发送了${meta.label}</div>`;
      })
      .join('');

    const isHost = room.hostId === state.playerId;
    const canNext = state.practiceMode
      ? room.phase === 'seriesEnd' || room.phase === 'roundEnd'
      : room.phase === 'roundEnd' && isHost;
    $('btnNextRound').classList.toggle('hidden', !canNext);
    if (state.practiceMode) $('btnNextRound').querySelector('span').textContent = '再练一局';
    else $('btnNextRound').querySelector('span').textContent = '下一局';
    maybeShowRankCeremony(myRoomProfile(room));
    renderTruthPrompt(room);
    renderRematchPrompt(room);
  }

  function giftLabel(id) {
    const meta = giftMeta(id);
    return (meta && meta.label) || id;
  }

  function renderTruthPrompt(room) {
    const box = $('truthPrompt');
    if (!box) return;
    const t = room && room.truth;
    const show = !state.practiceMode && !state.puzzleMode && t && (room.phase === 'truth' || t.question || t.answer);
    box.classList.toggle('hidden', !show);
    if (state.truthTick) {
      clearInterval(state.truthTick);
      state.truthTick = null;
    }
    if (!show) return;

    const youId = state.playerId;
    const isWinner = t.winnerId === youId;
    const isLoser = t.loserId === youId;
    const hint = $('truthHint');
    const choicesEl = $('truthChoices');
    const customEl = $('truthCustom');
    const answerBox = $('truthAnswerBox');
    const resultEl = $('truthResult');
    const title = $('truthTitle');
    if (title) title.textContent = '友尽赛 · 真心话';

    const tick = () => {
      if (!hint) return;
      const left = Math.max(0, Math.ceil(((t.deadline || 0) - Date.now()) / 1000));
      if (room.phase === 'truth' && t.stage === 'pick') {
        hint.textContent = isWinner
          ? `选出一题或自己出题 · 超时将随机选题 · ${left}s`
          : `等待 ${t.winnerName} 出题 · ${left}s`;
      } else if (room.phase === 'truth' && t.stage === 'answer') {
        hint.textContent = isLoser
          ? `请回答，拒绝或超时将扣除 3 件背包物品 · ${left}s`
          : `等待 ${t.loserName} 作答 · ${left}s`;
      } else {
        hint.textContent = t.penalty
          ? `${t.loserName} 未作答，已扣除背包物品`
          : '真心话已完成';
      }
    };
    tick();
    if (room.phase === 'truth' && t.deadline) {
      state.truthTick = setInterval(tick, 400);
    }

    const picking = room.phase === 'truth' && t.stage === 'pick' && isWinner;
    if (choicesEl) {
      choicesEl.innerHTML = '';
      if (picking) {
        (t.choices || []).forEach((q, i) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn ghost sm truth-choice';
          b.textContent = q;
          b.onclick = () => send({ type: 'truthPick', index: i });
          choicesEl.appendChild(b);
        });
      } else if (t.question) {
        const p = document.createElement('p');
        p.className = 'truth-q';
        p.textContent = `题目：${t.question}`;
        choicesEl.appendChild(p);
      }
    }
    if (customEl) customEl.classList.toggle('hidden', !picking);
    if (answerBox) {
      answerBox.classList.toggle('hidden', !(room.phase === 'truth' && t.stage === 'answer' && isLoser));
    }
    if (resultEl) {
      if (t.answer) {
        resultEl.classList.remove('hidden');
        resultEl.textContent = `${t.loserName}：${t.answer}`;
      } else if (t.penalty && t.stage === 'done') {
        resultEl.classList.remove('hidden');
        const taken = (t.penalty.taken || []).map(giftLabel).join('、');
        resultEl.textContent = taken
          ? `${t.loserName} 未作答，扣除 ${taken}`
          : `${t.loserName} 未作答，背包已空`;
      } else {
        resultEl.classList.add('hidden');
        resultEl.textContent = '';
      }
    }
  }

  function renderRematchPrompt(room) {
    const box = $('rematchPrompt');
    if (!box) return;
    const seated = !!(room.you && room.you.seat);
    const show = !state.practiceMode && !state.puzzleMode
      && room.phase === 'seriesEnd'
      && room.rematchOpen
      && seated;
    box.classList.toggle('hidden', !show);
    if (state.rematchTick) {
      clearInterval(state.rematchTick);
      state.rematchTick = null;
    }
    if (!show) return;
    const voted = room.rematchVotes && room.rematchVotes[state.playerId];
    const hint = $('rematchHint');
    const tick = () => {
      const left = Math.max(0, Math.ceil(((room.rematchDeadline || 0) - Date.now()) / 1000));
      if (hint) {
        hint.textContent = voted
          ? `已同意，等待其他棋手或房主确认 · ${left}s`
          : `30 秒内未选则回到大厅 · 剩余 ${left}s`;
      }
    };
    tick();
    state.rematchTick = setInterval(tick, 400);
  }

  function renderChat(room) {
    const feed = $('chatFeed');
    feed.innerHTML = (room.chatLog || [])
      .slice(-8)
      .filter((c) => !isMutedChat(c))
      .map((c) => {
        if (c.kind === 'system') {
          return `<div class="hint soft">${c.text}</div>`;
        }
        if (c.kind === 'emote') {
          const meta = emoteMeta(c.emote);
          return `<div><b>${c.name}</b> ${iconImg(meta.src, meta.label, 'chat-sticker')} <span class="chat-sticker-label">${meta.label}</span>${muteChatBtn(c)}</div>`;
        }
        if (c.kind === 'gift') {
          const g = giftMeta(c.item);
          return `<div><b>${c.name}</b> 赠送 ${iconImg(g.src, g.label, 'inline-icon')} ${g.label} → ${c.toName}${muteChatBtn(c)}</div>`;
        }
        return `<div><b>${c.name}</b>：${c.text}${muteChatBtn(c)}</div>`;
      })
      .join('');
    bindMuteButtons(feed);

    const emotes = $('chatEmotes');
    emotes.innerHTML = '';
    EMOTES.forEach((e) => {
      const b = document.createElement('button');
      b.className = 'emote-btn';
      b.title = e.label;
      b.innerHTML = `${iconImg(e.src, e.label, 'emote-icon')}<span>${e.label}</span>`;
      b.onclick = () => send({ type: 'emote', emote: e.id });
      emotes.appendChild(b);
    });

    const texts = $('chatTexts');
    texts.innerHTML = '';
    myQuickList().forEach((t) => {
      const b = document.createElement('button');
      b.className = 'quick-btn';
      b.textContent = t.text;
      b.onclick = () => send({ type: 'quickText', textId: t.id });
      texts.appendChild(b);
    });
    if ($('btnEditQuick')) {
      $('btnEditQuick').classList.toggle('hidden', !isLoggedIn());
    }
  }

  function renderGame() {
    const room = state.room;
    if (!room || !room.board) return;
    const gt = GAME_TYPES.find((g) => g.id === room.gameType);
    const md = room.mode === 'practice'
      ? { label: '人机练习' }
      : MODES.find((m) => m.id === room.mode);
    $('gameTitle').textContent = `${gt ? gt.label : room.gameType} · ${md ? md.label : room.mode} · ${room.currentRound}/${room.totalRounds}${room.gameType === 'flying' || room.gameType === 'draughts' ? '' : ` · ${room.boardSize}路`}`;
    if ($('practiceBanner')) {
      $('practiceBanner').classList.toggle('hidden', !state.practiceMode);
    }

    const cur = room.seats[room.turnSeatIndex];
    const aidTag = room.aidRequest ? ' · 外援请求中' : '';
    const scoreTag = room.gameType === 'flying'
      ? ` · ${Object.entries(room.seriesScore || {}).map(([k, v]) => `${FLYING_LABEL[k] || k}${v}`).join(' ')}`
      : ` · 比分 ${room.seriesScore.black}:${room.seriesScore.white}`;
    const colorWord = colorWordOf(room, room.turnColor);
    if (room.phase === 'playing' && cur && cur.player) {
      const nameSpan = document.createElement('span');
      nameSpan.className = 'player-name';
      nameSpan.textContent = cur.player.name;
      bindProfileClick(nameSpan, cur.player.profile, cur.player.name);
      $('turnInfo').innerHTML = '';
      $('turnInfo').append(
        document.createTextNode(`当前：队${cur.team} · ${colorWord}（`),
        nameSpan,
        document.createTextNode(`）${aidTag}${scoreTag}`)
      );
    } else {
      $('turnInfo').textContent = room.phase === 'playing'
        ? `当前：队${cur ? cur.team : '-'} · ${colorWord}${aidTag}${scoreTag}`
        : `结算中${scoreTag}`;
    }

    const weatherEl = $('weatherBanner');
    if (weatherEl) {
      const w = room.weather;
      if (w && w.id) {
        const meta = WEATHER_LABELS[w.id] || w;
        let extra = '';
        if (w.id === 'tide' && room.event && room.event.turnsLeft > 0) extra = ` · 边线封闭 ${room.event.turnsLeft} 手`;
        if (w.id === 'meteor') extra = ' · 踩中幸运点 +8 秒';
        if (w.id === 'fogSpread') extra = ' · 对手近几手被迷雾遮住';
        weatherEl.textContent = `${meta.icon || w.icon || ''} ${meta.label || w.label}${extra}`;
        weatherEl.classList.remove('hidden');
      } else {
        weatherEl.classList.add('hidden');
      }
    }
    const mentorEl = $('mentorBanner');
    if (mentorEl) {
      const on = !!(room.mentorCoaching && room.mentorCoaching.name);
      mentorEl.classList.toggle('hidden', !on);
      if (on) mentorEl.textContent = `师傅指导中 · ${room.mentorCoaching.name}`;
    }
    renderGardenBar(room, 'gameGardenBar', null, 'gameGardenLabel');
    if (room.spyReveal && room.spyReveal.hint && room.spyReveal.until > state.lastSpyRevealUntil) {
      state.lastSpyRevealUntil = room.spyReveal.until;
      flashToast(`间谍窥视：${room.spyReveal.hint}`);
    }

    if (state.puzzleMode && room.phase === 'playing') tickTimer(room.turnDeadline);
    else if (state.practiceMode && room.phase === 'playing') {
      if (timer) clearInterval(timer);
      stopUrgentBeep();
      $('timer').classList.remove('urgent');
      $('timer').textContent = state.practiceThinking ? 'AI' : 'GO';
    } else if (room.phase === 'playing') tickTimer(room.turnDeadline);
    else {
      if (timer) clearInterval(timer);
      stopUrgentBeep();
      $('timer').classList.remove('urgent');
    }

    renderSpecStrip($('gameSpecs'), room, {
      isHost: room.hostId === state.playerId,
      inLobby: false,
    });
    renderCommentatorStrip($('gameCommentators'), room, {
      isHost: room.hostId === state.playerId,
      inLobby: false,
    });
    syncSeatStripFold('gameSpecBlock', 'spec', '观战席', occupiedSeatCount(specSeatList(room)));
    syncSeatStripFold('gameCommBlock', 'commentator', '解说席', occupiedSeatCount(commentatorSeatList(room)));
    applyBoardThemeLayer(room);
    drawBoard(room);
    renderToolbar(room);
    renderPropBalance(room);
    renderChat(room);
    renderThemeDock(room);
    if (state.practiceMode) {
      if ($('giftDock')) $('giftDock').innerHTML = '';
      if ($('chatFeed')) $('chatFeed').innerHTML = '';
      if ($('chatEmotes')) $('chatEmotes').innerHTML = '';
      if ($('chatTexts')) $('chatTexts').innerHTML = '';
    } else {
      renderGiftBar($('giftDock'), room);
    }

    const settling = room.phase === 'roundEnd' || room.phase === 'seriesEnd' || room.phase === 'truth';
    $('overlay').classList.toggle('hidden', !settling);
    if (settling) renderSettlement(room);
  }

  function applyBoardThemeLayer(room) {
    const img = $('boardThemeLayer');
    const shell = img && img.closest('.board-shell');
    if (!img) return;
    const locked = !room || THEME_LOCKED.has(room.gameType);
    const theme = BOARD_THEMES.find((t) => t.id === ((room && room.boardTheme) || 'default')) || BOARD_THEMES[0];
    if (locked || !theme.src) {
      img.removeAttribute('src');
      img.classList.remove('on');
      if (shell) shell.classList.remove('has-theme');
      return;
    }
    if (img.getAttribute('src') !== theme.src) img.src = theme.src;
    img.classList.add('on');
    if (shell) shell.classList.add('has-theme');
  }

  function renderThemeDock(room) {
    const dock = $('themeDock');
    if (!dock) return;
    const locked = !room || THEME_LOCKED.has(room.gameType);
    dock.classList.toggle('hidden', locked);
    if (locked) {
      dock.innerHTML = '';
      return;
    }
    const current = room.boardTheme || 'default';
    const remain = room.boardThemeAt
      ? Math.max(0, Math.ceil((5000 - (Date.now() - room.boardThemeAt)) / 1000))
      : 0;
    dock.innerHTML = '<div class="theme-title">棋盘背景</div>';
    const row = document.createElement('div');
    row.className = 'theme-picks';
    BOARD_THEMES.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `theme-pick${current === t.id ? ' on' : ''}${t.src ? '' : ' default'}`;
      b.title = t.label;
      b.disabled = remain > 0 && t.id !== current;
      if (t.src) b.innerHTML = `<img src="${t.src}" alt="${t.label}" />`;
      else b.textContent = t.label;
      b.onclick = () => {
        if (remain > 0) return;
        if (state.practiceMode && state.room) {
          state.room.boardTheme = t.id;
          state.room.boardThemeAt = Date.now();
          renderGame();
          return;
        }
        send({ type: 'setBoardTheme', themeId: t.id });
      };
      row.appendChild(b);
    });
    dock.appendChild(row);
    if (remain > 0 && !dock.dataset.coolTimer) {
      dock.dataset.coolTimer = '1';
      setTimeout(() => {
        dock.dataset.coolTimer = '';
        if (state.room) renderThemeDock(state.room);
      }, remain * 1000 + 80);
    }
  }

  function setReplayIndex(idx) {
    const room = state.room;
    if (!room || !room.boardHistory) return;
    const max = room.boardHistory.length - 1;
    if (idx == null || idx >= max) {
      state.replayIndex = null;
    } else {
      state.replayIndex = Math.max(0, Math.min(max, idx));
    }
    renderGame();
  }

  function activeBoard(room) {
    if (state.replayIndex == null || !room.boardHistory || !room.boardHistory.length) {
      return room.board;
    }
    return room.boardHistory[state.replayIndex] || room.board;
  }

  function pickCell(canvas, room, clientX, clientY) {
    const n = room.boardSize || room.board.length;
    const W = canvas.width;
    const pad = 28;
    const step = (W - pad * 2) / (n - 1);
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (clientX - rect.left) * scale;
    const y = (clientY - rect.top) * scale;
    let best = null;
    let bestD = Infinity;
    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) {
        const px = pad + c * step;
        const py = pad + r * step;
        const d = (px - x) ** 2 + (py - y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = { r, c };
        }
      }
    }
    if (!best || bestD > (step * 0.55) ** 2) return null;
    return best;
  }

  function drawArrow(ctx, x1, y1, x2, y2, color) {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const head = 12;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(ang - 0.4), y2 - head * Math.sin(ang - 0.4));
    ctx.lineTo(x2 - head * Math.cos(ang + 0.4), y2 - head * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  function isMyTurnNow() {
    const room = state.room;
    if (!room || room.phase !== 'playing') return false;
    const mySeat = room.you && room.you.seat;
    const cur = room.seats[room.turnSeatIndex];
    return !!(mySeat && cur && cur.player && cur.player.id === mySeat.player.id);
  }

  function stopUrgentBeep() {
    if (state.urgentBeepTimer) {
      clearInterval(state.urgentBeepTimer);
      state.urgentBeepTimer = null;
    }
  }

  function syncUrgentBeep(remain) {
    const should = remain <= 5 && remain > 0 && isMyTurnNow();
    if (!should) {
      stopUrgentBeep();
      return;
    }
    if (state.urgentBeepTimer) return;
    if (window.QibaFx) QibaFx.play('urgent');
    state.urgentBeepTimer = setInterval(() => {
      if (!isMyTurnNow() || state.remain > 5 || state.remain <= 0) {
        stopUrgentBeep();
        return;
      }
      if (window.QibaFx) QibaFx.play('urgent');
    }, 800);
  }

  function tickTimer(deadline) {
    if (timer) clearInterval(timer);
    const update = () => {
      const remain = Math.max(0, Math.ceil(((deadline || 0) - Date.now()) / 1000));
      state.remain = remain;
      const el = $('timer');
      el.textContent = String(remain);
      const urgent = remain <= 5 && state.room && state.room.phase === 'playing';
      el.classList.toggle('urgent', urgent);
      syncUrgentBeep(remain);
      if (state.puzzleMode && remain <= 0 && state.room && state.room.phase === 'playing') {
        finishPuzzle(false, '超时');
      }
    };
    update();
    timer = setInterval(update, 200);
  }

  function renderToolbar(room) {
    const box = $('toolbar');
    box.innerHTML = '';
    if (room.phase !== 'playing') return;

    const mySeat = room.you && room.you.seat;
    const mySpec = room.you && room.you.spectator;
    const cur = room.seats[room.turnSeatIndex];
    const isMyTurn = !!(mySeat && cur && cur.player && cur.player.id === mySeat.player.id);
    const aid = !!room.aidRequest;

    const add = (label, onClick, cls = '') => {
      const b = document.createElement('button');
      b.className = `btn ${cls}`.trim();
      b.innerHTML = `<span>${label}</span>`;
      b.onclick = onClick;
      box.appendChild(b);
    };

    if (mySeat && !state.practiceMode && room.gameType !== 'flying') add(`悔棋×${mySeat.undoLeft}`, () => send({ type: 'undo' }), 'ghost');
    if (room.gameType === 'go' && canPlace(room)) {
      add('停一手', () => {
        if (mySpec && aid && !room.you.commentator) send({ type: 'aidMove', r: -1, c: -1 });
        else send({ type: 'place', r: -1, c: -1 });
      }, 'ghost');
    }
    if (room.mode === 'aid' && isMyTurn && !aid && (room.spectators || []).length) {
      add('请求外援', () => send({ type: 'requestAid' }), 'ghost');
    }
    if (aid && isMyTurn) add('取消外援', () => send({ type: 'cancelAid' }), 'danger');
    if (mySpec && aid && !room.you.commentator) {
      $('gameHint').textContent = '外援';
    } else if (canCoachSuggest(room)) {
      $('gameHint').textContent = '点格子可向当前行棋方建议一手（仅对方可见虚影）';
    } else if (state.puzzleMode) {
      if (room.phase === 'playing' && state.puzzle) {
        $('gameHint').textContent = state.puzzle.desc || '残局挑战';
      }
    } else if (state.practiceMode) {
      if (state.practiceThinking) {
        $('gameHint').textContent = '思考中…';
      } else if (room.phase === 'playing' && room.turnColor === 2) {
        $('gameHint').textContent = '可重试';
      } else if (room.phase === 'playing') {
        $('gameHint').textContent = '轮到你';
      }
    } else if (room.lastMove && !room.lastMove.pass && room.lastMove.r >= 0) {
      $('gameHint').textContent = '';
    } else {
      $('gameHint').textContent = '';
    }
    if (room.mode === 'props' && mySeat) {
      const catalog = propsForGame(room.gameType);
      catalog.forEach((p) => {
        const n = (mySeat.props && mySeat.props[p.id]) || 0;
        add(`${p.label}×${n}`, () => startUseProp(p), n ? '' : 'ghost');
      });
    }
    if (room.gameType === 'flying' && isMyTurn && !state.practiceMode) {
      const rolled = room.board && room.board.rolled;
      const shown = rolled ? room.board.dice : (room.lastDice || '');
      add(rolled ? `点数 ${shown}` : (shown ? `再掷（上次 ${shown}）` : '掷骰子'), () => {
        if (!rolled) send({ type: 'rollDice' });
      }, rolled ? 'ghost' : 'primary');
      if (rolled) {
        $('gameHint').textContent = `${room.board.dice}`;
      } else if (room.lastMove && room.lastMove.stuck) {
        $('gameHint').textContent = '';
      }
    }
    if (room.gameType === 'draughts' && isMyTurn) {
      $('gameHint').textContent = '';
    }
    if (state.practiceMode) {
      if (state.puzzleMode) {
        add('放弃', () => finishPuzzle(false, '放弃'), 'danger');
        add('返回首页', () => stopPractice(), 'ghost');
      } else {
        if (state.practiceThinking) {
          add('AI 思考中', () => {}, 'ghost');
        } else if (room.phase === 'playing' && room.turnColor === 2) {
          add('重试 AI', () => practiceAiMove(), 'primary');
        }
        add('认输', () => finishPractice(2, { resigned: true }), 'danger');
        add('返回首页', () => stopPractice(), 'ghost');
      }
    } else if (mySeat) {
      add('认输', () => {
        if (!window.confirm('确定认输？本局记一场失败。')) return;
        send({ type: 'resign' });
      }, 'danger');
      add('强制退出', () => leaveRoomLocal(true), 'danger');
    }
  }

  function renderPropBalance(room) {
    const box = $('propBalance');
    if (!box) return;
    const show = room && room.mode === 'props' && (room.phase === 'playing' || room.phase === 'roundEnd' || room.phase === 'seriesEnd');
    box.classList.toggle('hidden', !show);
    if (!show) {
      box.innerHTML = '';
      return;
    }
    const sideLabel = (seat) => {
      const name = (seat.player && seat.player.name) || `${colorWordOf(room, seat.color)}方`;
      return `${colorWordOf(room, seat.color)} · ${name}`;
    };
    box.innerHTML = `
      <div class="prop-balance-head">
        <span>道具余量（双方可见）</span>
        <span>不含隐藏信息，仅公开次数</span>
      </div>
      ${(room.seats || []).map((seat) => {
        const catalog = propsForGame(room.gameType);
        const props = seat.props || {};
        const chips = catalog.map((p) => {
          const n = props[p.id] || 0;
          return `<span class="prop-chip${n ? '' : ' empty'}">${p.label}×${n}</span>`;
        }).join('');
        return `<div class="prop-balance-row"><b>${sideLabel(seat)}</b>${chips}</div>`;
      }).join('')}`;
  }

  function starPoints(n) {
    if (n === 15) return [3, 7, 11];
    if (n === 13) return [3, 6, 9];
    if (n === 9) return [2, 4, 6];
    if (n === 8 || n === 6) return [];
    const mid = Math.floor(n / 2);
    return [mid];
  }

  function bindBoardRedraw(img) {
    if (img.dataset.bound) return;
    img.dataset.bound = '1';
    img.onload = () => {
      if (state.room && state.room.board) drawBoard(state.room);
    };
  }

  function drawCoverImage(ctx, img, W, H) {
    if (!img || !img.complete || !img.naturalWidth) return false;
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = W / H;
    let dw = W;
    let dh = H;
    let dx = 0;
    let dy = 0;
    if (ir > cr) {
      dw = H * ir;
      dx = (W - dw) / 2;
    } else {
      dh = W / ir;
      dy = (H - dh) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    return true;
  }

  function containRect(img, W, H) {
    if (!img || !img.complete || !img.naturalWidth) {
      return { dx: 0, dy: 0, dw: W, dh: H };
    }
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = W / H;
    let dw = W;
    let dh = H;
    let dx = 0;
    let dy = 0;
    if (ir > cr) {
      dh = W / ir;
      dy = (H - dh) / 2;
    } else {
      dw = H * ir;
      dx = (W - dw) / 2;
    }
    return { dx, dy, dw, dh };
  }

  function drawContainImage(ctx, img, W, H) {
    if (!img || !img.complete || !img.naturalWidth) return false;
    const { dx, dy, dw, dh } = containRect(img, W, H);
    ctx.drawImage(img, dx, dy, dw, dh);
    return true;
  }

  function draughtsLayout(W) {
    const box = containRect(draughtsBoardImg, W, W);
    const nw = draughtsBoardImg.naturalWidth || 480;
    const nh = draughtsBoardImg.naturalHeight || 479;
    const padX = box.dw * (30 / nw);
    const padY = box.dh * (31 / nh);
    const cellW = (box.dw - padX * 2) / 8;
    const cellH = (box.dh - padY * 2) / 8;
    return {
      originX: box.dx + padX,
      originY: box.dy + padY,
      cellW,
      cellH,
      cell: Math.min(cellW, cellH),
    };
  }

  function pickDraughtsCell(canvas, clientX, clientY) {
    const W = canvas.width;
    const { originX, originY, cellW, cellH } = draughtsLayout(W);
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (clientX - rect.left) * scale;
    const y = (clientY - rect.top) * scale;
    const c = Math.floor((x - originX) / cellW);
    const r = Math.floor((y - originY) / cellH);
    if (r < 0 || c < 0 || r > 7 || c > 7) return null;
    return { r, c };
  }

  function flyingHangarXY(color, index, W) {
    const cells = [[-0.72, -0.72], [0.72, -0.72], [-0.72, 0.72], [0.72, 0.72]];
    const corners = {
      1: [0.155, 0.155],
      2: [0.845, 0.155],
      3: [0.845, 0.845],
      4: [0.155, 0.845],
    };
    const [cx, cy] = corners[color];
    const [dx, dy] = cells[index] || cells[0];
    return { x: (cx + dx * 0.05) * W, y: (cy + dy * 0.05) * W };
  }

  function flyingTrackXY(i, W) {
    const n = 13;
    const side = Math.floor(((i % 52) + 52) % 52 / n);
    const t = ((i % 52) + 52) % 52 % n;
    const u = n === 1 ? 0 : t / (n - 1);
    const m = 0.11;
    const M = 0.89;
    let x;
    let y;
    if (side === 0) { x = m + (M - m) * u; y = m; }
    else if (side === 1) { x = M; y = m + (M - m) * u; }
    else if (side === 2) { x = M - (M - m) * u; y = M; }
    else { x = m; y = M - (M - m) * u; }
    return { x: x * W, y: y * W };
  }

  function flyingHomeXY(color, pos, W) {
    const paths = {
      1: { x1: 0.20, y1: 0.50, x2: 0.46, y2: 0.50 },
      2: { x1: 0.50, y1: 0.20, x2: 0.50, y2: 0.46 },
      3: { x1: 0.80, y1: 0.50, x2: 0.54, y2: 0.50 },
      4: { x1: 0.50, y1: 0.80, x2: 0.50, y2: 0.54 },
    };
    if (pos >= 5) return { x: 0.5 * W, y: 0.5 * W };
    const p = paths[color];
    const u = (pos + 0.5) / 5;
    return { x: (p.x1 + (p.x2 - p.x1) * u) * W, y: (p.y1 + (p.y2 - p.y1) * u) * W };
  }

  function flyingPlaneXY(plane, W) {
    if (!plane) return { x: 0, y: 0 };
    if (plane.loc === 'base') return flyingHangarXY(plane.color, plane.index, W);
    if (plane.loc === 'track') return flyingTrackXY(plane.pos, W);
    return flyingHomeXY(plane.color, plane.loc === 'done' ? 5 : plane.pos, W);
  }

  function pickFlyingPlane(canvas, room, clientX, clientY) {
    const W = canvas.width;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (clientX - rect.left) * scale;
    const y = (clientY - rect.top) * scale;
    const planes = (room.board && room.board.planes) || [];
    let best = null;
    let bestD = (W * 0.045) ** 2;
    planes.forEach((p) => {
      const pt = flyingPlaneXY(p, W);
      const d = (pt.x - x) ** 2 + (pt.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    });
    return best;
  }

  function handleBoardClick(room, r, c, extra = {}) {
    if (state.puzzleMode) {
      puzzlePlace(r, c);
      return;
    }
    if (state.propTarget) {
      applyPropCell(room, r, c);
      return;
    }
    if (state.practiceMode) {
      if (!canPlace(room) || state.practiceThinking) return;
      practicePlace(r, c);
      return;
    }
    if (canCoachSuggest(room)) {
      send({ type: 'coachSuggest', r, c });
      toast('已发送建议一手');
      return;
    }
    if (room.gameType === 'draughts') {
      handleDraughtsClick(room, r, c);
      return;
    }
    if (room.gameType === 'flying') {
      handleFlyingClick(room, extra.plane);
      return;
    }
    if (!canPlace(room)) return;
    const mySpec = room.you && room.you.spectator;
    const aid = !!room.aidRequest;
    if (mySpec && aid && !room.you.commentator) send({ type: 'aidMove', r, c });
    else send({ type: 'place', r, c });
  }

  function handleDraughtsClick(room, r, c) {
    if (!canPlace(room)) return;
    const board = room.board;
    const colorOf = (v) => (v === 1 || v === 3 ? 1 : (v === 2 || v === 4 ? 2 : 0));
    const myColor = room.turnColor;
    const legal = room.legalMoves || [];
    if (room.draughtsContinue) {
      send({
        type: 'place',
        r,
        c,
        fromR: room.draughtsContinue.r,
        fromC: room.draughtsContinue.c,
      });
      state.selectedCell = null;
      return;
    }
    const piece = board[r] && board[r][c];
    if (state.selectedCell) {
      const from = state.selectedCell;
      if (from.r === r && from.c === c) {
        state.selectedCell = null;
        drawBoard(room);
        return;
      }
      const okMove = legal.some((m) => m.fromR === from.r && m.fromC === from.c && m.toR === r && m.toC === c);
      if (okMove) {
        send({ type: 'place', r, c, fromR: from.r, fromC: from.c });
        state.selectedCell = null;
        return;
      }
      if (colorOf(piece) === myColor) {
        state.selectedCell = { r, c };
        drawBoard(room);
        return;
      }
      toast('非法走子');
      return;
    }
    if (colorOf(piece) === myColor) {
      state.selectedCell = { r, c };
      drawBoard(room);
    }
  }

  function handleFlyingClick(room, plane) {
    if (!canPlace(room)) return;
    if (!room.board || !room.board.rolled) {
      toast('请先掷骰子');
      return;
    }
    if (!plane) return;
    const legal = room.flyingLegalIds || [];
    if (legal.length && !legal.includes(plane.id)) {
      toast('这架飞机走不了当前点数');
      return;
    }
    send({ type: 'place', planeId: plane.id });
  }

  function bindCanvasInput(canvas, room, kind) {
    const live = true;
    const pick = (x, y) => {
      if (kind === 'draughts') return pickDraughtsCell(canvas, x, y);
      if (kind === 'flying') return null;
      return pickCell(canvas, room, x, y);
    };
    canvas.oncontextmenu = (ev) => ev.preventDefault();
    canvas.onmousemove = (ev) => {
      if (kind !== 'grid') return;
      const cell = pick(ev.clientX, ev.clientY);
      if (state.arrowDraft && state.arrowDraft.from) {
        state.arrowDraft.to = cell;
        drawBoard(room);
        return;
      }
      const same = state.hover && cell && state.hover.r === cell.r && state.hover.c === cell.c;
      if (!same) {
        state.hover = cell;
        drawBoard(room);
      }
    };
    canvas.onmouseleave = () => {
      state.hover = null;
      state.arrowDraft = null;
      if (kind === 'grid') drawBoard(room);
    };
    canvas.onmousedown = (ev) => {
      if (kind !== 'grid' || ev.button !== 2) return;
      ev.preventDefault();
      const cell = pick(ev.clientX, ev.clientY);
      if (!cell) return;
      state.arrowDraft = { from: cell, to: cell };
    };
    canvas.onmouseup = (ev) => {
      if (kind !== 'grid' || ev.button !== 2) return;
      ev.preventDefault();
      const cell = pick(ev.clientX, ev.clientY);
      if (!state.arrowDraft || !state.arrowDraft.from || !cell) {
        state.arrowDraft = null;
        return;
      }
      const from = state.arrowDraft.from;
      if (from.r === cell.r && from.c === cell.c) {
        const key = `${cell.r},${cell.c}`;
        const exists = state.circles.findIndex((p) => `${p.r},${p.c}` === key);
        if (exists >= 0) state.circles.splice(exists, 1);
        else state.circles.push(cell);
      } else {
        state.arrows.push({ from, to: cell });
        if (state.arrows.length > 12) state.arrows.shift();
      }
      state.arrowDraft = null;
      if (window.QibaFx) QibaFx.play('click');
      drawBoard(room);
    };

    let touchLongTimer = null;
    let touchStartCell = null;
    let touchMoved = false;
    let longPressDone = false;
    const clearTouchTimer = () => {
      if (touchLongTimer) {
        clearTimeout(touchLongTimer);
        touchLongTimer = null;
      }
    };
    canvas.ontouchstart = (ev) => {
      if (!ev.touches || !ev.touches[0]) return;
      const t = ev.touches[0];
      touchStartCell = kind === 'flying'
        ? pickFlyingPlane(canvas, room, t.clientX, t.clientY)
        : pick(t.clientX, t.clientY);
      touchMoved = false;
      longPressDone = false;
      if (kind === 'grid' && touchStartCell) {
        state.hover = touchStartCell;
        drawBoard(room);
      }
      clearTouchTimer();
      if (kind === 'grid') {
        touchLongTimer = setTimeout(() => {
          longPressDone = true;
          if (!touchStartCell) return;
          const key = `${touchStartCell.r},${touchStartCell.c}`;
          const exists = state.circles.findIndex((p) => `${p.r},${p.c}` === key);
          if (exists >= 0) state.circles.splice(exists, 1);
          else state.circles.push(touchStartCell);
          if (window.QibaFx) QibaFx.play('click');
          drawBoard(room);
        }, 480);
      }
    };
    canvas.ontouchmove = (ev) => {
      if (!ev.touches || !ev.touches[0] || !touchStartCell) return;
      const t = ev.touches[0];
      if (kind === 'flying') {
        const p = pickFlyingPlane(canvas, room, t.clientX, t.clientY);
        if (!p || p.id !== touchStartCell.id) {
          touchMoved = true;
          clearTouchTimer();
        }
        return;
      }
      const cell = pick(t.clientX, t.clientY);
      if (kind === 'grid' && cell) {
        state.hover = cell;
        drawBoard(room);
      }
      if (!cell || cell.r !== touchStartCell.r || cell.c !== touchStartCell.c) {
        touchMoved = true;
        clearTouchTimer();
      }
    };
    canvas.ontouchend = (ev) => {
      clearTouchTimer();
      if (longPressDone || touchMoved) {
        touchStartCell = null;
        return;
      }
      const t = (ev.changedTouches && ev.changedTouches[0]) || null;
      if (kind === 'flying') {
        const plane = t
          ? pickFlyingPlane(canvas, room, t.clientX, t.clientY)
          : touchStartCell;
        touchStartCell = null;
        handleBoardClick(room, 0, 0, { plane });
        return;
      }
      const cell = t ? pick(t.clientX, t.clientY) : touchStartCell;
      touchStartCell = null;
      if (!cell) return;
      handleBoardClick(room, cell.r, cell.c);
    };
    canvas.ontouchcancel = () => {
      clearTouchTimer();
      touchStartCell = null;
    };

    canvas.onclick = (ev) => {
      if (ev.pointerType === 'touch' || (ev.sourceCapabilities && ev.sourceCapabilities.firesTouchEvents)) {
        return;
      }
      if (kind === 'flying') {
        const plane = pickFlyingPlane(canvas, room, ev.clientX, ev.clientY);
        handleBoardClick(room, 0, 0, { plane });
        return;
      }
      const best = pick(ev.clientX, ev.clientY);
      if (!best) return;
      handleBoardClick(room, best.r, best.c);
    };
    void live;
  }

  function drawDraughts(room) {
    const canvas = $('board');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const { originX, originY, cellW, cellH, cell } = draughtsLayout(W);
    const board = room.board;
    const legal = room.legalMoves || [];
    ctx.clearRect(0, 0, W, W);
    bindBoardRedraw(draughtsBoardImg);
    if (!drawContainImage(ctx, draughtsBoardImg, W, W)) {
      ctx.fillStyle = '#3b2412';
      ctx.fillRect(0, 0, W, W);
    }
    const sel = state.selectedCell || room.draughtsContinue;
    const targets = sel
      ? legal.filter((m) => m.fromR === sel.r && m.fromC === sel.c)
      : [];
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const x = originX + (c + 0.5) * cellW;
        const y = originY + (r + 0.5) * cellH;
        if (sel && sel.r === r && sel.c === c) {
          ctx.beginPath();
          ctx.arc(x, y, cell * 0.46, 0, Math.PI * 2);
          ctx.strokeStyle = '#4fd2ff';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        if (targets.some((m) => m.toR === r && m.toC === c)) {
          ctx.beginPath();
          ctx.arc(x, y, cell * 0.14, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(93, 255, 168, 0.85)';
          ctx.fill();
        }
        const v = board[r][c];
        if (!v) continue;
        const king = v === 3 || v === 4;
        const dark = v === 1 || v === 3;
        ctx.beginPath();
        ctx.arc(x, y, cell * 0.36, 0, Math.PI * 2);
        ctx.fillStyle = dark ? '#1b1b1b' : '#f3e6c8';
        ctx.fill();
        ctx.strokeStyle = dark ? '#888' : '#8a6a3a';
        ctx.lineWidth = 2;
        ctx.stroke();
        if (king) {
          ctx.fillStyle = '#ffcf5a';
          ctx.font = `${Math.floor(cell * 0.32)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('王', x, y);
        }
      }
    }
    bindCanvasInput(canvas, room, 'draughts');
    applyBoardThemeLayer(room);
    const tip = $('boardTip');
    if (tip) tip.textContent = '';
  }

  function drawFlying(room) {
    const canvas = $('board');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    ctx.clearRect(0, 0, W, W);
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, W, W);
    bindBoardRedraw(flyingBoardImg);
    if (!drawContainImage(ctx, flyingBoardImg, W, W)) {
      ctx.fillStyle = '#123';
      ctx.fillRect(0, 0, W, W);
    }
    const legal = new Set(room.flyingLegalIds || []);
    const planes = (room.board && room.board.planes) || [];
    planes.forEach((p) => {
      const pt = flyingInterpXY(p, W);
      const r = W * 0.022;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fillStyle = FLYING_HEX[p.color] || '#fff';
      ctx.fill();
      ctx.lineWidth = legal.has(p.id) ? 3 : 2;
      ctx.strokeStyle = legal.has(p.id) ? '#fff56a' : 'rgba(0,0,0,0.55)';
      ctx.stroke();
      if (p.loc === 'done') {
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.floor(W * 0.018)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', pt.x, pt.y);
      }
    });
    if (room.board && room.board.rolled) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(W * 0.38, W * 0.02, W * 0.24, W * 0.08);
      ctx.fillStyle = '#ffe08a';
      ctx.font = `bold ${Math.floor(W * 0.045)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`骰 ${room.board.dice || room.lastDice || ''}`, W * 0.5, W * 0.06);
    }
    bindCanvasInput(canvas, room, 'flying');
    applyBoardThemeLayer(room);
    const tip = $('boardTip');
    if (tip) tip.textContent = '';
  }

  function drawBoard(room) {
    if (room.gameType === 'draughts') {
      drawDraughts(room);
      return;
    }
    if (room.gameType === 'flying') {
      drawFlying(room);
      return;
    }
    const canvas = $('board');
    const ctx = canvas.getContext('2d');
    const n = room.boardSize || room.board.length;
    const W = canvas.width;
    const pad = 28;
    const step = (W - pad * 2) / (n - 1);
    const skins = skinMap(room);
    const board = activeBoard(room);
    const frames = room.boardHistory || [];
    const live = state.replayIndex == null || state.replayIndex === frames.length - 1;
    const last = live ? room.lastMove : (room.moveLog || [])[state.replayIndex - 1];
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--orange').trim() || '#ff6a00';

    ctx.clearRect(0, 0, W, W);
    applyBoardThemeLayer(room);
    const themeId = room.boardTheme || 'default';
    const themed = themeId !== 'default' && !THEME_LOCKED.has(room.gameType);
    if (themed) {
      /* 立绘走 CSS 层，棋盘网格保持透明以免盖住背景 */
    } else if (boardTexture.complete && boardTexture.naturalWidth) {
      ctx.globalAlpha = 0.3;
      ctx.drawImage(boardTexture, 0, 0, W, W);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(7, 12, 20, 0.18)';
      ctx.fillRect(0, 0, W, W);
    } else {
      const bg = ctx.createLinearGradient(0, 0, W, W);
      bg.addColorStop(0, '#1a2436');
      bg.addColorStop(0.55, '#121926');
      bg.addColorStop(1, '#0b111b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, W);
      if (!boardTexture.dataset.bound) {
        boardTexture.dataset.bound = '1';
        boardTexture.onload = () => {
          if (state.room && state.room.board) drawBoard(state.room);
        };
      }
    }

    ctx.strokeStyle = 'rgba(79, 210, 255, 0.22)';
    ctx.lineWidth = 1;
    for (let i = 0; i < n; i += 1) {
      const p = pad + i * step;
      ctx.beginPath();
      ctx.moveTo(pad, p);
      ctx.lineTo(W - pad, p);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p, pad);
      ctx.lineTo(p, W - pad);
      ctx.stroke();
    }

    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    ctx.strokeRect(pad - 10, pad - 10, W - (pad - 10) * 2, W - (pad - 10) * 2);
    ctx.globalAlpha = 1;

    const stars = starPoints(n);
    if (stars.length) {
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.8;
      stars.forEach((r) => {
        stars.forEach((c) => {
          const x = pad + c * step;
          const y = pad + r * step;
          ctx.beginPath();
          ctx.moveTo(x, y - 3.5);
          ctx.lineTo(x + 3.5, y);
          ctx.lineTo(x, y + 3.5);
          ctx.lineTo(x - 3.5, y);
          ctx.closePath();
          ctx.fill();
        });
      });
      ctx.globalAlpha = 1;
    }

    state.circles.forEach((p) => {
      const x = pad + p.c * step;
      const y = pad + p.r * step;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(10, step * 0.38), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(79, 210, 255, 0.85)';
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    const anim = state.pieceAnim;
    const animT = anim ? Math.min(1, (performance.now() - anim.startedAt) / ANIM_MS) : 1;
    const easeOut = (t) => 1 - (1 - t) ** 2;
    const placedKey = anim && anim.placed ? `${anim.placed.r},${anim.placed.c}` : '';
    const flipMap = new Map();
    if (anim) {
      (anim.flipped || []).forEach((p) => flipMap.set(`${p.r},${p.c}`, true));
    }
    const capturedList = (anim && anim.captured) || [];

    function drawStone(x, y, color, radius, opts = {}) {
      const scaleX = opts.scaleX == null ? 1 : opts.scaleX;
      const scale = opts.scale == null ? 1 : opts.scale;
      const alpha = opts.alpha == null ? 1 : opts.alpha;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scaleX * scale, scale);
      ctx.globalAlpha = alpha;
      const g = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.1, 0, 0, radius);
      if (stoneIsDark(color)) {
        g.addColorStop(0, '#4a4a4a');
        g.addColorStop(1, '#111');
      } else {
        g.addColorStop(0, '#fff8e7');
        g.addColorStop(1, '#d9c3a0');
      }
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      const tone = (SKINS.find((s) => s.id === skins[color]) || SKINS[0]).color;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = tone;
      ctx.globalAlpha = alpha * 0.88;
      ctx.fill();
      ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.ellipse(-radius * 0.25, -radius * 0.28, radius * 0.18, radius * 0.12, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
      if (color === 3 || color === 4) {
        ctx.beginPath();
        ctx.arc(radius * 0.28, radius * 0.22, radius * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = color === 3 ? 'rgba(255, 207, 90, 0.95)' : 'rgba(79, 210, 255, 0.95)';
        ctx.fill();
      }
      ctx.restore();
    }

    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) {
        const cell = board[r][c];
        if (!cell) continue;
        const x = pad + c * step;
        const y = pad + r * step;
        const radius = Math.max(8, step * 0.42);
        const key = `${r},${c}`;
        let scale = 1;
        let scaleX = 1;
        let alpha = 1;
        if (live && anim && key === placedKey) {
          const t = easeOut(animT);
          scale = 0.2 + 0.8 * t;
          alpha = 0.35 + 0.65 * t;
        } else if (live && anim && flipMap.has(key)) {
          // 翻转：前半收缩，后半展开
          const t = animT;
          scaleX = t < 0.5 ? 1 - t * 2 : (t - 0.5) * 2;
          scaleX = Math.max(0.08, scaleX);
          if (t < 0.5) {
            // 闪色提示
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(79, 210, 255, ${0.35 * (1 - t * 2)})`;
            ctx.fill();
            ctx.restore();
          }
        }
        drawStone(x, y, cell, radius, { scale, scaleX, alpha });

        const isLast = last && !last.pass && last.r === r && last.c === c;
        if (isLast) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = accent;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#4fd2ff';
          ctx.fill();
        }
      }
    }

    (room.forbiddenCells || []).forEach((p) => {
      const x = pad + p.c * step;
      const y = pad + p.r * step;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 77, 77, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 8);
      ctx.lineTo(x + 8, y + 8);
      ctx.moveTo(x + 8, y - 8);
      ctx.lineTo(x - 8, y + 8);
      ctx.stroke();
      ctx.restore();
    });
    (room.protectedCells || []).forEach((p) => {
      const x = pad + p.c * step;
      const y = pad + p.r * step;
      ctx.save();
      ctx.strokeStyle = 'rgba(93, 255, 168, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(10, step * 0.46), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    if (live && room.event && room.event.kind === 'tide' && (room.event.turnsLeft || 0) > 0) {
      const size = n;
      const margin = Math.max(1, Number(room.event.margin) || 1);
      for (let r = 0; r < size; r += 1) {
        for (let c = 0; c < size; c += 1) {
          if (r >= margin && c >= margin && r < size - margin && c < size - margin) continue;
          const x = pad + c * step;
          const y = pad + r * step;
          ctx.save();
          ctx.globalAlpha = 0.28;
          ctx.fillStyle = 'rgba(40, 90, 160, 0.55)';
          ctx.beginPath();
          ctx.arc(x, y, Math.max(6, step * 0.22), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
    if (live && room.event && room.event.kind === 'meteor' && room.event.r != null) {
      const x = pad + room.event.c * step;
      const y = pad + room.event.r * step;
      const pulse = 0.45 + 0.35 * Math.abs(Math.sin(Date.now() / 280));
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = 'rgba(255, 220, 120, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(10, step * 0.42), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 207, 90, 0.35)';
      ctx.fill();
      ctx.restore();
    }
    const sp = room.spirit;
    if (live && sp && sp.r != null) {
      const t = Math.min(1, (Date.now() - (sp.at || 0)) / 280);
      const cr = (sp.prevR != null ? sp.prevR : sp.r) + (sp.r - (sp.prevR != null ? sp.prevR : sp.r)) * t;
      const cc = (sp.prevC != null ? sp.prevC : sp.c) + (sp.c - (sp.prevC != null ? sp.prevC : sp.c)) * t;
      const x = pad + cc * step;
      const y = pad + cr * step;
      const glow = 0.55 + 0.45 * Math.abs(Math.sin(Date.now() / 200));
      ctx.save();
      ctx.shadowColor = 'rgba(80, 200, 255, 0.95)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = `rgba(90, 210, 255, ${glow})`;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(6, step * 0.18), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 提子碎裂/淡出（画在空位上）
    if (live && anim && capturedList.length) {
      const fade = 1 - easeOut(animT);
      capturedList.forEach((p) => {
        const x = pad + p.c * step;
        const y = pad + p.r * step;
        const radius = Math.max(8, step * 0.42);
        const scatter = (1 - fade) * radius * 0.6;
        drawStone(x + scatter * 0.3, y - scatter * 0.2, p.color || 2, radius, {
          scale: 0.5 + fade * 0.5,
          alpha: fade,
        });
        ctx.save();
        ctx.globalAlpha = fade * 0.7;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - radius * 0.5, y - radius * 0.5);
        ctx.lineTo(x + radius * 0.5, y + radius * 0.5);
        ctx.moveTo(x + radius * 0.5, y - radius * 0.5);
        ctx.lineTo(x - radius * 0.5, y + radius * 0.5);
        ctx.stroke();
        ctx.restore();
      });
    }

    const hint = room.coachHint;
    if (live && hint && board[hint.r]) {
      const x = pad + hint.c * step;
      const y = pad + hint.r * step;
      const radius = Math.max(8, step * 0.42);
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(255, 207, 90, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = room.turnColor === 1 || room.turnColor === 3 ? '#141414' : '#fff8e6';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const hover = live && state.hover && board[state.hover.r] ? state.hover : null;
    const emptyHover = hover && !board[hover.r][hover.c];
    if (emptyHover && room.phase === 'playing' && (room.gameType === 'gomoku' || room.gameType === 'go')) {
      const x = pad + hover.c * step;
      const y = pad + hover.r * step;
      const radius = Math.max(8, step * 0.42);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = (room.turnColor === 1 || room.turnColor === 3) ? 'rgba(20,20,20,0.35)' : 'rgba(255,248,230,0.35)';
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (emptyHover && room.phase === 'playing' && room.gameType === 'reversi') {
      const flips = reversiFlipsAt(board, hover.r, hover.c, room.turnColor);
      if (flips.length) {
        const x = pad + hover.c * step;
        const y = pad + hover.r * step;
        ctx.save();
        ctx.fillStyle = room.turnColor === 1 ? 'rgba(20,20,20,0.4)' : 'rgba(255,248,230,0.4)';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(8, step * 0.42), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4fd2ff';
        ctx.lineWidth = 2;
        ctx.stroke();
        flips.forEach((p) => {
          const fx = pad + p.c * step;
          const fy = pad + p.r * step;
          ctx.beginPath();
          ctx.arc(fx, fy, Math.max(10, step * 0.48), 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 207, 90, 0.95)';
          ctx.lineWidth = 3;
          ctx.stroke();
        });
        ctx.restore();
      }
    }

    state.arrows.forEach((a) => {
      drawArrow(
        ctx,
        pad + a.from.c * step,
        pad + a.from.r * step,
        pad + a.to.c * step,
        pad + a.to.r * step,
        accent
      );
    });
    if (state.arrowDraft && state.arrowDraft.from && state.arrowDraft.to) {
      drawArrow(
        ctx,
        pad + state.arrowDraft.from.c * step,
        pad + state.arrowDraft.from.r * step,
        pad + state.arrowDraft.to.c * step,
        pad + state.arrowDraft.to.r * step,
        'rgba(79, 210, 255, 0.7)'
      );
    }

    bindCanvasInput(canvas, room, 'grid');
    if (live && ((room.spirit && room.spirit.r != null) || (room.event && room.event.kind === 'meteor'))) {
      if (state.weatherRaf) cancelAnimationFrame(state.weatherRaf);
      state.weatherRaf = requestAnimationFrame(() => {
        state.weatherRaf = null;
        if (state.room && state.room.board && (state.view === 'game')) drawBoard(state.room);
      });
    }
    const tip = $('boardTip');
    if (tip) tip.textContent = '';
  }

  async function quickMatch() {
    toast('');
    if (!requireLogin('快速匹配')) return;
    try {
      await connect({ autoRejoin: false });
      startMatchQueueUI(Date.now());
      send({
        type: 'quickMatch',
        gameType: state.gameType,
        mode: state.mode,
        name: state.name,
        skin: state.skin,
        totalRounds: state.totalRounds,
        boardScale: state.boardScale,
        turnMs: state.turnMs,
        uid: state.uid,
      });
    } catch (e) {
      stopMatchQueueUI();
      toast(e.message || '连接失败');
    }
  }

  function cancelQuickMatch() {
    send({ type: 'cancelQuickMatch', uid: state.uid });
    stopMatchQueueUI();
    if (state.playerId) leaveRoomLocal(true);
    else toast('已取消匹配');
  }

  async function createRoom(opts = {}) {
    toast('');
    if (!requireLogin('创建房间')) return;
    try {
      await connect({ autoRejoin: false });
      const joinPass = opts.joinPass != null
        ? opts.joinPass
        : (($('joinPassInput') && $('joinPassInput').value) || state.joinPass || '');
      if ($('joinPassInput')) {
        state.joinPass = ($('joinPassInput').value || '').trim();
        localStorage.setItem('qiba_join_pass', state.joinPass);
      }
      send({
        type: 'create',
        gameType: opts.gameType || state.gameType,
        mode: opts.mode || state.mode,
        name: state.name,
        skin: state.skin,
        totalRounds: opts.totalRounds != null ? opts.totalRounds : state.totalRounds,
        boardScale: opts.boardScale || state.boardScale,
        turnMs: opts.turnMs != null ? opts.turnMs : state.turnMs,
        roomCode: opts.roomCode != null ? opts.roomCode : state.customCode,
        visibility: opts.visibility || state.visibility,
        uid: state.uid,
        joinPass,
        fillBots: !!(opts.fillBots != null ? opts.fillBots : state.fillBots),
        friendshipStake: opts.friendshipStake != null ? opts.friendshipStake : state.friendshipStake,
        celestial: opts.celestial != null ? !!opts.celestial : resolvedCelestial(),
        grudgeMatch: !!opts.grudgeMatch,
      });
    } catch (e) {
      toast(e.message || '连接失败');
    }
  }

  function openPassModal({ code, asSpectator, asCommentator, hint }) {
    state.pendingJoin = { code, asSpectator: !!asSpectator, asCommentator: !!asCommentator };
    $('passModal').classList.remove('hidden');
    $('passModalHint').textContent = hint || '';
    $('passModalInput').value = ($('joinPassJoin') && $('joinPassJoin').value) || '';
    setTimeout(() => $('passModalInput').focus(), 50);
  }

  async function joinRoom(joinRole, codeOverride, passOverride) {
    toast('');
    const asSpectator = joinRole === true;
    const asCommentator = joinRole === 'commentator';
    const roleLabel = asCommentator ? '解说' : (asSpectator ? '观战' : '加入房间');
    if (!requireLogin(roleLabel)) return;
    const code = (codeOverride || ($('joinCode').value || '')).trim().toUpperCase();
    if (code.length < 4) {
      const tip = '请输入房间码';
      toast(tip);
      $('joinHint').textContent = tip;
      return;
    }
    const joinPass = passOverride != null
      ? passOverride
      : (($('joinPassJoin') && $('joinPassJoin').value) || '');
    state.pendingJoin = { code, asSpectator, asCommentator };
    try {
      await connect({ autoRejoin: false });
      send({
        type: 'join',
        code,
        name: state.name,
        skin: state.skin,
        asSpectator,
        asCommentator,
        uid: state.uid,
        joinPass,
      });
    } catch (e) {
      toast(e.message || '连接失败');
      $('joinHint').textContent = e.message || '连接失败';
    }
  }

  function outcomeLabel(o) {
    if (o === 'win') return '胜';
    if (o === 'loss') return '负';
    return '和';
  }

  function formatMatchTime(at) {
    const d = new Date(at || Date.now());
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function renderRecentList(box, matches) {
    if (!box) return;
    const list = Array.isArray(matches) ? matches : [];
    if (!list.length) {
      box.innerHTML = '<p class="hint soft">暂无最近对局</p>';
      return;
    }
    box.innerHTML = '';
    list.forEach((m) => {
      const gt = GAME_TYPES.find((g) => g.id === m.gameType);
      const md = MODES.find((x) => x.id === m.mode);
      const row = document.createElement('div');
      row.className = 'recent-row';
      const oc = m.outcome === 'win' ? 'outcome-win' : (m.outcome === 'loss' ? 'outcome-loss' : 'outcome-draw');
      row.innerHTML = `
        <div class="meta">
          <strong>${(m.opponent && m.opponent.name) || '对手'}</strong>
          <span>${gt ? gt.label : m.gameType} · ${md ? md.label : m.mode} · <b class="${oc}">${outcomeLabel(m.outcome)}</b></span>
          <span>${formatMatchTime(m.at)}</span>
        </div>`;
      const btn = document.createElement('button');
      btn.className = 'btn sm primary';
      btn.type = 'button';
      btn.innerHTML = '<span>再开一局</span>';
      btn.onclick = () => rematchFromRecent(m);
      row.appendChild(btn);
      box.appendChild(row);
    });
  }

  async function loadRecentMatches() {
    try {
      const q = new URLSearchParams();
      if (state.uid) q.set('id', state.uid);
      if (state.name) q.set('name', state.name);
      const res = await fetch(`/api/recent-matches?${q}`);
      const data = await res.json();
      if (!data.ok) return;
      state.recentMatches = data.matches || [];
      if ($('archiveRecentList')) renderRecentList($('archiveRecentList'), state.recentMatches);
    } catch {
      /* ignore */
    }
  }

  async function rematchFromRecent(m) {
    if (!m) return;
    state.gameType = m.gameType || 'gomoku';
    state.mode = m.mode || '1v1';
    state.totalRounds = m.totalRounds || 1;
    state.boardScale = m.boardScale || 'large';
    state.turnMs = m.turnMs || 30000;
    state.customCode = '';
    renderHome();
    toast(`正在创建与 ${(m.opponent && m.opponent.name) || '对手'} 同配置房间…`);
    await createRoom({
      gameType: state.gameType,
      mode: state.mode,
      totalRounds: state.totalRounds,
      boardScale: state.boardScale,
      turnMs: state.turnMs,
      roomCode: '',
      joinPass: '',
    });
    // 创建成功后复制房间码（在 created/stateSync 后由定时提示）
    const waitCopy = setInterval(() => {
      if (state.room && state.room.code) {
        clearInterval(waitCopy);
        const code = state.room.code;
        const tip = `已开同配置房间 ${code}，请把房间码发给 ${(m.opponent && m.opponent.name) || '对手'}`;
        toast(tip);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(() => {
            toast(`${tip}（已复制）`);
          }).catch(() => {});
        }
      }
    }, 200);
    setTimeout(() => clearInterval(waitCopy), 5000);
  }

  function phaseLabel(phase) {
    if (phase === 'lobby') return '大厅';
    if (phase === 'playing') return '对局中';
    if (phase === 'truth') return '真心话';
    if (phase === 'roundEnd') return '局间';
    return phase;
  }

  function renderWorldList(rooms) {
    state.worldRooms = Array.isArray(rooms) ? rooms : [];
    renderWorldGameFilters();
    const box = $('worldList');
    if (!box) return;
    const filter = state.worldGameFilter || 'all';
    const all = state.worldRooms;
    const shown = filter === 'all' ? all : all.filter((r) => r.gameType === filter);
    if (!shown.length) {
      box.innerHTML = `<p class="hint">${all.length ? '该棋种暂无公开房间' : '暂无公开房间'}</p>`;
      $('worldHint').textContent = all.length ? `共 ${all.length} 个公开房间` : '';
      return;
    }
    box.innerHTML = '';
    shown.forEach((r) => {
      const gt = GAME_TYPES.find((g) => g.id === r.gameType);
      const md = MODES.find((m) => m.id === r.mode);
      const row = document.createElement('div');
      row.className = 'world-row';
      const passTag = r.hasJoinPass ? '<span class="pass-badge">需口令</span>' : '';
      const w = r.weather;
      const wMeta = w && (WEATHER_LABELS[w.id] || w);
      const weatherTag = wMeta ? `<span class="weather-badge">${wMeta.icon || ''} ${wMeta.label || ''}</span>` : '';
      const myRival = state.profile && state.profile.rivals && state.profile.rivals.uid;
      const rivalHere = !!(myRival && (r.players || []).some((p) => p.uid === myRival));
      if (rivalHere) row.classList.add('rival-row');
      const rivalTag = rivalHere ? '<span class="rival-badge">宿敌</span>' : '';
      const grudgeTag = r.grudgeMatch ? '<span class="rival-badge">了结</span>' : '';
      const typeTag = `<span class="game-type-badge">${gt ? gt.label : r.gameType}</span>`;
      row.innerHTML = `
        <div>
          <strong>${r.clubTag ? `【${r.clubTag}】` : ''}${r.code}</strong>${typeTag}${passTag}${weatherTag}${rivalTag}${grudgeTag}
          <span>${gt ? gt.label : r.gameType} · ${md ? md.label : r.mode} · ${phaseLabel(r.phase)}</span>
          <span>房主 ${r.hostName} · 座位 ${r.seated}/${r.seatCount} · 观战 ${r.spectators}/${r.specCount}</span>
        </div>`;
      const join = document.createElement('button');
      join.className = 'btn sm primary';
      join.innerHTML = '<span>加入</span>';
      join.onclick = () => {
        if (r.hasJoinPass) openPassModal({ code: r.code, asSpectator: false });
        else joinRoom(false, r.code);
      };
      const watch = document.createElement('button');
      watch.className = 'btn sm ghost';
      watch.innerHTML = '<span>观战</span>';
      watch.onclick = () => {
        if (r.hasJoinPass) openPassModal({ code: r.code, asSpectator: true });
        else joinRoom(true, r.code);
      };
      const commentate = document.createElement('button');
      commentate.className = 'btn sm ghost';
      commentate.innerHTML = '<span>解说</span>';
      commentate.onclick = () => {
        if (r.hasJoinPass) openPassModal({ code: r.code, asCommentator: true });
        else joinRoom('commentator', r.code);
      };
      const acts = document.createElement('div');
      acts.className = 'world-acts';
      acts.appendChild(join);
      acts.appendChild(watch);
      acts.appendChild(commentate);
      row.appendChild(acts);
      box.appendChild(row);
    });
    $('worldHint').textContent = filter === 'all'
      ? `共 ${shown.length} 个公开房间`
      : `共 ${shown.length} 个${(GAME_TYPES.find((g) => g.id === filter) || {}).label || ''}房间（全部 ${all.length}）`;
  }

  function renderWorldGameFilters() {
    const items = [{ id: 'all', label: '全部' }, ...GAME_TYPES];
    renderChips('worldGameFilters', items, state.worldGameFilter || 'all', (id) => {
      state.worldGameFilter = id;
      renderWorldList(state.worldRooms || []);
    });
  }

  function setWorldTab(tab) {
    state.worldTab = tab === 'join' ? 'join' : 'create';
    const createOn = state.worldTab === 'create';
    if ($('worldTabCreate')) $('worldTabCreate').classList.toggle('on', createOn);
    if ($('worldTabJoin')) $('worldTabJoin').classList.toggle('on', !createOn);
    if ($('worldCreatePane')) $('worldCreatePane').classList.toggle('hidden', !createOn);
    if ($('worldJoinPane')) $('worldJoinPane').classList.toggle('hidden', createOn);
    if (createOn) updateWorldCreateSummary();
  }

  function updateWorldCreateSummary() {
    const el = $('worldCreateSummary');
    if (!el) return;
    const gt = GAME_TYPES.find((g) => g.id === state.gameType);
    const md = MODES.find((m) => m.id === state.mode);
    const vis = state.visibility === 'private' ? '私密' : '公开';
    el.textContent = `${gt ? gt.label : state.gameType} · ${md ? md.label : state.mode} · ${vis} · ${state.totalRounds} 局${state.friendshipStake ? ` · 赌注${giftMeta(state.friendshipStake).label}` : ''}`;
  }

  async function openWorldChannel(tab) {
    if (!requireLogin('进入世界频道')) return;
    setWorldTab(tab || state.worldTab || 'create');
    $('joinHint').textContent = '';
    $('worldChannelModal').classList.remove('hidden');
    updateWorldCreateSummary();
    fetchWorldFeed();
    if (state.worldTab === 'join') await openWorld();
  }

  async function openWorld() {
    $('worldHint').textContent = '加载中…';
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '加载失败');
      renderWorldList(data.rooms || []);
    } catch (e) {
      $('worldHint').textContent = e.message || '加载失败';
      try {
        await connect();
        send({ type: 'listRooms' });
      } catch {
        /* ignore */
      }
    }
  }

  function renderMuteList() {
    const box = $('muteList');
    const hint = $('muteHint');
    if (!box) return;
    const ids = state.mutedUids || [];
    if (!ids.length) {
      box.innerHTML = '';
      if (hint) hint.textContent = '在聊天或档案中可屏蔽玩家，屏蔽后其聊天/弹幕/表情对本机隐藏。';
      return;
    }
    box.innerHTML = '';
    ids.forEach((uid) => {
      const chip = document.createElement('span');
      chip.className = 'mute-chip';
      chip.textContent = uid.slice(0, 10);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn sm ghost';
      btn.textContent = '解除';
      btn.onclick = () => unmutePlayer(uid);
      chip.appendChild(btn);
      box.appendChild(chip);
    });
    if (hint) hint.textContent = `已屏蔽 ${ids.length} 人`;
  }

  function openSettings() {
    $('settingsModal').classList.remove('hidden');
    const vol = window.QibaFx ? QibaFx.getVolume() : 80;
    $('volumeSlider').value = String(vol);
    $('volumeLabel').textContent = String(vol);
    if ($('sfxToggle') && window.QibaFx) {
      $('sfxToggle').checked = !QibaFx.isMuted() && vol > 0;
    }
    if ($('vibrateToggle') && window.QibaFx && QibaFx.isVibrateEnabled) {
      $('vibrateToggle').checked = QibaFx.isVibrateEnabled();
    }
    if (window.QibaFx) {
      $('bgmToggle').checked = QibaFx.isBgmEnabled();
      const bv = QibaFx.getBgmVolume();
      $('bgmVolumeSlider').value = String(bv);
      $('bgmVolumeLabel').textContent = String(bv);
      QibaFx.syncBgm();
    }
    renderMuteList();
    renderChips('themeChips', THEMES, state.theme, (id) => {
      applyTheme(id);
      openSettings();
      if (window.QibaFx) QibaFx.play('click');
    });
  }

  function openAuth() {
    $('authModal').classList.remove('hidden');
    $('authHint').textContent = '';
    $('authTitle').textContent = state.auth ? '账号' : '登录';
    updateAuthUI();
  }

  async function doAuth(mode) {
    const username = ($('authUsername').value || '').trim();
    const password = $('authPassword').value || '';
    $('authHint').textContent = '';
    try {
      const res = await fetch(mode === 'register' ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          nickname: state.name,
          uid: state.uid,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '失败');
      state.auth = data.user;
      state.uid = data.user.uid;
      localStorage.setItem('qiba_uid', state.uid);
      localStorage.setItem('qiba_auth', JSON.stringify(data.user));
      if (data.user.nickname) {
        state.name = data.user.nickname;
        localStorage.setItem('qiba_name', state.name);
      }
      updateAuthUI();
      $('authHint').textContent = mode === 'register' ? '注册成功并已登录' : '登录成功';
      paintDailyTasks(state.profile && state.profile.dailyTasks);
      refreshProfileQuiet();
      connect({ autoRejoin: false }).catch(() => {});
      setTimeout(() => $('authModal').classList.add('hidden'), 600);
    } catch (e) {
      $('authHint').textContent = e.message || '失败';
    }
  }

  function logout() {
    state.auth = null;
    state.profile = null;
    localStorage.removeItem('qiba_auth');
    updateAuthUI();
    paintDailyTasks(null);
    $('authHint').textContent = '已退出登录';
    $('authModal').classList.add('hidden');
    show('home');
    updateAuthUI();
  }

  function startUseProp(prop) {
    if (!prop) return;
    if (!prop.needCell && !prop.needTwo && !prop.needDelta && !prop.needDice) {
      send({ type: 'useProp', propType: prop.id });
      return;
    }
    if (prop.needDice) {
      openDicePicker();
      return;
    }
    if (prop.needDelta) {
      const plus = window.confirm('贴目 +2.5 点确定，-2.5 点取消');
      send({ type: 'useProp', propType: 'komiAdjust', delta: plus ? 2.5 : -2.5 });
      return;
    }
    state.propTarget = { id: prop.id, needTwo: !!prop.needTwo, cells: [] };
    toast(prop.needTwo ? '请依次点击两枚棋子换位' : '请点击目标点');
  }

  function applyPropCell(room, r, c) {
    const t = state.propTarget;
    if (!t) return;
    t.cells.push({ r, c });
    if (t.needTwo && t.cells.length < 2) {
      toast('再点另一枚棋子');
      return;
    }
    const first = t.cells[0];
    const second = t.cells[1];
    send({
      type: 'useProp',
      propType: t.id,
      r: first.r,
      c: first.c,
      r2: second ? second.r : undefined,
      c2: second ? second.c : undefined,
    });
    state.propTarget = null;
  }

  function openDicePicker() {
    const box = $('dicePicks');
    if (!box || !$('diceModal')) {
      const n = Number(window.prompt('选择点数 1-6', '6'));
      send({ type: 'useProp', propType: 'remoteDice', dice: n });
      return;
    }
    box.innerHTML = '';
    for (let i = 1; i <= 6; i += 1) {
      const b = document.createElement('button');
      b.className = 'chip';
      b.textContent = String(i);
      b.onclick = () => {
        $('diceModal').classList.add('hidden');
        send({ type: 'useProp', propType: 'remoteDice', dice: i });
      };
      box.appendChild(b);
    }
    $('diceModal').classList.remove('hidden');
  }

  async function maybeHostBotMove(room) {
    if (!room || room.phase !== 'playing' || state.practiceMode || state.puzzleMode) return;
    if (room.hostId !== state.playerId) return;
    const cur = room.seats[room.turnSeatIndex];
    if (!cur || !cur.player || !cur.player.bot) return;
    if (state.botBusy) return;
    state.botBusy = true;
    try {
      if (room.gameType === 'gomoku' && (room.boardSize || 15) === 15 && room.board) {
        try {
          const result = await PracticeAI.search(room.board, room.turnColor);
          send({ type: 'botPlace', r: result.r, c: result.c });
        } catch {
          send({ type: 'botPlace', auto: true });
        }
      } else {
        send({ type: 'botPlace', auto: true });
      }
    } finally {
      setTimeout(() => { state.botBusy = false; }, 400);
    }
  }

  function emptyPuzzleBoard() {
    return Array.from({ length: PRACTICE_SIZE }, () => Array(PRACTICE_SIZE).fill(0));
  }

  function openPuzzleModal() {
    const box = $('puzzleList');
    if (!box) return;
    box.innerHTML = '';
    PUZZLES.forEach((p) => {
      const row = document.createElement('div');
      row.className = 'social-row';
      const kind = p.type === 'kill' ? `黑先 ${p.maxMoves || 1} 步内取胜` : '做活防守';
      row.innerHTML = `<div><strong>${p.title}</strong><div class="meta">${kind} · ${p.timeSec}秒 · ${p.desc}</div></div>`;
      const b = document.createElement('button');
      b.className = 'btn sm primary';
      b.innerHTML = '<span>挑战</span>';
      b.onclick = () => {
        $('puzzleModal').classList.add('hidden');
        startPuzzle(p);
      };
      row.appendChild(b);
      box.appendChild(row);
    });
    $('puzzleModal').classList.remove('hidden');
  }

  function startPuzzle(puzzle) {
    if (state.room && !state.practiceMode && !state.puzzleMode) {
      toast('请先离开当前房间');
      return;
    }
    state.puzzleMode = true;
    state.practiceMode = true;
    state.practiceThinking = false;
    state.practiceGen += 1;
    state.puzzle = puzzle;
    state.puzzleMoves = 0;
    state.playerId = state.uid;
    const board = emptyPuzzleBoard();
    (puzzle.stones || []).forEach(([r, c, color]) => {
      if (board[r]) board[r][c] = color;
    });
    state.room = makePracticeRoom();
    state.room.board = board;
    state.room.boardHistory = [board.map((row) => row.slice())];
    state.room.moveLog = [];
    state.room.turnDeadline = Date.now() + (puzzle.timeSec || 45) * 1000;
    show('game');
    if ($('practiceBanner')) $('practiceBanner').classList.add('hidden');
    if ($('puzzleBanner')) {
      $('puzzleBanner').classList.remove('hidden');
      $('puzzleBanner').textContent = `${puzzle.title} · ${puzzle.type === 'kill' ? `${puzzle.maxMoves || 1}步取胜` : '做活'}`;
    }
    $('gameHint').textContent = puzzle.desc || '轮到你';
    renderGame();
  }

  function finishPuzzle(ok, reason) {
    const room = state.room;
    if (!room || !state.puzzleMode) return;
    room.phase = 'seriesEnd';
    room.winner = ok ? 1 : 2;
    room.seriesScore = { black: ok ? 1 : 0, white: ok ? 0 : 1 };
    room.roundResults = [{ round: 1, winner: room.winner, moves: (room.moveLog || []).length }];
    room.turnDeadline = null;
    state.practiceThinking = false;
    syncPracticeYou(room);
    renderGame();
    $('resultText').textContent = ok ? '挑战成功' : (reason || '挑战失败');
    toast(ok ? '残局挑战成功' : (reason || '残局挑战失败'));
  }

  function puzzlePlace(r, c) {
    const room = state.room;
    const puzzle = state.puzzle;
    if (!room || !puzzle || room.phase !== 'playing') return;
    if (room.turnDeadline && Date.now() > room.turnDeadline) {
      finishPuzzle(false, '超时');
      return;
    }
    const placed = applyPracticeMove(room, r, c, 1);
    if (!placed.ok) {
      toast(placed.error);
      return;
    }
    if (window.QibaFx) QibaFx.play('place');
    state.puzzleMoves = (state.puzzleMoves || 0) + 1;
    const maxMoves = puzzle.maxMoves || 1;

    if (puzzle.type === 'survive') {
      const whiteWins = puzzleFindWins(room.board, 2);
      if (!whiteWins.length) {
        finishPuzzle(true);
        return;
      }
      finishPuzzle(false, '没有挡住杀招');
      return;
    }

    if (placed.win) {
      if (state.puzzleMoves > maxMoves) finishPuzzle(false, `超过 ${maxMoves} 步`);
      else finishPuzzle(true);
      return;
    }
    if (state.puzzleMoves >= maxMoves) {
      finishPuzzle(false, `未能在 ${maxMoves} 步内取胜`);
      return;
    }

    const reply = puzzlePickReply(room.board);
    if (reply) {
      const white = applyPracticeMove(room, reply[0], reply[1], 2);
      if (white.ok && white.win) {
        finishPuzzle(false, '被对方连成五子');
        return;
      }
    }
    syncPracticeYou(room);
    renderGame();
    $('gameHint').textContent = `${puzzle.desc || '残局挑战'} · 已下 ${state.puzzleMoves}/${maxMoves} 手`;
  }

  async function openFriendsPanel() {
    if (!requireLogin('查看好友')) return;
    $('friendHint').textContent = '';
    $('friendsModal').classList.remove('hidden');
    try {
      await connect({ autoRejoin: false });
      send({ type: 'hello', uid: state.uid, name: state.name });
      send({ type: 'friendList', uid: state.uid, name: state.name });
    } catch (e) {
      $('friendHint').textContent = e.message || '连接失败';
    }
    loadFriendsHttp();
  }

  async function loadFriendsHttp() {
    try {
      const q = new URLSearchParams({ uid: state.uid, name: state.name });
      const res = await fetch(`/api/friends?${q}`);
      const data = await res.json();
      if (data.ok) renderFriendList(data.friends || []);
    } catch {
      /* ignore */
    }
  }

  function renderFriendList(friends) {
    const box = $('friendList');
    if (!box) return;
    if (!friends || !friends.length) {
      box.innerHTML = '<p class="hint">暂无好友，搜索昵称添加</p>';
      return;
    }
    box.innerHTML = '';
    friends.forEach((f) => {
      const row = document.createElement('div');
      row.className = 'social-row';
      row.innerHTML = `<div><span class="${f.online ? 'dot-online' : 'dot-offline'}"></span><strong>${f.name}</strong>
        <div class="meta">${f.rankLabel || ''} · ${f.online ? '在线' : '离线'}</div></div>`;
      const acts = document.createElement('div');
      const inv = document.createElement('button');
      inv.className = 'btn sm primary';
      inv.innerHTML = '<span>邀请</span>';
      inv.onclick = () => {
        send({
          type: 'friendInvite',
          uid: state.uid,
          name: state.name,
          skin: state.skin,
          toUid: f.uid,
          gameType: state.gameType,
          mode: state.mode,
          totalRounds: state.totalRounds,
          boardScale: state.boardScale,
          turnMs: state.turnMs,
          fillBots: state.fillBots,
        });
      };
      const apprentice = document.createElement('button');
      apprentice.className = 'btn sm ghost';
      apprentice.innerHTML = '<span>收徒</span>';
      apprentice.onclick = () => {
        send({ type: 'mentorInvite', uid: state.uid, name: state.name, toUid: f.uid, toName: f.name });
      };
      const rm = document.createElement('button');
      rm.className = 'btn sm ghost';
      rm.innerHTML = '<span>删除</span>';
      rm.onclick = () => send({ type: 'friendRemove', uid: state.uid, name: state.name, targetUid: f.uid });
      acts.appendChild(inv);
      acts.appendChild(apprentice);
      acts.appendChild(rm);
      row.appendChild(acts);
      box.appendChild(row);
    });
    renderMentorPending();
  }

  function renderMentorPending() {
    const box = $('mentorPendingBox');
    if (!box) return;
    const inv = state.profile && state.profile.pendingMentorInvite;
    if (!inv || !inv.fromUid) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = `<div class="social-row"><div><strong>${inv.fromName || '棋友'}</strong>
      <div class="meta">邀请你成为徒弟 · 契约 7 天</div></div></div>`;
    const acts = document.createElement('div');
    const yes = document.createElement('button');
    yes.className = 'btn sm primary';
    yes.innerHTML = '<span>拜师</span>';
    yes.onclick = () => send({ type: 'mentorRespond', uid: state.uid, name: state.name, accept: true });
    const no = document.createElement('button');
    no.className = 'btn sm ghost';
    no.innerHTML = '<span>婉拒</span>';
    no.onclick = () => send({ type: 'mentorRespond', uid: state.uid, name: state.name, accept: false });
    acts.appendChild(yes);
    acts.appendChild(no);
    const row = box.querySelector('.social-row');
    if (row) row.appendChild(acts);
  }

  function pendingInboxCount() {
    const inv = state.profile && state.profile.pendingMentorInvite;
    return inv && inv.fromUid ? 1 : 0;
  }

  function updateInboxBadge() {
    const badge = $('inboxBadge');
    if (!badge) return;
    const n = pendingInboxCount();
    badge.textContent = n > 9 ? '9+' : String(n);
    badge.classList.toggle('hidden', n <= 0);
  }

  function renderInboxList() {
    const box = $('inboxList');
    if (!box) return;
    const inv = state.profile && state.profile.pendingMentorInvite;
    if (!inv || !inv.fromUid) {
      box.innerHTML = '<p class="hint">暂无待处理的收徒 / 拜师申请</p>';
      return;
    }
    box.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'social-row';
    row.innerHTML = `<div><strong>${inv.fromName || '棋友'}</strong>
      <div class="meta">邀请你成为徒弟 · 契约 7 天</div></div>`;
    const acts = document.createElement('div');
    const yes = document.createElement('button');
    yes.className = 'btn sm primary';
    yes.innerHTML = '<span>拜师</span>';
    yes.onclick = () => send({ type: 'mentorRespond', uid: state.uid, name: state.name, accept: true });
    const no = document.createElement('button');
    no.className = 'btn sm ghost';
    no.innerHTML = '<span>婉拒</span>';
    no.onclick = () => send({ type: 'mentorRespond', uid: state.uid, name: state.name, accept: false });
    acts.appendChild(yes);
    acts.appendChild(no);
    row.appendChild(acts);
    box.appendChild(row);
  }

  async function openInbox() {
    if (!requireLogin('查看消息')) return;
    $('inboxModal').classList.remove('hidden');
    renderInboxList();
    try {
      await connect({ autoRejoin: false });
      send({ type: 'hello', uid: state.uid, name: state.name });
      const profile = await fetchMyProfile();
      state.profile = profile;
      renderInboxList();
      updateInboxBadge();
    } catch {
      renderInboxList();
      updateInboxBadge();
    }
  }

  async function searchFriends() {
    const q = ($('friendSearch') && $('friendSearch').value || '').trim();
    const box = $('friendSearchHits');
    if (!box) return;
    if (!q) {
      box.innerHTML = '';
      return;
    }
    try {
      const res = await fetch(`/api/friends/search?${new URLSearchParams({ q })}`);
      const data = await res.json();
      const users = (data.users || []).filter((u) => u.uid !== state.uid);
      if (!users.length) {
        box.innerHTML = '<p class="hint">没有匹配的玩家</p>';
        return;
      }
      box.innerHTML = '';
      users.forEach((u) => {
        const row = document.createElement('div');
        row.className = 'social-row';
        row.innerHTML = `<div><strong>${u.name || u.username}</strong><div class="meta">${u.username || u.uid}</div></div>`;
        const add = document.createElement('button');
        add.className = 'btn sm';
        add.innerHTML = '<span>添加</span>';
        add.onclick = () => {
          send({
            type: 'friendAdd',
            uid: state.uid,
            name: state.name,
            targetUid: u.uid,
            targetName: u.name,
          });
          toast('已发送添加');
        };
        row.appendChild(add);
        box.appendChild(row);
      });
    } catch (e) {
      box.innerHTML = `<p class="hint">${e.message || '搜索失败'}</p>`;
    }
  }

  async function openClubPanel() {
    if (!requireLogin('查看棋社')) return;
    $('clubHint').textContent = '';
    $('clubModal').classList.remove('hidden');
    try {
      await connect({ autoRejoin: false });
      send({ type: 'hello', uid: state.uid, name: state.name });
      send({ type: 'clubMine', uid: state.uid });
    } catch {
      /* ignore */
    }
    loadClubHttp();
  }

  async function loadClubHttp() {
    try {
      const mine = await (await fetch(`/api/clubs/mine?uid=${encodeURIComponent(state.uid)}`)).json();
      const rank = await (await fetch('/api/clubs/rank')).json();
      renderClubPanel(mine.club, rank.clubs);
    } catch (e) {
      $('clubHint').textContent = e.message || '加载失败';
    }
  }

  function renderClubPanel(club, ranking) {
    const box = $('clubMineBox');
    if (box) {
      if (!club) {
        box.innerHTML = '<p class="hint">尚未加入棋社，可创建或用加入码加入。</p>';
      } else {
        const members = (club.members || []).map((m) =>
          `<div class="social-row"><div><strong>${m.name}</strong><div class="meta">${m.rankLabel} · 赛季胜 ${m.seasonWins}${m.mentorName ? ` · 师从 ${m.mentorName}` : ''}</div></div></div>`
        ).join('');
        box.innerHTML = `<div class="social-row"><div><strong>【${club.shortName}】${club.name}</strong>
          <div class="meta">成员 ${club.memberCount}/${club.maxMembers} · 队分 ${club.teamScore} · 加入码 ${club.joinCode}</div></div></div>${members}`;
      }
    }
    const lineageBox = $('clubLineageBox');
    if (lineageBox) {
      const pairs = (club && club.lineage) || [];
      if (!club) lineageBox.innerHTML = '';
      else if (!pairs.length) lineageBox.innerHTML = '<p class="hint soft">社内暂无师徒契约</p>';
      else {
        lineageBox.innerHTML = pairs.map((p) =>
          `<div class="social-row"><div><strong>${p.mentorName}</strong> 带 <strong>${p.apprenticeName}</strong></div></div>`
        ).join('');
      }
    }
    const rankBox = $('clubRankList');
    if (rankBox) {
      const list = ranking || [];
      if (!list.length) rankBox.innerHTML = '<p class="hint">暂无棋社上榜</p>';
      else {
        rankBox.innerHTML = list.map((c, i) =>
          `<div class="social-row"><div><strong>${i + 1}. 【${c.shortName}】${c.name}</strong>
            <div class="meta">队分 ${c.teamScore} · ${c.memberCount} 人</div></div></div>`
        ).join('');
      }
    }
  }

  function bind() {
    $('btnToggleRoomSettings').onclick = () => setRoomSettingsOpen(!state.roomSettingsOpen);
    $('customCode').oninput = (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      state.customCode = e.target.value;
    };
    if ($('joinPassInput')) {
      $('joinPassInput').oninput = (e) => {
        e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 8);
        state.joinPass = e.target.value;
        localStorage.setItem('qiba_join_pass', state.joinPass);
      };
    }
    $('btnCreate').onclick = () => createRoom();
    if ($('btnQuickMatch')) $('btnQuickMatch').onclick = () => quickMatch();
    if ($('btnCancelMatch')) $('btnCancelMatch').onclick = () => cancelQuickMatch();
    if ($('btnCloseRankCeremony')) {
      $('btnCloseRankCeremony').onclick = () => {
        if ($('rankCeremony')) $('rankCeremony').classList.add('hidden');
      };
    }
    if ($('btnWorldChannel')) {
      $('btnWorldChannel').onclick = () => openWorldChannel('create');
    }
    if ($('worldTabCreate')) $('worldTabCreate').onclick = () => {
      setWorldTab('create');
    };
    if ($('worldTabJoin')) $('worldTabJoin').onclick = async () => {
      setWorldTab('join');
      await openWorld();
    };
    if ($('btnCloseWorldChannel')) {
      $('btnCloseWorldChannel').onclick = () => $('worldChannelModal').classList.add('hidden');
    }
    if ($('worldChannelModal')) {
      $('worldChannelModal').onclick = (e) => {
        if (e.target === $('worldChannelModal')) $('worldChannelModal').classList.add('hidden');
      };
    }
    $('btnPractice').onclick = () => startPractice();
    if ($('btnPuzzles')) $('btnPuzzles').onclick = () => openPuzzleModal();
    if ($('btnFriends')) $('btnFriends').onclick = () => openFriendsPanel();
    if ($('btnClubs')) $('btnClubs').onclick = () => openClubPanel();
    $('btnOpenBoard').onclick = () => openLeaderboard(state.leaderboardTab);
    if ($('btnBoardFromBag')) $('btnBoardFromBag').onclick = () => openLeaderboard('rush');
    $('btnRefreshBoard').onclick = () => openLeaderboard(state.leaderboardTab);
    $('btnCloseBoard').onclick = () => $('boardModal').classList.add('hidden');
    $('boardModal').onclick = (e) => {
      if (e.target === $('boardModal')) $('boardModal').classList.add('hidden');
    };
    $('btnJoin').onclick = () => joinRoom(false);
    $('btnWatch').onclick = () => joinRoom(true);
    if ($('btnCommentate')) $('btnCommentate').onclick = () => joinRoom('commentator');
    if ($('btnPassConfirm')) {
      $('btnPassConfirm').onclick = () => {
        const pass = ($('passModalInput').value || '').trim();
        const pending = state.pendingJoin || {};
        $('passModal').classList.add('hidden');
        if ($('joinPassJoin')) $('joinPassJoin').value = pass;
        joinRoom(
          pending.asCommentator ? 'commentator' : !!pending.asSpectator,
          pending.code,
          pass
        );
      };
    }
    if ($('btnPassCancel')) {
      $('btnPassCancel').onclick = () => $('passModal').classList.add('hidden');
    }
    if ($('passModal')) {
      $('passModal').onclick = (e) => {
        if (e.target === $('passModal')) $('passModal').classList.add('hidden');
      };
    }
    if ($('passModalInput')) {
      $('passModalInput').onkeydown = (e) => {
        if (e.key === 'Enter') $('btnPassConfirm').click();
      };
    }
    if ($('btnDanmaku')) {
      $('btnDanmaku').onclick = () => {
        const text = ($('danmakuInput').value || '').trim();
        if (!text) return;
        send({ type: 'danmaku', text });
        $('danmakuInput').value = '';
      };
    }
    if ($('danmakuInput')) {
      $('danmakuInput').onkeydown = (e) => {
        if (e.key === 'Enter') $('btnDanmaku').click();
      };
    }
    $('btnRefreshWorld').onclick = openWorld;
    $('btnBackHome').onclick = () => {
      show('home');
      toast('');
    };
    $('btnSaveProfile').onclick = () => saveMyProfile();

    $('btnSettings').onclick = openSettings;
    if ($('btnInbox')) $('btnInbox').onclick = openInbox;
    if ($('btnCloseInbox') && $('inboxModal')) {
      $('btnCloseInbox').onclick = () => $('inboxModal').classList.add('hidden');
      $('inboxModal').onclick = (e) => {
        if (e.target === $('inboxModal')) $('inboxModal').classList.add('hidden');
      };
    }
    if ($('btnCloseSettings') && $('settingsModal')) {
      $('btnCloseSettings').onclick = () => $('settingsModal').classList.add('hidden');
      $('settingsModal').onclick = (e) => {
        if (e.target === $('settingsModal')) $('settingsModal').classList.add('hidden');
      };
    }
    $('volumeSlider').oninput = (e) => {
      const v = Number(e.target.value);
      $('volumeLabel').textContent = String(v);
      if (window.QibaFx) QibaFx.setVolume(v);
      if ($('sfxToggle') && window.QibaFx) $('sfxToggle').checked = !QibaFx.isMuted() && v > 0;
    };
    if ($('sfxToggle')) {
      $('sfxToggle').onchange = (e) => {
        if (!window.QibaFx) return;
        if (e.target.checked) {
          QibaFx.setMuted(false);
          if (QibaFx.getVolume() === 0) QibaFx.setVolume(80);
          $('volumeSlider').value = String(QibaFx.getVolume());
          $('volumeLabel').textContent = String(QibaFx.getVolume());
        } else {
          QibaFx.setMuted(true);
        }
      };
    }
    if ($('vibrateToggle')) {
      $('vibrateToggle').onchange = (e) => {
        if (window.QibaFx && QibaFx.setVibrateEnabled) QibaFx.setVibrateEnabled(e.target.checked);
      };
    }
    $('bgmToggle').onchange = (e) => {
      if (window.QibaFx) QibaFx.setBgmEnabled(e.target.checked);
    };
    $('bgmVolumeSlider').oninput = (e) => {
      const v = Number(e.target.value);
      $('bgmVolumeLabel').textContent = String(v);
      if (window.QibaFx) QibaFx.setBgmVolume(v);
    };

    $('btnLogin').onclick = () => {
      if (isLoggedIn()) openProfilePage();
      else openAuth();
    };
    $('btnCloseAuth').onclick = () => $('authModal').classList.add('hidden');
    $('authModal').onclick = (e) => {
      if (e.target === $('authModal')) $('authModal').classList.add('hidden');
    };
    $('btnDoLogin').onclick = () => doAuth('login');
    $('btnDoRegister').onclick = () => doAuth('register');
    $('btnLogout').onclick = logout;
    if ($('btnLogoutProfile')) $('btnLogoutProfile').onclick = logout;
    $('btnForgot').onclick = () => {
      $('authModal').classList.add('hidden');
      $('forgotModal').classList.remove('hidden');
    };
    $('btnCloseForgot').onclick = () => $('forgotModal').classList.add('hidden');
    $('forgotModal').onclick = (e) => {
      if (e.target === $('forgotModal')) $('forgotModal').classList.add('hidden');
    };

    $('btnLobbyChat').onclick = () => {
      const text = ($('lobbyChatInput').value || '').trim();
      if (!text) return;
      send({ type: 'roomChat', text });
      $('lobbyChatInput').value = '';
      closeLobbyEmojiPicker();
    };
    $('lobbyChatInput').onkeydown = (e) => {
      if (e.key === 'Enter') $('btnLobbyChat').click();
    };
    fillLobbyEmojiPicker();
    if ($('btnLobbyEmoji')) {
      $('btnLobbyEmoji').onclick = (ev) => {
        ev.stopPropagation();
        toggleLobbyEmojiPicker();
      };
    }
    document.addEventListener('click', (ev) => {
      const wrap = ev.target && ev.target.closest && ev.target.closest('.chat-emoji-wrap');
      if (!wrap) closeLobbyEmojiPicker();
    });

    $('joinCode').oninput = (e) => {
      e.target.value = e.target.value.toUpperCase();
    };
    $('btnCopy').onclick = async () => {
      if (!state.room) return;
      try {
        await navigator.clipboard.writeText(state.room.code);
        toast('房间码已复制');
      } catch {
        toast(state.room.code);
      }
    };
    $('btnReady').onclick = () => {
      const mySeat = state.room && state.room.you && state.room.you.seat;
      send({ type: 'ready', ready: !(mySeat && mySeat.ready) });
    };
    $('btnStart').onclick = () => send({ type: 'start' });
    if ($('btnFillBots')) {
      $('btnFillBots').onclick = () => {
        const room = state.room;
        send({ type: 'setFillBots', enabled: !(room && room.fillBots) });
      };
    }
    if ($('btnCelestial')) {
      $('btnCelestial').onclick = () => {
        const room = state.room;
        send({ type: 'setCelestial', enabled: !(room && room.celestial) });
      };
    }
    if ($('btnGrudge')) {
      $('btnGrudge').onclick = () => send({ type: 'startGrudge' });
    }
    if ($('btnUseJob')) {
      $('btnUseJob').onclick = () => send({ type: 'useJob' });
    }
    if ($('fillBotsToggle')) {
      $('fillBotsToggle').checked = !!state.fillBots;
      $('fillBotsToggle').onchange = (e) => {
        state.fillBots = !!e.target.checked;
        localStorage.setItem('qiba_fill_bots', state.fillBots ? '1' : '0');
      };
    }
    if ($('celestialToggle')) {
      $('celestialToggle').checked = resolvedCelestial();
      $('celestialToggle').onchange = (e) => {
        const on = !!e.target.checked;
        state.celestial = on;
        localStorage.setItem('qiba_celestial', on ? '1' : '0');
      };
    }
    if ($('btnCloseFriends')) $('btnCloseFriends').onclick = () => $('friendsModal').classList.add('hidden');
    if ($('btnFriendSearch')) $('btnFriendSearch').onclick = () => searchFriends();
    if ($('friendSearch')) {
      $('friendSearch').onkeydown = (e) => {
        if (e.key === 'Enter') searchFriends();
      };
    }
    if ($('btnCloseClub')) $('btnCloseClub').onclick = () => $('clubModal').classList.add('hidden');
    if ($('btnClubCreate')) {
      $('btnClubCreate').onclick = () => {
        send({
          type: 'clubCreate',
          uid: state.uid,
          name: ($('clubNameInput') && $('clubNameInput').value) || '',
          shortName: ($('clubShortInput') && $('clubShortInput').value) || '',
        });
      };
    }
    if ($('btnClubJoin')) {
      $('btnClubJoin').onclick = () => {
        send({
          type: 'clubJoin',
          uid: state.uid,
          joinCode: ($('clubJoinCode') && $('clubJoinCode').value) || '',
        });
      };
    }
    if ($('btnClubLeave')) {
      $('btnClubLeave').onclick = () => send({ type: 'clubLeave', uid: state.uid });
    }
    if ($('btnClosePuzzles')) $('btnClosePuzzles').onclick = () => $('puzzleModal').classList.add('hidden');
    if ($('btnInviteAccept')) {
      $('btnInviteAccept').onclick = () => {
        const inv = state.pendingInvite;
        if (inv) {
          send({
            type: 'inviteAccept',
            inviteId: inv.inviteId,
            uid: state.uid,
            name: state.name,
            skin: state.skin,
          });
        }
        nextInviteOrClose();
      };
    }
    if ($('btnInviteDecline')) {
      $('btnInviteDecline').onclick = () => {
        const inv = state.pendingInvite;
        if (inv) {
          send({
            type: 'inviteDecline',
            inviteId: inv.inviteId,
            uid: state.uid,
          });
        }
        nextInviteOrClose();
      };
    }
    if ($('btnCloseDice')) $('btnCloseDice').onclick = () => $('diceModal').classList.add('hidden');
    $('btnNextRound').onclick = () => {
      if (state.practiceMode) startPractice();
      else if (state.puzzleMode) openPuzzleModal();
      else send({ type: 'nextRound' });
    };
    if ($('btnRematchYes')) {
      $('btnRematchYes').onclick = () => send({ type: 'rematchVote', accept: true });
    }
    if ($('btnRematchNo')) {
      $('btnRematchNo').onclick = () => send({ type: 'rematchVote', accept: false });
    }
    if ($('btnTruthAsk')) {
      $('btnTruthAsk').onclick = () => {
        const input = $('truthAskInput');
        send({ type: 'truthAsk', text: input ? input.value : '' });
      };
    }
    if ($('btnTruthAnswer')) {
      $('btnTruthAnswer').onclick = () => {
        const input = $('truthAnswerInput');
        send({ type: 'truthAnswer', text: input ? input.value : '' });
      };
    }
    if ($('btnTruthRefuse')) {
      $('btnTruthRefuse').onclick = () => send({ type: 'truthRefuse' });
    }
    if ($('btnEditQuick')) {
      $('btnEditQuick').onclick = () => {
        openProfilePage();
        toast('在档案中编辑 7 条快捷语后保存');
      };
    }
    $('btnCloseProfile').onclick = () => $('profileModal').classList.add('hidden');
    $('profileModal').onclick = (e) => {
      if (e.target === $('profileModal')) $('profileModal').classList.add('hidden');
    };
    $('btnLeaveRoom').onclick = () => leaveRoomLocal(true);
    $('btnHome').onclick = () => leaveRoomLocal(true);
  }

  applyTheme(state.theme);
  setRoomSettingsOpen(false);
  bind();
  renderHome();
  show('home');
  updateAuthUI();
  loadSeason();
  loadRecentMatches();
  refreshProfileQuiet();
  if (window.QibaFx) {
    QibaFx.ensureSounds();
    QibaFx.setVolume(QibaFx.getVolume());
    QibaFx.initParticles('tsparticles');
  }
  // 进首页后若有上次房间则尝试重连
  if (loadLastRoom()) {
    connect({ autoRejoin: true }).catch(() => {});
  }
})();
