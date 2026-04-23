// ── In-app console ──────────────────────────────────────────────────────────
const _consoleLogs = [];
function _patchConsole(level, orig) {
    return function(...args) {
        orig.apply(console, args);
        const text = args.map(a => {
            if (a instanceof Error) return a.stack || (a.message + ' (no stack)');
            try { return typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a); } catch { return String(a); }
        }).join(' ');
        _consoleLogs.push({ level, text, ts: new Date().toLocaleTimeString('ru') });
        if (_consoleLogs.length > 500) _consoleLogs.shift();
    };
}
console.log   = _patchConsole('log',   console.log.bind(console));
console.warn  = _patchConsole('warn',  console.warn.bind(console));
console.error = _patchConsole('error', console.error.bind(console));

function renderConsoleLog() {
    const el = document.getElementById('console-log');
    if (!el) return;
    if (!_consoleLogs.length) { el.textContent = 'Логов нет'; return; }
    el.innerHTML = _consoleLogs.slice().reverse().map(e => {
        const color = e.level === 'error' ? '#e74c3c' : e.level === 'warn' ? '#e67e22' : 'var(--text-muted)';
        const escaped = e.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        return `<div style="border-bottom:1px solid var(--border);padding:4px 0;color:${color}"><span style="opacity:.5">${e.ts}</span> ${escaped}</div>`;
    }).join('');
}

// ── Константы ───────────────────────────────────────────────────────────────
const BASE = './';
const DB_URL = 'https://cn-trip-default-rtdb.asia-southeast1.firebasedatabase.app';
const APP_VERSION = '3.38';

const PAGES = [
    { file: 'plan.md',      label: 'Маршрут',   icon: 'map' },
    { file: 'checklist.md', label: 'Чек-листы', icon: 'list-checks' },
    { file: 'budget.md',    label: 'Бюджет',    icon: 'wallet' },
    { file: 'explore',      label: 'Инфо',      icon: 'info' },
    { file: 'translate',    label: 'Перевод',   icon: 'languages' },
    { file: 'settings',     label: 'Настройки', icon: 'settings' },
];

// Для поиска и индексирования explore раскрывается в два реальных файла
const SEARCH_PAGES = PAGES.flatMap(p =>
    p.file === 'explore'
        ? [
            { file: 'info.md',   label: 'Инфо',  icon: p.icon, navTarget: 'explore', subTab: 'info' },
            { file: 'places.md', label: 'Места', icon: p.icon, navTarget: 'explore', subTab: 'places' },
          ]
        : [{ ...p, navTarget: p.file, subTab: null }]
);

const ACCENTS = [
    { id: 'red',    label: 'Красный',
      light: { color: '#C0392B', tocBg: '#FFF7ED', tocTitle: '#92400E', border: '#F0DCC0', tocDivider: '#f5dfc0', bqText: '#8c5a3a' },
      dark:  { color: '#FF6B6B' } },
    { id: 'orange', label: 'Оранжевый',
      light: { color: '#D35400', tocBg: '#FFF3E0', tocTitle: '#7c3a00', border: '#F5CBA7', tocDivider: '#f5c490', bqText: '#7c4a20' },
      dark:  { color: '#FF9F43' } },
    { id: 'gold',   label: 'Золотой',
      light: { color: '#B7860B', tocBg: '#FFFDE7', tocTitle: '#5c4400', border: '#F0D878', tocDivider: '#e8cc50', bqText: '#7a5e10' },
      dark:  { color: '#F0C040' } },
    { id: 'green',  label: 'Зелёный',
      light: { color: '#27AE60', tocBg: '#F0FFF4', tocTitle: '#1a5c30', border: '#A9DFBF', tocDivider: '#90d4a8', bqText: '#2e7d46' },
      dark:  { color: '#55EFC4' } },
    { id: 'blue',   label: 'Синий',
      light: { color: '#1A6FA8', tocBg: '#EBF5FB', tocTitle: '#154360', border: '#AED6F1', tocDivider: '#90c8ec', bqText: '#1a5276' },
      dark:  { color: '#74B9FF' } },
    { id: 'purple', label: 'Фиолетовый',
      light: { color: '#7D3C98', tocBg: '#F5EEF8', tocTitle: '#4a235a', border: '#D7BDE2', tocDivider: '#c8a8d8', bqText: '#6c3483' },
      dark:  { color: '#A29BFE' } },
];

// ── Состояние ───────────────────────────────────────────────────────────────
const pageCache = new Map();
const tabScrollY = new Map();

let currentPage = PAGES[0].file;
let translateTab = 'phrases'; // активная вкладка внутри translate-страницы
let exploreTab = 'info';      // активная вкладка внутри explore-страницы ('info' | 'places')
const scroller = document.getElementById('scroller');
let updateAvailable = false;
let latestVersion = null;

// ── DOM-ссылки (нужны в search.js) ─────────────────────────────────────────
const searchOverlay = document.getElementById('search-overlay');
const searchInput   = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchHint    = document.getElementById('search-hint');
const pullIndicator = document.getElementById('pull-indicator');

// ── Accent + Theme ──────────────────────────────────────────────────────────
function _applyAccentColors(accent) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const r = document.documentElement;
    if (isDark) {
        const { color } = accent.dark;
        r.style.setProperty('--link', color);
        r.style.setProperty('--toc-link', color);
        r.style.setProperty('--nav-accent', color);
        r.style.setProperty('--scroll-bg', color);
        r.style.setProperty('--city-btn-active-bg', color);
        // Dark mode secondary colors are always neutral — remove any light overrides
        r.style.removeProperty('--toc-bg');
        r.style.removeProperty('--toc-title');
        r.style.removeProperty('--toc-divider');
        r.style.removeProperty('--th-bg');
        r.style.removeProperty('--code-bg');
        r.style.removeProperty('--border');
        r.style.removeProperty('--h-border');
        r.style.removeProperty('--blockquote-border');
        r.style.removeProperty('--blockquote-text');
    } else {
        const { color, tocBg, tocTitle, border, tocDivider, bqText } = accent.light;
        r.style.setProperty('--link', color);
        r.style.setProperty('--toc-link', color);
        r.style.setProperty('--nav-accent', color);
        r.style.setProperty('--scroll-bg', color);
        r.style.setProperty('--city-btn-active-bg', color);
        r.style.setProperty('--toc-bg', tocBg);
        r.style.setProperty('--toc-title', tocTitle);
        r.style.setProperty('--toc-divider', tocDivider);
        r.style.setProperty('--th-bg', tocBg);
        r.style.setProperty('--code-bg', tocBg);
        r.style.setProperty('--border', border);
        r.style.setProperty('--h-border', border);
        r.style.setProperty('--blockquote-border', border);
        r.style.setProperty('--blockquote-text', bqText);
    }
}

function _updateSettingsInPlace() {
    if (currentPage !== 'settings') return;
    const el = document.getElementById('content');
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const currentAccent = localStorage.getItem('accent') || 'red';
    el.querySelectorAll('[data-theme-btn]').forEach(btn => {
        const isActive = btn.dataset.themeBtn === currentTheme;
        btn.style.background = isActive ? 'var(--link)' : 'var(--toc-bg)';
        btn.style.color = isActive ? '#fff' : 'var(--text)';
        btn.style.fontWeight = isActive ? '600' : '500';
    });
    el.querySelectorAll('[data-accent]').forEach(btn => {
        const a = ACCENTS.find(a => a.id === btn.dataset.accent);
        if (!a) return;
        const isActive = btn.dataset.accent === currentAccent;
        btn.style.background = currentTheme === 'dark' ? a.dark.color : a.light.color;
        btn.style.border = isActive ? '3px solid var(--text)' : '2px solid rgba(0,0,0,0.1)';
        btn.style.outline = isActive ? '2px solid var(--bg)' : 'none';
    });
}

function applyAccent(id) {
    const accent = ACCENTS.find(a => a.id === id) || ACCENTS[0];
    localStorage.setItem('accent', id);
    _applyAccentColors(accent);
    _updateSettingsInPlace();
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'dark' ? '#0D1117' : '#FEFBF6');
    const savedAccent = localStorage.getItem('accent') || 'red';
    const accent = ACCENTS.find(a => a.id === savedAccent) || ACCENTS[0];
    _applyAccentColors(accent);
    _updateSettingsInPlace();
}
applyTheme(localStorage.getItem('theme') || 'light');

// ── Build nav ────────────────────────────────────────────────────────────────
const nav = document.getElementById('nav');
PAGES.forEach(p => {
    const btn = document.createElement('button');
    btn.dataset.file = p.file;
    btn.title = p.label;
    btn.innerHTML = '<span class="tab-icon"><i data-lucide="' + p.icon + '"></i></span>';
    if (p.file === currentPage) btn.classList.add('active');
    btn.addEventListener('click', () => {
        if (p.file === currentPage) {
            scroller.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        loadPage(p.file);
    });
    nav.appendChild(btn);
});
lucide.createIcons({ attrs: { 'stroke-width': '1.75' } });

// Checkbox state: loaded once, kept in memory
let checkboxState = {};
fetch(DB_URL + '/checkboxes.json')
    .then(r => r.json())
    .then(d => { if (d) checkboxState = d; })
    .catch(() => {});

function saveCheckbox(key, checked) {
    checkboxState[key] = checked;
    fetch(DB_URL + '/checkboxes/' + key + '.json', {
        method: 'PUT',
        body: JSON.stringify(checked)
    });
}

// ── Pre-load all pages into cache for search ─────────────────────────────────
async function ensureAllPagesCached() {
    await Promise.all(
        SEARCH_PAGES
            .filter(p => p.file !== 'settings' && p.file !== 'translate')
            .map(p => pageCache.has(p.file) ? null :
                fetch(BASE + p.file).then(r => r.text()).then(t => pageCache.set(p.file, t)).catch(() => {}))
    );
    // для поиска по translate — берём фразы из PHRASEBOOK
    if (!pageCache.has('translate')) {
        const phrasebookText = PHRASEBOOK.flatMap(c => c.phrases.map(p => `${p.ru} ${p.zh} ${p.pinyin} ${p.note || ''}`)).join('\n');
        pageCache.set('translate', phrasebookText);
    }
}

// ── Разговорник: карточки + озвучка ─────────────────────────────────────────
function speakChinese(text) {
    if (!window.speechSynthesis) return;

    // iOS PWA: синтез паузится при уходе в фон — принудительно возобновляем
    speechSynthesis.resume();
    if (speechSynthesis.speaking) speechSynthesis.cancel();

    const doSpeak = () => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'zh-CN';
        u.rate = 0.85;
        // Явно выбираем китайский голос если есть
        const voices = speechSynthesis.getVoices();
        const zhVoice = voices.find(v => v.lang.startsWith('zh'));
        if (zhVoice) u.voice = zhVoice;
        speechSynthesis.speak(u);
    };

    // Голоса могут ещё не загрузиться (особенно первый вызов)
    if (speechSynthesis.getVoices().length === 0) {
        speechSynthesis.onvoiceschanged = () => {
            speechSynthesis.onvoiceschanged = null;
            doSpeak();
        };
    } else {
        doSpeak();
    }
}

function transformPhrasebook(el, sectionOnly = false) {
    // Найти h2 "Разговорник" (если не передан уже готовый контент секции)
    let startNode;
    if (sectionOnly) {
        startNode = el.firstElementChild;
    } else {
        const h2s = Array.from(el.querySelectorAll('h2'));
        const pbH2 = h2s.find(h => h.textContent.trim() === 'Разговорник');
        if (!pbH2) return;
        startNode = pbH2.nextElementSibling;
    }

    // Собрать все h3 + table в этой секции
    let node = startNode;
    while (node && node.tagName !== 'H2') {
        if (node.tagName === 'TABLE') {
            const rows = Array.from(node.querySelectorAll('tbody tr'));
            const grid = document.createElement('div');
            grid.className = 'phrase-grid';

            rows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
                if (cells.length < 2) return;

                // Формат: Russian | Chinese | Pinyin | When
                const ru = cells[0];
                const zh = cells[1];
                const pinyin = cells[2] || '';
                const when = (cells[3] && cells[3] !== '—') ? cells[3] : '';

                const card = document.createElement('div');
                card.className = 'phrase-card';
                card.innerHTML = `
                    <div class="phrase-ru">${ru}</div>
                    <div class="phrase-zh">${zh}</div>
                    <div class="phrase-footer">
                        <span class="phrase-pinyin">${pinyin}</span>
                        <button class="phrase-show" title="Показать китайцу">👁</button>
                        <button class="phrase-play" title="Произношение">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                        </button>
                    </div>
                    ${when ? `<div class="phrase-when">${when}</div>` : ''}
                `;
                const playBtn = card.querySelector('.phrase-play');
                playBtn.addEventListener('click', () => {
                    playBtn.classList.add('speaking');
                    speakChinese(zh);
                    setTimeout(() => playBtn.classList.remove('speaking'), 2000);
                });
                card.querySelector('.phrase-show').addEventListener('click', () => {
                    showChineseOverlay(zh, pinyin, ru);
                });
                grid.appendChild(card);
            });

            node.replaceWith(grid);
            node = grid.nextElementSibling;
        } else {
            node = node.nextElementSibling;
        }
    }
}

// Рендер разговорника из PHRASEBOOK в контейнер
function renderPhrasebookFromData(phrasesEl) {
    phrasesEl.innerHTML = '';
    const intro = document.createElement('p');
    intro.innerHTML = '<b>Пиньинь</b> — латинская запись китайского произношения. Тоны: <b>ā</b> ровный, <b>á</b> восходящий, <b>ǎ</b> вниз-вверх, <b>à</b> резко вниз. Тоны важны — одно слово в разных тонах это разные слова. Нажми ▶ чтобы услышать.';
    phrasesEl.appendChild(intro);
    PHRASEBOOK.forEach(({ category, phrases }) => {
        const h3 = document.createElement('h3');
        h3.textContent = category;
        phrasesEl.appendChild(h3);
        const grid = document.createElement('div');
        grid.className = 'phrase-grid';
        phrasesEl.appendChild(grid);
        phrases.forEach(({ ru, zh, pinyin, note }) => {
            const when = (note && note !== '—') ? note : '';
            const card = document.createElement('div');
            card.className = 'phrase-card';
            card.innerHTML = `
                <div class="phrase-ru">${ru}</div>
                <div class="phrase-zh">${zh}</div>
                <div class="phrase-footer">
                    <span class="phrase-pinyin">${pinyin}</span>
                    <button class="phrase-show" title="Показать китайцу">👁</button>
                    <button class="phrase-play" title="Произношение">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                    </button>
                </div>
                ${when ? `<div class="phrase-when">${when}</div>` : ''}
            `;
            const playBtn = card.querySelector('.phrase-play');
            playBtn.addEventListener('click', () => {
                playBtn.classList.add('speaking');
                speakChinese(zh);
                setTimeout(() => playBtn.classList.remove('speaking'), 2000);
            });
            card.querySelector('.phrase-show').addEventListener('click', () => {
                showChineseOverlay(zh, pinyin, ru);
            });
            grid.appendChild(card);
        });
    });
}

// ── "Сегодня в маршруте" ─────────────────────────────────────────────────────
const RU_MONTHS = { 'янв':1,'фев':2,'мар':3,'апр':4,'май':5,'мая':5,'июн':6,'июл':7,'авг':8,'сен':9,'окт':10,'ноя':11,'дек':12 };

function findTodayH2(h2s) {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1; // 1-based
    const re = /(\d{1,2})\s+(янв|фев|мар|апр|май|мая|июн|июл|авг|сен|окт|ноя|дек)/i;
    return h2s.find(h2 => {
        const m = re.exec(h2.textContent);
        return m && parseInt(m[1]) === day && RU_MONTHS[m[2].toLowerCase()] === month;
    }) || null;
}

const todayToastEl = document.getElementById('today-toast');
let todayToastTimer = null;

function showTodayToast(h2, scrollFn) {
    const today = new Date().toDateString();
    if (sessionStorage.getItem('todayToastDate') === today) return;
    sessionStorage.setItem('todayToastDate', today);
    const title = h2.textContent.replace(/^[А-ЯЁа-яё\d]+:\s*/, '').trim(); // убираем "Ш1: "
    todayToastEl.textContent = '📍 Сегодня: ' + title;
    todayToastEl.classList.add('visible');
    todayToastEl.onclick = () => { hideTodayToast(); scrollFn(); };
    todayToastTimer = setTimeout(hideTodayToast, 5000);
}

function hideTodayToast() {
    todayToastEl.classList.remove('visible');
    clearTimeout(todayToastTimer);
}

// ── Chinese overlay ──────────────────────────────────────────────────────────
const chineseOverlay = document.getElementById('chinese-overlay');
let _brightnessLock = null;
let _prevBrightness = null;

async function showChineseOverlay(zh, pinyin, ru) {
    chineseOverlay.querySelector('.co-zh').textContent = zh;
    chineseOverlay.querySelector('.co-pinyin').textContent = pinyin;
    chineseOverlay.querySelector('.co-ru').textContent = ru;
    chineseOverlay.classList.add('visible');
    // Wake lock — экран не гаснет
    if (navigator.wakeLock) {
        _brightnessLock = await navigator.wakeLock.request('screen').catch(() => null);
    }
    // Яркость на максимум (работает в некоторых Android PWA)
    try {
        if (screen.brightness !== undefined) {
            _prevBrightness = screen.brightness;
            screen.brightness = 1.0;
        }
    } catch(e) {}
}

function hideChineseOverlay() {
    chineseOverlay.classList.remove('visible');
    if (_brightnessLock) { _brightnessLock.release().catch(() => {}); _brightnessLock = null; }
    // Восстанавливаем яркость
    try {
        if (_prevBrightness !== null && screen.brightness !== undefined) {
            screen.brightness = _prevBrightness;
            _prevBrightness = null;
        }
    } catch(e) {}
}

chineseOverlay.querySelector('.co-close').addEventListener('click', hideChineseOverlay);
chineseOverlay.addEventListener('click', e => { if (e.target === chineseOverlay) hideChineseOverlay(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideChineseOverlay(); });

// ── Modal ────────────────────────────────────────────────────────────────────
function showModal(title, bodyHtml) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:flex-end;justify-content:center;padding:0';
    const sheet = document.createElement('div');
    sheet.style.cssText = 'background:var(--bg);border-radius:20px 20px 0 0;padding:24px 20px 40px;max-width:480px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 -4px 24px rgba(0,0,0,.15);overscroll-behavior:contain';
    sheet.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
        + '<strong style="font-size:17px">' + title + '</strong>'
        + '<button style="border:none;background:none;font-size:22px;cursor:pointer;color:var(--text-muted);padding:0;line-height:1" id="_modal-close">×</button>'
        + '</div>' + bodyHtml;
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    // Блокируем скролл фона
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    overlay.addEventListener('touchmove', e => { e.preventDefault(); }, { passive: false });
    let _touchStartY = 0;
    sheet.addEventListener('touchstart', e => { _touchStartY = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener('touchmove', e => {
        e.stopPropagation();
        const dy = e.touches[0].clientY - _touchStartY;
        const atTop = sheet.scrollTop === 0;
        const atBottom = sheet.scrollTop + sheet.clientHeight >= sheet.scrollHeight - 1;
        if ((atTop && dy > 0) || (atBottom && dy < 0)) e.preventDefault();
    }, { passive: false });

    const close = () => {
        document.body.style.overflow = prevOverflow;
        overlay.remove();
    };
    sheet.querySelector('#_modal-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

// ── Toast ────────────────────────────────────────────────────────────────────
const toast = document.getElementById('toast');
let toastTimer = null;

function showToast(msg, onClick, duration) {
    toast.textContent = msg;
    toast.classList.add('visible');
    toast.classList.toggle('clickable', !!onClick);
    toast._onClick = onClick || null;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('visible', 'clickable');
        toast._onClick = null;
    }, duration || 5000);
}
toast.addEventListener('click', () => {
    if (toast._onClick) {
        toast._onClick();
        toast.classList.remove('visible', 'clickable');
        if (toastTimer) clearTimeout(toastTimer);
    }
});

// ── loadPage ─────────────────────────────────────────────────────────────────
async function loadPage(file, opts = {}) {
    if (!opts.skipSave && currentPage) {
        const saveKey = currentPage === 'explore' ? 'explore-' + exploreTab
            : currentPage === 'translate' && translateTab === 'phrases' ? 'translate-phrases'
            : currentPage;
        tabScrollY.set(saveKey, scroller.scrollTop);
    }
    currentPage = file;
    nav.querySelectorAll('button').forEach(b => {
        b.classList.toggle('active', b.dataset.file === file);
    });
    location.replace('#' + file.replace('.md', ''));

    const el = document.getElementById('content');

    // Универсальная очистка fixed tab bar и Bing iframe при любом переходе
    document.getElementById('page-tabbar')?.remove();
    document.getElementById('bing-iframe')?.remove();
    scroller.style.paddingTop = '';

    // ── explore ──
    if (file === 'explore') {
        if (opts.subTab) exploreTab = opts.subTab;
        const actualFile = exploreTab === 'places' ? 'places.md' : 'info.md';

        el.classList.remove('translate-mode');
        el.style.display = '';
        scroller.style.overflow = '';

        const renderExplore = async () => {
            const makeTabStyle = (active) =>
                'padding:6px 16px;border-radius:20px;border:1.5px solid ' + (active ? 'var(--link)' : 'var(--border)') + ';'
                + 'background:' + (active ? 'var(--link)' : 'transparent') + ';'
                + 'color:' + (active ? '#fff' : 'var(--text-muted)') + ';'
                + 'font-size:13px;cursor:pointer;font-weight:' + (active ? '600' : '400');

            // Таббар — фиксированный элемент в body над скроллером
            document.getElementById('page-tabbar')?.remove();
            const tabBarEl = document.createElement('div');
            tabBarEl.id = 'page-tabbar';
            tabBarEl.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:50;background:var(--bg);display:flex;gap:8px;padding:calc(env(safe-area-inset-top, 0px) + 10px) 12px 8px';
            tabBarEl.innerHTML =
                '<button data-etab="info" style="' + makeTabStyle(exploreTab === 'info') + '">Инфо</button>'
                + '<button data-etab="places" style="' + makeTabStyle(exploreTab === 'places') + '">Места</button>';
            document.body.insertBefore(tabBarEl, scroller);
            // Сдвигаем скроллер вниз на высоту таббара
            requestAnimationFrame(() => { scroller.style.paddingTop = tabBarEl.offsetHeight + 'px'; });

            if (!pageCache.has(actualFile)) scroller.scrollTop = 0;
            el.innerHTML = '';

            tabBarEl.querySelectorAll('[data-etab]').forEach(btn => {
                btn.addEventListener('click', () => {
                    tabScrollY.set('explore-' + exploreTab, scroller.scrollTop);
                    exploreTab = btn.dataset.etab;
                    loadPage('explore', { skipSave: true, subTab: exploreTab });
                });
            });

            try {
                const mdText = pageCache.has(actualFile)
                    ? pageCache.get(actualFile)
                    : await fetch(BASE + actualFile).then(r => r.text()).then(t => { pageCache.set(actualFile, t); return t; });

                marked.setOptions({ breaks: true, gfm: true });
                const mdDiv = document.createElement('div');
                mdDiv.innerHTML = marked.parse(mdText);
                el.appendChild(mdDiv);

                transformPhrasebook(mdDiv);

                const h1s = Array.from(mdDiv.querySelectorAll('h1'));
                const h2s = Array.from(mdDiv.querySelectorAll('h2'));

                function getAnchorId(heading) {
                    let prev = heading.previousElementSibling;
                    if (prev && prev.tagName === 'A' && prev.id) return prev.id;
                    if (prev) { prev = prev.previousElementSibling; if (prev && prev.tagName === 'A' && prev.id) return prev.id; }
                    return null;
                }

                if (h1s.length > 1) {
                    h1s[0].style.display = 'none';
                    const cityNavH1s = h1s.slice(1);
                    const cityNav = document.createElement('div');
                    cityNav.className = 'city-nav scrollable';

                    const todayH2 = findTodayH2(h2s);
                    if (todayH2) {
                        const scrollToToday = () => {
                            const elTop = todayH2.getBoundingClientRect().top
                                - scroller.getBoundingClientRect().top
                                + scroller.scrollTop;
                            scroller.scrollTop = Math.max(0, elTop - 80);
                        };
                        const todayBtn = document.createElement('button');
                        todayBtn.textContent = 'Сегодня';
                        todayBtn.className = 'today-btn';
                        todayBtn.addEventListener('click', scrollToToday);
                        cityNav.appendChild(todayBtn);
                        showTodayToast(todayH2, scrollToToday);
                    }

                    cityNavH1s.forEach(h1 => {
                        const btn = document.createElement('button');
                        btn.textContent = h1.textContent.split('(')[0].trim();
                        btn.addEventListener('click', () => h1.scrollIntoView({ behavior: 'instant' }));
                        cityNav.appendChild(btn);
                    });
                    mdDiv.insertBefore(cityNav, mdDiv.firstChild);

                    h1s.forEach((h1, cityIdx) => {
                        const nextH1 = h1s[cityIdx + 1];
                        const cityH2s = h2s.filter(h2 => {
                            const after = h1.compareDocumentPosition(h2) & Node.DOCUMENT_POSITION_FOLLOWING;
                            const before = !nextH1 || (nextH1.compareDocumentPosition(h2) & Node.DOCUMENT_POSITION_PRECEDING);
                            return after && before;
                        });
                        if (cityH2s.length === 0) return;
                        const toc = document.createElement('div');
                        toc.className = 'toc-block';
                        toc.innerHTML = '<div class="toc-title">Содержание</div>';
                        cityH2s.forEach(h2 => {
                            const anchorId = getAnchorId(h2);
                            const a = document.createElement('a');
                            a.textContent = h2.textContent;
                            a.href = anchorId ? '#' + anchorId : '#';
                            a.addEventListener('click', e => {
                                e.preventDefault();
                                h2.scrollIntoView({ behavior: 'instant' });
                            });
                            toc.appendChild(a);
                        });
                        let insertAfter = h1.nextElementSibling;
                        while (insertAfter && insertAfter.tagName !== 'H2' && insertAfter.tagName !== 'A' && insertAfter.tagName !== 'H1') {
                            insertAfter = insertAfter.nextElementSibling;
                        }
                        if (insertAfter) insertAfter.parentNode.insertBefore(toc, insertAfter);
                        else h1.after(toc);
                    });
                } else {
                    if (h2s.length > 2) {
                        const toc = document.createElement('div');
                        toc.className = 'toc-block';
                        toc.innerHTML = '<div class="toc-title">Содержание</div>';
                        h2s.forEach(h => {
                            const a = document.createElement('a');
                            a.textContent = h.textContent;
                            a.addEventListener('click', e => { e.preventDefault(); h.scrollIntoView({ behavior: 'instant' }); });
                            toc.appendChild(a);
                        });
                        mdDiv.insertBefore(toc, mdDiv.querySelector('h2') || mdDiv.firstChild);
                    }
                }

                mdDiv.querySelectorAll('a[href*=".md#"]').forEach(a => {
                    a.classList.add('cross-link');
                    a.addEventListener('click', e => {
                        e.preventDefault();
                        const href = a.getAttribute('href');
                        const [targetFile, targetId] = href.split('#');
                        loadPage(targetFile, { skipSave: true }).then(() => {
                            setTimeout(() => {
                                const target = document.getElementById(targetId);
                                if (target) target.scrollIntoView({ behavior: 'instant' });
                            }, 200);
                        });
                    });
                });

                mdDiv.querySelectorAll('td').forEach(td => {
                    if (/^[\s\*]*[\d¥₽\s,.—–]+[\s\*]*$/.test(td.textContent.trim())) {
                        td.classList.add('num');
                    }
                });

                // Поиск-хайлайт
                if (opts.searchQuery) {
                    scroller.scrollTop = 0;
                    requestAnimationFrame(() => {
                        const blocks = Array.from(el.querySelectorAll('h1,h2,h3,h4,p,li,td,blockquote,.phrase-ru'));
                        const qWords = opts.searchQuery.trim().split(/\s+/).filter(Boolean);
                        const qWordRes = qWords.map(w => new RegExp(escapeRe(w), 'i'));

                        function ngramScore(b) {
                            if (!opts.searchSnippet) return 0;
                            const bText = b.textContent.toLowerCase();
                            const sWords = (opts.searchSnippet.toLowerCase().match(/[а-яёa-z0-9]+/gi) || []);
                            let hits = 0;
                            for (let i = 0; i < sWords.length - 1; i++) {
                                if (bText.includes(sWords[i] + ' ' + sWords[i + 1])) hits++;
                            }
                            for (let i = 0; i < sWords.length - 2; i++) {
                                if (bText.includes(sWords[i] + ' ' + sWords[i + 1] + ' ' + sWords[i + 2])) hits += 2;
                            }
                            return hits;
                        }

                        let target = null;
                        if (opts.searchSnippet) {
                            let bestScore = 0;
                            for (const b of blocks) {
                                const s = ngramScore(b);
                                if (s > bestScore) { bestScore = s; target = b; }
                            }
                        }
                        if (!target) {
                            const allMatch = blocks.filter(b => qWordRes.every(re => re.test(b.textContent)));
                            const anyMatch = blocks.filter(b => qWordRes.some(re => re.test(b.textContent)));
                            const candidates = allMatch.length ? allMatch : anyMatch;
                            if (candidates.length) target = candidates[0];
                        }
                        if (target) {
                            const elTop = target.getBoundingClientRect().top
                                - scroller.getBoundingClientRect().top
                                + scroller.scrollTop;
                            scroller.scrollTop = Math.max(0, elTop - 80);
                            target.classList.add('search-flash');
                            target.addEventListener('animationend', () => target.classList.remove('search-flash'), { once: true });
                        }
                        updateStickyHeader();
                    });
                } else {
                    // восстанавливаем скролл и при навигации, и при переключении сабтаба
                    requestAnimationFrame(() => {
                        scroller.scrollTop = tabScrollY.get('explore-' + exploreTab) || 0;
                        updateStickyHeader();
                    });
                }
            } catch(err) {
                el.innerHTML = '<p style="color:red">Failed to load: ' + err.message + '</p>';
            }
        };

        await renderExplore();
        return;
    }

    if (file === 'translate') {
        el.classList.remove('translate-mode');
        el.removeAttribute('style');
        scroller.style.overflow = '';

        const renderTranslate = () => {
            document.getElementById('bing-iframe')?.remove();
            el.removeAttribute('style');
            scroller.style.overflow = '';

            const makeTabStyle = (active) =>
                'padding:6px 16px;border-radius:20px;border:1.5px solid ' + (active ? 'var(--link)' : 'var(--border)') + ';'
                + 'background:' + (active ? 'var(--link)' : 'transparent') + ';'
                + 'color:' + (active ? '#fff' : 'var(--text-muted)') + ';'
                + 'font-size:13px;cursor:pointer;font-weight:' + (active ? '600' : '400');

            // Fixed tab bar — тот же паттерн что explore
            document.getElementById('page-tabbar')?.remove();
            const tabBarEl = document.createElement('div');
            tabBarEl.id = 'page-tabbar';
            tabBarEl.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:50;background:var(--bg);display:flex;gap:8px;padding:calc(env(safe-area-inset-top, 0px) + 10px) 12px 8px';
            tabBarEl.innerHTML =
                '<button data-ttab="phrases" style="' + makeTabStyle(translateTab === 'phrases') + '">Разговорник</button>'
                + '<button data-ttab="bing" style="' + makeTabStyle(translateTab === 'bing') + '">Переводчик</button>';
            document.body.insertBefore(tabBarEl, scroller);

            tabBarEl.querySelectorAll('[data-ttab]').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (translateTab === 'phrases') tabScrollY.set('translate-phrases', scroller.scrollTop);
                    translateTab = btn.dataset.ttab;
                    renderTranslate();
                });
            });

            if (translateTab === 'bing') {
                el.innerHTML = '';
                requestAnimationFrame(() => {
                    const tabH = tabBarEl.offsetHeight;
                    scroller.style.paddingTop = tabH + 'px';
                    scroller.style.overflow = 'hidden';
                    el.style.padding = '0';
                    el.style.height = 'calc(100dvh - ' + tabH + 'px - var(--nav-h) - env(safe-area-inset-bottom, 0px))';
                    el.innerHTML = '<iframe id="bing-iframe" src="https://translate.bing.com/?from=ru&to=zh-Hans" style="width:100%;height:100%;border:none;display:block;border-radius:10px" allow="clipboard-read; clipboard-write; camera; microphone"></iframe>';
                });
            } else {
                el.innerHTML = '';
                renderPhrasebookFromData(el);
                requestAnimationFrame(() => {
                    scroller.style.paddingTop = tabBarEl.offsetHeight + 'px';
                    scroller.scrollTop = tabScrollY.get('translate-phrases') || 0;
                });
            }
        };

        renderTranslate();

        // Подсветка результата поиска в разговорнике
        if (opts.searchQuery && translateTab === 'phrases') {
            requestAnimationFrame(() => {
                const blocks = Array.from(el.querySelectorAll('h3,p,.phrase-ru,.phrase-card'));
                const qWords = opts.searchQuery.trim().split(/\s+/).filter(Boolean);
                const qWordRes = qWords.map(w => new RegExp(escapeRe(w), 'i'));

                let target = null;
                if (opts.searchSnippet) {
                    const sWords = (opts.searchSnippet.toLowerCase().match(/[а-яёa-z0-9]+/gi) || []);
                    let bestScore = 0;
                    for (const b of blocks) {
                        const bText = b.textContent.toLowerCase();
                        let hits = 0;
                        for (let i = 0; i < sWords.length - 1; i++) {
                            if (bText.includes(sWords[i] + ' ' + sWords[i + 1])) hits++;
                        }
                        if (hits > bestScore) { bestScore = hits; target = b; }
                    }
                }
                if (!target) {
                    const allMatch = blocks.filter(b => qWordRes.every(re => re.test(b.textContent)));
                    const anyMatch = blocks.filter(b => qWordRes.some(re => re.test(b.textContent)));
                    target = (allMatch.length ? allMatch : anyMatch)[0] || null;
                }
                if (target) {
                    const elTop = target.getBoundingClientRect().top
                        - scroller.getBoundingClientRect().top
                        + scroller.scrollTop;
                    scroller.scrollTop = Math.max(0, elTop - 80);
                    target.classList.add('search-flash');
                    target.addEventListener('animationend', () => target.classList.remove('search-flash'), { once: true });
                }
            });
        }
        return;
    }

    el.classList.remove('translate-mode');
    el.removeAttribute('style');
    scroller.style.overflow = '';

    if (file === 'settings') {
        const v = APP_VERSION;
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const currentAccent = localStorage.getItem('accent') || 'red';

        const accentSwatches = ACCENTS.map(a => {
            const color = currentTheme === 'dark' ? a.dark.color : a.light.color;
            const isActive = a.id === currentAccent;
            return '<button data-accent="' + a.id + '" title="' + a.label + '" style="'
                + 'width:36px;height:36px;border-radius:50%;cursor:pointer;'
                + 'background:' + color + ';'
                + 'border:' + (isActive ? '3px solid var(--text)' : '2px solid rgba(0,0,0,0.1)') + ';'
                + 'outline:' + (isActive ? '2px solid var(--bg)' : 'none') + ';outline-offset:-5px;'
                + 'box-shadow:0 2px 8px rgba(0,0,0,0.18);-webkit-tap-highlight-color:transparent'
                + '"></button>';
        }).join('');

        const themeRowStyle = 'flex:1;padding:10px;border-radius:10px;border:none;font-size:15px;cursor:pointer;font-weight:500;-webkit-tap-highlight-color:transparent;transition:background 0.15s,color 0.15s;';
        const lightActive = currentTheme === 'light';
        const darkActive = currentTheme === 'dark';

        el.innerHTML = '<h1>Настройки</h1>'
            + '<div class="city-nav" id="settings-tabs">'
            + '<button class="active" data-tab="info">Версия</button>'
            + '<button data-tab="appearance">Вид</button>'
            + '<button data-tab="console">Консоль</button>'
            + '</div>'

            + '<div id="settings-appearance" style="display:none">'
            + '<p style="margin:0 0 10px;font-weight:600;color:var(--text-muted);font-size:0.8em;text-transform:uppercase;letter-spacing:0.5px">Тема</p>'
            + '<div style="display:flex;gap:8px;margin-bottom:24px">'
            + '<button data-theme-btn="light" style="' + themeRowStyle + 'background:' + (lightActive ? 'var(--link)' : 'var(--toc-bg)') + ';color:' + (lightActive ? '#fff' : 'var(--text)') + '">☀️ Светлая</button>'
            + '<button data-theme-btn="dark" style="' + themeRowStyle + 'background:' + (darkActive ? 'var(--link)' : 'var(--toc-bg)') + ';color:' + (darkActive ? '#fff' : 'var(--text)') + '">🌙 Тёмная</button>'
            + '</div>'
            + '<p style="margin:0 0 12px;font-weight:600;color:var(--text-muted);font-size:0.8em;text-transform:uppercase;letter-spacing:0.5px">Цвет акцента</p>'
            + '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">' + accentSwatches + '</div>'
            + '</div>'

            + '<div id="settings-info">'
            + (updateAvailable ? '<div style="margin-top:12px;padding:12px 14px;border-radius:8px;background:#fff3cd;border:1px solid #ffc107;color:#856404;font-weight:600">🔔 Доступна новая версия</div>' : '')
            + '<table style="margin-top:12px;width:100%"><tr><th>Версия</th><td>' + v + (updateAvailable && latestVersion ? ' → ' + latestVersion : '') + '</td></tr></table>'
            + '<button id="update-btn" style="margin-top:20px;width:100%;padding:12px;border-radius:8px;border:none;background:var(--link);color:#fff;font-size:15px;font-weight:600;cursor:pointer">' + (updateAvailable ? '🔄 Установить обновление' : 'Обновить приложение') + '</button>'
            + '<button id="clear-cache-btn" style="margin-top:10px;width:100%;padding:10px;border-radius:8px;border:1.5px solid var(--border);background:transparent;color:var(--text-muted);font-size:14px;cursor:pointer">Очистить кэш</button>'
            + (() => {
                const searchOn = localStorage.getItem('search') === 'on';
                const smartOn = localStorage.getItem('smartSearch') === 'on';
                const mkToggle = (id, thumbId, on) =>
                    '<label style="position:relative;display:inline-block;width:44px;height:26px;flex-shrink:0">'
                    + '<input type="checkbox" id="' + id + '" style="opacity:0;width:0;height:0"' + (on ? ' checked' : '') + '>'
                    + '<span id="' + thumbId + '" style="position:absolute;inset:0;border-radius:13px;background:' + (on ? 'var(--link)' : 'var(--toggle-bg)') + ';transition:.2s;cursor:pointer"></span>'
                    + '<span style="position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:.2s;transform:' + (on ? 'translateX(18px)' : 'translateX(0)') + ';pointer-events:none"></span>'
                    + '</label>';
                return '<div style="margin-top:16px;border-radius:8px;background:var(--toc-bg);border:1px solid var(--border);overflow:hidden">'
                    // Parent: Поиск
                    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px">'
                    + '<div style="font-weight:600;font-size:15px">Поиск</div>'
                    + mkToggle('search-toggle', 'search-thumb', searchOn)
                    + '</div>'
                    // Child: Умный поиск (indented, grayed when search off)
                    + '<div id="smart-search-section" style="border-top:1px solid var(--border);transition:opacity .2s;' + (!searchOn ? 'opacity:0.4;pointer-events:none;' : '') + '">'
                    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px 10px 28px">'
                    + '<div><div style="font-weight:600;font-size:14px;display:flex;align-items:center;gap:6px">Умный поиск<button id="smart-search-info-btn" style="width:18px;height:18px;border-radius:50%;border:1.5px solid var(--text-muted);background:transparent;color:var(--text-muted);font-size:11px;font-weight:700;cursor:pointer;padding:0;line-height:1;flex-shrink:0">i</button></div><div style="font-size:12px;color:var(--text-muted);margin-top:2px">ML-модель, поиск по смыслу</div></div>'
                    + mkToggle('smart-search-toggle', 'smart-search-thumb', smartOn)
                    + '</div>'
                    + '<div style="border-top:1px solid var(--border);padding:8px 14px;display:flex;align-items:center;gap:8px">'
                    + '<div id="model-status-text" style="font-size:12px;color:var(--text-muted);flex:1">⏳ Проверка модели…</div>'
                    + '</div>'
                    + '<div style="border-top:1px solid var(--border);padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px">'
                    + '<div id="semantic-status-text" style="font-size:13px;color:var(--text-muted)">' + getSemanticStatusText() + '</div>'
                    + '<button id="semantic-index-btn" style="padding:6px 14px;border-radius:6px;border:1.5px solid var(--link);background:transparent;color:var(--link);font-size:13px;cursor:pointer;white-space:nowrap;flex-shrink:0" ' + (semanticIndexing ? 'disabled' : '') + '>' + getSemanticBtnText() + '</button>'
                    + '</div>'
                    + '</div>'
                    + '</div>';
            })()
            + '</div>' // закрываем settings-info

            + '<div id="settings-console" style="display:none"><div style="padding:8px 0 4px;display:flex;justify-content:flex-end"><button id="copy-log-btn" style="padding:4px 12px;border-radius:6px;border:1.5px solid var(--border);background:transparent;color:var(--text-muted);font-size:12px;cursor:pointer">Скопировать</button></div><div id="console-log" style="font-family:monospace;font-size:11px;white-space:pre-wrap;word-break:break-all;padding:4px 0;min-height:200px"></div></div>';

        el.querySelector('#settings-tabs').addEventListener('click', e => {
            const btn = e.target.closest('button');
            if (!btn) return;
            el.querySelectorAll('#settings-tabs button').forEach(b => b.classList.toggle('active', b === btn));
            el.querySelector('#settings-appearance').style.display = btn.dataset.tab === 'appearance' ? '' : 'none';
            el.querySelector('#settings-info').style.display = btn.dataset.tab === 'info' ? '' : 'none';
            el.querySelector('#settings-console').style.display = btn.dataset.tab === 'console' ? '' : 'none';
            if (btn.dataset.tab === 'console') {
                renderConsoleLog();
                el.querySelector('#copy-log-btn').onclick = () => {
                    const text = _consoleLogs.slice().reverse().map(e => e.ts + ' [' + e.level + '] ' + e.text).join('\n');
                    navigator.clipboard.writeText(text).then(() => showToast('📋 Скопировано', null, 1500));
                };
            }
        });

        el.querySelectorAll('[data-theme-btn]').forEach(btn => {
            btn.addEventListener('click', () => applyTheme(btn.dataset.themeBtn));
        });

        el.querySelectorAll('[data-accent]').forEach(btn => {
            btn.addEventListener('click', () => applyAccent(btn.dataset.accent));
        });

        el.querySelector('#smart-search-info-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            showModal(
                'Умный поиск',
                '<p style="margin:0 0 12px">Обычный поиск ищет точное совпадение слов. Умный поиск понимает <strong>смысл</strong> запроса — находит релевантные фрагменты даже если слова не совпадают.</p>'
                + '<p style="margin:0 0 12px">Например, по запросу <em>«животные»</em> найдёт текст про панд и тигров, хотя слова «животные» там нет.</p>'
                + '<p style="margin:0 0 12px">Работает <strong>офлайн</strong> — ML-модель (~50 МБ) скачивается один раз и кэшируется. В Китае интернет не нужен.</p>'
                + '<p style="margin:0 0 4px"><strong>Как использовать:</strong></p>'
                + '<ol style="margin:0;padding-left:20px;line-height:1.8">'
                + '<li>Включите тогл «Умный поиск» здесь в настройках</li>'
                + '<li>Нажмите «Запустить индексацию» — займёт минуту при первом запуске</li>'
                + '<li>После завершения результаты по смыслу появятся автоматически под обычными</li>'
                + '<li>Индекс сохраняется и загружается при следующих запусках</li>'
                + '<li>При обновлении приложения до новой версии индекс сбрасывается — нужно переиндексировать</li>'
                + '</ol>'
            );
        });

        el.querySelector('#search-toggle').addEventListener('change', function() {
            const on = this.checked;
            localStorage.setItem('search', on ? 'on' : 'off');
            const thumb = el.querySelector('#search-thumb');
            const knob = thumb.nextElementSibling;
            thumb.style.background = on ? 'var(--link)' : 'var(--toggle-bg)';
            knob.style.transform = on ? 'translateX(18px)' : 'translateX(0)';
            const section = el.querySelector('#smart-search-section');
            section.style.opacity = on ? '' : '0.4';
            section.style.pointerEvents = on ? '' : 'none';
            if (!on) {
                document.querySelectorAll('#search-results > div[data-semantic-pending], #search-results > div[data-semantic-section]').forEach(e => e.remove());
            }
        });

        el.querySelector('#smart-search-toggle').addEventListener('change', function() {
            const on = this.checked;
            localStorage.setItem('smartSearch', on ? 'on' : 'off');
            const thumb = el.querySelector('#smart-search-thumb');
            const knob = thumb.nextElementSibling;
            thumb.style.background = on ? 'var(--link)' : 'var(--toggle-bg)';
            knob.style.transform = on ? 'translateX(18px)' : 'translateX(0)';
            if (on) {
                triggerSemanticIfSearchOpen();
            } else {
                document.querySelectorAll('#search-results > div[data-semantic-pending], #search-results > div[data-semantic-section]').forEach(el => el.remove());
            }
        });

        el.querySelector('#update-btn').addEventListener('click', async function() {
            this.textContent = 'Проверяю...';
            this.disabled = true;
            if (swReg?.waiting) {
                swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else if (swReg) {
                try { await swReg.update(); } catch(e) {}
                setTimeout(() => {
                    if (!updateAvailable) {
                        this.textContent = updateAvailable ? '🔄 Установить обновление' : 'Обновить приложение';
                        this.disabled = false;
                        showToast('✅ Версия актуальна', null, 2500);
                    }
                }, 3000);
            } else {
                location.reload();
            }
        });

        refreshModelStatus();

        el.querySelector('#semantic-index-btn').addEventListener('click', async function() {
            if (semanticIndexing) return;
            semanticReady = false;
            semanticIndex = [];
            try {
                const db = await idbOpen();
                const tx = db.transaction(IDB_STORE, 'readwrite');
                tx.objectStore(IDB_STORE).clear();
                await new Promise(r => { tx.oncomplete = r; });
            } catch(e) { console.warn('IDB clear failed:', e); }
            refreshSemanticStatus();
            startBackgroundIndexing();
            const poll = setInterval(() => {
                refreshSemanticStatus();
                if (!semanticIndexing) clearInterval(poll);
            }, 500);
        });

        el.querySelector('#clear-cache-btn').addEventListener('click', async function() {
            this.textContent = 'Очищаю...';
            this.disabled = true;
            try { await caches.delete('china-trip-models'); } catch(e) {}
            try {
                const db = await idbOpen();
                const tx = db.transaction(IDB_STORE, 'readwrite');
                tx.objectStore(IDB_STORE).clear();
                await new Promise(r => { tx.oncomplete = r; });
            } catch(e) { console.warn('IDB clear failed:', e); }
            semanticReady = false;
            semanticIndex = [];
            semanticIndexing = false;
            modelLoaded = false;
            refreshSemanticStatus();
            refreshModelStatus();
            this.textContent = 'Очистить кэш';
            this.disabled = false;
            showToast('🗑 Кэш очищен', null, 2500);
        });

        requestAnimationFrame(() => {
            scroller.scrollTop = tabScrollY.get(file) || 0;
            updateStickyHeader();
        });
        return;
    }

    // ── Обычные md-страницы (plan.md, checklist.md, budget.md) ──
    const cached = pageCache.has(file);
    if (!cached) {
        el.innerHTML = '<div id="loading"><div class="spinner"></div><div>Loading...</div></div>';
        scroller.scrollTop = 0;
    }

    try {
        const mdText = pageCache.has(file)
            ? pageCache.get(file)
            : await fetch(BASE + file).then(r => r.text()).then(t => { pageCache.set(file, t); return t; });
        const state = checkboxState;

        marked.setOptions({ breaks: true, gfm: true });
        let html = marked.parse(mdText);

        let idx = 0;
        html = html.replace(/<li><input\s[^>]*type="checkbox"[^>]*>\s*/gi, (match) => {
            const key = file.replace('.md', '') + '_' + idx;
            const i = idx++;
            const checked = state[key] !== undefined ? state[key] : /checked/i.test(match);
            return '<li class="task-list-item' + (checked ? ' checked' : '') + '"><input type="checkbox" data-key="' + key + '"' + (checked ? ' checked' : '') + '> <span class="task-text">';
        });

        el.innerHTML = html;

        // Ленивая подгрузка картинок
        el.querySelectorAll('img').forEach(img => { img.loading = 'lazy'; });

        transformPhrasebook(el);

        const h1s = Array.from(el.querySelectorAll('h1'));
        const h2s = Array.from(el.querySelectorAll('h2'));

        function getAnchorId(heading) {
            let prev = heading.previousElementSibling;
            if (prev && prev.tagName === 'A' && prev.id) return prev.id;
            if (prev) { prev = prev.previousElementSibling; if (prev && prev.tagName === 'A' && prev.id) return prev.id; }
            return null;
        }

        if (h1s.length > 1) {
            h1s[0].style.display = 'none';
            const cityNavH1s = h1s.slice(1);
            const cityNav = document.createElement('div');
            cityNav.className = 'city-nav scrollable';

            const todayH2 = findTodayH2(h2s);
            if (todayH2) {
                const scrollToToday = () => {
                    const elTop = todayH2.getBoundingClientRect().top
                        - scroller.getBoundingClientRect().top
                        + scroller.scrollTop;
                    scroller.scrollTop = Math.max(0, elTop - 80);
                };
                const todayBtn = document.createElement('button');
                todayBtn.textContent = 'Сегодня';
                todayBtn.className = 'today-btn';
                todayBtn.addEventListener('click', scrollToToday);
                cityNav.appendChild(todayBtn);
                showTodayToast(todayH2, scrollToToday);
            }

            cityNavH1s.forEach(h1 => {
                const btn = document.createElement('button');
                btn.textContent = h1.textContent.split('(')[0].trim();
                btn.addEventListener('click', () => h1.scrollIntoView({ behavior: 'instant' }));
                cityNav.appendChild(btn);
            });
            el.insertBefore(cityNav, el.firstChild);

            h1s.forEach((h1, cityIdx) => {
                const nextH1 = h1s[cityIdx + 1];
                const cityH2s = h2s.filter(h2 => {
                    const after = h1.compareDocumentPosition(h2) & Node.DOCUMENT_POSITION_FOLLOWING;
                    const before = !nextH1 || (nextH1.compareDocumentPosition(h2) & Node.DOCUMENT_POSITION_PRECEDING);
                    return after && before;
                });
                if (cityH2s.length === 0) return;
                const toc = document.createElement('div');
                toc.className = 'toc-block';
                toc.innerHTML = '<div class="toc-title">Содержание</div>';
                cityH2s.forEach(h2 => {
                    const anchorId = getAnchorId(h2);
                    const a = document.createElement('a');
                    a.textContent = h2.textContent;
                    a.href = anchorId ? '#' + anchorId : '#';
                    a.addEventListener('click', e => {
                        e.preventDefault();
                        h2.scrollIntoView({ behavior: 'instant' });
                    });
                    toc.appendChild(a);
                });
                let insertAfter = h1.nextElementSibling;
                while (insertAfter && insertAfter.tagName !== 'H2' && insertAfter.tagName !== 'A' && insertAfter.tagName !== 'H1') {
                    insertAfter = insertAfter.nextElementSibling;
                }
                if (insertAfter) insertAfter.parentNode.insertBefore(toc, insertAfter);
                else h1.after(toc);
            });
        } else {
            if (h2s.length > 2) {
                const toc = document.createElement('div');
                toc.className = 'toc-block';
                toc.innerHTML = '<div class="toc-title">Содержание</div>';
                h2s.forEach(h => {
                    const a = document.createElement('a');
                    a.textContent = h.textContent;
                    a.addEventListener('click', e => { e.preventDefault(); h.scrollIntoView({ behavior: 'instant' }); });
                    toc.appendChild(a);
                });
                el.insertBefore(toc, el.querySelector('h2') || el.firstChild);
            }
        }

        el.querySelectorAll('a[href*=".md#"]').forEach(a => {
            a.classList.add('cross-link');
            a.addEventListener('click', e => {
                e.preventDefault();
                const href = a.getAttribute('href');
                const [targetFile, targetId] = href.split('#');
                loadPage(targetFile, { skipSave: true }).then(() => {
                    setTimeout(() => {
                        const target = document.getElementById(targetId);
                        if (target) target.scrollIntoView({ behavior: 'instant' });
                    }, 200);
                });
            });
        });

        el.querySelectorAll('td').forEach(td => {
            if (/^[\s\*]*[\d¥₽\s,.—–]+[\s\*]*$/.test(td.textContent.trim())) {
                td.classList.add('num');
            }
        });

        el.querySelectorAll('.task-list-item').forEach(li => {
            const span = li.querySelector('span.task-text');
            if (span) {
                while (span.nextSibling) span.appendChild(span.nextSibling);
            }
        });

        el.addEventListener('change', e => {
            if (e.target.matches('.task-list-item input[type="checkbox"]')) {
                const checked = e.target.checked;
                const key = e.target.dataset.key;
                saveCheckbox(key, checked);
                e.target.closest('.task-list-item').classList.toggle('checked', checked);
            }
        });

        if (opts.searchQuery) {
            scroller.scrollTop = 0;
            requestAnimationFrame(() => {
                const blocks = Array.from(el.querySelectorAll('h1,h2,h3,h4,p,li,td,blockquote,.phrase-ru'));
                const qWords = opts.searchQuery.trim().split(/\s+/).filter(Boolean);
                const qWordRes = qWords.map(w => new RegExp(escapeRe(w), 'i'));

                function ngramScore(b) {
                    if (!opts.searchSnippet) return 0;
                    const bText = b.textContent.toLowerCase();
                    const sWords = (opts.searchSnippet.toLowerCase().match(/[а-яёa-z0-9]+/gi) || []);
                    let hits = 0;
                    for (let i = 0; i < sWords.length - 1; i++) {
                        if (bText.includes(sWords[i] + ' ' + sWords[i + 1])) hits++;
                    }
                    for (let i = 0; i < sWords.length - 2; i++) {
                        if (bText.includes(sWords[i] + ' ' + sWords[i + 1] + ' ' + sWords[i + 2])) hits += 2;
                    }
                    return hits;
                }

                let target = null;

                if (opts.searchSnippet) {
                    let bestScore = 0;
                    for (const b of blocks) {
                        const s = ngramScore(b);
                        if (s > bestScore) { bestScore = s; target = b; }
                    }
                }

                if (!target) {
                    const allMatch = blocks.filter(b => qWordRes.every(re => re.test(b.textContent)));
                    const anyMatch = blocks.filter(b => qWordRes.some(re => re.test(b.textContent)));
                    const candidates = allMatch.length ? allMatch : anyMatch;
                    if (candidates.length) target = candidates[0];
                }

                if (target) {
                    const elTop = target.getBoundingClientRect().top
                        - scroller.getBoundingClientRect().top
                        + scroller.scrollTop;
                    scroller.scrollTop = Math.max(0, elTop - 80);
                    target.classList.add('search-flash');
                    target.addEventListener('animationend', () => target.classList.remove('search-flash'), { once: true });
                }
                updateStickyHeader();
            });
        } else if (!opts.skipSave) {
            requestAnimationFrame(() => {
                scroller.scrollTop = tabScrollY.get(file) || 0;
                updateStickyHeader();
            });
        } else {
            updateStickyHeader();
        }
    } catch (err) {
        el.innerHTML = '<p style="color:red">Failed to load: ' + err.message + '</p>';
    }
}

// ── visualViewport: keep nav above browser chrome on mobile ─────────────────
if (window.visualViewport) {
    const updateNav = () => {
        const vv = window.visualViewport;
        const offset = window.innerHeight - vv.height - vv.offsetTop;
        nav.style.transform = offset > 0 ? 'translateY(' + (-Math.round(offset)) + 'px)' : '';
    };
    window.visualViewport.addEventListener('resize', updateNav);
    window.visualViewport.addEventListener('scroll', updateNav);
}

// ── Sticky header ────────────────────────────────────────────────────────────
const stickyHeader = document.getElementById('sticky-header');
let stickyRaf = null;

function updateStickyHeader() {
    if (currentPage === 'settings') {
        stickyHeader.classList.remove('visible');
        return;
    }
    const el = document.getElementById('content');
    const h1s = Array.from(el.querySelectorAll('h1'));
    const allHeadings = Array.from(el.querySelectorAll('h1, h2, h3'));
    if (h1s.length === 0) { stickyHeader.classList.remove('visible'); return; }

    // Если есть таббар — рисуемся под ним, иначе на стандартной позиции
    const tabBar = document.getElementById('page-tabbar');
    const tabBarH = tabBar ? tabBar.offsetHeight : 0;
    stickyHeader.style.top = tabBarH
        ? (tabBarH + 4) + 'px'
        : 'calc(env(safe-area-inset-top, 0px) + 8px)';

    // Порог = нижний край sticky-header (самокалибрующийся: учитывает таббар + safe-area)
    const threshold = stickyHeader.getBoundingClientRect().bottom;
    const viewH = window.innerHeight;

    // Скрываем если хоть один заголовок частично или полностью виден в верхней половине экрана
    // Используем .bottom заголовка: заголовок "виден" пока его нижний край ниже порога
    const anyVisible = allHeadings.some(h => {
        const rect = h.getBoundingClientRect();
        return rect.bottom > threshold && rect.top < viewH / 2;
    });
    if (anyVisible) { stickyHeader.classList.remove('visible'); return; }

    let curH1 = null, curH2 = null, curH3 = null;
    for (const h of allHeadings) {
        // Заголовок "прокручен" только когда он полностью скрылся за порогом (.bottom, не .top)
        if (h.getBoundingClientRect().bottom <= threshold) {
            if (h.tagName === 'H1') { curH1 = h; curH2 = null; curH3 = null; }
            else if (h.tagName === 'H2') { curH2 = h; curH3 = null; }
            else { curH3 = h; }
        }
    }

    if (!curH1) { stickyHeader.classList.remove('visible'); return; }

    const multiCity = h1s.length > 1;
    let left = null, right = null;

    if (multiCity) {
        left = curH1.textContent.split('(')[0].trim();
        right = curH3 ? curH3.textContent : curH2 ? curH2.textContent : null;
    } else {
        left = curH2 ? curH2.textContent : null;
        right = curH3 ? curH3.textContent : null;
    }

    if (!left && !right) { stickyHeader.classList.remove('visible'); return; }

    stickyHeader.innerHTML = (left && right)
        ? '<span class="sh-h1">' + left + '</span><span class="sh-sep">›</span><span class="sh-h2">' + right + '</span>'
        : '<span class="sh-h2">' + (left || right) + '</span>';
    stickyHeader.classList.add('visible');
}

// ── Scroll: throttled tab scroll save ───────────────────────────────────────
let scrollSaveTimer = null;
scroller.addEventListener('scroll', () => {
    if (!stickyRaf) stickyRaf = requestAnimationFrame(() => { updateStickyHeader(); stickyRaf = null; });
    if (scrollSaveTimer) return;
    scrollSaveTimer = setTimeout(() => {
        const key = currentPage === 'explore' ? 'explore-' + exploreTab
            : currentPage === 'translate' && translateTab === 'phrases' ? 'translate-phrases'
            : currentPage;
        tabScrollY.set(key, scroller.scrollTop);
        scrollSaveTimer = null;
    }, 150);
}, { passive: true });

// ── Disable pinch/double-tap zoom ────────────────────────────────────────────
let lastTouchEnd = 0;
scroller.addEventListener('touchstart', e => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });
scroller.addEventListener('touchmove', e => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });
scroller.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouchEnd < 300) e.preventDefault();
    lastTouchEnd = now;
}, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });

// ── Service Worker ───────────────────────────────────────────────────────────
let swReg = null;
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(reg => {
        swReg = reg;
        if (reg.waiting) onUpdateReady();
        reg.addEventListener('updatefound', () => {
            const newSW = reg.installing;
            if (!newSW) return;
            newSW.addEventListener('statechange', () => {
                if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                    onUpdateReady();
                }
            });
        });
    }).catch(e => console.warn('SW registration failed:', e));
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
}

// ── Search event wiring ──────────────────────────────────────────────────────
document.getElementById('search-close').addEventListener('click', closeSearch);
searchInput.addEventListener('keydown', e => { if (e.key === 'Escape') closeSearch(); });

let searchTimer = null;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => performSearch(searchInput.value.trim()), 200);
});

// ── Pull-to-search gesture ───────────────────────────────────────────────────
let pullStartY = 0;
let pullTriggered = false;
scroller.addEventListener('touchstart', e => {
    if (localStorage.getItem('search') !== 'on') { pullStartY = 0; return; }
    if (e.touches.length !== 1 || currentPage === 'settings') { pullStartY = 0; return; }
    if (currentPage === 'translate') {
        if (translateTab !== 'phrases') { pullStartY = 0; return; }
        if (scroller.scrollTop !== 0) { pullStartY = 0; return; }
    } else if (scroller.scrollTop !== 0) {
        pullStartY = 0; return;
    }
    pullStartY = e.touches[0].clientY;
    pullTriggered = false;
}, { passive: true });
scroller.addEventListener('touchmove', e => {
    if (!pullStartY || pullTriggered) return;
    const dy = e.touches[0].clientY - pullStartY;
    pullIndicator.classList.toggle('visible', dy > 20);
    if (dy > 60) {
        pullTriggered = true;
        pullIndicator.classList.remove('visible');
        openSearch();
    }
}, { passive: true });
scroller.addEventListener('touchend', () => {
    pullStartY = 0;
    pullIndicator.classList.remove('visible');
}, { passive: true });

// ── Update flow ──────────────────────────────────────────────────────────────
function onUpdateReady() {
    if (updateAvailable) return;
    updateAvailable = true;
    const settingsBtn = nav.querySelector('[data-file="settings"]');
    if (settingsBtn) settingsBtn.classList.add('has-update');
    if (currentPage === 'settings') loadPage('settings', { skipSave: true });
    showToast('🔔 Доступна новая версия', () => loadPage('settings'));
}

async function hardReload() {
    if (swReg?.waiting) {
        swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
        if (swReg) await swReg.unregister();
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k !== 'china-trip-models').map(k => caches.delete(k)));
        location.reload();
    }
}

function checkVersion() {
    if (!swReg || updateAvailable) return;
    if (swReg.waiting) { onUpdateReady(); return; }
    fetch('./version.txt?t=' + Date.now(), { cache: 'no-store' })
        .then(r => r.text())
        .then(v => {
            const newVer = v.trim();
            if (newVer !== APP_VERSION) {
                latestVersion = newVer;
                swReg.update().catch(() => {});
                setTimeout(() => { if (!updateAvailable) location.reload(); }, 4000);
            }
        })
        .catch(() => {});
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (updateAvailable) {
        showToast('🔔 Доступна новая версия', () => loadPage('settings'));
    } else {
        checkVersion();
    }
});

// ── Init ─────────────────────────────────────────────────────────────────────
const hash = location.hash.slice(1);
const initial = PAGES.find(p => p.file.replace('.md', '') === hash);
loadPage(initial ? initial.file : PAGES[0].file);

async function tryRestoreFromIDB() {
    if (localStorage.getItem('smartSearch') !== 'on') return;
    const cached = await idbLoad();
    if (!cached) {
        startBackgroundIndexing();
        return;
    }
    semanticIndex = cached.map(item => ({
        ...item,
        page: SEARCH_PAGES.find(p => p.file === item.pageFile),
    })).filter(item => item.page);
    semanticReady = true;
    refreshSemanticStatus();
    createWorker()
        .then(() => triggerSemanticIfSearchOpen())
        .catch(e => console.error('Worker init failed:', e));
}
tryRestoreFromIDB();
