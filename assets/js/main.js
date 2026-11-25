/* ==========================================================================
   bqzz7.github.io — 全站脚本（无依赖）
   1 主题切换  2 年份  3 滚动渐显  4 导航高亮  5 内容筛选
   6 灯箱      7 复制文本  8 站内搜索  9 文章目录 + 阅读进度
   10 工具箱   11 外部链接安全
   所有模块都先判断元素是否存在，缺什么就安静跳过。
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ROOT = (document.body && document.body.getAttribute('data-root')) || './';

  function st(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* 1 主题 ---------------------------------------------------------------- */
  var tBtn = $('#themeToggle');
  function paintThemeBtn() {
    if (!tBtn) return;
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    tBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    var label = $('.theme__label', tBtn);
    if (label) label.textContent = dark ? 'Light' : 'Dark';
  }
  if (tBtn) {
    paintThemeBtn();
    tBtn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      st('theme', next);
      paintThemeBtn();
    });
  }
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onSys = function (e) {
      if (st('theme')) return; /* 用户手动选过就不跟随系统 */
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      paintThemeBtn();
    };
    if (mq.addEventListener) mq.addEventListener('change', onSys);
  }

  /* 2 年份 ---------------------------------------------------------------- */
  $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* 3 滚动渐显 ------------------------------------------------------------ */
  var reveals = $$('.reveal');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* 4 导航高亮（仅锚点导航的页面生效） ------------------------------------ */
  var navLinks = $$('.rail__nav a[href^="#"]');
  var sections = navLinks.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + e.target.id;
          a.classList.toggle('is-active', on);
          if (on) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-42% 0px -52% 0px' });
    sections.forEach(function (s) { navIO.observe(s); });
  }

  /* 5 内容筛选（作品 / 笔记共用） ----------------------------------------- */
  $$('[data-filter-group]').forEach(function (group) {
    var chips = $$('.chip', group);
    var items = $$('[data-cat]', group.parentNode).filter(function (el) { return !el.classList.contains('chip'); });
    var empty = group.parentNode.querySelector('[data-empty]');
    function apply(cat) {
      items.forEach(function (el) {
        var show = cat === 'all' || el.getAttribute('data-cat') === cat;
        el.hidden = !show;
        if (show) {
          el.classList.remove('is-in');
          if (!reduce) { void el.offsetWidth; el.classList.add('is-in'); }
          else { el.classList.add('is-in'); }
        }
      });
      if (empty) {
        var visible = items.filter(function (el) { return !el.hidden; }).length;
        empty.hidden = visible > 0;
      }
      chips.forEach(function (c) {
        var on = c.getAttribute('data-cat') === cat;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () { apply(c.getAttribute('data-cat')); });
    });
    apply('all');
  });

  /* 6 灯箱 ---------------------------------------------------------------- */
  var lb = $('#lb'), stage = $('#lbStage'), cap = $('#lbCap'), meta = $('#lbMeta'), count = $('#lbCount');
  var cards = $$('[data-lb]');
  var cur = 0;
  function paint(i) {
    if (!cards.length || !stage) return;
    cur = (i + cards.length) % cards.length;
    var c = cards[cur];
    var media = $('.card__media', c);
    stage.innerHTML = '';
    if (media) stage.appendChild(media.cloneNode(true));
    // 有真实图片时，舞台按图片自身比例走（占位块仍用 CSS 的 16/10）
    var stageImg = stage.querySelector('img');
    if (stageImg) {
      var ratio = (stageImg.naturalWidth && stageImg.naturalHeight)
        ? stageImg.naturalWidth / stageImg.naturalHeight
        : (Number(stageImg.getAttribute('width')) || 1) / (Number(stageImg.getAttribute('height')) || 1);
      if (!ratio || !isFinite(ratio)) ratio = 1.6;
      stage.style.aspectRatio = String(Math.min(2.2, Math.max(0.6, ratio)));
    } else {
      stage.style.aspectRatio = '';
    }
    if (cap) cap.textContent = c.getAttribute('data-title') || '';
    if (meta) meta.textContent = c.getAttribute('data-meta') || '';
    if (count) count.textContent = String(cur + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
  }
  function openLb(i) {
    if (!lb) return;
    paint(i);
    if (typeof lb.showModal === 'function' && !lb.open) lb.showModal();
    document.body.classList.add('is-locked');
  }
  cards.forEach(function (c, i) { c.addEventListener('click', function () { openLb(i); }); });
  if (lb) {
    $$('[data-close]').forEach(function (b) { b.addEventListener('click', function () { lb.close(); }); });
    $$('.lb__nav').forEach(function (b) {
      b.addEventListener('click', function () { paint(cur + Number(b.getAttribute('data-dir'))); });
    });
    lb.addEventListener('close', function () { document.body.classList.remove('is-locked'); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.open) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); paint(cur + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); paint(cur - 1); }
    });
  }

  /* 7 复制文本 ------------------------------------------------------------ */
  var toastEl = $('#toast'), tTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(tTimer);
    tTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 1800);
  }
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function () { toast('已复制 — ' + text); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { toast(text); });
      } else {
        toast(text);
      }
    });
  });

  /* 8 站内搜索 ------------------------------------------------------------ */
  var search = $('#search'), sInput = $('#searchInput'), sList = $('#searchList');
  var idx = null, curIdx = -1;

  function loadIndex() {
    if (idx) return Promise.resolve(idx);
    return fetch(ROOT + 'data/search.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (data) { idx = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : []); return idx; })
      .catch(function () { idx = []; return idx; })
  }
  function openSearch() {
    if (!search) return;
    search.hidden = false;
    document.body.classList.add('is-locked');
    if (sInput) { sInput.value = ''; sInput.focus(); }
    render('');
    loadIndex();
  }
  function closeSearch() {
    if (!search) return;
    search.hidden = true;
    document.body.classList.remove('is-locked');
  }
  function highlight(text, q) {
    if (!q) return esc(text);
    var i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function render(q) {
    if (!sList) return;
    var items = (idx || []).filter(function (it) {
      if (!q) return true;
      var hay = [it.title, it.summary, (it.tag || ''), (it.keywords || '')].join(' ').toLowerCase();
      return hay.indexOf(q.toLowerCase()) >= 0;
    }).slice(0, 12);
    if (!q && !(idx && idx.length)) {
      sList.innerHTML = '<div class="search__none">输入关键词开始搜索 · 正在加载索引…</div>';
      return;
    }
    if (!items.length) {
      sList.innerHTML = '<div class="search__none">没有匹配结果 — 换个词试试</div>';
      return;
    }
    curIdx = -1;
    sList.innerHTML = items.map(function (it, i) {
      return '<a class="search__item" role="option" href="' + esc(ROOT + it.url) + '" data-i="' + i + '">' +
        '<b>' + highlight(it.title, q) + '</b>' +
        '<span>' + highlight(it.summary || '', q) + '</span>' +
        '<span><em>' + esc(it.tag || '') + '</em></span></a>';
    }).join('');
  }
  function move(dir) {
    var items = $$('.search__item', sList);
    if (!items.length) return;
    curIdx = (curIdx + dir + items.length) % items.length;
    items.forEach(function (el, i) { el.classList.toggle('is-cur', i === curIdx); });
    items[curIdx].scrollIntoView({ block: 'nearest' });
  }
  $$('[data-search-open]').forEach(function (b) { b.addEventListener('click', openSearch); });
  if (search) {
    $('[data-search-close]', search).addEventListener('click', closeSearch);
    search.addEventListener('click', function (e) { if (e.target === search) closeSearch(); });
    if (sInput) {
      sInput.addEventListener('input', function () { render(sInput.value.trim()); });
      sInput.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        if (e.key === 'Enter') {
          var items = $$('.search__item', sList);
          var target = items[curIdx >= 0 ? curIdx : 0];
          if (target) location.href = target.getAttribute('href');
        }
      });
    }
    loadIndex();
  }
  document.addEventListener('keydown', function (e) {
    var meta = e.ctrlKey || e.metaKey;
    if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape' && search && !search.hidden) closeSearch();
  });

  /* 9 文章目录 + 阅读进度 ------------------------------------------------ */
  var prose = $('.prose');
  if (prose) {
    var hs = $$('h2', prose).filter(function (h) { return h.getAttribute('data-notoc') === null; });
    var tocBox = $('#toc');
    if (tocBox && hs.length >= 2) {
      hs.forEach(function (h, i) {
        if (!h.id) h.id = 'sec-' + (i + 1);
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent.replace(/\s+/g, ' ').trim();
        tocBox.appendChild(a);
      });
    } else if (tocBox && hs.length < 2) {
      var wrap = tocBox.closest('.toc');
      if (wrap) wrap.hidden = true;
    }
  }
  var bar = $('#progress');
  if (bar && prose) {
    var onScroll = function () {
      var top = prose.getBoundingClientRect().top + window.scrollY;
      var total = prose.offsetHeight + (bar.dataset.extra ? Number(bar.dataset.extra) : 0);
      var passed = window.scrollY + window.innerHeight * 0.35 - top;
      var pct = Math.max(0, Math.min(100, (passed / total) * 100));
      bar.style.width = pct + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  /* 10 工具箱 ------------------------------------------------------------ */
  var tsIn = $('#tsIn'), tsOut = $('#tsOut'), tsHint = $('#tsHint');
  if (tsIn && tsOut) {
    var pad2 = function (n) { return String(n).padStart(2, '0'); };
    var fmt2 = function (d) {
      return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' +
        pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
    };
    var convert = function () {
      var v = (tsIn.value || '').trim();
      if (!v) { tsOut.textContent = '等待输入…'; return; }
      var d;
      if (/^\d{9,13}$/.test(v)) {
        d = new Date(v.length === 13 ? Number(v) : Number(v) * 1000);
      } else if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
        d = new Date(v.replace(' ', 'T'));
      } else {
        d = new Date(v);
      }
      if (isNaN(d.getTime())) { tsOut.textContent = '无法识别，试试 1750000000 / 1750000000000 / 2026-11-25 12:00'; return; }
      tsOut.textContent =
        '本地时间  ' + fmt2(d) + '\n' +
        'ISO 8601  ' + d.toISOString() + '\n' +
        'Unix 秒   ' + Math.floor(d.getTime() / 1000) + '\n' +
        'Unix 毫秒 ' + d.getTime() + '\n' +
        'UTC+8 星期 ' + ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
      if (tsHint) tsHint.textContent = '已解析 ' + v;
    };
    tsIn.addEventListener('input', convert);
    $('#tsNow') && $('#tsNow').addEventListener('click', function () {
      tsIn.value = String(Math.floor(Date.now() / 1000));
      convert();
    });
    $('#tsZero') && $('#tsZero').addEventListener('click', function () {
      tsIn.value = '0'; convert();
    });
    convert();
  }

  var txtIn = $('#txtIn');
  if (txtIn) {
    var txtOut = $('#txtOut');
    var stat = function () {
      var s = txtIn.value;
      var chars = Array.from(s.replace(/\s/g, '')).length;
      var raw = s.length;
      var lines = s ? s.split(/\n/).length : 0;
      var words = (s.match(/[\u4e00-\u9fa5]/g) || []).length + (s.match(/[A-Za-z0-9']+/g) || []).length;
      var read = Math.max(1, Math.round(chars / 350));
      txtOut.textContent =
        '字符(含空格) ' + raw + '\n' +
        '字符(不含空白) ' + chars + '\n' +
        '行数         ' + lines + '\n' +
        '词/字计数     ' + words + '\n' +
        '预计阅读      ' + read + ' 分钟';
    };
    txtIn.addEventListener('input', stat);
    stat();
  }

  var jsonIn = $('#jsonIn');
  if (jsonIn) {
    var jsonOut = $('#jsonOut');
    var runJson = function (min) {
      try {
        var obj = JSON.parse(jsonIn.value);
        jsonOut.textContent = JSON.stringify(obj, null, min ? 0 : 2);
      } catch (err) {
        jsonOut.textContent = 'JSON 解析失败：' + err.message;
      }
    };
    $('#jsonPretty') && $('#jsonPretty').addEventListener('click', function () { runJson(false); });
    $('#jsonMin') && $('#jsonMin').addEventListener('click', function () { runJson(true); });
  }

  /* 12 彩蛋口令（首页大图入口） ------------------------------------------ */
  var eggTrigger = $('[data-egg]');
  var eggDlg = $('#egg');
  if (eggTrigger && eggDlg) {
    var eggForm = $('#eggForm'), eggInput = $('#eggInput'), eggHint = $('#eggHint');
    var eggDest = eggTrigger.getAttribute('data-egg');
    var eggTries = 0;

    var openEgg = function () {
      eggDlg.hidden = false;
      void eggDlg.offsetWidth;
      eggDlg.classList.add('is-open');
      document.body.classList.add('is-locked');
      eggHint.textContent = '';
      eggDlg.classList.remove('is-wrong');
      eggInput.value = '';
      setTimeout(function () { eggInput.focus(); }, 80);
    };
    var closeEgg = function () {
      eggDlg.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      setTimeout(function () { eggDlg.hidden = true; }, 220);
    };

    eggTrigger.addEventListener('click', openEgg);
    $$('[data-egg-close]').forEach(function (b) { b.addEventListener('click', closeEgg); });
    eggDlg.addEventListener('click', function (e) { if (e.target === eggDlg) closeEgg(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !eggDlg.hidden) closeEgg();
    });

    eggForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = (eggInput.value || '').trim().replace(/\s/g, '').toUpperCase();
      if (v === '2077') {
        location.href = eggDest;
        return;
      }
      eggTries += 1;
      eggHint.textContent = eggTries >= 2 ? '不对。提示：四个数字。' : '口令不对。';
      eggInput.value = '';
      eggDlg.classList.remove('is-wrong');
      void eggDlg.offsetWidth;
      eggDlg.classList.add('is-wrong');
      eggInput.focus();
    });

    eggInput.addEventListener('input', function () {
      if (eggHint.textContent) eggHint.textContent = '';
      eggDlg.classList.remove('is-wrong');
    });
  }

  /* 13 外部链接：自动补 rel ---------------------------------------------- */
  $$('a[href^="http"]').forEach(function (a) {
    if (a.hostname && a.hostname !== location.hostname) {
      a.setAttribute('rel', 'noopener noreferrer');
      if (!a.getAttribute('target')) a.setAttribute('target', '_blank');
    }
  });
})();
