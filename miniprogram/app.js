App({
  globalData: {
    playerId: '',
    playerName: '',
    skin: 'red',
    // 本地开发。线上网页版：https://qiba.wuyeni.cn 备用 http://47.102.108.137
    wsUrl: 'ws://127.0.0.1:3000',
    lastState: null,
  },
  onLaunch() {
    const skin = wx.getStorageSync('qiba_skin');
    const name = wx.getStorageSync('qiba_name');
    if (skin) this.globalData.skin = skin;
    if (name) this.globalData.playerName = name;
    else {
      this.globalData.playerName = `棋手${Math.floor(Math.random() * 900 + 100)}`;
      wx.setStorageSync('qiba_name', this.globalData.playerName);
    }
  },
});
