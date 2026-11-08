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

工具代码和样式都在打开时才加载。需要后端的工具，在 `worker.js` 加 `/api/<id>` 路由，页面里用相对路径 `api/<id>` 请求。

页头、主题令牌和公用动画不要写在本项目，统一用主站的，规范见主站 `docs/design/ui-redesign/MOTION_STANDARD.md`。
