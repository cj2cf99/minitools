# 告解骰本地验收

工作目录为 `G:/selftool/minitools`，以下命令使用 PowerShell。页面版由 minitools Worker 提供，菜单使用现有本地主站外壳。小时 API 是独立的 subscriptions-api Worker 逻辑，游戏页面本身不会调用它。

## 准备

使用仓库锁定的 Wrangler（`node_modules` 已安装）、Node、Git 和 Windows 自带的 tar。API 来源取本机 informationManage 仓库的 `ad4ecb1`，含已发布的绯月改动及告解骰。以下步骤在验收准备时执行一次。文件位于 Git 忽略的目录，可按同一提交重新生成。

```powershell
Set-Location G:/selftool/minitools
$bundleDir = '.wrangler/sindie-acceptance/ad4ecb1'
New-Item -ItemType Directory -Force -Path $bundleDir | Out-Null
git --git-dir=G:/selftool/informationManage/.git archive --format=tar --output=.wrangler/sindie-acceptance/ad4ecb1.tar ad4ecb14310a3bb2ee40d52053b3566b13fda567 api-worker/src api-worker/scripts/prepare-initial-data.mjs api-worker/test api-worker/package.json api-worker/wrangler.jsonc api-worker/migrations api-worker/host-managed-migrations
if ($LASTEXITCODE -ne 0) { throw 'API archive failed' }
tar -xf .wrangler/sindie-acceptance/ad4ecb1.tar -C $bundleDir
if ($LASTEXITCODE -ne 0) { throw 'API extract failed' }
```

两个本地配置位于本目录的 `local/`。游戏配置只绑定本机静态资源。API 配置使用隔离 KV 和空 D1；小时路由需要 D1 绑定存在，本次不访问业务表，无需建表、导入数据或使用凭据。API 预览入口只接受回环地址的小时路由，向真实 handler 传入测试身份；生产 Access 鉴权由生产入口承担。两个预览入口均不在生产构建入口中。

## 启动

用户明确指示启动后，在上述工作目录的三个终端中分别运行。终端保持运行至本次验收结束。

**终端一 · 游戏 Worker**

```powershell
node node_modules/wrangler/bin/wrangler.js dev -c docs/sindie/local/game.jsonc --local --persist-to .wrangler/sindie-acceptance/game-state --show-interactive-dev-session=false
```

**终端二 · 主站菜单外壳**（既有预览器读取 `G:/cloudflare/myapp` 的外壳和代理代码）

```powershell
node scripts/preview-tarot.mjs
```

**终端三 · 小时 API Worker**

```powershell
node node_modules/wrangler/bin/wrangler.js dev -c docs/sindie/local/api.jsonc --local --persist-to .wrangler/sindie-acceptance/api-state --show-interactive-dev-session=false
```

预定游戏端口为 8811，菜单为 8812，API 为 8813。代理指向 8811。启动后先验证菜单、游戏、game.js、API 均返回 200，再把实际可访问地址交给用户。若端口被占用，先辨明进程，不停止其他任务的服务。

## 验收步骤

| 用户操作 | 预期 |
| --- | --- |
| 在 `http://127.0.0.1:8812/minitools/` 从「小游戏」点「告解骰」 | 主站菜单进入 `/minitools/tools/sindie/` 全屏烛光祭坛；左上角能返回原菜单 |
| 连掷数次，再用 Tab 和 Enter 掷骰 | 骰子落定后揭示；顶面编号与牌匾一致；滚动时不能触发第二掷；下一掷清空旧罪名。允许两连，禁止三连 |
| 切换 375×812 与 460×360、480×375、512×400 | 常规竖屏可读；三个横屏左右排列，无水平滚动。320×375 圣徽遮字已由用户接受，上线后登记改善 |
| 两次打开 `http://127.0.0.1:8813/api/v1/sin-die` | 同一东京小时的 `data.hour`、`data.face`、`data.next_at` 相同；`request_id` 是逐请求字段。下一整点重新计算，允许再次是同一罪名 |

启动后可用以下命令检查小时结果的一致性。该步骤在服务就绪后执行。

```powershell
$endpoint = 'http://127.0.0.1:8813/api/v1/sin-die'
$first = (Invoke-RestMethod $endpoint).data
$second = (Invoke-RestMethod $endpoint).data
if ($first.hour -ne $second.hour) { throw 'Crossed the JST hour; repeat the check' }
if (!$first.face.latin -or $first.face.n -ne $second.face.n -or $first.next_at -ne $second.next_at) { throw 'Hourly result mismatch' }
$first | ConvertTo-Json -Depth 4
```

## 本地验收实测 · 2026-11-21 04:56 JST

已按用户指令启动三个回环服务，保持运行供用户试用。04:56:31 JST 最后复查菜单和游戏均为 HTTP 200。用户手动验收待确认。

| 本次实测 | 结果 |
| --- | --- |
| 真实入口 | 8811 游戏 Worker、8812 主站外壳菜单、代理后的游戏页和模块、8813 小时 API 均返回 200。独立 Chrome 会话从菜单进入游戏并返回成功，菜单首屏未加载游戏脚本。 |
| 连续投掷 | 在本地 Worker 页面使用原生动画与随机源，以鼠标和键盘实掷五次：III、III、VII、VI、IV。逐次比对 Canvas 高亮的顶面与牌匾，五次一致；重掷时旧中文名清空，键盘焦点仍在按钮。游戏页没有请求小时 API。 |
| 视口切换 | 同一个页面依次切换到 375×812、460×360、480×375、512×400、1024×768；三个矮横屏均转为左右布局。五个尺寸均无横向滚动，顶面数字中心与牌匾分开。320×375 延续已接受的改善项。 |
| 小时 API 与真实本地 KV | 同小时并发 GET 的 data 完全一致，request_id 不同。04:00–05:00 JST 实测结果为 III / LVXVRIA / 色欲，POST 返回 405。只读核对本地 KV 键 `sindie:hour:v1` 的值为本小时、索引 2；重复读取前后同一条记录的 blob_id 未变。此次未等到真实跨整点。 |

浏览器未记录 HTTP 错误；菜单往返期间记录到一次 `ViewTransition opt-in disabled` 过渡中止，未影响导航与投掷。未访问生产 Access、生产数据库或生产 KV。上线后效果待用户截图确认。

用户随后回复“ok，可以准备部署了，部署完成后去找绯月做登记”，本地验收获确认。本次生产发布范围及待确认的花园清单见项目根目录 RELEASE_REVIEW.md。
