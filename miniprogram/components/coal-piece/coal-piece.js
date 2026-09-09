Component({
  properties: {
    skin: { type: String, value: 'red' },
    color: { type: Number, value: 1 },
    size: { type: Number, value: 28 },
  },
  data: {
    tone: '#c62828',
  },
  observers: {
    'skin, color': function (skin) {
      const map = {
        red: '#c62828',
        blue: '#1565c0',
        green: '#2e7d32',
        pink: '#c2185b',
        yellow: '#f9a825',
      };
      this.setData({ tone: map[skin] || '#c62828' });
    },
  },
});
