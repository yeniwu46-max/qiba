const SKIN_MAP = {
  red: '#c62828',
  blue: '#1565c0',
  green: '#2e7d32',
  pink: '#c2185b',
  yellow: '#f9a825',
};

module.exports = {
  skins: [
    { id: 'red', label: '赤红', color: SKIN_MAP.red },
    { id: 'blue', label: '靛青', color: SKIN_MAP.blue },
    { id: 'green', label: '青碧', color: SKIN_MAP.green },
    { id: 'pink', label: '桃粉', color: SKIN_MAP.pink },
    { id: 'yellow', label: '琥珀', color: SKIN_MAP.yellow },
  ],
  gameTypes: [
    { id: 'gomoku', label: '五子棋' },
    { id: 'reversi', label: '黑白棋' },
    { id: 'go', label: '围棋' },
  ],
  modes: [
    { id: '1v1', label: '1v1' },
    { id: '2v2', label: '2v2' },
    { id: 'props', label: '道具赛' },
    { id: 'aid', label: '外援赛' },
    { id: 'youjin', label: '友尽赛' },
  ],
  skinColor(id) {
    return SKIN_MAP[id] || SKIN_MAP.red;
  },
};
