# 饰品库

独立于主站的单页工具集：一个 Worker（`worker.js`）加静态页（`public/`）。

```bash
npm run dev
```

```bash
npm test
```

## 新增工具

1. 在 `public/tools/index.js` 的 `TOOLS` 加一项；要新分类就在 `GROUPS` 加一项。页头下拉、手机抽屉、总览会自动出现。
2. 新建 `public/tools/<id>.js`，导出 `mount(el)`，可返回卸载函数。
3. 新建 `public/tools/<id>.css`，放这个工具自己的样式，内容宽度也在这里定。

工具代码和样式都在打开时才加载。需要后端的工具，在 `worker.js` 加 `/api/<id>` 路由。

页头和主题取自主站 `shell.css` / `theme.css`，主站改版时需手动同步 `public/shell.css`。
