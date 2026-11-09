/* ── routes/index.js —— 四个 webServer 端点（2026-10-29 从 index.js 搬出，work-092）
   四个端点：
     persona.json   面板快照（只读，JSON）
     pet-image      桌宠形象图（只读，二进制）
     fs             本机文件浏览（只读，JSON；范围锁工作区）
     act            写动作（备份 / 导入 / 人格槽位 / 融合开关）

   为什么搬出来：端点只能靠 HTTP 行为验收，而验收必须重启宿主——搬出来才能用假
   webServer 在进程内断言 403 / 200 / 400 / 路径越界，不必等重启。

   这一层不碰宿主：端点只吃 request / response，宿主状态全部由 createRoutes 的 deps 注入。
   凡是会变的（工作区、debug、lastAudit）都走 live() 现取——装配时拍快照，
   之后你在面板里换了工作区，路由还认旧路径。

   装配时缺依赖当场炸：少一个 helper 就在 apply() 里报错，别等请求进来变成 500。 */

import { copyFile, cp, mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { isLoopback, jsonSender, LOOPBACK_ONLY } from './guard.js';

const IMAGE_MIME = {
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

const REQUIRED_HELPERS = [
  'buildSnapshot', 'resolveAreas', 'readPet', 'readPetArt',
  'readPluginState', 'writePluginState', 'buildCompleteSelf',
  'importRecords', 'restorePersonaFiles', 'installPersonaFile', 'parsePersonaFile',
  'readPersonaGuard', 'writePersonaGuard', 'hasActiveWorkTask',
];

export function createRoutes(deps = {}) {
  const {
    endpoints = {},
    layers = [],
    areaFiles = {},
    petDirParts = [],
    imagePickExt = /\.(png|jpe?g|webp|gif)$/i,
    personaPickExt = /\.(md|markdown|json|ya?ml|txt)$/i,
    fsMaxEntries = 400,
    personaPickMax = 512 * 1024,
    personaDirs = ['experience', 'memory', 'rings', 'organs', 'patch'],
    helpers = {},
    live,
  } = deps;

  if (typeof live !== 'function') throw new Error('routes: 缺少 live()（工作区 / debug / lastAudit 要现取）');
  for (const name of REQUIRED_HELPERS) {
    if (typeof helpers[name] !== 'function') throw new Error(`routes: 缺少依赖 ${name}`);
  }
  for (const key of ['persona', 'petImage', 'fs', 'act']) {
    if (typeof endpoints[key] !== 'string' || !endpoints[key]) throw new Error(`routes: 缺少端点 ${key}`);
  }
  const {
    buildSnapshot, resolveAreas, readPet, readPetArt,
    readPluginState, writePluginState, buildCompleteSelf,
    importRecords, restorePersonaFiles, installPersonaFile, parsePersonaFile,
    readPersonaGuard, writePersonaGuard, hasActiveWorkTask,
  } = helpers;

  /* 人格更改门禁（093）的判定只有这一处：锁着就拒，解锁了就放。
     界面按钮的 disabled 只是提示，真正挡住的是这里。
     2026-11-01 去掉了「有任务就自动复位上锁」：那一版与 index.js 面板快照
     「仍可解锁，改动会立即生效」正好相反 —— 面板说能改、接口说不能，
     两边都不算错，用户看到的是自相矛盾。门禁只由人开关，任务状态只做提示。 */
  const personaGuardNow = async () => {
    const guard = await readPersonaGuard();
    const work = await hasActiveWorkTask();
    const base = { ...guard, hasWork: work.active, taskIds: work.taskIds };
    if (!guard.unlocked) {
      return {
        ok: false,
        status: 403,
        body: {
          ok: false,
          error: '人格更改是锁着的：先到设置页「人格更改 · 门禁」解锁（默认关）',
          guard: base,
        },
      };
    }
    return { ok: true, guard: base };
  };

  return [
    /* 面板快照：四个环 + 状态行。只读，不含写入路径 */
    {
      kind: 'exact',
      path: endpoints.persona,
      handler: async (request, response) => {
        const loopback = isLoopback(request?.socket?.remoteAddress);
        try {
          if (!loopback) {
            response.statusCode = 403;
            response.setHeader('content-type', 'text/plain; charset=utf-8');
            response.end(LOOPBACK_ONLY);
            return;
          }
          const { root, areas, debug, lastAudit } = live();
          response.statusCode = 200;
          response.setHeader('content-type', 'application/json; charset=utf-8');
          response.setHeader('cache-control', 'no-store');
          const snapshot = await buildSnapshot(root, areas);
          if (lastAudit) snapshot.memory = { ...snapshot.memory, lastAudit };
          snapshot.memory = { ...snapshot.memory, debug: { ...debug } };
          response.end(JSON.stringify(snapshot));
        } catch (error) {
          response.statusCode = 500;
          response.setHeader('content-type', 'application/json; charset=utf-8');
          response.end(JSON.stringify({ ok: false, error: String((error && error.message) || error) }));
        }
      },
    },
    /* 桌宠形象图：GET 直出当前那张（avatar.json 选中的，或内置 icon.png），只读、只本机 */
    {
      kind: 'exact',
      path: endpoints.petImage,
      handler: async (request, response) => {
        const loopback = isLoopback(request?.socket?.remoteAddress);
        if (!loopback) {
          response.statusCode = 403;
          response.end(LOOPBACK_ONLY);
          return;
        }
        try {
          const { workspace } = live();
          const pet = await readPet(workspace);
          if (pet.imageKind === 'embedded') {
            /* 全身立绘是内嵌在桌宠 client.js 里的 webp，直接从那份 base64 还原 */
            const art = await readPetArt(pet.dir);
            if (!art || !art.bytes) {
              response.statusCode = 404;
              response.end('pet art unavailable');
              return;
            }
            response.statusCode = 200;
            response.setHeader('content-type', art.mime || 'image/webp');
            response.setHeader('cache-control', 'no-store');
            response.end(art.bytes);
            return;
          }
          const target = String(pet.imagePath || '');
          /* 形象只从工作区里挑，且只允许图片扩展名 */
          const insideWs = String(target).toLowerCase().startsWith(String(workspace).toLowerCase() + '\\');
          if (!insideWs || !imagePickExt.test(target)) {
            response.statusCode = 403;
            response.end('image not allowed');
            return;
          }
          const bytes = await readFile(target);
          const ext = (target.split('.').pop() || '').toLowerCase();
          response.statusCode = 200;
          response.setHeader('content-type', IMAGE_MIME[ext] || 'application/octet-stream');
          response.setHeader('cache-control', 'no-store');
          response.end(bytes);
        } catch (error) {
          response.statusCode = 404;
          response.setHeader('content-type', 'text/plain; charset=utf-8');
          response.end(`pet image unavailable: ${String((error && error.message) || error)}`);
        }
      },
    },
    /* 本机文件浏览（只读）：人格切换要像系统「打开文件」那样一层层找。
       范围锁在工作区内；只列目录和文件名，不读文件内容、不联网。 */
    {
      kind: 'exact',
      path: endpoints.fs,
      handler: async (request, response) => {
        const loopback = isLoopback(request?.socket?.remoteAddress);
        const send = jsonSender(response);
        if (!loopback) return send(403, { ok: false, error: LOOPBACK_ONLY });
        const { workspace, personaRoot } = live();
        /* 浏览范围就是工作区：打开看到 01_Perception / 02_Memory / 03_Persona / 04_Execution_Membrane / 备份，
           自己点进去选文件。不再提供盘符级跳转。 */
        const inside = (target) => {
          /* 2026-11-01 修：先 resolve 归一化再比。
             以前只把 / 换成 \ 就做字符串前缀比较 —— `..\` 根本没被解析，
             于是 `工作区\..\..\Windows` 前缀照样匹配，readdir 就能列出工作区外的目录。
             resolve 会把 .. / . 和相对写法都折叠成绝对路径，再比前缀才成立。
             顺带保留分隔符归一：前端 encodeURIComponent 后可能是正斜杠。 */
          const norm = resolve(String(target || '') || '.').replace(/[\\/]+$/, '').toLowerCase();
          const base = resolve(String(workspace || '') || '.').replace(/[\\/]+$/, '').toLowerCase();
          return norm === base || norm.startsWith(base + '\\');
        };
        const insidePersona = (target) => {
          const norm = resolve(String(target || '') || '.').replace(/[\\/]+$/, '').toLowerCase();
          const base = resolve(String(personaRoot || '') || '.').replace(/[\\/]+$/, '').toLowerCase();
          return Boolean(String(personaRoot || '')) && (norm === base || norm.startsWith(base + '\\'));
        };
        try {
          const url = new URL(String(request.url || '/'), 'http://127.0.0.1');
          const asked = String(url.searchParams.get('path') || '').trim();
          const target = asked || workspace;
          if (!inside(target)) return send(403, { ok: false, error: 'path not allowed（只看工作区）' });
          /* 人格更改门禁（093）：锁着时连人格目录都不给列 */
          const guard = await readPersonaGuard();
          if (!guard.unlocked && insidePersona(target)) {
            return send(403, { ok: false, error: '人格目录已锁定：先在设置页「人格更改 · 门禁」解锁' });
          }
          const atRoot = String(target).toLowerCase() === String(workspace).toLowerCase();
          let names = [];
          try {
            names = await readdir(target, { withFileTypes: true });
          } catch (error) {
            return send(404, { ok: false, error: `目录读不到：${String((error && error.message) || error)}` });
          }
          const entries = [];
          for (const item of names) {
            const full = join(target, item.name);
            if (item.isDirectory()) {
              entries.push({ name: item.name, path: full, dir: true });
            } else if (item.isFile()) {
              entries.push({
                name: item.name,
                path: full,
                dir: false,
                size: (await stat(full).catch(() => null))?.size ?? null,
              });
            }
          }
          entries.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name, 'zh') : a.dir ? -1 : 1));
          return send(200, {
            ok: true,
            path: target,
            parent: atRoot ? null : dirname(target),
            root: workspace,
            truncated: entries.length > fsMaxEntries,
            entries: entries.slice(0, fsMaxEntries),
          });
        } catch (error) {
          return send(500, { ok: false, error: String((error && error.message) || error) });
        }
      },
    },
    /* 两个动作端点：备份人格/记忆、用资源管理器打开允许的目录。
       白名单只含 personaRoot 与四区目录，不让它变成任意命令执行。 */
    {
      kind: 'exact',
      path: endpoints.act,
      handler: async (request, response) => {
        const loopback = isLoopback(request?.socket?.remoteAddress);
        const send = jsonSender(response);
        if (!loopback) return send(403, { ok: false, error: LOOPBACK_ONLY });
        const { root, areas, workspace } = live();
        try {
          const chunks = [];
          for await (const chunk of request) chunks.push(chunk);
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
          const action = String(body.action || '');
          const dirs = resolveAreas(root, areas);
          const insideWorkspace = (target) => {
            const norm = String(target || '').toLowerCase();
            const base = String(workspace).toLowerCase();
            return norm === base || norm.startsWith(base + '\\') || norm.startsWith(base + '/');
          };
          /* 打开文件统一走面板内的 /fs 浏览；不再给插件开「用资源管理器跳转」的口子 */
          /* 三环权重 v5（095）：只写 state.json 的开关，不动 v4 口径；关着时行为与今天一致 */
          if (action === 'ring-weight-v5') {
            const state = await readPluginState();
            state.ringWeightV5 = body.enabled === true;
            state.ringWeightV5At = new Date().toISOString();
            await writePluginState(state);
            return send(200, {
              ok: true,
              ringWeightV5: state.ringWeightV5,
              avg: state.ringWeightAvg || null,
            });
          }
          /* 人格更改门禁（093）：一个开关——开＝备份 + 放行；有任务时打开也复位。 */
          if (action === 'persona-guard') {
            const explicit = typeof body.enabled === 'boolean';
            const wantsUnlock = body.enabled === true;
            const work = await hasActiveWorkTask();
            const stamp = new Date().toISOString();
            if (explicit && wantsUnlock && work.active) {
              const next = await writePersonaGuard({ unlocked: false, at: stamp });
              return send(409, {
                ok: false,
                error: `${work.workText || '正在做任务'}：不能解锁，开关已复位`,
                guard: { ...next, hasWork: true, taskIds: work.taskIds },
              });
            }
            /* 打开就自动先备份一次完整自我：滑块的「自动保存」就是这个动作 */
            let backup = null;
            if (explicit && wantsUnlock && !work.active) {
              try {
                const saved = await buildCompleteSelf(root);
                backup = (saved && (saved.dest || saved.path)) || null;
              } catch (error) {
                return send(500, { ok: false, error: `自动备份失败，没解锁：${String((error && error.message) || error)}` });
              }
            }
            const next = await writePersonaGuard({ unlocked: explicit ? wantsUnlock : undefined, at: stamp });
            return send(200, { ok: true, backup, guard: { ...next, hasWork: work.active, taskIds: work.taskIds } });
          }
          /* 整套人格替换（093）：人格是账号级绑定，只能整套换，不能拆槽位。
             准入：锁着拒；六层必须齐全；先整包备份；替换失败回滚提示。 */
          if (action === 'persona-bundle') {
            const gate = await personaGuardNow();
            if (!gate.ok) return send(gate.status, gate.body);
            const source = String(body.path || '');
            if (!insideWorkspace(source)) return send(403, { ok: false, error: 'path not allowed（只认工作区内的路径）' });
            let info = null;
            try {
              info = await stat(source);
            } catch {
              return send(400, { ok: false, error: '目录不存在或读不到' });
            }
            if (!info.isDirectory()) return send(400, { ok: false, error: '要选一个目录：里面放这套人格的六份文件' });
            const missing = [];
            for (const [, layerFile] of layers) {
              try {
                const one = await stat(join(source, layerFile));
                if (!one.isFile()) missing.push(layerFile);
              } catch {
                missing.push(layerFile);
              }
            }
            if (missing.length) {
              return send(400, { ok: false, error: `这套不完整，缺：${missing.join('、')}——不允许拼装`, missing });
            }
            if (resolve(source).toLowerCase() === resolve(root).toLowerCase()) {
              return send(400, { ok: false, error: '这就是当前人格目录，不用换' });
            }
            let backup = null;
            try {
              const saved = await buildCompleteSelf(root);
              backup = (saved && (saved.dest || saved.path)) || null;
            } catch (error) {
              return send(500, { ok: false, error: `备份失败，没有替换：${String((error && error.message) || error)}` });
            }
            const copied = [];
            const copiedDirs = [];
            try {
              for (const [, layerFile] of layers) {
                await copyFile(join(source, layerFile), join(root, layerFile));
                copied.push(layerFile);
              }
              for (const dir of personaDirs) {
                const from = join(source, dir);
                try {
                  const info2 = await stat(from);
                  if (!info2.isDirectory()) continue;
                } catch {
                  continue;
                }
                await cp(from, join(root, dir), { recursive: true, force: true });
                copiedDirs.push(dir);
              }
            } catch (error) {
              return send(500, {
                ok: false,
                error: `替换中途失败：${String((error && error.message) || error)}。备份在 ${backup}`,
                backup, copied,
              });
            }
            const state = await readPluginState();
            state.personaBundle = { source, at: new Date().toISOString(), backup };
            await writePluginState(state);
            return send(200, { ok: true, backup, copied, dirs: copiedDirs, source });
          }
          /* 记忆融合开关：只写插件自己的 state.json，不碰四区、不碰人格 */
          if (action === 'fuse-toggle') {
            const state = await readPluginState();
            state.fuseEnabled = body.enabled === true;
            await writePluginState(state);
            return send(200, { ok: true, fuseEnabled: state.fuseEnabled });
          }
          if (action === 'backup') {
            const dest = join(root, '..', '..', 'BLUE Files', '02_Memory', '备份', `人格记忆-${Date.now()}`);
            const copied = [];
            for (const [, file] of layers) {
              try {
                const to = join(dest, 'persona', file);
                await mkdir(join(to, '..'), { recursive: true });
                await copyFile(join(root, file), to);
                copied.push(`persona/${file}`);
              } catch {
                /* 某个层文件缺失不阻断其它 */
              }
            }
            for (const [key, file] of Object.entries(areaFiles)) {
              try {
                const to = join(dest, 'records', `${key}.ndjson`);
                await mkdir(join(dest, 'records'), { recursive: true });
                await copyFile(join(dirs[key], file), to);
                copied.push(`records/${key}.ndjson`);
              } catch {
                /* 没有该区记录就跳过 */
              }
            }
            return send(200, { ok: true, dest, copied: copied.length });
          }
          if (action === 'backup-full') {
            /* 打开滑块时跑：整包备份到 备份/<名字>-完整自我/，覆盖成最新一份 */
            try {
              const result = await buildCompleteSelf(root);
              return send(200, result);
            } catch (error) {
              return send(500, { ok: false, error: `完整备份失败：${String((error && error.message) || error)}` });
            }
          }
          if (action === 'pet-avatar') {
            /* 桌宠形象替换：只做接口串联——校验图片路径、把选择写进桌宠的 avatar.json。
               桌宠侧读这份配置的逻辑还没接，所以返回 applied:false，不谎称已替换。 */
            const image = String(body.image || '');
            const petDir = join(workspace, ...petDirParts);
            if (!insideWorkspace(image)) return send(403, { ok: false, error: 'image not allowed' });
            if (!imagePickExt.test(image)) return send(400, { ok: false, error: 'not an image' });
            const config = join(petDir, 'avatar.json');
            const row = {
              v: 1,
              avatar: image,
              by: 'bluetide-rings',
              updatedAt: new Date().toISOString(),
              note: '桌宠侧读取这份配置的逻辑待接',
            };
            try {
              await mkdir(petDir, { recursive: true });
              const tmp = `${config}.tmp`;
              await writeFile(tmp, `${JSON.stringify(row, null, 2)}\n`, 'utf8');
              await rename(tmp, config);
            } catch (error) {
              return send(500, { ok: false, error: String((error && error.message) || error) });
            }
            return send(200, {
              ok: true,
              applied: false,
              config,
              avatar: image,
              note: '形象配置已写入 avatar.json；桌宠侧读取还没接，改了不会立刻生效',
            });
          }
          if (action === 'import-records' || action === 'backup-restore') {
            const source = String(body.path || '');
            if (!insideWorkspace(source)) return send(403, { ok: false, error: 'path not allowed（只认工作区内的路径）' });
            /* 工作区根整包扫会把所有历史记录再走一遍，误点一次就是几万行；要求选到具体的那一份 */
            if (resolve(source).toLowerCase() === resolve(workspace).toLowerCase()) {
              return send(400, { ok: false, error: '别把工作区根整个导进来：进「备份」文件夹选具体那一份，或选一个 .ndjson 文件' });
            }
            if (action === 'import-records') {
              try {
                const report = await importRecords(source, dirs);
                return send(200, { ok: true, ...report });
              } catch (error) {
                return send(400, { ok: false, error: String((error && error.message) || error) });
              }
            }
            try {
              const persona = await restorePersonaFiles(source, root);
              const records = await importRecords(source, dirs);
              return send(200, { ok: true, persona, records });
            } catch (error) {
              return send(400, { ok: false, error: String((error && error.message) || error) });
            }
          }
          if (action === 'persona-import') {
            /* 093 起停用：人格是整套绑定的，单换一份等于拼装。保留分支只为回一句明确原因。 */
            return send(410, { ok: false, error: '人格只能整套换（persona-bundle）：单份替换已停用' });
            const gate = await personaGuardNow();
            if (!gate.ok) return send(gate.status, gate.body);
            const slot = String(body.slot || '');
            const source = String(body.path || '');
            if (!layers.some(([id]) => id === slot)) return send(400, { ok: false, error: '未知的人格槽位' });
            if (!insideWorkspace(source)) return send(403, { ok: false, error: 'path not allowed（只认工作区内的文件）' });
            if (!personaPickExt.test(source)) return send(400, { ok: false, error: '只认 .md / .json / .yaml / .txt 文件' });
            let picked = null;
            try {
              picked = await stat(source);
            } catch {
              return send(400, { ok: false, error: '文件不存在或读不到' });
            }
            if (!picked || !picked.isFile()) return send(400, { ok: false, error: '这不是一个文件' });
            if (picked.size > personaPickMax) return send(400, { ok: false, error: '文件太大，上限 512 KB' });
            /* 备份在「打开滑块」那一步就做过了（一个开关两件事）；这里不再重复整包拷贝 */
            try {
              const saved = await installPersonaFile(root, slot, source);
              return send(200, { ok: true, ...saved });
            } catch (error) {
              return send(500, { ok: false, error: `导入失败：${String((error && error.message) || error)}` });
            }
          }
          if (action === 'persona-load') {
            /* 093 起停用：单换身份层同样破坏账号绑定。 */
            return send(410, { ok: false, error: '人格只能整套换（persona-bundle）：单换身份来源已停用' });
            const gate = await personaGuardNow();
            if (!gate.ok) return send(gate.status, gate.body);
            const target = String(body.path || '');
            if (!insideWorkspace(target)) return send(403, { ok: false, error: 'path not allowed（只认工作区内的文件）' });
            if (!personaPickExt.test(target)) return send(400, { ok: false, error: '只认 .md / .json / .yaml / .txt 配置文件' });
            let info = null;
            try {
              info = await stat(target);
            } catch {
              return send(400, { ok: false, error: '文件不存在或读不到' });
            }
            if (!info || !info.isFile()) return send(400, { ok: false, error: '这不是一个文件' });
            if (info.size > personaPickMax) return send(400, { ok: false, error: '文件太大，上限 512 KB' });
            let text = '';
            try {
              text = await readFile(target, 'utf8');
            } catch (error) {
              return send(400, { ok: false, error: `读不到内容：${String((error && error.message) || error)}` });
            }
            const fields = parsePersonaFile(text, target);
            const state = await readPluginState();
            state.persona = {
              path: target,
              name: fields.name,
              alt: fields.alt,
              race: fields.race,
              at: new Date().toISOString(),
              bytes: info.size,
            };
            try {
              await writePluginState(state);
            } catch (error) {
              return send(500, { ok: false, error: `写入失败：${String((error && error.message) || error)}` });
            }
            return send(200, {
              ok: true,
              applied: true,
              path: target,
              name: fields.name,
              alt: fields.alt,
              bytes: info.size,
              note: '已切换插件读取的人格来源；人格基座文件没动',
            });
          }
          return send(400, { ok: false, error: 'unknown action' });
        } catch (error) {
          return send(500, { ok: false, error: String((error && error.message) || error) });
        }
      },
    },
  ];
}
