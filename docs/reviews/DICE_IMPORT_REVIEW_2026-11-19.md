# 掷骰台迁入复核

2026-11-19（JST） · 待用户确认

## 用户需求与对照依据

> [https://github.com/cj2cf99/SampleProjects下](https://github.com/cj2cf99/SampleProjects下)`randomCheck` 中的摇骰子项目接过来
>
> 重新检测，从github上获取

- 来源是 GitHub `cj2cf99/SampleProjects` 的 `main`，固定到 `4284e62b6a44211771452f1dd3050cdf59e3918b`。通过 GitHub API 取得五个源码文件、Blender 脚本及最后一份原型复核，逐份校验 Git blob。原版以 3–30 闭区间均匀抽取总点数，用最多四颗 D4、D6、D8 骰呈现，支持 2D 卡通骰和 3D 镜面骰。原型复核记录的观感确认状态为待用户确认。[来源原型复核](https://github.com/cj2cf99/SampleProjects/blob/4284e62b6a44211771452f1dd3050cdf59e3918b/randomCheck/docs/reviews/PROTOTYPE_REVIEW_2026-11-19_10.md)
- 目标基线为饰品铺子 `c1bbbb61d3d22327e167fb90eb04ef8a8a914cd6`，比较范围为本地工作区改动。按 `README.md` 和项目备忘录 `C:/Users/asura/.claude/projects/G--selftool-minitools/memory/standalone-page-uses-main-shell.md` 复用宿主页头，工具由铺子内的「随机工具」分组进入。工具名沿用来源的「掷骰台」，新增分组和入口图标为此次接入选择。
- 参考全局 `C:/Users/asura/.codex/AGENTS.md`、`C:/Users/asura/.claude/CLAUDE.md` 和 `G:/selftool/resourceforlater/docs/FRAMEWORK_PREFERENCES.md`，沿用原生模块、紧凑控件、按需加载和独立子项目开发。参考主站 `G:/cloudflare/myapp/docs/design/development.md` 的入口实测反例与 `docs/design/ui-redesign/MOTION_STANDARD.md`，在隔离 Chrome 中走真实页头生成代码和点击路径。来源目录的文档索引列有九份原型复核，未找到单独的开发设计备忘录。

## 变更范围

- `public/tools/index.js` 增加入口。`public/tools/dice.js` 以 `mount` 接入，复用原版随机算法，并在离开时取消动画帧。`public/tools/dice.css` 将原版骰台样式限定在工具内，表单和结果区域跟随主站主题。
- `public/tools/dice/{motion,dice-meshes}.js` 转为 ES 模块。离开时断开画布尺寸观察器。源码比较确认动画计算和网格数值与固定的远端版本一致。`scripts/build_dice.py` 保留网格生成方法，输出改为 ES 模块。
- `public/app.js` 为同一工具共用样式加载 Promise，等资源就绪后只挂载当前仍在页面内的容器。`README.md` 记录源码、入口和隔离启动方式。无依赖、API、存储、数据库、Worker 配置或主站仓库改动。

## 复核与检测

1. 第一轮发现慢速导入时快速退出并重进会挂载两次，留下第一套尺寸观察器。以延迟 `dice.js` 的浏览器用例复现，修改现有路由以确认目标容器仍在页面上。随机抽样及网格源文件对照一致。
2. 第二轮确认快速切换用例通过。发现赛博主题会将 2D 骰台的紫色背景及深色点数文字自动替换，而 Canvas 仍保持原色。调整局部样式变量，保留 2D 和 3D 骰台各自的配色，由主站主题处理外围控件。
3. 第三轮确认两项回归通过。入口和掷骰逻辑符合用户需求和来源原型，复用已有工具路由，无额外框架或状态存储。

- `npm.cmd test` 通过 4 项。`node --check` 检查五个改动或新增的 JavaScript 文件，Python `ast.parse` 检查生成器，`git diff --check` 通过。
- 临时 Node 脚本枚举 406 个区间内 8,120 组目标点数与两种落定方向，校验骰子数量、有效面值及加总。远端源码与迁入算法、动画及网格的对照通过。
- 使用 Chrome 和 Playwright 在 1440、390、320 像素下测试。用主站实际路由、外壳和样式配本地静态资源，验证资源按需加载、直接打开路径、无效输入、单骰边界、3D 四骰投掷、模式切换不重抽、快速切换、动画退出清理、双主题配色、窄屏布局和汇率工具回归。鉴权和汇率采用测试替身。
- `npm.cmd exec --offline -- wrangler deploy --dry-run` 通过。隔离本地 Worker 可用 `npm.cmd run dev -- --local` 启动，无初始化数据，待启动指令。线上部署未执行。线上效果、实体手机与跨浏览器均待验证。
- Blender 进程在当前环境以 `0xC0000022` 退出，网格再生成未验证。已使用经 Git blob 校验的远端网格，浏览器实测可渲染。
