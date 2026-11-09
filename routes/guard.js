/* ── routes/guard.js —— 路由的两个共用动作（2026-10-29 拆出，work-092）
   四个端点各自抄过一遍「只认回环」与「发 JSON」：一份安全判定被复制了四份，
   改一次要记得改四处，漏一处就是一条静默的越权口子。现在只留这里一份。

   这一层不认 ctx、不读盘：输入是地址字符串或 response 对象，输出同上。
   纯函数 → 可以直接断言「192.168.x 进不来」，不用起服务器。 */

export const LOOPBACK_ONLY = 'loopback only';

/* 宿主给的 remoteAddress 形态：IPv6 回环 ::1、IPv4 127/8、以及 IPv4-mapped ::ffff:127.x。
   空/未知一律不放行——宁可 403，不可默认信任。
   按「地址形状」判而不是 startsWith('127.')：前缀判定会把 127.evil.com 这种字符串也放进来。
   remoteAddress 正常只会是 IP，但判定不该依赖「调用方一定给对」。 */
export function isLoopback(address) {
  const value = typeof address === 'string' ? address.trim() : '';
  if (!value) return false;
  if (value === '::1') return true;
  const v4 = value.startsWith('::ffff:') ? value.slice(7) : value;
  return /^127(?:\.\d{1,3}){3}$/.test(v4);
}

/* 统一的 JSON 回执：状态码 + 两个头 + 序列化。
   no-store 是必须的：面板与设置页都靠「每次现取」判断当前状态，缓存会让改动看不见。 */
export function jsonSender(response) {
  return (code, payload) => {
    response.statusCode = code;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.setHeader('cache-control', 'no-store');
    response.end(JSON.stringify(payload));
  };
}
