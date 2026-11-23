// Open-source AI for generating Mermaid C4 code, plus a Mermaid C4 parser/layout.
// Everything runs client-side, no backend:
// - "webllm" (default): an open-weight model runs inside the page via WebLLM + WebGPU.
//   No account, token or server. Weights download once and are cached in IndexedDB.
// - "mock": the original hardcoded keyword matching.

const WEBLLM_URL = "https://esm.run/@mlc-ai/web-llm@0.2.86";

const AI_PROVIDERS = {
  webllm: {
    label: "In-browser model (WebLLM, no setup)",
    models: [
      { id: "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 Coder 1.5B (~1 GB download)" },
      { id: "Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC", label: "Qwen2.5 Coder 3B (~2 GB download, better)" },
      { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", label: "Llama 3.2 3B (~2 GB download)" }
    ]
  },
  mock: {
    label: "Keyword mock (no AI)",
    models: []
  }
};

const AI_SETTINGS_KEY = "c4studio.aiSettings";

function defaultAiSettings() {
  return {
    provider: "webllm",
    models: { webllm: AI_PROVIDERS.webllm.models[0].id }
  };
}

function loadAiSettings() {
  const settings = defaultAiSettings();
  try {
    const saved = JSON.parse(localStorage.getItem(AI_SETTINGS_KEY));
    if (saved && typeof saved === "object") {
      if (AI_PROVIDERS[saved.provider]) settings.provider = saved.provider;
      Object.assign(settings.models, saved.models || {});
    }
  } catch (e) {
    // localStorage unavailable or corrupt: fall back to defaults
  }
  return settings;
}

function saveAiSettings(settings) {
  try {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    // Ignore: settings just won't persist across reloads
  }
}

const SYSTEM_PROMPT = `You are an assistant inside a VS Code extension that writes Mermaid C4 diagrams.
Reply with ONLY Mermaid C4 code: no explanations, no markdown fences.
Rules:
- First line is C4Context or C4Container. Second line is: title <short title>.
- Use only these elements: Person(alias, "label", "descr"), System(alias, "label", "descr"),
  System_Ext(alias, "label", "descr"), Container(alias, "label", "techn", "descr"),
  ContainerDb(alias, "label", "techn", "descr"), Rel(from, to, "label", "techn").
- Aliases are camelCase identifiers. Every string argument is in double quotes.
- Use at most 8 elements. Every element takes part in at least one Rel.

Example:
C4Container
  title Blog platform
  Person(reader, "Reader", "Reads articles")
  Container(web, "Web App", "React", "Shows articles")
  ContainerDb(db, "Articles DB", "PostgreSQL", "Stores articles")
  Rel(reader, web, "Reads articles", "HTTPS")
  Rel(web, db, "Reads", "SQL")`;

function buildMessages(prompt, rulesText) {
  let system = SYSTEM_PROMPT;
  if (rulesText) {
    system += `\n\nThe organization's architecture rules (.c4rules.yaml) are below. The diagram MUST follow them:\n${rulesText}`;
  }
  return [
    { role: "system", content: system },
    { role: "user", content: prompt }
  ];
}

// Strip markdown fences / chatter some models add despite instructions
function extractMermaid(text) {
  const fenced = text.match(/```(?:mermaid)?\s*\n([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/^\s*C4(Context|Container|Component|Dynamic|Deployment)\b/m);
  return (start >= 0 ? body.slice(start) : body).trim();
}

function ensureC4Code(content) {
  const code = extractMermaid(content);
  if (!/^C4(Context|Container|Component|Dynamic|Deployment)\b/.test(code)) {
    throw new Error("Model did not return Mermaid C4 code, try again");
  }
  return code;
}

// ---- In-browser model (WebLLM) ----

let webllmEngine = null;
let webllmModelLoaded = "";

async function getWebLLMEngine(modelId, onProgress) {
  if (!navigator.gpu) {
    throw new Error("WebGPU not available: use a recent Chrome or Edge");
  }
  if (webllmEngine && webllmModelLoaded === modelId) return webllmEngine;

  const webllm = await import(WEBLLM_URL);
  if (webllmEngine) {
    await webllmEngine.unload();
    webllmEngine = null;
  }
  webllmEngine = await webllm.CreateMLCEngine(modelId, {
    // IndexedDB also works when index.html is opened straight from disk (file://)
    appConfig: { ...webllm.prebuiltAppConfig, cacheBackend: "indexeddb" },
    initProgressCallback: report => onProgress(report.progress, report.text)
  });
  webllmModelLoaded = modelId;
  return webllmEngine;
}

async function generateC4InBrowser({ prompt, rulesText, model, onProgress }) {
  const engine = await getWebLLMEngine(model, onProgress);
  const reply = await engine.chat.completions.create({
    messages: buildMessages(prompt, rulesText),
    temperature: 0.2,
    max_tokens: 1200
  });
  return ensureC4Code(reply.choices?.[0]?.message?.content || "");
}

// ---- Minimal Mermaid C4 parser + auto layout (enough for the preview) ----

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const ELEMENT_RE = /^\s*(Person_Ext|Person|SystemDb_Ext|SystemDb|SystemQueue_Ext|SystemQueue|System_Ext|System|ContainerDb_Ext|ContainerDb|ContainerQueue_Ext|ContainerQueue|Container_Ext|Container|ComponentDb|Component_Ext|Component)\s*\((.*)\)\s*$/;
const REL_RE = /^\s*(?:Bi)?Rel(?:_[A-Za-z]+)?\s*\((.*)\)\s*$/;

// Split "a, b, "c, d", "e"" into ["a", "b", "c, d", "e"]
function splitArgs(argText) {
  const args = [];
  const re = /\s*(?:"([^"]*)"|([^,]+?))\s*(?:,|$)/g;
  let match;
  while ((match = re.exec(argText)) !== null && match[0] !== "") {
    args.push(match[1] !== undefined ? match[1] : match[2]);
  }
  return args;
}

function elementStyle(kind) {
  if (kind.startsWith("Person")) return { type: "person", label: "Person", icon: "👤" };
  if (kind.endsWith("_Ext")) return { type: "external", label: "External System", icon: "🌐" };
  if (kind.includes("Db")) return { type: "database", label: "Container: Database", icon: "🗄️" };
  if (kind.includes("Queue")) return { type: "database", label: "Container: Queue", icon: "📨" };
  if (kind.startsWith("Container")) return { type: "system", label: "Container", icon: "📦" };
  if (kind.startsWith("Component")) return { type: "system", label: "Component", icon: "🧩" };
  return { type: "system", label: "Software System", icon: "🖥️" };
}

function parseC4(code) {
  const elements = [];
  const rels = [];
  let title = "";

  code.split("\n").forEach(line => {
    const titleMatch = line.match(/^\s*title\s+(.+)$/);
    if (titleMatch) {
      title = titleMatch[1].trim();
      return;
    }
    const el = line.match(ELEMENT_RE);
    if (el) {
      const args = splitArgs(el[2]);
      const hasTech = el[1].startsWith("Container") || el[1].startsWith("Component");
      elements.push({
        id: args[0],
        kind: el[1],
        label: args[1] || args[0],
        tech: hasTech ? (args[2] || "") : "",
        desc: hasTech ? (args[3] || "") : (args[2] || "")
      });
      return;
    }
    const rel = line.match(REL_RE);
    if (rel) {
      const args = splitArgs(rel[1]);
      if (args.length >= 2) {
        rels.push({ from: args[0], to: args[1], label: args[2] || "", tech: args[3] || "" });
      }
    }
  });

  const ids = new Set(elements.map(e => e.id));
  return { title, elements, rels: rels.filter(r => ids.has(r.from) && ids.has(r.to)) };
}

const CARD_W = 200;
const CARD_H = 140;
const COL_GAP = 90;
const ROW_GAP = 40;
const PAD = 20;

// Column = BFS distance from the entry points (nodes with no incoming relation,
// or persons if every node has one). BFS keeps cycles from stretching the layout.
function layoutColumns(elements, rels) {
  const col = {};
  const outgoing = {};
  const hasIncoming = new Set();
  elements.forEach(e => { outgoing[e.id] = []; });
  rels.forEach(r => {
    if (r.from === r.to) return;
    outgoing[r.from].push(r.to);
    hasIncoming.add(r.to);
  });

  let roots = elements.filter(e => !hasIncoming.has(e.id));
  if (roots.length === 0) roots = elements.filter(e => e.kind.startsWith("Person"));

  const bfs = startIds => {
    const queue = startIds.filter(id => col[id] === undefined);
    queue.forEach(id => { col[id] = 0; });
    while (queue.length) {
      const id = queue.shift();
      outgoing[id].forEach(next => {
        if (col[next] === undefined) {
          col[next] = col[id] + 1;
          queue.push(next);
        }
      });
    }
  };

  bfs(roots.map(e => e.id));
  // Anything unreachable from the roots (e.g. a pure cycle) starts its own BFS
  elements.forEach(e => { if (col[e.id] === undefined) bfs([e.id]); });
  return col;
}

function edgePoints(a, b) {
  const ac = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
  const bc = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  if (b.left >= a.left + a.width) return { from: { x: a.left + a.width, y: ac.y }, to: { x: b.left, y: bc.y } };
  if (a.left >= b.left + b.width) return { from: { x: a.left, y: ac.y }, to: { x: b.left + b.width, y: bc.y } };
  if (bc.y > ac.y) return { from: { x: ac.x, y: a.top + a.height }, to: { x: bc.x, y: b.top } };
  return { from: { x: ac.x, y: a.top }, to: { x: bc.x, y: b.top + b.height } };
}

// Turn Mermaid C4 code into the same state shape the hardcoded presets use
function c4CodeToState(code) {
  const { title, elements, rels } = parseC4(code);
  if (elements.length === 0) throw new Error("No C4 elements found in generated code");

  const col = layoutColumns(elements, rels);
  const rowsUsed = {};
  const pos = {};
  elements.forEach(e => {
    const c = col[e.id];
    const r = rowsUsed[c] || 0;
    rowsUsed[c] = r + 1;
    pos[e.id] = { left: PAD + c * (CARD_W + COL_GAP), top: PAD + r * (CARD_H + ROW_GAP), width: CARD_W, height: CARD_H };
  });

  const maxCol = Math.max(...Object.values(col));
  const maxRows = Math.max(...Object.values(rowsUsed));
  const canvas = {
    width: PAD * 2 + (maxCol + 1) * CARD_W + maxCol * COL_GAP,
    height: PAD * 2 + maxRows * CARD_H + (maxRows - 1) * ROW_GAP
  };

  // Vertically center shorter columns
  elements.forEach(e => {
    const colHeight = rowsUsed[col[e.id]] * (CARD_H + ROW_GAP) - ROW_GAP;
    pos[e.id].top += (canvas.height - PAD * 2 - colHeight) / 2;
  });

  const cards = elements.map(e => {
    const style = elementStyle(e.kind);
    return {
      id: e.id,
      type: style.type,
      typeLabel: `[ ${style.label} ]`,
      icon: style.icon,
      title: escapeHtml(e.label),
      tech: escapeHtml(e.tech),
      desc: escapeHtml(e.desc),
      pos: pos[e.id]
    };
  });

  const connections = rels.filter(r => r.from !== r.to).map(r => {
    const { from, to } = edgePoints(pos[r.from], pos[r.to]);
    const text = r.tech ? `${r.label} (${r.tech})` : r.label;
    return {
      from,
      to,
      label: escapeHtml(text.length > 34 ? text.slice(0, 33) + "…" : text),
      labelPos: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 8 }
    };
  });

  return {
    title: title || "AI-generated C4 diagram", // rendered with textContent, no escaping needed
    nodeSummary: `${elements.length} Components • ${connections.length} Relations`,
    code,
    cards,
    connections,
    canvas
  };
}
