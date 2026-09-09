/**
 * 联机 WebSocket 地址。
 * 留空：与当前页面同源。
 *   - 本地开发：浏览器打开 http://127.0.0.1:3000 ，自动连 ws://127.0.0.1:3000
 *   - 线上：https://qiba.wuyeni.cn （wss 同源）
 *   - 备用（无证书）：http://47.102.108.137
 * 仅当页面与联机服务不在同一主机时才填写，例如 wss://qiba.wuyeni.cn
 */
window.QIBA_WS_URL = '';
