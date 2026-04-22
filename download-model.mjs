import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import path from 'path';

const MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const BASE = `https://huggingface.co/${MODEL}/resolve/main`;
const OUT = './model';

const FILES = [
    'config.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'special_tokens_map.json',
    'onnx/model_quantized.onnx',
];

async function download(file) {
    const url = `${BASE}/${file}`;
    const dest = path.join(OUT, file);
    mkdirSync(path.dirname(dest), { recursive: true });

    if (existsSync(dest)) { console.log(`  skip ${file} (already exists)`); return; }

    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`${res.status} ${url}`);

    const total = Number(res.headers.get('content-length') || 0);
    let loaded = 0;
    let lastPct = -1;

    const transform = new TransformStream({
        transform(chunk, ctrl) {
            loaded += chunk.length;
            if (total) {
                const pct = Math.floor(loaded / total * 100);
                if (pct !== lastPct) { lastPct = pct; process.stdout.write(`\r  ${file}: ${pct}%`); }
            }
            ctrl.enqueue(chunk);
        }
    });

    await pipeline(
        Readable.fromWeb(res.body.pipeThrough(transform)),
        createWriteStream(dest)
    );
    process.stdout.write(`\r  ${file}: done\n`);
}

console.log(`Downloading ${MODEL}...\n`);
for (const f of FILES) await download(f);
console.log('\nAll files ready in ./model/');
