const app = getApp();

class WsClient {
  constructor() {
    this.socket = null;
    this.handlers = {};
    this.connected = false;
    this.queue = [];
  }

  connect(url) {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        try {
          this.socket.close();
        } catch (e) {}
      }
      const wsUrl = url || app.globalData.wsUrl;
      this.socket = wx.connectSocket({ url: wsUrl });
      this.socket.onOpen(() => {
        this.connected = true;
        this.queue.forEach((m) => this.rawSend(m));
        this.queue = [];
        resolve();
      });
      this.socket.onError((err) => {
        this.connected = false;
        reject(err);
      });
      this.socket.onClose(() => {
        this.connected = false;
        this.emit('close', {});
      });
      this.socket.onMessage((res) => {
        let data;
        try {
          data = JSON.parse(res.data);
        } catch (e) {
          return;
        }
        if (data.type === 'stateSync' && data.state) {
          app.globalData.lastState = data.state;
          if (data.state.you && data.state.you.playerId) {
            app.globalData.playerId = data.state.you.playerId;
          }
        }
        if (data.type === 'created' || data.type === 'joined') {
          app.globalData.playerId = data.playerId;
        }
        this.emit(data.type, data);
        this.emit('message', data);
      });
    });
  }

  on(type, fn) {
    if (!this.handlers[type]) this.handlers[type] = [];
    this.handlers[type].push(fn);
    return () => {
      this.handlers[type] = (this.handlers[type] || []).filter((f) => f !== fn);
    };
  }

  emit(type, data) {
    (this.handlers[type] || []).forEach((fn) => fn(data));
  }

  rawSend(obj) {
    this.socket.send({ data: JSON.stringify(obj) });
  }

  send(obj) {
    if (!this.connected) {
      this.queue.push(obj);
      return;
    }
    this.rawSend(obj);
  }

  ensureConnected() {
    if (this.connected) return Promise.resolve();
    return this.connect();
  }
}

const wsClient = new WsClient();
module.exports = { wsClient };
