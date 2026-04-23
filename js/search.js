// search.js

// ── Утилиты текста ──────────────────────────────────────────────────────────

function cleanMd(text) {
    return text
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/#{1,6} /g, '')
        .replace(/\*{1,2}([^*\n]+)\*{1,2}/g, '$1')
        .replace(/`[^`]+`/g, m => m.slice(1, -1))
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ── Fuzzy search (Levenshtein) ──────────────────────────────────────────────

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const row = Array.from({length: n + 1}, (_, i) => i);
    for (let i = 1; i <= m; i++) {
        let prev = row[0]; row[0] = i;
        for (let j = 1; j <= n; j++) {
            const tmp = row[j];
            row[j] = a[i-1] === b[j-1] ? prev : 1 + Math.min(prev, row[j], row[j-1]);
            prev = tmp;
        }
    }
    return row[n];
}

// Для слова длиной 1-3 — только точное; 4 — ±1; 5+ — ±2
function fuzzyThreshold(len) { return len <= 3 ? 0 : len <= 4 ? 1 : 2; }

// Ищет в массиве слов ближайшее к queryWord в пределах порога; возвращает {word, dist} или null
function fuzzyFindWord(queryWord, textWords) {
    const thr = fuzzyThreshold(queryWord.length);
    if (thr === 0) return null;
    let best = null, bestDist = thr + 1;
    for (const w of textWords) {
        if (Math.abs(w.length - queryWord.length) > thr) continue;
        const d = levenshtein(queryWord, w);
        if (d > 0 && d < bestDist) { bestDist = d; best = { word: w, dist: d }; }
    }
    return best;
}

function performFuzzySearch(query) {
    const allWords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!allWords.length) return null;

    // Короткие слова (≤3) — только точное вхождение, длинные — fuzzy
    const shortWords = allWords.filter(w => fuzzyThreshold(w.length) === 0);
    const longWords  = allWords.filter(w => fuzzyThreshold(w.length) > 0);
    if (!longWords.length) return null; // нет слов для fuzzy — это зона точного поиска

    const frag = document.createDocumentFragment();
    let total = 0;

    SEARCH_PAGES.filter(p => p.file !== 'settings').forEach(page => {
        const raw = pageCache.get(page.file);
        if (!raw) return;
        const clean = cleanMd(raw);

        // Короткие слова должны присутствовать буквально
        if (shortWords.some(w => !new RegExp(escapeRe(w), 'i').test(clean))) return;

        // Токенизируем текст страницы в уникальные слова
        const textWords = [...new Set((clean.toLowerCase().match(/[а-яёa-z]+/gi) || []))];

        // Для длинных слов ищем fuzzy-совпадение
        const fuzzyWords = longWords.map(w => {
            if (new RegExp(escapeRe(w), 'i').test(clean)) return { word: w, dist: 0 };
            return fuzzyFindWord(w, textWords);
        });
        if (fuzzyWords.some(fw => !fw)) return; // хоть одно длинное слово не нашлось — пропускаем

        // Все слова которые должны быть в сниппете
        const allMatchWords = [...fuzzyWords.map(fw => fw.word), ...shortWords];
        const allMatchRes = allMatchWords.map(w => new RegExp(escapeRe(w), 'i'));

        // Ищем окно ~250 символов где все слова присутствуют вместе
        const WINDOW = 250;
        const cleanLow = clean.toLowerCase();
        let bestSnippetStart = -1;

        // Перебираем позиции каждого слова как центр окна
        for (const anchorRe of allMatchRes) {
            const re = new RegExp(anchorRe.source, 'gi');
            let m2;
            while ((m2 = re.exec(clean)) !== null) {
                const ws = Math.max(0, m2.index - 50);
                const we = Math.min(clean.length, ws + WINDOW);
                const window = cleanLow.slice(ws, we);
                if (allMatchRes.every(r => r.test(window))) {
                    bestSnippetStart = ws;
                    break;
                }
            }
            if (bestSnippetStart !== -1) break;
        }
        if (bestSnippetStart === -1) return; // слова не встречаются рядом — пропускаем

        const snippetEnd = Math.min(clean.length, bestSnippetStart + WINDOW);
        const snippet = (bestSnippetStart > 0 ? '…' : '') + clean.slice(bestSnippetStart, snippetEnd) + (snippetEnd < clean.length ? '…' : '');
        const anchorRaw = new RegExp(escapeRe(allMatchWords[0]), 'i');
        const rawM = anchorRaw.exec(raw);
        const breadcrumb = rawM ? getBreadcrumbAtPos(raw, rawM.index) : '';
        const matches = [{ snippet, breadcrumb, fuzzyWords: allMatchWords }];
        if (!matches.length) return;

        const group = document.createElement('div');
        group.className = 'search-page-group';
        const label = document.createElement('div');
        label.className = 'search-page-label';
        label.textContent = page.label;
        group.appendChild(label);

        matches.forEach(({ snippet, breadcrumb, fuzzyWords: fw }) => {
            const div = document.createElement('div');
            div.className = 'search-result';
            if (breadcrumb) {
                const bc = document.createElement('div');
                bc.className = 'search-breadcrumb';
                bc.textContent = breadcrumb;
                div.appendChild(bc);
            }
            const p = document.createElement('div');
            p.className = 'search-snippet';
            p.innerHTML = highlightWords(snippet, fw);
            div.appendChild(p);
            div.addEventListener('click', () => {
                closeSearch();
                loadPage(page.navTarget || page.file, { searchQuery: fw[0], searchSnippet: snippet, subTab: page.subTab });
            });
            group.appendChild(div);
            total++;
        });
        frag.appendChild(group);
    });

    return total > 0 ? frag : null;
}

function getBreadcrumbAtPos(raw, pos) {
    const hRe = /^(#{2,3})\s+(.+)$/gm;
    let h2 = '', h3 = '', hm;
    hRe.lastIndex = 0;
    while ((hm = hRe.exec(raw)) !== null) {
        if (hm.index >= pos) break;
        const lvl = hm[1].length;
        const txt = hm[2].replace(/[*_`[\]]/g, '').trim();
        if (lvl === 2) { h2 = txt; h3 = ''; }
        else if (lvl === 3) h3 = txt;
    }
    return [h2, h3].filter(Boolean).join(' › ');
}

function highlightWords(text, words) {
    // Подсвечиваем каждое слово отдельно (длинные — первыми, чтобы не перебивать)
    let result = text;
    words.slice().sort((a, b) => b.length - a.length).forEach(w => {
        result = result.replace(new RegExp(escapeRe(w), 'gi'), '<mark>$&</mark>');
    });
    return result;
}

// ── Semantic Search ─────────────────────────────────────────────────────────

let semanticIndex = [];
let semanticReady = false;   // индекс полностью построен
let semanticIndexing = false; // идёт фоновая индексация
let modelLoaded = false;     // модель успешно инициализирована в воркере (кэш гарантирован)

function cosineSim(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

function chunkText(text) {
    const chunks = [];
    for (const para of text.split(/\n\n+/)) {
        const t = para.trim();
        if (t.length < 40) continue;
        if (t.length <= 500) { chunks.push(t); continue; }
        let buf = '';
        for (const s of t.split(/(?<=[.!?])\s+/)) {
            if (buf.length + s.length > 500 && buf) { chunks.push(buf.trim()); buf = s; }
            else buf += (buf ? ' ' : '') + s;
        }
        if (buf.trim().length > 40) chunks.push(buf.trim());
    }
    return chunks;
}

// ── Web Worker (ONNX inference off main thread) ─────────────────────────────
let semanticWorker = null;
let workerMsgId = 0;
const workerCbs = new Map();

function workerEmbed(text) {
    return new Promise((resolve, reject) => {
        const id = ++workerMsgId;
        workerCbs.set(id, { resolve, reject });
        semanticWorker.postMessage({ type: 'embed', id, text });
    });
}

// ── IndexedDB persistence для эмбеддингов ──────────────────────────────────
const IDB_NAME = 'china-trip-semantic';
const IDB_STORE = 'index';

function idbOpen() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

async function idbLoad() {
    try {
        const db = await idbOpen();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const req = tx.objectStore(IDB_STORE).get(APP_VERSION);
            req.onsuccess = e => resolve(e.target.result || null);
            req.onerror = e => reject(e.target.error);
        });
    } catch { return null; }
}

async function idbSave(data) {
    try {
        const db = await idbOpen();
        // Удаляем старые версии
        const keys = await new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const req = tx.objectStore(IDB_STORE).getAllKeys();
            req.onsuccess = e => resolve(e.target.result);
            req.onerror = e => reject(e.target.error);
        });
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        keys.forEach(k => { if (k !== APP_VERSION) store.delete(k); });
        store.put(data, APP_VERSION);
    } catch(e) { console.warn('idbSave failed:', e); }
}

const WORKER_SRC = `
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2/dist/transformers.min.js';
let pipe = null;
onmessage = async ({ data }) => {
    if (data.type === 'init') {
        try {
            pipe = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', {
                progress_callback: p => postMessage({ type: 'progress', p })
            });
            postMessage({ type: 'ready' });
        } catch(e) { postMessage({ type: 'error', msg: e.message }); }
    } else if (data.type === 'embed') {
        try {
            const out = await pipe(data.text, { pooling: 'mean', normalize: true });
            postMessage({ type: 'emb', id: data.id, emb: Array.from(out.data) });
        } catch(e) { postMessage({ type: 'error', id: data.id, msg: e.message }); }
    }
};`;

// Создаёт и инициализирует воркер, возвращает Promise
function createWorker() {
    const blob = new Blob([WORKER_SRC], { type: 'text/javascript' });
    semanticWorker = new Worker(URL.createObjectURL(blob), { type: 'module' });
    semanticWorker.onmessage = ({ data }) => {
        if (data.type === 'emb') {
            const cb = workerCbs.get(data.id);
            if (cb) { workerCbs.delete(data.id); cb.resolve(data.emb); }
        } else if (data.type === 'error' && data.id != null) {
            const cb = workerCbs.get(data.id);
            if (cb) { workerCbs.delete(data.id); cb.reject(new Error(data.msg)); }
        }
    };
    semanticWorker.onerror = e => console.error('Semantic worker error:', e);
    return new Promise((resolve, reject) => {
        const orig = semanticWorker.onmessage;
        semanticWorker.onmessage = ({ data }) => {
            if (data.type === 'ready') {
                semanticWorker.onmessage = orig;
                modelLoaded = true;
                refreshModelStatus();
                resolve();
            } else if (data.type === 'error' && data.id == null) {
                reject(new Error(data.msg));
            } else if (data.type === 'progress') {
                const p = data.p;
                console.log('[model progress]', p?.status, p);
                const el = document.getElementById('model-status-text');
                if (el && p) {
                    if ((p.status === 'downloading' || p.status === 'progress') && p.file) {
                        const pct = p.progress != null ? Math.round(p.progress) + '%' : '';
                        const fname = p.file.split('/').pop();
                        el.textContent = '📥 Скачивание: ' + fname + (pct ? ' · ' + pct : '');
                    }
                }
            } else {
                orig({ data });
            }
        };
        semanticWorker.postMessage({ type: 'init' });
    });
}

function getSemanticStatusText() {
    if (semanticReady) return '✅ Готов · ' + semanticIndex.length + ' фрагментов';
    if (semanticIndexing) return '⏳ Индексируется…';
    return '○ Не проиндексировано';
}

function getSemanticBtnText() {
    if (semanticReady) return 'Переиндексировать';
    if (semanticIndexing) return 'Идёт индексация…';
    return 'Запустить индексацию';
}

function refreshSemanticStatus() {
    const statusEl = document.getElementById('semantic-status-text');
    const btnEl = document.getElementById('semantic-index-btn');
    if (statusEl) statusEl.textContent = getSemanticStatusText();
    if (btnEl) { btnEl.textContent = getSemanticBtnText(); btnEl.disabled = semanticIndexing; }
}

async function refreshModelStatus() {
    const el = document.getElementById('model-status-text');
    if (!el) return;
    // Если воркер уже инициализирован — модель точно есть, не ждём async cache.put()
    if (modelLoaded) {
        el.textContent = '✅ Модель готова (офлайн)';
        return;
    }
    try {
        const cache = await caches.open('china-trip-models');
        const keys = await cache.keys();
        const modelFiles = keys.filter(r => r.url.includes('huggingface.co'));
        const hasOnnx = modelFiles.some(r => r.url.includes('model_quantized.onnx'));
        if (hasOnnx) {
            el.textContent = '✅ Модель скачана (' + modelFiles.length + ' файл' + (modelFiles.length === 1 ? '' : modelFiles.length < 5 ? 'а' : 'ов') + ')';
        } else if (modelFiles.length > 0) {
            el.textContent = '⚠️ Модель скачана частично (' + modelFiles.length + ' из 5 файлов)';
        } else {
            el.textContent = '📥 Модель не скачана — загрузится автоматически при индексации (~50 МБ)';
        }
    } catch(e) {
        el.textContent = '❓ Статус модели недоступен';
    }
}

// Если поиск открыт и есть запрос — дозаписываем семантику в результаты
function triggerSemanticIfSearchOpen() {
    const q = searchInput.value.trim();
    if (!q || q.length < 3) return;
    // Убираем текст "индексируется" если он есть
    document.querySelectorAll('#search-results > div[data-semantic-pending]').forEach(el => el.remove());
    appendSemanticResults(q, searchResults);
}

async function startBackgroundIndexing() {
    if (semanticReady || semanticIndexing) return;
    if (localStorage.getItem('smartSearch') !== 'on') return;
    semanticIndexing = true;
    refreshSemanticStatus();
    try {
        // Пробуем загрузить готовый индекс из IndexedDB
        const cached = await idbLoad();
        if (cached) {
            semanticIndex = cached.map(item => ({
                ...item,
                page: SEARCH_PAGES.find(p => p.file === item.pageFile),
            })).filter(item => item.page);
            semanticReady = true;
            semanticIndexing = false;
            refreshSemanticStatus();
            // Воркер нужен для эмбеддинга запроса — ждём готовности перед тригером
            createWorker()
                .then(() => triggerSemanticIfSearchOpen())
                .catch(e => console.error('Worker init failed:', e));
            return;
        }

        // Кэша нет — строим индекс с нуля
        showToast('🔍 Подготовка умного поиска…', null, 2500);
        await createWorker();

        const pages = SEARCH_PAGES.filter(p => p.file !== 'settings' && p.file !== 'translate');
        for (const page of pages) {
            let raw = pageCache.get(page.file);
            if (!raw) {
                try { raw = await (await fetch('./' + page.file)).text(); pageCache.set(page.file, raw); }
                catch { continue; }
            }
            const chunks = chunkText(cleanMd(raw));
            const embs = await Promise.all(chunks.map(c => workerEmbed(c)));
            const badEmbs = embs.filter(e => !Array.isArray(e) || !e.length);
            if (badEmbs.length) console.warn('[index] bad embs for page', page.file, ':', badEmbs.length, '/', embs.length);
            chunks.forEach((chunk, i) => {
                if (!Array.isArray(embs[i]) || !embs[i].length) return; // пропускаем кривые
                const pos = raw.toLowerCase().indexOf(chunk.slice(0, 40).toLowerCase());
                semanticIndex.push({ page, chunk, emb: embs[i], breadcrumb: pos >= 0 ? getBreadcrumbAtPos(raw, pos) : '' });
            });
        }

        // Добавляем фразы из PHRASEBOOK в индекс
        const phrasebookChunks = PHRASEBOOK.flatMap(c => c.phrases.map(p => `${p.ru} ${p.zh} ${p.pinyin} ${p.note || ''}`));
        const phrasePage = SEARCH_PAGES.find(p => p.file === 'translate') || { file: 'translate', label: 'Перевод', navTarget: 'translate', subTab: null };
        if (phrasebookChunks.length) {
            const embs = await Promise.all(phrasebookChunks.map(c => workerEmbed(c)));
            phrasebookChunks.forEach((chunk, i) => {
                if (!Array.isArray(embs[i]) || !embs[i].length) return;
                semanticIndex.push({ page: phrasePage, chunk, emb: embs[i], breadcrumb: '' });
            });
        }

        await idbSave(semanticIndex.map(item => ({ ...item, page: undefined, pageFile: item.page.file })));
        semanticReady = true;
        semanticIndexing = false;
        refreshSemanticStatus();
        showToast('✅ Умный поиск готов', null, 2500);
        triggerSemanticIfSearchOpen();
    } catch(e) {
        console.error('Background indexing failed:', e);
        semanticIndexing = false;
        refreshSemanticStatus();
    }
}

// Ждёт готовности индекса и показывает прогресс если пользователь уже нажал кнопку
async function waitForIndex(btn) {
    if (semanticReady) return true;
    if (!semanticIndexing && !semanticWorker) {
        // Воркер ещё не запускался — запускаем сейчас
        if (btn) { btn.disabled = true; btn.textContent = '🔍 Загрузка модели…'; }
        startBackgroundIndexing();
    } else if (btn) {
        btn.disabled = true;
        btn.textContent = '🔍 Индексируется…';
    }
    while (!semanticReady && (semanticIndexing || semanticWorker)) {
        await new Promise(r => setTimeout(r, 300));
    }
    return semanticReady;
}

async function querySemanticIndex(query) {
    if (!semanticReady || !semanticIndex.length) return null;
    const qEmb = await workerEmbed(query);
    const allScored = semanticIndex
        .filter(item => Array.isArray(item.emb) && item.emb.length === qEmb.length)
        .map(item => ({ ...item, score: cosineSim(qEmb, item.emb) }));
    allScored.sort((a, b) => b.score - a.score);
    const scored = allScored.filter(item => item.score > 0.28).slice(0, 6);
    if (!scored.length) return null;

    const queryWords = query.trim().split(/\s+/).filter(Boolean);
    const frag = document.createDocumentFragment();
    const byPage = new Map();
    for (const item of scored) {
        if (!byPage.has(item.page.file)) byPage.set(item.page.file, []);
        byPage.get(item.page.file).push(item);
    }
    for (const [, items] of byPage) {
        const page = items[0].page;
        const group = document.createElement('div');
        group.className = 'search-page-group';
        const lbl = document.createElement('div');
        lbl.className = 'search-page-label';
        lbl.textContent = page.label;
        group.appendChild(lbl);
        items.slice(0, 2).forEach(item => {
            const div = document.createElement('div');
            div.className = 'search-result';
            if (item.breadcrumb) {
                const bc = document.createElement('div');
                bc.className = 'search-breadcrumb';
                bc.textContent = item.breadcrumb;
                div.appendChild(bc);
            }
            const p = document.createElement('div');
            p.className = 'search-snippet';
            const snippet = item.chunk.slice(0, 200) + (item.chunk.length > 200 ? '…' : '');
            // Выделяем слова запроса если они встречаются в чанке
            p.innerHTML = highlightWords(snippet, queryWords);
            div.appendChild(p);
            div.addEventListener('click', () => {
                closeSearch();
                loadPage(page.navTarget || page.file, { searchQuery: query, searchSnippet: item.chunk, subTab: page.subTab });
            });
            group.appendChild(div);
        });
        frag.appendChild(group);
    }
    return frag;
}

// Добавляет блок "По смыслу" в конец searchResults
async function appendSemanticResults(query, container) {
    if (localStorage.getItem('smartSearch') !== 'on') return;
    if (query.trim().length < 3) return;

    if (!semanticReady) {
        appendSmartSearchBtn(query);
        return;
    }

    try {
        const frag = await querySemanticIndex(query);
        if (!frag) return;

        const section = document.createElement('div');
        section.dataset.semanticSection = '1';
        section.style.cssText = 'border-top:1px solid var(--border);margin-top:8px';
        const hdr = document.createElement('div');
        hdr.style.cssText = 'padding:10px 16px 6px;font-size:0.75em;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px';
        hdr.textContent = 'По смыслу';
        section.appendChild(hdr);
        section.appendChild(frag);
        container.appendChild(section);
    } catch(e) {
        console.error('Semantic search error:', e);
    }
}

async function showSemanticResults(query, btn) {
    const ready = await waitForIndex(btn);
    if (!ready) { showToast('❌ Умный поиск недоступен', null, 3000); return; }

    const frag = await querySemanticIndex(query);
    searchResults.innerHTML = '';
    const hdr = document.createElement('div');
    hdr.style.cssText = 'padding:8px 16px 4px;font-size:0.75em;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px';
    hdr.textContent = 'По смыслу';
    searchResults.appendChild(hdr);
    if (frag) {
        searchResults.appendChild(frag);
    } else {
        searchResults.innerHTML = '<div id="search-hint"><div class="hint-icon">🤷</div>Ничего не найдено</div>';
    }
}

async function performSearch(query) {
    if (!query.trim()) {
        searchResults.innerHTML = '';
        searchResults.appendChild(searchHint);
        return;
    }
    const words = query.trim().split(/\s+/).filter(Boolean);
    const wordRes = words.map(w => new RegExp(escapeRe(w), 'gi'));
    const frag = document.createDocumentFragment();
    let total = 0;

    SEARCH_PAGES.filter(p => p.file !== 'settings').forEach(page => {
        const raw = pageCache.get(page.file);
        if (!raw) return;
        const clean = cleanMd(raw);

        // Ищем окно где все слова присутствуют вместе
        const WINDOW = 250;
        const cleanLow = clean.toLowerCase();
        const wordResLow = words.map(w => new RegExp(escapeRe(w.toLowerCase()), 'i'));
        let bestStart = -1;
        for (const anchorRe of wordResLow) {
            const re = new RegExp(anchorRe.source, 'gi');
            let m2;
            while ((m2 = re.exec(cleanLow)) !== null) {
                const ws = Math.max(0, m2.index - 50);
                const we = Math.min(clean.length, ws + WINDOW);
                const win = cleanLow.slice(ws, we);
                if (wordResLow.every(r => r.test(win))) { bestStart = ws; break; }
            }
            if (bestStart !== -1) break;
        }
        if (bestStart === -1) return;

        const snippetEnd = Math.min(clean.length, bestStart + WINDOW);
        const snippet = (bestStart > 0 ? '…' : '') + clean.slice(bestStart, snippetEnd) + (snippetEnd < clean.length ? '…' : '');
        const rawM = new RegExp(escapeRe(words[0]), 'i').exec(raw);
        const breadcrumb = rawM ? getBreadcrumbAtPos(raw, rawM.index) : '';
        const matches = [{ snippet, breadcrumb }];
        if (!matches.length) return;

        const group = document.createElement('div');
        group.className = 'search-page-group';
        const label = document.createElement('div');
        label.className = 'search-page-label';
        label.textContent = page.label;
        group.appendChild(label);

        matches.forEach(({ snippet, breadcrumb }) => {
            const div = document.createElement('div');
            div.className = 'search-result';
            if (breadcrumb) {
                const bc = document.createElement('div');
                bc.className = 'search-breadcrumb';
                bc.textContent = breadcrumb;
                div.appendChild(bc);
            }
            const p = document.createElement('div');
            p.className = 'search-snippet';
            p.innerHTML = highlightWords(snippet, words);
            div.appendChild(p);
            div.addEventListener('click', () => {
                closeSearch();
                loadPage(page.navTarget || page.file, { searchQuery: query, searchSnippet: snippet, subTab: page.subTab });
            });
            group.appendChild(div);
            total++;
        });
        frag.appendChild(group);
    });

    searchResults.innerHTML = '';
    if (total === 0) {
        const fuzzyFrag = performFuzzySearch(query);
        if (fuzzyFrag) {
            const hdr = document.createElement('div');
            hdr.style.cssText = 'padding:8px 16px 4px;font-size:0.75em;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px';
            hdr.textContent = 'Похожие результаты';
            searchResults.appendChild(hdr);
            searchResults.appendChild(fuzzyFrag);
            await appendSemanticResults(query, searchResults);
        } else if (query.trim().length >= 3) {
            if (semanticReady) {
                await showSemanticResults(query);
            } else {
                searchResults.innerHTML = '<div id="search-hint"><div class="hint-icon">🤷</div>Ничего не найдено</div>';
                appendSmartSearchBtn(query);
            }
        } else {
            searchResults.innerHTML = '<div id="search-hint"><div class="hint-icon">🤷</div>Ничего не найдено</div>';
        }
    } else {
        searchResults.appendChild(frag);
        await appendSemanticResults(query, searchResults);
    }
}

function appendSmartSearchBtn(query) {
    if (localStorage.getItem('smartSearch') !== 'on') return;
    const el = document.createElement('div');
    el.dataset.semanticPending = '1';
    el.style.cssText = 'padding:10px 16px;font-size:0.8em;color:var(--text-muted)';
    if (semanticIndexing) {
        el.textContent = '🔍 Индексируется поиск по смыслу…';
    } else {
        el.innerHTML = '💡 Для поиска по смыслу запустите индексацию в <a href="#" style="color:var(--link)">настройках</a>';
        el.querySelector('a').addEventListener('click', e => {
            e.preventDefault();
            closeSearch();
            loadPage('settings');
        });
    }
    searchResults.appendChild(el);
}

function openSearch() {
    searchOverlay.classList.add('visible');
    searchInput.value = '';
    searchResults.innerHTML = '';
    searchResults.appendChild(searchHint);
    setTimeout(() => searchInput.focus(), 100);
    ensureAllPagesCached();
}

function closeSearch() {
    searchOverlay.classList.remove('visible');
    searchInput.blur();
}
