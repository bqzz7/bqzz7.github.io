# 字体说明

本站所有网页字体均为**自托管**（不引第三方 CDN），字体本身全部采用 **SIL Open Font License 1.1**，
允许嵌入网页并随站点一起分发。文件按站点实际用字裁剪过，所以才能在几百 KB 的量级跑起来。

## 文件清单

| 文件 | 字重 | 体积 | 用途 |
|---|---|---|---|
| `site-latin-regular.1b812099.woff2` | 400 | 24.8 KB | 拉丁正文（Liberation Sans） |
| `site-latin-bold.49b98736.woff2` | 700 | 21.6 KB | 拉丁加粗 |
| `site-sans.8aa82a94.woff2` | 100–900（可变） | 396 KB | 中文正文 / UI（思源黑体） |
| `site-serif-regular.1da34ee4.woff2` | 400 | 424 KB | 标题、正文小标题（思源宋体） |
| `site-serif-bold.7fb46a87.woff2` | 700 | 438 KB | 标题加粗 |
| `site-kai.b2ca8d9f.woff2` | 400 | 211 KB | 点缀：首页自嘲句、正文引文（霞鹜文楷） |

全部合计约 **1.5 MB**，但并非一次性加载：浏览器只会按 CSS 里实际用到的字族下载，
且只有 `site-sans` 做了 `<link rel="preload">`（正文必需），其余按需加载。

## 上游来源

| 字体 | 上游 | 版本 | 获取日期 |
|---|---|---|---|
| 思源黑体 Source Han Sans SC | <https://github.com/adobe-fonts/source-han-sans> | 2.004R | 2026-11-25 |
| 思源宋体 Source Han Serif SC | <https://github.com/adobe-fonts/source-han-serif> | 2.003R | 2026-11-25 |
| 霞鹜文楷 LXGW WenKai | <https://github.com/lxgw/LxgwWenKai> | v1.520 | 2026-11-25 |
| Liberation Sans | <https://github.com/liberationfonts/liberation-fonts> | 2.1.5 | 2026-11-25 |

## 授权

三份授权原文就在本目录：

- `LICENSE-SourceHan.txt` —— Adobe 思源黑体 / 思源宋体，SIL OFL 1.1
- `LICENSE-LxgwWenKai.txt` —— 霞鹜文楷，SIL OFL 1.1
- `LICENSE-Liberation.txt` —— Liberation Sans，SIL OFL 1.1

OFL 1.1 允许：自由使用、复制、合并、修改、再分发，**包括嵌入网页**；要求保留版权与授权声明、
不得单独售卖字体本身、修改版不得沿用上游的保留字体名。

## 做了哪些修改（重要）

1. **子集裁剪**：只保留本站实际出现的 **978 个字符**（拉丁基本区与常用标点另行兜底）。
2. **改名分发**：思源与霞鹜均声明了保留字体名（Reserved Font Name），子集属于修改版，
   因此按 OFL 要求统一改名为 `Site Sans` / `Site Serif` / `Site Kai` / `Site Latin`。
   字体内部的 `copyright`、`license`、`license URL` 字段**原样保留未动**，可自行用
   `fontTools.ttLib.TTFont` 校验。
3. 文件名带内容哈希，用于配合 GitHub Pages 的短缓存（`Cache-Control: max-age=600`）避免旧字体残留。

## 如何重新生成

```bash
pip install fonttools brotli
python tools/build-fonts.py          # 字符集没变则跳过
python tools/build-fonts.py --force   # 强制重建
```

源字体放在 `.cache/fonts/`（已加入 `.gitignore`，不进仓库），脚本会读取
本机 `C:\Windows\Fonts` 里的思源黑体作为兜底。运行后会更新 `manifest.json`，
并打印新的文件名与 `@font-face` 片段。

## 什么时候必须重跑

**只要改了文案就要重跑。** 子集是冻结的字符集：新增文案里出现子集没有的字，
浏览器会回退到系统字体——字形、字宽、基线都会有细微差异，中文尤其明显（看起来"某个字怪怪的"）。

流程：改文案 → `python tools/build-fonts.py --force` → 把新文件名同步到
`assets/css/style.css` 第 00 段和页面里的 `preload` 链接 → 提交。
（文件名带哈希，直接用新的替换旧的即可。）
