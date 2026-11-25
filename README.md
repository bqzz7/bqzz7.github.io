# bqzz7.github.io

白琦的个人门户站：纯静态、零依赖、零构建。手写 HTML + 一份共享 CSS + 一份共享 JS，直接由 GitHub Pages 托管。

线上地址：<https://bqzz7.github.io>

## 目录结构

```
.
├── index.html            首页
├── works.html            作品（分类筛选 + 灯箱）
├── notes.html            笔记列表（标签筛选）
├── notes/                单篇笔记
│   ├── hello.html        这个门户怎么搭的
│   ├── grid.html         clamp 的用法
│   ├── night.html        夜景拍摄
│   └── 2025.html         年终回顾
├── about.html            关于 + 时间线
├── links.html            友链
├── lab.html              工具箱（时间戳 / 文本统计 / JSON）
├── 404.html              自定义 404
├── assets/
│   ├── css/style.css     全站样式（16 段，含深色主题）
│   ├── js/main.js        全站脚本（11 个独立模块）
│   └── img/favicon.svg
├── data/search.json      站内搜索索引
├── legacy/index-v1.html  旧版单页备份（不改动）
├── .nojekyll             关闭 Jekyll，按原样发布
├── robots.txt  sitemap.xml
```

## 本地预览

在本目录打开终端，任选一种：

```bash
python -m http.server 5173
# 或
npx serve .
```

然后访问 <http://localhost:5173>。不要直接双击 HTML：`file://` 下站内搜索读不到 `data/search.json`（其它功能正常）。

## 修改内容

| 想改什么 | 改哪里 |
|---|---|
| 姓名 / 一句话简介 | `index.html` 的 `.hero` 区块 |
| 联系邮箱 | 每个页面 rail 底部与 `.contact`，以及 `assets/js/main.js` 的 `data-copy` 属性值所在处（搜索 `969379064`） |
| 主色 / 字体 | `assets/css/style.css` 顶部 `:root` 的 `--accent`、`--sans`、`--mono` |
| 深色配色 | 同文件 `:root[data-theme="dark"]` |
| 作品图 | 把 `<span class="card__media ph ...">` 换成 `<img src="./assets/img/xxx.jpg" alt="…" loading="lazy">`，外层比例已锁好 |
| 新增笔记 | 复制 `notes/hello.html` 改内容 → 在 `notes.html` 列表加一条 → 补进 `data/search.json` 与 `sitemap.xml` |
| 工具箱 | `lab.html` 加一个 `.tool` 卡片，逻辑写进 `assets/js/main.js` 第 10 段 |

## 发布

```bash
git add -A
git commit -m "update: 说明这次改了什么"
git push origin main
```

GitHub Pages 会在一分钟内自动更新。仓库 Settings → Pages 应为：Source = `Deploy from a branch`，Branch = `main`，目录 = `/ (root)`。

## 约定

- 不引入框架、不引 CDN、不加第三方追踪；需要外部服务（评论、统计）时先确认。
- 每个页面共享 `assets/css/style.css` 与 `assets/js/main.js`，改一处全站生效。
- 新增功能小步提交，出问题直接回滚单个提交。
- 旧版单页保留在 `legacy/index-v1.html`。
