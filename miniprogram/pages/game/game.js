const { wsClient } = require('../../services/ws');
const constants = require('../../utils/constants');

Page({
  data: {
    state: null,
    remain: 30,
    canPlace: false,
    canRequestAid: false,
    canCancelAid: false,
    canAidMove: false,
    aidUsed: 0,
    mySeat: null,
    skinMap: { 1: 'red', 2: 'blue' },
    currentTeam: 'A',
    currentName: '',
    gameLabel: '',
    modeLabel: '',
    resultText: '',
  },

  timer: null,

  onLoad() {
    this.offMsg = wsClient.on('message', (msg) => {
      if (msg.type === 'stateSync') this.applyState(msg.state);
      if (msg.type === 'error') {
        wx.showToast({ title: msg.error || '错误', icon: 'none' });
      }
    });
    const last = getApp().globalData.lastState;
    if (last) this.applyState(last);
    else wsClient.send({ type: 'sync' });
  },

  onUnload() {
    if (this.offMsg) this.offMsg();
    if (this.timer) clearInterval(this.timer);
  },

  applyState(state) {
    if (!state || !state.board) return;
    const gt = constants.gameTypes.find((g) => g.id === state.gameType);
    const md = constants.modes.find((m) => m.id === state.mode);
    const mySeat = state.you && state.you.seat;
    const mySpec = state.you && state.you.spectator;
    const cur = state.seats[state.turnSeatIndex];
    const skinMap = { 1: 'red', 2: 'blue' };
    state.seats.forEach((s) => {
      if (s.player) skinMap[s.color] = s.player.skin;
    });

    const isMyTurn = !!(mySeat && cur && cur.player && cur.player.id === mySeat.player.id);
    const aidActive = !!state.aidRequest;
    const canAidMove = !!(
      mySpec &&
      aidActive &&
      state.phase === 'playing' &&
      mySpec.aidUsed < 5
    );
    const canPlace =
      state.phase === 'playing' && ((isMyTurn && !aidActive) || canAidMove);

    let resultText = '';
    if (state.phase === 'finished') {
      if (state.winner === 0) resultText = '平局';
      else if (state.winner === 1) resultText = '黑方胜利';
      else if (state.winner === 2) resultText = '白方胜利';
      else resultText = '对局结束';
    }

    this.setData({
      state,
      mySeat,
      skinMap,
      currentTeam: cur ? cur.team : 'A',
      currentName: cur && cur.player ? cur.player.name : '',
      gameLabel: gt ? gt.label : state.gameType,
      modeLabel: md ? md.label : state.mode,
      canPlace,
      canRequestAid:
        state.mode === 'aid' &&
        state.phase === 'playing' &&
        isMyTurn &&
        !aidActive &&
        state.spectators.length > 0,
      canCancelAid: aidActive && isMyTurn,
      canAidMove,
      aidUsed: mySpec ? mySpec.aidUsed : 0,
      resultText,
    });
    this.tickRemain(state.turnDeadline);
  },

  tickRemain(deadline) {
    if (this.timer) clearInterval(this.timer);
    const update = () => {
      const remain = Math.max(0, Math.ceil(((deadline || 0) - Date.now()) / 1000));
      this.setData({ remain });
    };
    update();
    this.timer = setInterval(update, 200);
  },

  onPlace(e) {
    const { r, c } = e.detail;
    if (this.data.canAidMove) {
      wsClient.send({ type: 'aidMove', r, c });
    } else {
      wsClient.send({ type: 'place', r, c });
    }
  },

  pass() {
    if (this.data.canAidMove) wsClient.send({ type: 'aidMove', r: -1, c: -1 });
    else wsClient.send({ type: 'place', r: -1, c: -1 });
  },

  undo() {
    wsClient.send({ type: 'undo' });
  },

  useProp(e) {
    wsClient.send({ type: 'useProp', propType: e.currentTarget.dataset.prop });
  },

  requestAid() {
    wsClient.send({ type: 'requestAid' });
  },

  cancelAid() {
    wsClient.send({ type: 'cancelAid' });
  },

  backHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },
});
