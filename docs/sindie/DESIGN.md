# 告解骰 · 设计

依据：[REQUIREMENTS.md](REQUIREMENTS.md)、`G:/selftool/resourceforlater/docs/FRAMEWORK_PREFERENCES.md`、掷骰台 `public/tools/dice/motion.js`（先定结果再演动画的做法）、月下秘仪（全屏游戏页的接入方式）。

## 目录

| 文件 | 作用 |
| --- | --- |
| `public/tools/sindie/core.js` | 内核：七面数据和 `nextFace(history)`，无依赖，页面与 API 共用 |
| `public/tools/sindie/index.html` · `sindie.css` | 全屏页面与氛围层（纯 CSS：穹顶、光柱、烛火、石纹、铭文环） |
| `public/tools/sindie/motion.js` | D14 几何、结果姿态、抛掷时间线（纯计算，Node 可测） |
| `public/tools/sindie/game.js` | 画布渲染（镜头仰角 62°）、尘埃震屏、浮尘、揭示。氛围已定为 A 烛光祭坛（2026-11-21 用户选定），B/C 与切换按钮已删除 |
| `informationManage/api-worker/src/sin-die.js` | 内核副本（文件头记来源与 SHA-256）+ 路由处理 |

## 内核

```js
nextFace(history) // history 为最近结果（0–6），只看最后两项
```

1. 取 0–6 等概率整数（拒绝采样，无取模偏差）。
2. 最后两项相同且等于本次结果时，从其余 6 面等概率重抽。

## 骰子与动画

- 七边形偏方面体：上下顶点 + 两圈各 7 个交错顶点，14 个共面风筝形面；面 k 与面 k+7 为同一罪。
- 画布自绘：凸体只画朝向镜头的面，兰伯特光照 + 金边；骰面刻罗马数字。
- 结果先定：选一个结果面（同一罪的两面任选），求出「该面朝上、数字朝前、随机偏航 ±15°」的最终姿态 q_final。
- 动画姿态 q(t) = 晃动(t) · 滚动(θ₁(t)) · 翻转(θ₂(t)) · q_final，三项在结束时都归零，所以必然停在结果面。每帧按最低顶点贴桌面，翻滚时自然以棱着地。
- 时间线约 2.6 秒：抽回手边 → 从下方一侧抛入 → 4 次衰减弹跳（首落震屏、每落扬尘）→ 滚动减速 → 棱上晃动 → 落定 → 光柱加亮、光环扩散 → 牌匾逐字刻出拉丁罪名。

## API

`GET /api/v1/sin-die`（subscriptions-api，现有 Access 鉴权与 `{ data, request_id }` 格式）

```json
{ "data": { "hour": "2026-11-21T15:00+09:00", "face": { "n": 1, "numeral": "I", "latin": "SVPERBIA", "zh": "傲慢" }, "next_at": "2026-11-21T16:00+09:00" }, "request_id": "…" }
```

KV `kvforapi` 键 `sindie:hour:v1`，值 `{ hour, history: [前一小时, 本小时] }`。读到的 `hour` 等于当前东京整点就直接返回；否则 `nextFace(history)`，写回后返回。单人使用，不处理并发写。

错误：KV 未绑定返回 `503 storage_unavailable`；其他沿用该 Worker 的错误格式。

## 主站接入计划

- minitools `public/tools/index.js` 的 `TOOLS` 增加 `sindie`（`href: 'tools/sindie/'`，分组 `games`），入口图标另给候选预览。
- API Worker `wrangler.jsonc` 补上 `kvforapi` 绑定（线上已有，源码缺失，不补会在部署时被移除）。
- 主站 KV 文档登记 `sindie:hour:v1`；接入前确认花园登记。

## 最简检查

- 不用 three.js 或其他库：凸体只需按法线剔除，不排序。
- 页面不碰服务器存储；API 只有一个键、一个路由。
