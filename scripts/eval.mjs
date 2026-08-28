// Evaluation harness. For each sample PDF it extracts the text (unpdf, server-
// side — exercises real extraction), uploads it, then asks a fixed set of
// questions and scores the streamed answers. Results are written to EVAL.md.
//
// Usage:  BASE_URL=http://localhost:3000 node scripts/eval.mjs
// The app must be running with valid MONGODB_URI / GEMINI_API_KEY.

import { extractText, getDocumentProxy } from "unpdf";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const suite = JSON.parse(readFileSync(join(ROOT, "docs/eval/questions.json"), "utf8"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Lowercase + strip diacritics so "période" matches "periode". */
function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

const REFUSAL_HINTS = [
  "not in the document",
  "not contained",
  "no information",
  "does not contain",
  "cannot find",
  "pas dans le document",
  "ne figure pas",
  "ne contient pas",
  "aucune information",
  "n'est pas",
];

function looksLikeRefusal(answer) {
  const n = normalize(answer);
  return REFUSAL_HINTS.some((h) => n.includes(normalize(h)));
}

async function extractPages(relPath) {
  const buf = readFileSync(join(ROOT, relPath));
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  return pages
    .map((t, i) => ({ pageNumber: i + 1, text: (t ?? "").trim() }))
    .filter((p) => p.text.length > 0);
}

async function upload(filename, pages) {
  const res = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filename, pages }),
  });
  if (!res.ok) throw new Error(`upload ${filename} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Parse an AI SDK data stream: 0=text, 3=error, 8=message annotation. */
function parseStream(raw) {
  let answer = "";
  let sources = [];
  let error = null;
  for (const line of raw.split("\n")) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const code = line.slice(0, idx);
    let payload;
    try {
      payload = JSON.parse(line.slice(idx + 1));
    } catch {
      continue;
    }
    if (code === "0") answer += payload;
    else if (code === "3") error = payload;
    else if (code === "8" && Array.isArray(payload)) {
      for (const ann of payload) if (ann?.type === "sources" && Array.isArray(ann.sources)) sources = ann.sources;
    }
  }
  return { answer: answer.trim(), sources, error };
}

async function ask(documentIds, question) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ documentIds, messages: [{ role: "user", content: question }] }),
  });
  return parseStream(await res.text());
}

function topSource(sources) {
  if (!sources.length) return "—";
  const best = sources[0];
  const pct = typeof best.score === "number" ? ` (${(best.score * 100).toFixed(0)}%)` : "";
  return `${best.filename} p.${best.pageNumber ?? "?"}${pct}`;
}

function excerpt(s, n = 90) {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > n ? `${one.slice(0, n)}…` : one;
}

function md(cell) {
  return String(cell).replace(/\|/g, "\\|");
}

async function run() {
  const model = process.env.GEMINI_CHAT_MODEL ?? "(default)";
  const sections = [];
  let overallPass = 0;
  let overallTotal = 0;

  for (const [lang, spec] of Object.entries(suite)) {
    const pages = await extractPages(spec.file);
    const { documentId } = await upload(spec.filename, pages);
    // Absorb Atlas vector-index write→searchable lag before querying.
    await sleep(6000);

    const rows = [];
    let pass = 0;
    for (const item of spec.questions) {
      let result = await ask([documentId], item.q);
      // One retry if retrieval came back empty (index still catching up).
      if (result.sources.length === 0 && !result.error) {
        await sleep(4000);
        result = await ask([documentId], item.q);
      }

      const ok = item.answerable
        ? normalize(result.answer).includes(normalize(item.expect))
        : looksLikeRefusal(result.answer);
      if (ok) pass += 1;

      rows.push(
        `| ${md(item.q)} | ${md(item.expect)} | ${md(topSource(result.sources))} | ${md(excerpt(result.answer) || (result.error ? `⚠ ${result.error}` : "—"))} | ${ok ? "✅" : "❌"} |`,
      );
    }

    overallPass += pass;
    overallTotal += spec.questions.length;
    sections.push(
      `## ${lang.toUpperCase()} — \`${spec.filename}\` (${pages.length} page${pages.length > 1 ? "s" : ""})\n\n` +
        `| Question | Expected | Top source | Answer (excerpt) | Result |\n` +
        `|---|---|---|---|---|\n` +
        rows.join("\n") +
        `\n\n**Accuracy: ${pass}/${spec.questions.length}**\n`,
    );
    console.log(`${lang}: ${pass}/${spec.questions.length}`);
  }

  const header =
    `# DocChat — Evaluation Results\n\n` +
    `Generated by \`npm run eval\` on ${new Date().toISOString().slice(0, 10)} · ` +
    `chat model \`${model}\`.\n\n` +
    `Each sample PDF is extracted (unpdf), uploaded, then queried. Answerable ` +
    `questions pass when the expected fact appears in the answer; the out-of-` +
    `document question passes when the model correctly refuses.\n\n` +
    `**Overall: ${overallPass}/${overallTotal}**\n\n`;

  writeFileSync(join(ROOT, "EVAL.md"), header + sections.join("\n"));
  console.log(`\nOverall: ${overallPass}/${overallTotal} → wrote EVAL.md`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
