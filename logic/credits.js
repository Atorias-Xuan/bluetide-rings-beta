/* 署名（单一来源）
 *
 * 为什么单独一个文件：署名要出现在面板、NOTICE、README 三处。
 * 各写一遍，改一次漏两处；这里只写一份，别处引用。
 *
 * 许可口径：GPL-3.0-or-later —— 可以免费用、免费改、再分发（含商用），
 * 但派生作品必须同样以 GPL 开源，不能改成闭源；保留版权与署名。
 * 不做防拆、不做授权码：作者不靠这个赚钱，锁人只会让自己难受。
 */
export const AUTHOR = {
  name: '砚尘dust',
  handle: '@Atorias-Xuan',
  license: 'GPL-3.0-or-later',
  feedback: '有问题找 @Atorias-Xuan',
};

/* 面板上那一行：只留作者与反馈，不带产品名和版本（版本在设置页另有一处） */
export function creditLine() {
  return `${AUTHOR.name}（${AUTHOR.handle}）· 问题反馈：${AUTHOR.handle}`;
}

/* 非官方分发的提示（只在指纹对不上时用；不拦、不崩） */
export function unofficialLine() {
  return `非官方分发 · 原版反馈 ${AUTHOR.handle}`;
}
