# 发布审核记录

## 2026-11-08 JST 饰品铺子首次发布

状态：用户 2026-11-08 确认并要求部署；未经第三方审核。

### 用户需求与验收

- 独立于主站仓库的单页"饰品铺子"，有入口和页头，风格、动画与线上主站一致。
- 首个工具为日、美、中三币种汇率速算：输入任一有效数字即时换算另外两个，不循环更新；日元无小数，美元和人民币 2 位。
- 汇率使用个股监察的数据库版本。
- 工具不上页头菜单，只从页内入口进入；入口文字隐藏时保留一个字。
- 发簪是本功能页图标：透明底、线性，风格与其他图标统一。

### 项目、环境、比较范围

- 项目：`G:\selftool\minitools`，仓库 `cj2cf99/minitools`。
- 发布目标：新 Worker `minitools`，地址 `https://minitools.cj2cf99.workers.dev/`，账号与主站相同。
- 比较：`203a307` 至本次提交。线上目前不存在这个 Worker，属首次部署。

### 变更与前后行为

- `worker.js`：`GET /api/fx` 只读主站 D1 的 `current_market_indicators`（`fx_jpy`、`fx_cny`），其余路径由静态资源提供。
- `public/`：页头、主题和公用动画对齐主站，规范见主站 `docs/design/ui-redesign/MOTION_STANDARD.md`。
- `public/tools/`：工具注册表和汇率速算。
- 前：线上无此页面。后：可访问上述地址。

### 数据库、配置与兼容

- 绑定主站 D1 `stockanalysis`，代码里只有一条固定 SELECT，无迁移、无写入。这个绑定本身具备写权限。
- 无 Secret、无 cron。

### 实际执行的检测

- `npm test`：4/4 通过。
- `wrangler deploy --dry-run`：通过，绑定为 `DB`、`ASSETS`。
- 浏览器（本地 `wrangler dev`，D1 走线上只读）：换算、千分位、非法输入、接口失败沿用旧汇率、入口展开与呼吸、ink/cyber 主题、375 与 768 宽度无横向溢出。

### 未完成的验证与已知问题

- 汇率只在有人打开个股监察时才更新，非严格实时，页面显示数据时间。
- 预览面板隐藏时未看到主题切换圆形扩散的收尾和输入框聚焦光圈。
- 线上效果需发布后验证。

### 风险与恢复

- 公开访问：`workers.dev` 地址不在主站 Access 保护内，任何人可看到页面和两个汇率。未把数据库其他内容暴露给接口。要限制访问需在 Access 控制台添加该域名。
- 公开仓库含账号 ID、D1 名称和 ID、主站地址，均非凭据，用户已确认原样推送。
- 恢复：删除 Worker 或回滚版本，不影响主站数据；主站入口届时需同步撤下。

### 部署步骤与发布后验证

1. 先于主站部署：`npx wrangler deploy`。
2. 匿名访问页面和 `/api/fx`，核对返回两个汇率且与 D1 一致。
3. 部署后补记实际版本、时间、结果和 Git 状态。

### 重点审核问题

- `/api/fx` 是否只暴露两个汇率字段。
- 公开访问是否可接受。

### 实际发布结果

- Worker 版本 `e629cdef-e23e-4ed2-9762-b470a350030c`，JST 2026-11-08 18:3x，先于主站部署。
- 匿名访问页面 200，`/tools/fx.js` 200，`/api/fx` 返回两个汇率且与 D1 一致，其他 `/api/*` 404。
- 主站入口版本 `1131570f-5ead-4987-85ec-390d5aeafdb1`。

## 修复候选：接入主站通用页头（2026-11-08 JST，未部署）

状态：待用户确认；未经第三方审核。

- 用户反馈页面没有合并主站通用页头，还吞了菜单。上一版只抄样式、跳转到独立域名，是错误做法。
- 现在只经主站 `/minitools/` 服务绑定访问：`workers_dev` 改 false；删除自带页头、主题和公用动画（`public/shell.css` 换成 `public/page.css`）；`api/fx` 改相对路径；工具页增加返回入口。
- 上一版记录的公开访问风险随之消除：访问需通过主站 Access。部署后原 `minitools.cj2cf99.workers.dev` 地址失效。
- 检测：`npm test` 4/4；经主站合成环境验证页头、换算和窄屏。真实绑定上线后验证。

### 修复实际发布结果

- Worker 版本 `7df1c259-4cbb-4acb-b850-02dd5af79ae8`，UTC 2026-11-08T09:50:34Z，100% 流量，已关闭 workers.dev，原公开地址返回 404。
- 主站 Worker `ea256170-cf4a-46db-aa45-02c83370da53` 经服务绑定访问，匿名请求被 Access 拦到登录页。
- 花园已登记（主站记录 `minitools-release-garden-20261108`）。Access 登录后的效果待用户确认。

## 2026-11-19 JST 掷骰台发布候选

2026-11-20 JST 用户确认本地验收通过。原三轮自测及最终两轮发布前自审均通过。用户完成 Wrangler 授权，并回复「ok，开始」确认下列花园清单及本次生产 minitools 部署。生产发布和花园登记均已完成。第三方独立审核未执行。[复核和用户原话](docs/reviews/DICE_ENTRY_REVIEW_2026-11-19.md)

### 用户需求与验收标准

- 从 GitHub `SampleProjects/randomCheck` 迁入。按用户 2026-11-20 JST 的指示，饰品铺子首页依次显示「实用工具 → 汇率速算」和「小游戏 → 掷骰台」。沿用汇率速算入口规格、宿主页头、返回方式、主题及按需加载。
- 使用简化的旋转骰子图标，沿用饰品铺子的单色线描。验证鼠标悬停、键盘聚焦、触屏导航、双主题和窄屏。
- 默认以骰台为主体，固定尺寸的投掷按钮和总点数在骰台内侧，外观随 2D／3D 模式切换。标题使用同款骰子图标，右侧依次放置显示区间的「设置」和投掷后出现的「点数明细」，两者均可折叠。
- 支持 3–30 的整数闭区间、D4/D6/D8 骰面和 2D／3D 视觉模式。核对点数加总、模式切换、无效输入及汇率工具回归。完成三轮自测后准备部署。

### 项目、环境与比较范围

- 来源为 `cj2cf99/SampleProjects` 的 `main` 提交 `4284e62b6a44211771452f1dd3050cdf59e3918b` 下的 `randomCheck/`。GitHub API 下载内容逐项对照 Git blob SHA。[固定来源](https://github.com/cj2cf99/SampleProjects/tree/4284e62b6a44211771452f1dd3050cdf59e3918b/randomCheck)
- 待发布根目录为 `G:/selftool/minitools`。目标是 Cloudflare 生产 Worker `minitools`，通过主站既有 `MINITOOLS` 服务绑定和 `/minitools/#/dice` 提供入口。主站仓库、导航和 Worker 部署范围为无。
- 目标 Git 基线为本地和 GitHub `main` 同一提交 `c1bbbb61d3d22327e167fb90eb04ef8a8a914cd6`。用 `git diff HEAD` 比较已跟踪文件，用 `git ls-files --others --exclude-standard` 列出新增文件并逐项审阅。部署前复核最终差异和生产版本来源。

### 逐项变更和前后行为

| 文件 | 发布前行为 | 发布后行为 |
| --- | --- | --- |
| `public/tools/index.js` | 首页只有「换算计算 → 汇率速算」 | 汇率速算归入「实用工具」，新增「小游戏 → 掷骰台」及旋转骰子的线描静态图形 |
| `public/index.html`、`public/tools/dice/icon.css` | 现有入口通用动效 | 新骰子在入口互动时短转一次，静态图形和动效分别维护 |
| `public/app.js` | 慢速加载时快速离开再进入同一路径可重复挂载 | 复用样式加载，只有当前容器可以挂载。允许工具在现有标题区放置设置，掷骰台沿用标准标题底板并使用同款骰子图标 |
| `public/tools/dice.js`、`public/tools/dice.css`、`public/tools/dice/{motion,dice-meshes}.js` | 无骰台 | 按需加载原版抽样、D4/D6/D8 和两种视觉模式。骰台内投掷和点数区采用对应模式的配色，按钮保持固定尺寸。标题右侧依次放置折叠设置和点数明细。返回时释放动画帧及观察器 |
| `scripts/build_dice.py`、`README.md`、`docs/reviews/`、`RELEASE_REVIEW.md` | 原 Worker 和首次发布说明 | 增加网格生成器、来源、隔离启动说明及复核记录 |

### 数据、配置和兼容性

- 业务数据库迁移、已有数据回填、SQL 写入、配置、绑定、环境变量、Secret、依赖均无。骰台在浏览器执行，无服务端数据。现有 `DB` 仍供汇率接口只读使用。
- 保留 `workers.dev` 关闭和主站既有 Access 策略。工具和路径沿用现有哈希导航与 Worker 静态资源。网格和动画文件仅在使用掷骰台时加载。
- 业务数据库和配置影响为无。花园发布元数据另按下列具体清单处理，清单确认后准备变更包。发布结果明确后生成并提交精确 SQL，凭独立提交推送且从远端验证可恢复的有效生产备份一次登记并后检。

### 已执行的检测和待验证项

- `npm.cmd test` 通过 4 项。`node --check` 检查路由、工具表、掷骰逻辑、动画和网格模块通过。`git diff --check` 通过。隔离的 Node 校验覆盖 8,120 组点数和落定方向。
- 三轮独立 Chrome 自测通过。覆盖雅致、赛博、1440/1024/390/320 像素、入口排序尺寸、动效回到静态、键盘和触控、懒加载、投掷、模式切换、出入路由及汇率回归。主站路由及外壳取自项目源码，鉴权和 D1 使用测试替身。
- `npm.cmd exec --offline -- wrangler deploy --dry-run` 成功读取 13 个静态资源，完成 Worker 打包。实测运行 `wrangler dev --help` 确认 `--local` 禁用远端绑定。
- 2026-11-20 JST 按用户指令启动隔离本地 Worker。工作目录 `G:/selftool/minitools`，实际运行 `node node_modules/wrangler/bin/wrangler.js dev --port 8799 --ip 127.0.0.1 --local --persist-to .wrangler/dice-acceptance/state --show-interactive-dev-session=false`。初次尝试遇到全局 Wrangler 注册目录的写入权限限制，启动时将注册目录和日志目录设在项目的 `.wrangler/dice-acceptance`。首页和六项前端资源均返回 200，Chrome 使用真实 Worker 验证第二入口、图标旋转、出点、模式切换和返回。掷骰台无需初始化数据。汇率验证沿用三轮自测中的隔离替身。
- 同日，用户指出直连 Worker 缺少标准样式。用本地辅助服务 `node .wrangler/dice-acceptance/shell-preview.mjs` 接真实主站路由和 `shell()`，读取主站原有 `shell.css`、`theme.css` 及客户端脚本，并连接 8799 上的隔离 Worker。带标准样式的验收地址为 `http://127.0.0.1:8800/minitools/#/dice`。页面、标准 CSS 和脚本均返回 200。Chrome 1440 和 390 像素实测统一页头、公共按钮、两套主题切换、掷骰和 2D／3D 切换通过。辅助服务和日志位于 Git 忽略目录，仅使用本地资源。
- 同日，按用户要求修订首页两个分类。Chrome 1440 和 390 像素实际访问标准样式预览，核对「实用工具」「小游戏」的顺序及对应页面入口通过。修订后重跑单测、注册表语法检查、`git diff --check` 和 Wrangler `deploy --dry-run`，均通过。
- 同日，按用户要求收拢骰台界面并替换标题图标。标准样式的本地预览通过 1440、390、320 像素 Chrome 实测，覆盖默认内容、折叠与键盘操作、无效范围恢复、投掷及点数明细、2D／3D、双主题、标题图标与返回重进。修正了触屏下投掷按钮逐字换行。
- 同日，按用户要求将设置移到标题右侧，固定尺寸的投掷按钮和点数移入骰台。Chrome 1440、390、320 像素实测位置、固定宽度、折叠和键盘提交、异常输入恢复、点数、模式、双主题与重进通过。再次运行单测、语法检查、`git diff --check` 和 Wrangler 打包检查。
- 同日，将「点数明细」移到设置右侧，骰台内控件改为跟随 2D／3D 的样式。Chrome 1440、390、320 像素实测位置、折叠互斥、键盘、结果、按钮固定宽度、双主题与返回重进通过。重新执行单测、语法检查、`git diff --check` 与 Wrangler 打包检查。
- 用户确认本地验收后完成两轮发布前自审。第一轮对照 GitHub 固定来源、用户历次要求及发布差异，算法、网格及渲染算法核对通过，8,120 组组合、汇率接口 D1 替身、`npm.cmd test` 4/4、JavaScript 检查、Python 生成器语法和 `git diff --check` 通过。第二轮以标准样式本地 Worker 在 Chrome 1440、390、320 像素覆盖最终交互，复测首屏按需加载、慢速导入下快速退出重进、离开时观察器清理及汇率回归。Wrangler `deploy --dry-run` 打包 13 项静态资源通过。
- 生产元数据预检首次因管理 API 未授权退出。用户在官方 OAuth 页面完成授权，Wrangler 回执成功。先在隔离 myapp 目录运行 `npm.cmd run db:sync-schema`，验证 217 个结构对象。随后重跑 `node node_modules/wrangler/bin/wrangler.js deployments list --name minitools --json`，确认活跃版本 `7df1c259-4cbb-4acb-b850-02dd5af79ae8` 承接 100% 流量，为本次拟回退点。部署前重核。
- 线上效果待用户截图确认。实体手机、跨浏览器及 Blender 再生成未复测。浏览器已验证远端网格可用。实际发布和 Git 结果见下方回执。

### 花园具体登记清单（用户已确认）

用户原话为「登记花园，作为饰品铺子新功能，另外启动授权页面，我给授权」。生产 D1 结构同步通过后，使用 Wrangler `d1 execute --remote --command` 执行两次范围限定的 `SELECT`，均在花园修订 86 核对。线上项目为「饰品铺子」#19，既有页面功能「工具总览」#50 和「汇率速算」#51 各有一次部署，最近登记均为 1.0。无掷骰台功能及对应种子、改善、问题或部署明细。

| 记录 | 当前 | 拟登记 |
| --- | --- | --- |
| 新功能 | 无掷骰台 | 在现有「饰品铺子」#19 新增页面功能「掷骰台」。阶段记录已完成本地测试，线上截图确认前保留待收尾状态 |
| 发布成功时 | 新功能尚无发布，版本 0.0 | 新增一条部署和一条掷骰台明细，版本 `0.0 → 1.0`，按实际 JST 发布时间及 Worker 版本记录「发布成功」。说明记录小游戏入口、3–30 取值区间、D4/D6/D8、2D／3D、折叠设置和点数明细 |
| 发布失败时 | 无本次失败记录 | 新功能保持测试阶段及 0.0，在已部署的「工具总览」#50 新增一条待办改善「发布中 · 掷骰台」，记实际失败原因与时间。现有花园要求改善关联已部署功能，因此由工具总览承载失败说明 |
| 其他 | 现有工具总览和汇率速算均为 1.0 | 既有功能与版本保留。项目、种子、Bug、数据源、关联均无更新，成功分支无改善新增 |

根据真实发布结果执行一个分支，整体只登记一次。发布前已准备登记 SQL 模板 `.wrangler/minitools-dice-garden-20261120/approved-draft.sql`，实际版本、时间和数据库修订在结果明确后定稿。写入前重核项目、版本、修订和重复项，修订或旧值不匹配即停止。实际写入结果见下方回执。

### 风险、恢复和独立审核重点

- 发布影响当前 `minitools` 静态资源。重点核对入口与完整卡面尺寸、CSS 的骰子作用域、哈希切换时资源和观察器回收、原版点数算法、现有汇率路径及绑定。新页面资源加载失败时以实际链路排查产物与服务绑定。
- 若部署后出现故障，按实际部署记录回退至部署前确认的健康 Worker 版本，并核对汇率入口与发布状态。业务数据库恢复或补偿动作无。

### 部署与发布后验证计划

1. 已取得花园登记意愿。取得具体登记内容确认和本次明确部署许可后，准备变更包，复核工作区差异与本记录，重新查询当前生产版本以确认回退点。范围变化时按全局规则重新确认。
2. 从 `G:/selftool/minitools` 执行 `npm.cmd run deploy`。读取 Cloudflare Worker 实际部署版本、时间和流量状态。通过既有 Access 链路的交互由用户自行打开并截图确认，涵盖第二入口、骰台投掷和汇率速算。上线交互状态记为待用户截图确认。
3. 按发布结果补记版本、时间、验证和 Git 同步状态。按授权提交和推送本次差异并验证远端提交，涉及自动部署的推送遵守本次许可范围。若获准登记花园，按实际发布结果执行一次并单独核对回执。

### 实际发布结果（2026-11-20 JST）

- `npm.cmd run deploy -- --keep-vars` 成功，上传 8 个新增或改动的静态资源。生产 Worker `minitools` 版本 `b2c13dae-49a0-42d4-9b98-c641fe4879c8` 于 01:04:50 JST 接管 100% 流量。控制台部署记录 `fe86cb01-39c6-484b-96d3-2c233e44deec`，回退版本 `7df1c259-4cbb-4acb-b850-02dd5af79ae8`。
- 花园已在生产 `stockanalysis` 一次登记成功，修订 `86 → 87`，饰品铺子 #19 新增「掷骰台」#59，部署 #42、明细 #110，功能版本 `0.0 → 1.0`。`quick_check` 为 `ok`，外键异常为零。Wrangler SQL 命令退出码为 0，包装脚本的 JSON 解析遇到表格格式。独立只读后检确认精确行和发布标识，SQL 执行一次。
- 精确 SQL 先提交并推送至 `cloudflaremyapp/main`，提交 `b6b978319c87be18b70915d1c5ddcd84b08337a9`。生产加密备份 `production/20261119T160708Z_minitools-dice-garden-20261120`，提交 `1dbc7bd37093f64a49a1d54ec8d00d4a5e83a11d` 独立推送至 `refs/heads/db-snapshots/production`，全新远端克隆解密恢复 117/117 表通过。写前用新生产导出比对全部 117 表一致。[花园登记回执](https://github.com/cj2cf99/cloudflaremyapp/blob/f0da9cac3ee6b18882962bd9cb1cfe331866a201/myapp/database/changes/minitools-dice-garden-20261120/execution-receipt.json)
- 已发布的代码提交 `cdb2afe0ad63628d65745e2742b0ea95d1821366` 已推送至 `minitools/main`；花园回执提交 `f0da9cac3ee6b18882962bd9cb1cfe331866a201` 已推送至 `cloudflaremyapp/main`，远端核对一致。本段发布回执另提交至 `minitools/main`。
- 线上交互待用户截图确认，验收入口为 [主站掷骰台](https://myapp.cj2cf99.workers.dev/minitools/#/dice)。

## 2026-11-20 JST · 月下秘仪迁入与部署准备

### 需求、基线和范围

用户要求接过 SampleProjects 的 magiccard 塔罗游戏，确认使用本机交接提交，并要求放在掷骰台旁边、使用两张简化塔罗牌图标、加入主站基础页面与样式。验收顺序为两轮带合规检查的自测，再提供本地服务。原始游戏需求、详细设计和动作复核均在来源仓库的 magiccard/{REQUIREMENTS.md,docs/DESIGN.md,docs/reviews/}。

- 来源仓库 G:/samplePj，提交 078164c144ae86545efdbd912416abb442a113b8。核对时 GitHub main 为 4284e62b6a44211771452f1dd3050cdf59e3918b，仅含 randomCheck。已取得用户对本机来源的明确确认。
- 本项目 G:/selftool/minitools，目标 Cloudflare 生产 Worker minitools，基线 03a28bc9942cd63198131dcde0c73d6b63a97b45。主站 G:/cloudflare/myapp，目标 Worker myapp，基线 fd9678c22e1886d3f8e6e00e666f6e774b97dd29。分别用 git diff 对照基线，用 git ls-files --others --exclude-standard 补查新增文件。主站也已追加根目录审核记录。
- 对照全局框架偏好 G:/selftool/resourceforlater/docs/FRAMEWORK_PREFERENCES.md、项目备忘录 C:/Users/asura/.claude/projects/G--selftool-minitools/memory/standalone-page-uses-main-shell.md、主站 docs/design/development.md 和 docs/design/ui-redesign/MOTION_STANDARD.md。沿用现有分组和真实外壳，工具、场景及牌面分阶段加载。来源设计注明未找到单独项目备忘录。游戏场景用同源 iframe 保留原作视口构图和独立样式，外层为真实主站主题、页头、工具标题和返回入口。

### 实现和实际差异

| 范围 | 之前 | 此次变更 |
| --- | --- | --- |
| public/tools/index.js、magiccard.js、magiccard.css | 小游戏只有掷骰台 | 下一个入口为月下秘仪，双牌图标，路由 /minitools/#/magiccard；退出时释放场景 |
| public/tools/magiccard/ | 无占卜屋 | 原版完整 78 张、三款牌背、房间互动、抽三翻三、牌义和表演。225 个素材共 41,495,777 字节逐文件与来源比对一致。原样保留场景 CSS 和星空脚本。牌库改为前后端共用的模块，游戏读取相对路径 API，控件待事件绑定后开放 |
| worker.js、tarot-reading.js、test/tarot.test.js | 仅汇率 API | 新增 POST /api/reading，沿用原牌义、主题、提示词、输出校验、格式回退、超时和原牌阵重试。服务端校验来源、2 KiB 请求上限、三个不同有效牌位。只发送选题与相应本地牌义 |
| scripts/preview-tarot.mjs、README.md | 直连子 Worker 缺少公共页头与样式 | 可复现的本机回环预览调用主站实际 shell()、代理、导航 JS 及公共 CSS；本地验收使用隔离鉴权替身 |
| 主站 src/features/minitools/routes.mjs、tests/minitools-host.test.mjs | 代理仅允许读请求 | 经过原鉴权后仅允许解读路径同源 POST，选择性转发来源、JSON 类型、正文；媒体请求可转发 Range。其它路径的方法约束延续 |

### 两轮自测与合规检查

1. 桌面 1440×900／雅致主题。在隔离 Chrome 通过实际主站外壳进入游戏，验证入口相邻、首页未拉取场景、换牌背、点击屋内物件、敲铃、选题、从牌扇露出区域抽三张、逐张翻牌与按需请求 MP4、查看本地释义。初测发现 workerd 拒绝 redirect:error，改用 manual 并通过状态码拒绝上游跳转。为避免初始化时提前交互，绑定完成后再解除 inert。修正后真实 llama.cpp 回答、重新开局、返回释放场景及掷骰入口通过。检查对照原玩法、独立子项目边界、请求校验、密钥仅服务端使用和无牌局历史。
2. 手机 390×844／赛博主题及系统减少动态偏好。实际切换主站主题、触屏更换牌背，完成选题、抽牌、翻牌。拦截第一次解读模拟 503，核对三张已翻牌保留，点击重试经实际 Worker 与本机模型返回 200，正文可读，重开与返回通过。两轮外层和内层文档横向溢出均为 0，无页面脚本异常。检查主站基础页、双牌图标、按需加载、兼容性、隔离数据及 Access 验收范围。浏览器脚本在 .wrangler/tarot-acceptance 下运行。
- npm.cmd test 通过 7/7（含全 78 张资产、接口拒绝和模型格式降级）。node node_modules/wrangler/bin/wrangler.js deploy --dry-run --outdir .wrangler/tarot-acceptance/build 通过，254 项静态文件。主站 npm.cmd test 通过 835/835；npm.cmd run check 打包通过。两个项目的 git diff --check 已检查。
- 通过脚本逐项比对 225 个素材与固定来源工作树字节，并比对 styles.css、salon.css、sky.js。浏览器请求实测本地 MP4 可取；开发静态服务对测试的 Range 返回 200 全文件，生产 CDN 的 206 行为未实测。
- 本地启动命令及初始化见本仓库 README.md「月下秘仪」，工作目录 G:/selftool/minitools。当前隔离 Worker 端口 8811，主站外壳预览 http://127.0.0.1:8812/minitools/#/magiccard。本地模型服务为 127.0.0.1:18786。无业务数据库初始化。本地验收由用户进行，尚未确认。

### 配置、数据、登记与发布

- 业务数据库迁移、回填、持久化和依赖新增均无。线上 minitools 必须配置可由 Worker 访问的兼容模型服务 AI_BASE_URL 与 AI_MODEL，按需设置 AI_API_KEY Secret。本机回环地址仅供本地验收。生产模型提供方、模型配置与连通性待确认。
- 花园已确认意愿及具体清单。生产只读结构同步通过，修订 88，饰品铺子 #19 的工具总览 #50、汇率速算 #51、掷骰台 #59 各为 1.0。两 Worker 成功后新增页面功能「月下秘仪」，合计一条部署及一条明细，0.0 → 1.0，记录两个真实版本。种子和功能改善无新增。发布失败仅记「发布中」和实际情况。主站 database/changes/minitools-magiccard-20261120/ 保存清单和成功 SQL 模板，已在同步结构的内存库用合成数据演练，验证外键和重复执行拒绝。生产花园未写入。
- 计划先核对两仓最终差异、生产版本与待配置的模型，再取得本次具体部署许可。先后发布主站接线和 minitools 游戏，以免给用户呈现无解读代理的入口。两处均使用各仓已验证配置并保留其它生产变量。分别读取实际接管流量的版本与时间。业务数据库部署步骤无。
- 发布结果明确后，重新核对花园旧值和有效生产备份，备份须已独立提交推送并验证远端恢复。根据真实结果生成精确 SQL，先提交再一次登记并后检。补记两个实际版本、时间、截图验收状态及两仓 Git 提交、推送和远端一致性。
- 风险集中在主站的方法限制、模型服务可达性和游戏大资源。审核重点为 Post 路径和来源、跨工具隔离、双主题、模型失败保留牌阵。若发布中途失败，报告实际到达版本，按当时核对的健康版本逆序回退已发布 Worker，单独核对花园状态。无业务数据恢复动作。
- 两轮自测完成。生产部署许可、第三方审核、生产模型验收和实体手机验证均待完成。Access 受控线上交互待用户截图确认。生产部署、Git 提交及推送均未执行。

### 入口图标动效补正（2026-11-20 JST）

用户指出双牌图标缺少动画。public/tools/index.js 给前后两张牌分别标记，public/index.html 在首页载入独立的 public/tools/magiccard/icon.css。悬停、键盘聚焦或按下入口时，两张牌先靠拢，再反向展开并回到原位，一轮 760 毫秒。静态图形和游戏场景继续复用原资源。

在带主站外壳的本地首页用独立 Chrome 核对了静止状态、悬停时两牌中段实际反向旋转、结束复位、Tab 聚焦重新触发和 Enter 进入游戏；首页仅加载图标样式，未请求游戏脚本或素材。npm.cmd test 通过 7/7，子项目 Wrangler dry-run 读取 255 个静态文件并通过。此补正仅涉及子项目入口展示，生产发布待确认。

### 用户修订 · 占卜屋独立全屏页面（2026-11-20 JST）

用户要求“塔罗牌游戏走全屏页面，不使用标准页面，不加表头，但是主页需要一个返回按钮，返回目标是饰品铺子菜单”。本条取代本次记录前文关于在标准工具页内嵌占卜屋的设计。饰品铺子菜单继续使用主站基础页，游戏以浏览器可视区域为画布。

- public/tools/index.js 和 public/app.js 让菜单双牌链接直接进入 /minitools/tools/magiccard/。旧 /minitools/#/magiccard 书签兼容跳转。新页面和菜单支持同源页面过渡；删除原先用于创建 iframe 与限定高度的 magiccard.js、magiccard.css。
- public/tools/magiccard/index.html、styles.css、salon.css 移除原游戏品牌表头，返回、重来、换牌背作为场景内控件显示。左上角「← 饰品铺子」直接回到菜单，允许从直接访问和进行中的牌局退出。public/tools/magiccard/icon.css 更新样式选择器，使双牌图标动效适配新链接。README.md 更新入口和预览说明。
- 本地入口为 http://127.0.0.1:8812/minitools/tools/magiccard/ ，返回 http://127.0.0.1:8812/minitools/ 。主站既有代理只给菜单首页注入公共外壳，主站代码、鉴权、模型及数据库配置此次修订均无额外变化。花园仍是先前确认的同一项游戏功能。
- 验证结果：桌面 1440×900、手机 390×844 经本地 Worker 及主站代理完成菜单进入、首页返回、旧书签跳转、刷新、抽牌翻牌、真实模型解读和回到菜单后打开骰台。手机还覆盖 503 后原牌阵重试。修正导航过渡初始声明后手机复验通过。320×640 验证首页和抽牌阶段左右控件可点且不重叠。两轮页面均无横向溢出。npm.cmd test 7/7，Wrangler dry-run 读取 253 个静态文件通过，git diff --check 通过。界面已在本地打开，生产部署待用户确认。

### 生产部署授权与最终范围（2026-11-20 JST）

用户已指示开始部署，并在核对生产 minitools 只有 ASSETS 和 DB 后明确选择「先上线抽牌和本地牌义，接受整局 AI 解读暂不可用」。本次按这个范围发布主站 myapp 的路由接线与 minitools 的全屏游戏。生产环境不配置模型、不产生模型调用费用；合法牌阵请求在缺少模型配置时返回 503，牌阵保留，可继续查看本地牌义。用户保留后续启用模型的决定权。生产上线前基线为 myapp abddfa15-676d-478b-9423-fd0f4c6e8d7e 和 minitools b2c13dae-49a0-42d4-9b98-c641fe4879c8，均为 100% 流量。两仓远端 HEAD 与审核基线一致；复核结构同步通过，花园修订 88，塔罗功能及重复登记均为 0。花园登记沿用已确认的记录清单，备注须写明此次 AI 能力状态。线上交互待用户截图确认。

### 实际发布（2026-11-20 JST）

- myapp 02:48:55 发布，版本 bde3e92f-5770-4547-811e-46887d4e90f0，部署 2bafa998-7fb8-4aad-ade4-d2afd388b7b3。minitools 02:49:18 发布，版本 090faa16-d674-4650-8c17-52bce7ed2526，部署 543511be-93f5-4f0f-a6a8-70487f57ae04。两次均保留生产变量；控制面独立复查，各新版本承接 100% 流量。
- 正式入口 https://myapp.cj2cf99.workers.dev/minitools/ ，塔罗页面 https://myapp.cj2cf99.workers.dev/minitools/tools/magiccard/ 。按本次决定优先提供抽牌及本地牌义，整局 AI 解读暂不可用。线上界面及交互待用户截图确认。花园和 Git 回执于下方补记。

花园于 02:55:47 JST 登记成功，修订 88 → 89，项目 #19 新增「月下秘仪」#60、部署 #44、明细 #112，版本 0.0 → 1.0。生产加密快照 752009fcf926c1200863986cb4ccb30c3ed4d7c7 已独立推送并经远端克隆验证恢复。写入前 117/117 表与快照一致，写后 117/117 表与演练一致，完整性 ok、外键异常 0。小游戏发布源码 4a5812a61b31d7c93d3c00610d15616e2a51ceb4 已推送至 minitools/main，主站最终回执提交 54a573c1d8495e6e9cd321b0e58d3fb8121f46bf 与远端 main 一致。[主站执行回执](https://github.com/cj2cf99/cloudflaremyapp/blob/54a573c1d8495e6e9cd321b0e58d3fb8121f46bf/myapp/database/changes/minitools-magiccard-20261120/execution-receipt.json)。本补记随小游戏最终回执提交推送；线上交互待用户截图确认。

## 2026-11-20 JST · 月下秘仪第一阶段收尾

玩家继续从饰品铺子的「月下秘仪」进入占卜屋。选题、78 张牌、本地正逆位牌义及女巫的抽翻牌表演已发布。本次补齐翻完三张后听她回答的环节：页面提交当前问题、牌号和正逆位，主站使用塔罗自己的提示词和精灵的底层 Workers AI 客户端。回答直接显示正文，失败可用原牌阵重试，游戏无历史记录。第一阶段在此收尾。

来源为 SampleProjects 的 f00114f。来源项目两轮回归见 magiccard/docs/reviews/READING_API_REVIEW_2026-11-20.md，覆盖本机真实模型、浏览器桌面流程、手机尺寸触控模拟、重试和取消。生产环境由 Cloudflare Workers myapp 与 minitools 共同提供。入口 /minitools/tools/magiccard/；专属接口 POST /api/tarot/reading。

### 发布与验证

先切换 myapp，再切换 minitools，新页面获得专属接口。业务数据库迁移、数据回填、绑定、Secret、依赖与既有 Access 策略的变更均为无。已有游戏页面可刷新到最新脚本。需恢复时先恢复 minitools，再恢复 myapp，回退版本分别为 090faa16-d674-4650-8c17-52bce7ed2526、bde3e92f-5770-4547-811e-46887d4e90f0。两者均在准备阶段从 Cloudflare 控制面核实为 100%。Worker 变更后核对实际版本与流量；受控页面效果和生产模型回答待用户截图确认。开发自测以隔离本机环境完成。

用户已同意登记花园，并明确确认保持 1.0 的具体清单。生产结构已同步，D1 只读核对修订 89。项目 #19 的功能 #60 只有部署 #44 明细 #112，与该功能关联的种子、改善、缺陷均无。结果明确后，在 #112 的已有正文末尾仅追加一次带 JST 时间、两个 Worker 版本与真实结果的说明，原正文保留。花园按关联部署次数计算版本，维持一条明细即可保留 1.0，本次不新增花园部署对象，不改完成时间，不升级花园管理应用。仅元数据修订计数 89 → 90。主站 SQL 准备稿 database/changes/tarot-phase1-close/append.template.sql 已通过内存 SQLite 演练，重复执行被拒绝。生产写入前重新备份、独立提交推送并验证远端恢复，精确 SQL 先提交，再执行一次并后检。若发布失败，追加「发布中」和实际失败情况；旧值或修订变化时停止复核。

第三方独立审核未执行。生产部署确认、生产写入及 Git 推送在本条准备记录时待执行。

### 饰品铺子发布差异

基线 955911d。比较 git diff 955911d -- public/tools/magiccard/game.js scripts/preview-tarot.mjs README.md docs/BUGS.md RELEASE_REVIEW.md；未提交文件另查 git status。game.js 把请求从旧的相对地址 ../../api/reading 切换至主站同源专属接口。scripts/preview-tarot.mjs 将该地址接回本机模型。README 更新接入和启动说明；docs/BUGS.md 的既有缺陷更新为本地已修、待线上确认。其它工具、牌面资源及旧 API 行为保持基线。重点核对工具目录里的路径解析、保留牌阵重试和全套资源。

npm.cmd test 7/7；node node_modules/wrangler/bin/wrangler.js deploy --dry-run 成功读取 253 个静态资源。可在本项目根目录按 README「月下秘仪」启动隔离 Worker（8811）与本机预览（8812），无需初始化业务库。用于本机测试的 AI_BASE_URL/AI_MODEL 对应本机模型，生产使用主站已有绑定。
