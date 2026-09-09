/*
 * 人机练习 Worker：复用 billzi2016/Gomoku-AI 的 Rust/Wasm 导出 search_best_move。
 * 不另造搜索引擎；仅做加载与一次搜索调用。
 */
let wasmReady = null;
let searchBestMove = null;

async function initWasm() {
  if (wasmReady) return wasmReady;
  wasmReady = import('/assets/wasm/gomoku_ai.js').then(async (mod) => {
    await mod.default();
    searchBestMove = mod.search_best_move;
  });
  return wasmReady;
}

self.onmessage = async (event) => {
  const { jobId, type } = event.data || {};
  try {
    if (type === 'init') {
      await initWasm();
      if (!searchBestMove) throw new Error('Wasm 五子 AI 未导出 search_best_move');
      self.postMessage({ jobId, ok: true, result: true });
      return;
    }
    if (type === 'search') {
      if (!searchBestMove) throw new Error('Wasm 五子 AI 尚未初始化');
      const cells = event.data.cells instanceof Int8Array
        ? event.data.cells
        : new Int8Array(event.data.cells || []);
      if (cells.length !== 225) throw new Error('棋盘数据必须是 15×15');
      const allowed = event.data.legalMoves instanceof Uint8Array
        ? event.data.legalMoves
        : new Uint8Array(event.data.legalMoves || []);
      const raw = searchBestMove(
        cells,
        !!event.data.isBlackTurn,
        Number(event.data.thinkTimeMs) || 2500,
        allowed
      );
      self.postMessage({ jobId, ok: true, result: JSON.parse(raw) });
      return;
    }
    throw new Error('未知 Worker 消息');
  } catch (err) {
    self.postMessage({ jobId, ok: false, error: (err && err.message) || String(err) });
  }
};
