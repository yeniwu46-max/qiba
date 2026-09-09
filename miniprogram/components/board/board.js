Component({
  properties: {
    board: { type: Array, value: [] },
    size: { type: Number, value: 15 },
    skins: { type: Object, value: {} },
    disabled: { type: Boolean, value: false },
    highlight: { type: Object, value: null },
  },
  methods: {
    onTap(e) {
      if (this.data.disabled) return;
      const { r, c } = e.currentTarget.dataset;
      this.triggerEvent('place', { r: Number(r), c: Number(c) });
    },
  },
});
