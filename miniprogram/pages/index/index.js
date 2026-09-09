const { wsClient } = require('../../services/ws');
const constants = require('../../utils/constants');

Page({
  data: {
    name: '',
    skin: 'red',
    gameType: 'gomoku',
    mode: '1v1',
    joinCode: '',
    // 本地开发。线上：wss://qiba.wuyeni.cn 备用 ws://47.102.108.137
    wsUrl: 'ws://127.0.0.1:3000',
    gameTypes: constants.gameTypes,
    modes: constants.modes,
    skins: constants.skins,
    err: '',
  },

  onShow() {
    const app = getApp();
    this.setData({
      name: app.globalData.playerName,
      skin: app.globalData.skin,
      wsUrl: app.globalData.wsUrl,
    });
  },

  onName(e) {
    this.setData({ name: e.detail.value });
    getApp().globalData.playerName = e.detail.value;
    wx.setStorageSync('qiba_name', e.detail.value);
  },

  onWs(e) {
    this.setData({ wsUrl: e.detail.value });
    getApp().globalData.wsUrl = e.detail.value;
  },

  onCode(e) {
    this.setData({ joinCode: (e.detail.value || '').toUpperCase() });
  },

  pickGame(e) {
    this.setData({ gameType: e.currentTarget.dataset.id });
  },

  pickMode(e) {
    this.setData({ mode: e.currentTarget.dataset.id });
  },

  pickSkin(e) {
    const skin = e.currentTarget.dataset.id;
    this.setData({ skin });
    getApp().globalData.skin = skin;
    wx.setStorageSync('qiba_skin', skin);
  },

  async ensureWs() {
    getApp().globalData.wsUrl = this.data.wsUrl;
    await wsClient.ensureConnected();
  },

  async createRoom() {
    this.setData({ err: '' });
    try {
      await this.ensureWs();
      const off = wsClient.on('created', () => {
        off();
        wx.navigateTo({ url: '/pages/room/room' });
      });
      const offErr = wsClient.on('error', (d) => {
        offErr();
        this.setData({ err: d.error || '创建失败' });
      });
      wsClient.send({
        type: 'create',
        gameType: this.data.gameType,
        mode: this.data.mode,
        name: this.data.name,
        skin: this.data.skin,
      });
    } catch (e) {
      this.setData({ err: '无法连接服务器，请先启动 server' });
    }
  },

  async doJoin(asSpectator) {
    this.setData({ err: '' });
    if (!this.data.joinCode || this.data.joinCode.length < 4) {
      this.setData({ err: '请输入房间码' });
      return;
    }
    try {
      await this.ensureWs();
      const off = wsClient.on('joined', () => {
        off();
        wx.navigateTo({ url: '/pages/room/room' });
      });
      wsClient.send({
        type: 'join',
        code: this.data.joinCode,
        name: this.data.name,
        skin: this.data.skin,
        asSpectator: !!asSpectator,
      });
    } catch (e) {
      this.setData({ err: '无法连接服务器' });
    }
  },

  joinRoom() {
    this.doJoin(false);
  },

  joinWatch() {
    this.doJoin(true);
  },
});
