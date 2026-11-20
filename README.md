# 饰品铺子

代码独立于主站仓库的工具集：一个 Worker（`worker.js`）加静态页（`public/`）。

线上入口是主站的 `/minitools/`：主站通过服务绑定 `MINITOOLS` 代理本 Worker，用 `shell()` 套上通用页头、主题和公用动画，并做登录校验。本 Worker 关闭了 `workers.dev`，不能直接访问。

`npm run dev` 只跑本 Worker，没有主站页头和主题，看完整效果要经主站。

```bash
npm run dev
```

```bash
npm test
```

## 新增工具

1. 在 `public/tools/index.js` 的 `TOOLS` 加一项；要新分类就在 `GROUPS` 加一项。页面里会自动出现对应入口；工具不上页头菜单。
2. 新建 `public/tools/<id>.js`，导出 `mount(el)`，可返回卸载函数。
3. 新建 `public/tools/<id>.css`，放这个工具自己的样式，内容宽度也在这里定。

工具页面的代码和样式都在打开时才加载。需要后端的工具，在 `worker.js` 加 `/api/<id>` 路由，页面里用相对路径 `api/<id>` 请求。

页头、主题令牌和公用动画不要写在本项目，统一用主站的，规范见主站 `docs/design/ui-redesign/MOTION_STANDARD.md`。

## 掷骰台

掷骰台是「小游戏」的第一个入口。掷骰台路径为 `/minitools/#/dice`。入口骰子图标在悬停或键盘聚焦时转一圈。

骰台内侧的固定按钮和总点数并排显示，外观随 2D／3D 模式切换。标题右侧的「设置」显示当前范围，展开可调整 3–30 的整数区间并切换模式。投掷后可展开设置右侧的「点数明细」查看每颗骰子的面值及加总。

源码来自 [SampleProjects/randomCheck](https://github.com/cj2cf99/SampleProjects/tree/4284e62b6a44211771452f1dd3050cdf59e3918b/randomCheck)。项目已包含浏览器使用的 D4、D6、D8 网格。修改网格时可运行 `blender -b --factory-startup --python-exit-code 1 -P scripts/build_dice.py` 重新生成。

在项目根目录运行 `npm.cmd run dev -- --local` 可隔离启动 Worker，再打开 `http://localhost:8799/#/dice`。掷骰台无需初始化数据。

## 月下秘仪

在「小游戏」中点掷骰台旁边的双牌图标，进入全屏占卜屋 `/minitools/tools/magiccard/`。菜单沿用主站外壳，游戏独占页面，左上角的「← 饰品铺子」返回菜单。旧书签 `/minitools/#/magiccard` 自动转到新地址。进入后才加载占卜屋，翻牌时才加载对应表演。78 张牌及正逆位释义来自本机 `SampleProjects` 提交 `078164c144ae86545efdbd912416abb442a113b8` 的 `magiccard/`。制作脚本和原画保存在该提交的 `magiccard/tools/`。

在 `G:/selftool/minitools` 用两个终端运行以下命令。第一条启动隔离 Worker，第二条从 `G:/cloudflare/myapp` 加载实际主站外壳与代理。预览只绑定回环地址，使用本地鉴权替身，无需初始化业务数据。

```powershell
node node_modules/wrangler/bin/wrangler.js dev --local --ip 127.0.0.1 --port 8811 --persist-to .wrangler/tarot-acceptance/state --show-interactive-dev-session=false --var AI_BASE_URL:http://127.0.0.1:18786/v1 --var AI_MODEL:tarot-local
```

```powershell
node scripts/preview-tarot.mjs
```

打开[饰品铺子菜单](http://127.0.0.1:8812/minitools/)或[全屏占卜屋](http://127.0.0.1:8812/minitools/tools/magiccard/)。本机预览使用来源项目的 llama.cpp，可用其 `start.ps1` 启动。第一阶段正式页面请求主站同源 `POST /api/tarot/reading`。主站负责 Access、牌阵校验和塔罗提示词，通过本地精灵的共享 Workers AI 客户端生成回答。模型暂时不可用时可以回看单牌并在原牌阵重试。接口来源为 SampleProjects 提交 `f00114f`。

## 告解骰

在「小游戏」中点烛台与骰子的图标，进入全屏页 `/minitools/tools/sindie/`。一颗 D14 七罪骰（七大罪各两面），点「掷」时先由内核定出结果，抛掷、弹跳、翻滚、晃动都收束到这个结果面，落定后才揭示拉丁罪名。连续三次不会相同：若会三连，则从其余 6 面重抽。页面只在内存里记最近两次结果。

- 内核 `public/tools/sindie/core.js` 原样复制到 subscriptions-api（`G:/selftool/informationManage/api-worker/src/sin-die-core.js`），供 `GET /api/v1/sin-die` 每个东京整点出一次结果，缓存在 KV `kvforapi` 的 `sindie:hour:v1`。
- 需求与设计：`docs/sindie/`；审核：`docs/reviews/SINDIE_*`。
- 本页纯静态，可用 `.claude/launch.json` 的 `static` 配置预览（`python -m http.server 8798 --bind 127.0.0.1 --directory public`），不连任何线上数据。

正式本地验收使用隔离的游戏 Worker、主站菜单外壳和小时 API Worker。工作目录、初始化、三个终端的启动命令和验收步骤见[告解骰本地验收](docs/sindie/LOCAL_ACCEPTANCE.md)。
