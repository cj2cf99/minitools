# 告解骰 · 定稿氛围与 API 开发审核（2026-11-21 JST）

状态：**待用户确认**

## 范围

- minitools：`public/tools/sindie/{index.html,sindie.css,game.js}`，按用户选定只保留 A 烛光祭坛。
- subscriptions-api（`G:/selftool/informationManage/api-worker`）：新增 `src/sin-die-core.js`、`src/sin-die.js`、`test/sin-die.test.js`；修改 `src/index.js`（路由）、`wrangler.jsonc`（补 `kvforapi`）、`README.md`、`AUTOMATION_API.md`。
- 不在范围：该仓库 `src/companion/**` 下其他会话的未提交改动（没有查看或修改）；入口图标（候选待选）；部署；主站接入；花园登记。
- 对照：`docs/sindie/REQUIREMENTS.md` 中的用户原话、用户选择「A 烛光祭坛」。

## 基线

- minitools：`main` @ `7181ec1`，本阶段改动未提交。
- informationManage：`main` @ `0dd1250`；开始前已有其他会话对 `api-worker/src/companion/**` 的未提交改动。
- 内核副本与源文件 SHA-256 一致：`04d01c2b696b1a99d35ff69f82733fd6da5bc21aea013a31c15885d28a209912`。

## 命令与结果

| 命令 | 结果 |
| --- | --- |
| minitools `node --test` | 13 / 13 通过 |
| api-worker `node --test test/sin-die.test.js` | 5 / 5 通过：内核哈希一致；同一小时只写 KV 一次、只用一个键；东京零点换日；3000 小时无三连且七面都出现；路由的 Access、GET、KV 缺失、API_ENABLED 门禁 |
| api-worker `node --test`（全部） | 第一次 37 / 38，`review-regressions` 用 `JSON.parse` 读 `wrangler.jsonc`，被新加的注释弄坏；删掉注释后 38 / 38 通过 |
| `npm.cmd run deploy:dry-run` | 打包 220.39 KiB，没有上传。绑定 kvforapi、APIDB、COMPANION_DB、myR2、COMPANION_HOST、clouflareai，与用户截图的线上绑定一致 |
| `wrangler kv namespace list` | 只读，查到 `stock-data` 的命名空间 ID，已写入 `wrangler.jsonc` |
| 真实 KV 读写、线上调用 | 未执行：还没部署 |

## 三轮审核

### 第 1 轮

| 编号 | 级别 | 发现 | 处理 |
| --- | --- | --- | --- |
| 1-1 | 中 | `wrangler.jsonc` 加注释导致既有回归测试失败 | 删掉注释，说明移到 AUTOMATION_API.md |
| 1-2 | **阻断（部署）** | dry-run 打包的是整个工作区，会把其他会话未提交的 companion 改动一起发布 | 未处理：要等那批改动提交或撤回后才能部署，由用户决定 |
| 1-3 | 高（已规避） | 线上 `kvforapi` 只在 Dashboard 上绑定，从源码部署会被删掉 | 已写进 `wrangler.jsonc`，dry-run 已确认 |

### 第 2 轮（需求偏移）

- 同一小时只读 KV，跨小时才计算，符合「每小时只刷新一次，短时间内从 KV 返回」。
- 内核原样复制并由测试校验哈希，符合「采用同样的内核」。
- 部署在 subscriptions-api，沿用它的 Access 和格式，符合用户补充的要求。
- 页面已删掉 B/C 和切换按钮，没有超出范围。本轮无新问题。

### 第 3 轮（最简）

- `sin-die.js` 共 19 行，一个键、一次读、最多一次写；不加 TTL、锁或强制刷新。单人使用，并发写只会让同一小时多算一次，可以接受。
- CSS 里 `--candles`、`--grain` 只剩一个取值，保留为变量的代价很小，不再改。
- 本轮无新问题，审核停止。

## 结论

有条件通过：代码和测试已就绪。部署 subscriptions-api 前必须先处理 1-2（其他会话的未提交改动）。

## 改动与清理

- 只改了上面列出的文件，没有写 KV，没有部署，也没有改主站。
- 静态预览服务（127.0.0.1:8798）仍在运行。没有临时文件。

## 补记：入口图标定稿（2026-11-21 JST）

- 用户先选「C 烛与骰」，并指出旧骰子动画不合物理（尖角立地、转 240° 后歪着停）。重做为：骰子平放在一个面上；起跳前压扁蓄力；上升减速、下落加速；空中匀速转满 360°，平落；落地压扁、小弹、绕底角轻晃、扬尘；烛火被风吹偏。预览经用户「定稿」。
- 实现：`public/tools/index.js` 新增 `sindie` 入口（`href: 'tools/sindie/'`，分组 games），静态图标写在入口里；动画单独放在 `public/tools/sindie/icon.css`，由菜单页 `index.html` 引入。
- 实测（静态预览 127.0.0.1:8798）：菜单出现「告解骰」，悬停后 `.sindie-icon-air` 等六层都套上了对应动画。链接解析为 `/minitools/tools/sindie/`，返回链接 `../../` 回到菜单。`node --test` 13/13 通过。
- 主站代理把 `/minitools/*` 原样转给 minitools Worker，CSP 允许本页使用的内联样式和 data: 图片，因此主站代码无需修改。主站外壳下的实际效果还未实测，要等部署后看你的截图确认。
- 三轮检查：
  - 第 1 轮：浏览器缓存了旧的 `tools/index.js`，是测试环境问题，强制刷新后正常。`test/tarot.test.js` 写死了小游戏列表 `['dice','magiccard']`，加入口后失败（12/13），这是预期内的变化，已把 `sindie` 加进列表，复测 13/13。
  - 第 2、3 轮：无需求偏移，也没有可删减的内容。

## 补记：Git 提交（2026-11-21 JST）

- 用户指示「先提交代码到git」。
- minitools：提交 `5502b69`（告解骰页面、内核、图标、文档、测试）。
- informationManage：本地 `main` 落后 `origin/main` 19 个提交。逐文件比对发现，本地未提交的 companion 改动是 11-20 19:49 JST 的旧集成副本：
  - 大部分文件在远端历史里有完全相同的版本。
  - 其余几个是远端已经更新过的旧版本。
  - 远端没有的随手记附图已提交在源项目 `WebCharacter/personal-digital-companion` 的 `2fa1b29`。
  - 原样提交会把远端功能退回去，所以没有提交，改为保存在 `git stash`（`stale companion integration snapshot …`），可以随时恢复。
- 之后快进到 `09c1caf`，恢复告解骰 API 改动，没有冲突。
- 内核哈希测试因为 Windows 检出时换成了 CRLF 而失败，改为统一成 LF 后再比对，复测 39/39 通过。dry-run 绑定与线上一致。
- 提交为 `18551a7`，本地领先远端 1 个提交。两个仓库都还没有推送。
