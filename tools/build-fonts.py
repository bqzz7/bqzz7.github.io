#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build-fonts.py —— 按站点实际用字，把开源字体裁剪成 woff2 子集。

用法:
    python tools/build-fonts.py          # 增量生成（已存在且字符集未变的字体跳过）
    python tools/build-fonts.py --force  # 强制全部重建

为什么需要它:
    网页字体必须裁剪，否则中文全量字库动辄 20-30 MB。
    但子集是"冻结"的 —— 你改了文案、出现新字，就必须重跑本脚本，
    否则新字会掉回系统字体（字宽、字形都有细微差异，一眼能看出来）。

字体来源(均为 SIL OFL 1.1，可自由嵌入网页并随站点分发):
    思源黑体 / 思源宋体  https://github.com/adobe-fonts
    霞鹜文楷            https://github.com/lxgw/LxgwWenKai
    Liberation Sans     https://github.com/liberationfonts/liberation-fonts
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "assets" / "fonts"
CACHE_DIR = ROOT / ".cache" / "fonts"

# 扫描哪些文件来收集用字
SCAN_SUFFIXES = {".html", ".css", ".js", ".json", ".md", ".svg", ".xml", ".txt"}
SKIP_DIRS = {".git", ".cache", "node_modules"}

# 额外保底的字符(拉丁基本区 + 通用标点 + 常用符号), 保证英文与标点永远可用
EXTRA_UNICODES = "U+0020-007E,U+00A0,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+25A0-25CF,U+FFFD"

# name: (缓存文件名, 下载地址, 是否可变字重)
SOURCES = {
    "sans": (
        "SourceHanSansSC-VF.otf",
        "https://github.com/adobe-fonts/source-han-sans/releases/download/2.004R/SourceHanSansSC.zip",
        True,
    ),
    "serif-regular": (
        "SourceHanSerifSC-Regular.otf",
        "https://github.com/adobe-fonts/source-han-serif/releases/download/2.003R/09_SourceHanSerifSC.zip",
        False,
    ),
    "serif-bold": (
        "SourceHanSerifSC-Bold.otf",
        "https://github.com/adobe-fonts/source-han-serif/releases/download/2.003R/09_SourceHanSerifSC.zip",
        False,
    ),
    "kai": (
        "LXGWWenKai-Regular.ttf",
        "https://github.com/lxgw/LxgwWenKai/releases/download/v1.520/LXGWWenKai-Regular.ttf",
        False,
    ),
    "latin-regular": (
        "LiberationSans-Regular.ttf",
        "https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz",
        False,
    ),
    "latin-bold": (
        "LiberationSans-Bold.ttf",
        "https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz",
        False,
    ),
}

# 本机已有的字体文件(避免重复下载): 环境变量 + 常见路径
LOCAL_HINTS = {
    "SourceHanSansSC-VF.otf": [
        Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "SourceHanSansSC-VF.otf",
    ],
    "NotoSansSC-VF.ttf": [
        Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "NotoSansSC-VF.ttf",
    ],
}


# 输出时使用的字体名。子集化属于"修改版"，
# 而思源/霞鹜都声明了保留字体名(Reserved Font Name)，修改版须改名后分发，
# 因此这里统一改成 Site 系列名，copyright 与 license 字段保持原样不动。
FAMILY = {
    "sans": ("Site Sans", "Regular", "SiteSans-Regular"),
    "serif-regular": ("Site Serif", "Regular", "SiteSerif-Regular"),
    "serif-bold": ("Site Serif", "Bold", "SiteSerif-Bold"),
    "kai": ("Site Kai", "Regular", "SiteKai-Regular"),
    "latin-regular": ("Site Latin", "Regular", "SiteLatin-Regular"),
    "latin-bold": ("Site Latin", "Bold", "SiteLatin-Bold"),
}


def collect_chars() -> str:
    chars: set[str] = set()
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in SCAN_SUFFIXES:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if OUT_DIR in path.parents:  # 不扫字体目录自身
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        chars.update(text)
    chars.update(chr(c) for c in range(0x20, 0x7F))
    return "".join(sorted(chars))


def resolve_source(cache_name: str) -> Path:
    cached = CACHE_DIR / cache_name
    if cached.exists():
        return cached
    for hint in LOCAL_HINTS.get(cache_name, []):
        if hint.exists():
            print(f"  使用本机字体: {hint}")
            return hint
    raise FileNotFoundError(
        f"找不到 {cache_name}。请手动下载后放到 .cache/fonts/ 下再重跑本脚本。"
    )


def sha8(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()[:8]


def rename_font(font, family: str, subfamily: str, ps_name: str) -> None:
    """只改"名字"，保留 copyright / license / url 等字段。"""
    values = {
        1: family,                 # Family
        2: subfamily,              # Subfamily
        3: f"{family}-{subfamily}",  # Unique ID
        4: f"{family} {subfamily}",  # Full name
        6: ps_name,                # PostScript name
        16: family,                # Typographic family
        17: subfamily,             # Typographic subfamily
        21: family,                # WWS family
        22: subfamily,             # WWS subfamily
    }
    table = font["name"]
    for rec in table.names:
        if rec.nameID in values:
            rec.string = values[rec.nameID]
    # 去掉可能残留的旧名记录，避免同名冲突
    table.names = [r for r in table.names if r.nameID not in (18, 20)];


def build_one(key: str, src: Path, chars: str, force: bool) -> dict:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    # 用一个稳定的指纹文件名前缀, 便于脚本清理旧文件
    prefix = f"site-{key}"
    existing = sorted(OUT_DIR.glob(f"{prefix}.*.woff2"))
    if existing and not force:
        # 字符集没变就复用(通过 unicode 集合比对太慢, 用字符数+哈希近似)
        fp = sha8(chars.encode("utf-8"))
        marker = OUT_DIR / f".{prefix}.fp"
        if marker.exists() and marker.read_text().strip() == fp:
            old = existing[0]
            print(f"  跳过 {old.name} (字符集未变)")
            return {"key": key, "file": old.name, "size": old.stat().st_size, "reused": True}

    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.notdef_outline = True
    options.recalc_bounds = True
    options.drop_tables += ["DSIG"]

    font = subset.load_font(str(src), options)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=chars, unicodes=subset.parse_unicodes(EXTRA_UNICODES))
    subsetter.subset(font)

    family, subfamily, ps_name = FAMILY[key]
    rename_font(font, family, subfamily, ps_name)

    tmp = OUT_DIR / f"{prefix}.tmp.woff2"
    subset.save_font(font, str(tmp), options)
    font.close()

    data = tmp.read_bytes()
    name = f"{prefix}.{sha8(data)}.woff2"
    final = OUT_DIR / name
    tmp.replace(final)

    # 清掉旧版本同名前缀文件
    for old in existing:
        if old.name != name:
            old.unlink(missing_ok=True)

    fp = sha8(chars.encode("utf-8"))
    (OUT_DIR / f".{prefix}.fp").write_text(fp)

    return {"key": key, "file": name, "size": final.stat().st_size, "reused": False}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="强制重建全部字体")
    args = ap.parse_args()

    chars = collect_chars()
    print(f"站点用字: {len(chars)} 个字符")

    results = []
    for key, (cache_name, _url, _vf) in SOURCES.items():
        src = resolve_source(cache_name)
        print(f"[{key}] <- {src.name}")
        results.append(build_one(key, src, chars, args.force))

    total = sum(r["size"] for r in results)
    print("\n生成结果:")
    for r in results:
        print(f"  {r['file']:42s} {r['size']/1024:7.1f} KB")
    print(f"  {'合计':42s} {total/1024:7.1f} KB")

    manifest = {
        "chars": len(chars),
        "charset_fingerprint": sha8(chars.encode("utf-8")),
        "files": {r["key"]: r["file"] for r in results},
        "total_bytes": total,
    }
    (OUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # 打印可直接粘进 style.css 的 @font-face
    print("\n@font-face 片段:")
    for r in results:
        print(f'  /* {r["key"]} */ url("../fonts/{r["file"]}")')
    return 0


if __name__ == "__main__":
    sys.exit(main())
