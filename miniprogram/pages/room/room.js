const { wsClient } = require('../../services/ws');
const constants = require('../../utils/constants');

Page({
  data: {
    state: null,
    isHost: false,
    mySeat: null,
    gameLabel: '',
    modeLabel: '',
    hint: '',
  },

  onLoad() {
    this.offMsg = wsClient.on('message', (msg) => {
      if (msg.type === 'stateSync') this.applyState(msg.state);
      if (msg.type === 'error') {
        this.setData({ hint: msg.error || '' });
        wx.showToast({ title: msg.error || '错误', icon: 'none' });
      }
    });
    const last = getApp().globalData.lastState;
    if (last) this.applyState(last);
    else wsClient.send({ type: 'sync' });
  },

  onUnload() {
    if (this.offMsg) this.offMsg();
  },

  applyState(state) {
    if (!state) return;
    if (state.phase === 'playing' || state.phase === 'finished') {
      wx.redirectTo({ url: '/pages/game/game' });
      return;
    }
    const gt = constants.gameTypes.find((g) => g.id === state.gameType);
    const md = constants.modes.find((m) => m.id === state.mode);
    const mySeat = state.you && state.you.seat;
    this.setData({
      state,
      isHost: state.hostId === (state.you && state.you.playerId),
      mySeat,
      gameLabel: gt ? gt.label : state.gameType,
      modeLabel: md ? md.label : state.mode,
      hint: '',
    });
  },

  copyCode() {
    const code = this.data.state && this.data.state.code;
    if (!code) return;
    wx.setClipboardData({ data: code });
  },

  ready() {
    wsClient.send({ type: 'ready', ready: true });
  },

  unready() {
    wsClient.send({ type: 'ready', ready: false });
  },

  start() {
    wsClient.send({ type: 'start' });
  },
});
