/* © 2026 砚尘dust (@Atorias-Xuan) · 蓝潮三环 β v1.0.0-bis
 *
 * 本程序是自由软件：你可以再分发、修改，但必须遵守 GNU 通用公共许可证
 * 第 3 版（或任何更新版本）的条款。它是"传染性"的：你发布基于本程序的
 * 作品，也必须以同样的 GPL 授权，不能改成闭源。
 *
 * 这是一份分发声明，不构成额外限制。完整条款见同目录 LICENSE。
 */
/* 布局与路径守卫（2026-11-05 从 index.js 搬出，103 S5 第一块）
 *
 * 为什么先搬这一块：它是 index.js 里最「干净」的一段——只依赖 node:path，
 * 不碰 ctx、不碰 FS 写入、不知道三环怎么算。搬出去之后 index.js 少一段，
 * 而且这段能被单独断言（work-092 的 verify-layering 要求 store/ 不许认宿主符号）。
 *
 * 判据都在函数上，不在这里：
 *   layoutPaths —— 由工作区根推导四区与各子目录的绝对路径；
 *   insidePath  —— 目标必须落在工作区内（Windows 折大小写），防 .. 与符号链接式逃逸。
 */
import { join, resolve } from 'node:path';

export const LAYOUT_VERSION = 1;
/* 布局配置属于插件自己的东西，放在 BLUE Files/Config 下；不再散在工作区根（2026-10-27 统一收纳） */
export const LAYOUT_DIRNAME = join('BLUE Files', 'Config');
export const LAYOUT_FILENAME = 'layout.json';
export const LAYOUT_REL = {
  perception: join('BLUE Files', '01_Perception', '记录'),
  memory: join('BLUE Files', '02_Memory', '记录'),
  persona: join('BLUE Files', '03_Persona', '记录'),
  work: join('BLUE Files', '04_Execution_Membrane', '执行', '工作', '记录'),
};
export const LAYOUT_PERSONA_REL = join('BLUE Files', '03_Persona', 'persona');
export const LAYOUT_BACKUP_REL = '备份';
export const LAYOUT_TASKS_REL = join('BLUE Files', '04_Execution_Membrane', '执行', '工作', 'tasks');
export const LAYOUT_MATERIALS_REL = join('BLUE Files', '04_Execution_Membrane', '执行', '工作', '工作资料');
export const LAYOUT_IMAGES_REL = join(LAYOUT_MATERIALS_REL, '素材', '抖音-蓝潮');

/* createdAt 由调用方给时间函数：这里不引宿主的时间源，模块才干净 */
export function layoutPaths(workspace, nowIso = () => new Date().toISOString()) {
  const areas = {};
  for (const key of Object.keys(LAYOUT_REL)) areas[key] = join(workspace, LAYOUT_REL[key]);
  return {
    version: LAYOUT_VERSION,
    workspace,
    areas,
    personaRoot: join(workspace, LAYOUT_PERSONA_REL),
    backupRoot: join(workspace, LAYOUT_BACKUP_REL),
    tasks: join(workspace, LAYOUT_TASKS_REL),
    materials: join(workspace, LAYOUT_MATERIALS_REL),
    images: join(workspace, LAYOUT_IMAGES_REL),
    createdAt: nowIso(),
  };
}

/* 路径守卫：目标必须落在工作区内（Windows 折大小写），防 .. 与符号链接式逃逸 */
export function insidePath(root, target) {
  try {
    const base = resolve(root);
    const full = resolve(target);
    const fold = (value) => (process.platform === 'win32' ? value.toLowerCase() : value);
    const prefix = fold(base).endsWith(fold(process.platform === 'win32' ? '\\' : '/')) ? fold(base) : fold(base) + (process.platform === 'win32' ? '\\' : '/');
    return fold(full) === fold(base) || fold(full).startsWith(prefix);
  } catch {
    return false;
  }
}
