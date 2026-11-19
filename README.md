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

打开[饰品铺子菜单](http://127.0.0.1:8812/minitools/)或[全屏占卜屋](http://127.0.0.1:8812/minitools/tools/magiccard/)。本机模型沿用来源项目的 llama.cpp 配置，可用其 `start.ps1` 启动。生产 Worker 需要独立配置可达的兼容模型地址 `AI_BASE_URL` 和模型名 `AI_MODEL`，服务需要鉴权时使用 Secret `AI_API_KEY`。模型暂时不可用时可以回看单牌并在原牌阵重试。
