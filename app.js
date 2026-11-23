// Hardcoded C4 Diagram State Configurations
const STATES = {
  ecommerce: {
    title: "E-Commerce System Context (C4)",
    prompt: "E-commerce store with Stripe payment and relational DB",
    nodeSummary: "4 Components • 3 Relations",
    code: `C4Context
  title System Context diagram for E-Commerce Platform

  Person(customer, "Customer", "Browses catalog, places orders, and pays online")
  System(storeApp, "Online Store Application", "Allows users to purchase products and view history")
  System_Ext(stripe, "Stripe Payment Gateway", "Processes credit cards and payment authorisations")
  ContainerDb(database, "Order & Product DB", "PostgreSQL", "Stores orders, stock, and customer data")

  Rel(customer, storeApp, "Browses & buys items", "HTTPS")
  Rel(storeApp, stripe, "Authorizes charges", "REST API")
  Rel(storeApp, database, "Reads & writes transactions", "SQL/TCP")`,
    cards: [
      {
        id: "customer",
        type: "person",
        typeLabel: "[ Person ]",
        icon: "👤",
        title: "Customer",
        tech: "",
        desc: "Browses catalog, places orders, and pays online.",
        pos: { top: 170, left: 30, width: 190, height: 130 }
      },
      {
        id: "storeApp",
        type: "system",
        typeLabel: "[ Software System ]",
        icon: "🛍️",
        title: "Online Store App",
        tech: "Node.js / React",
        desc: "Allows users to purchase products and manage order fulfillment.",
        pos: { top: 155, left: 310, width: 220, height: 160 }
      },
      {
        id: "stripe",
        type: "external",
        typeLabel: "[ External System ]",
        icon: "💳",
        title: "Stripe Gateway",
        tech: "SaaS API",
        desc: "Processes credit cards and payment authorizations securely.",
        pos: { top: 50, left: 630, width: 200, height: 140 }
      },
      {
        id: "database",
        type: "database",
        typeLabel: "[ Container: Database ]",
        icon: "🗄️",
        title: "Order & Product DB",
        tech: "PostgreSQL",
        desc: "Stores orders, stock inventory, and customer account records.",
        pos: { top: 270, left: 630, width: 200, height: 145 }
      }
    ],
    connections: [
      {
        from: { x: 220, y: 235 },
        to: { x: 310, y: 235 },
        label: "Browses & buys (HTTPS)",
        labelPos: { x: 265, y: 225 }
      },
      {
        from: { x: 530, y: 210 },
        to: { x: 630, y: 120 },
        label: "Authorizes (REST)",
        labelPos: { x: 580, y: 155 }
      },
      {
        from: { x: 530, y: 260 },
        to: { x: 630, y: 340 },
        label: "Reads/Writes (SQL)",
        labelPos: { x: 580, y: 310 }
      }
    ]
  },

  auth: {
    title: "User Authentication Flow (C4)",
    prompt: "User auth flow with API Gateway and Auth Service",
    nodeSummary: "3 Components • 2 Relations",
    code: `C4Container
  title Container diagram for User Authentication Flow

  Person(user, "User / Client", "Attempts sign in and accesses secured resources")
  Container(apiGateway, "API Gateway", "Kong / Envoy", "Validates JWT tokens and routes requests")
  Container(authService, "Auth Service", "Go / OAuth2", "Issues tokens, hashes passwords, verifies MFA")

  Rel(user, apiGateway, "Submits login credentials", "HTTPS / JSON")
  Rel(apiGateway, authService, "Verifies credentials & issues JWT", "gRPC")`,
    cards: [
      {
        id: "user",
        type: "person",
        typeLabel: "[ Person ]",
        icon: "👤",
        title: "User / Client",
        tech: "",
        desc: "Attempts sign-in and accesses secured application resources.",
        pos: { top: 165, left: 60, width: 200, height: 135 }
      },
      {
        id: "apiGateway",
        type: "system",
        typeLabel: "[ Container: Gateway ]",
        icon: "🛡️",
        title: "API Gateway",
        tech: "Kong / Envoy",
        desc: "Validates JWT tokens, applies rate limiting, and routes requests.",
        pos: { top: 155, left: 360, width: 220, height: 155 }
      },
      {
        id: "authService",
        type: "database",
        typeLabel: "[ Container: Service ]",
        icon: "🔑",
        title: "Auth Service",
        tech: "Go / OAuth2 / Redis",
        desc: "Validates identity, issues signed tokens, and manages sessions.",
        pos: { top: 155, left: 670, width: 220, height: 155 }
      }
    ],
    connections: [
      {
        from: { x: 260, y: 232 },
        to: { x: 360, y: 232 },
        label: "Login credentials (HTTPS)",
        labelPos: { x: 310, y: 220 }
      },
      {
        from: { x: 580, y: 232 },
        to: { x: 670, y: 232 },
        label: "Issues JWT (gRPC)",
        labelPos: { x: 625, y: 220 }
      }
    ]
  }
};

let currentStateKey = "ecommerce";

// DOM References
const promptInput = document.getElementById("prompt-input");
const btnGenerate = document.getElementById("btn-generate");
const tagEcommerce = document.getElementById("tag-ecommerce");
const tagAuth = document.getElementById("tag-auth");
const codeDisplay = document.getElementById("code-display");
const lineNumbers = document.getElementById("line-numbers");
const diagramMount = document.getElementById("diagram-mount");
const diagramTitle = document.getElementById("diagram-title");
const nodeCount = document.getElementById("node-count");
const btnCopyCode = document.getElementById("btn-copy-code");
const btnGenerateLabel = btnGenerate.querySelector("span");

const previewCanvas = document.getElementById("preview-canvas");
const zoomLabel = document.getElementById("btn-zoom-fit");

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const CANVAS_MARGIN = 20;

let zoomLevel = 1;
let zoomIsAuto = true; // Keep fitting the diagram to the panel until the user zooms
let diagramSize = { width: 0, height: 0 };

let currentCode = "";
let loadedRulesText = "";

// Interaction mode: 'move' (default drag), 'connect', 'delete'
// Declared early so renderDiagram can reference it during initial load
let interactionMode = 'move';

// Syntax Highlighter for C4 Mermaid
function highlightC4(text) {
  // Single pass, so later rules never match inside spans added by earlier ones
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(
      /("[^"]*")|\b(C4Context|C4Container|C4Component|title)\b|\b(Person_Ext|Person|System_Ext|SystemDb_Ext|SystemDb|System|ContainerDb_Ext|ContainerDb|Container_Ext|Container|Component|BiRel|Rel(?:_[A-Za-z]+)?)\b/g,
      (match, str, directive) => {
        if (str) return `<span class="code-c4-str">${str}</span>`;
        if (directive) return `<span class="code-c4-directive">${directive}</span>`;
        return `<span class="code-c4-fn">${match}</span>`;
      }
    );
}

// Render Diagram Cards and Connecting Arrows
function renderDiagram(state) {
  // SVG Arrow definitions & lines
  let svgContent = `
    <svg class="c4-svg-overlay" id="svg-overlay" width="100%" height="100%">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#4fa6ff"/>
        </marker>
        <filter id="label-bg" x="-10%" y="-10%" width="120%" height="120%">
          <feFlood flood-color="#18181c" flood-opacity="0.9" result="bg" />
          <feMerge>
            <feMergeNode in="bg" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
  `;

  state.connections.forEach((conn, i) => {
    svgContent += `
      <path d="M ${conn.from.x} ${conn.from.y} L ${conn.to.x} ${conn.to.y}" marker-end="url(#arrow)" data-conn-index="${i}" />
      <text x="${conn.labelPos.x}" y="${conn.labelPos.y}" class="c4-conn-label" filter="url(#label-bg)">${conn.label}</text>
    `;
  });

  svgContent += `</svg>`;

  // HTML Cards
  let cardsHtml = `<div class="c4-cards-layer">`;
  state.cards.forEach(card => {
    const modeClass = interactionMode === 'connect' ? 'connect-selectable' : 
                      interactionMode === 'delete' ? 'delete-target' : 'draggable';
    cardsHtml += `
      <div class="c4-card ${card.type} ${modeClass}" data-card-id="${card.id}"
           style="top: ${card.pos.top}px; left: ${card.pos.left}px; width: ${card.pos.width}px; min-height: ${card.pos.height}px;">
        <div class="c4-card-header">
          <span class="c4-badge">${card.typeLabel}</span>
          <span class="c4-card-icon">${card.icon}</span>
        </div>
        <div class="c4-card-title">${card.title}</div>
        ${card.tech ? `<div class="c4-card-tech">[${card.tech}]</div>` : ''}
        <div class="c4-card-desc">${card.desc}</div>
      </div>
    `;
  });
  cardsHtml += `</div>`;

  diagramMount.innerHTML = `
    <div class="c4-diagram animate-fade">
      ${svgContent}
      ${cardsHtml}
    </div>
  `;

  sizeDiagramToCards();
  zoomIsAuto = true;
  fitDiagram();
  attachCardInteractions();
}

// Size the canvas from the rendered cards, which grow with their text
function sizeDiagramToCards() {
  diagramMount.style.zoom = 1;
  const diagram = diagramMount.querySelector(".c4-diagram");
  if (!diagram) return;
  const cards = [...diagramMount.querySelectorAll(".c4-card")];
  if (cards.length === 0) {
    diagramSize = { width: 400, height: 300 };
  } else {
    diagramSize = {
      width: Math.max(...cards.map(c => c.offsetLeft + c.offsetWidth)) + CANVAS_MARGIN,
      height: Math.max(...cards.map(c => c.offsetTop + c.offsetHeight)) + CANVAS_MARGIN
    };
  }
  diagram.style.width = `${diagramSize.width}px`;
  diagram.style.height = `${diagramSize.height}px`;
}

// Stretch the diagram to cover the whole visible panel (at the current zoom),
// so cards can be dropped or moved anywhere in it, not only inside the cards' box
function applyCanvasSize() {
  const diagram = diagramMount.querySelector(".c4-diagram");
  if (!diagram) return;
  // Shrink to the content first, so the panel size read below only includes
  // scrollbars the content itself needs
  diagram.style.width = `${diagramSize.width}px`;
  diagram.style.height = `${diagramSize.height}px`;
  const visibleWidth = Math.floor(previewCanvas.clientWidth / zoomLevel);
  const visibleHeight = Math.floor(previewCanvas.clientHeight / zoomLevel);
  diagram.style.width = `${Math.max(diagramSize.width, visibleWidth)}px`;
  diagram.style.height = `${Math.max(diagramSize.height, visibleHeight)}px`;
}

function setZoom(level) {
  zoomLevel = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, level));
  // A fitted diagram never needs scrollbars. Hiding them also stops a loop where
  // a scrollbar shrinks the panel, the refit removes it, and the panel grows back.
  previewCanvas.style.overflow = zoomIsAuto ? "hidden" : "";
  diagramMount.style.zoom = zoomLevel;
  zoomLabel.textContent = `${Math.round(zoomLevel * 100)}%`;
  applyCanvasSize();
}

// Fit the whole diagram in the panel, without enlarging it past 100%
function fitDiagram() {
  // Measure the panel without scrollbars left over from a manual zoom
  previewCanvas.style.overflow = "hidden";
  const style = getComputedStyle(previewCanvas);
  const availableWidth = previewCanvas.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const availableHeight = previewCanvas.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  setZoom(Math.min(1, availableWidth / diagramSize.width, availableHeight / diagramSize.height));
}

// Show a state (preset or AI-generated) in both panels
function showState(state) {
  currentCode = state.code;

  // Update code view
  codeDisplay.innerHTML = highlightC4(state.code);
  const totalLines = state.code.split("\n").length;
  lineNumbers.innerHTML = Array.from({ length: totalLines }, (_, i) => i + 1).join("<br>");

  // Update right panel header and status
  diagramTitle.textContent = state.title;
  nodeCount.textContent = state.nodeSummary;

  // Render Visual Preview
  renderDiagram(state);
}

// Switch and Apply State
function setState(key) {
  currentStateKey = key;
  const state = STATES[key];

  // Update input text
  promptInput.value = state.prompt;

  // Update sample tag active styles
  tagEcommerce.classList.toggle("active", key === "ecommerce");
  tagAuth.classList.toggle("active", key === "auth");

  showState(state);
}

// Zoom Controls
function zoomBy(factor) {
  zoomIsAuto = false;
  setZoom(zoomLevel * factor);
}

document.getElementById("btn-zoom-out").addEventListener("click", () => zoomBy(1 / 1.2));
document.getElementById("btn-zoom-in").addEventListener("click", () => zoomBy(1.2));
zoomLabel.addEventListener("click", () => {
  zoomIsAuto = true;
  fitDiagram();
});

// Ctrl + mouse wheel zooms the diagram instead of the whole page
previewCanvas.addEventListener("wheel", (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
}, { passive: false });

// Refit only when the panel's outer size really changes (e.g. the AI settings
// panel opens), once per frame
let lastCanvasSize = "";
let refitFrame = 0;
new ResizeObserver(() => {
  const size = `${previewCanvas.offsetWidth}x${previewCanvas.offsetHeight}`;
  if (size === lastCanvasSize) return;
  lastCanvasSize = size;
  cancelAnimationFrame(refitFrame);
  refitFrame = requestAnimationFrame(() => {
    if (zoomIsAuto) fitDiagram();
    else applyCanvasSize();
  });
}).observe(previewCanvas);

// Event Listeners
tagEcommerce.addEventListener("click", () => setState("ecommerce"));
tagAuth.addEventListener("click", () => setState("auth"));

// Keyword mock: the original hardcoded behaviour
function generateWithKeywords() {
  const query = promptInput.value.toLowerCase();
  if (query.includes("auth") || query.includes("login") || query.includes("jwt") || query.includes("user")) {
    setState("auth");
  } else if (query.includes("store") || query.includes("e-commerce") || query.includes("stripe") || query.includes("shop")) {
    setState("ecommerce");
  } else {
    // Toggle state if generic
    setState(currentStateKey === "ecommerce" ? "auth" : "ecommerce");
  }
}

async function generateWithAI() {
  const prompt = promptInput.value.trim();
  if (!prompt) return;

  const provider = aiSettings.provider;
  const model = aiSettings.models[provider];
  const modelName = shortModelName(model);
  btnGenerate.disabled = true;
  btnGenerateLabel.textContent = "Generating…";
  setAiStatus(`⏳ ${modelName} generating…`);

  try {
    const code = await generateC4InBrowser({
      prompt,
      rulesText: loadedRulesText,
      model,
      onProgress: (progress, text) => {
        // First run downloads the model; later runs load it from the browser cache
        btnGenerateLabel.textContent = progress < 1 ? `Loading model ${Math.round(progress * 100)}%` : "Generating…";
        setAiStatus(progress < 1 ? `⏳ ${text.slice(0, 80)}` : `⏳ ${modelName} generating…`);
      }
    });
    showState(c4CodeToState(code));
    tagEcommerce.classList.remove("active");
    tagAuth.classList.remove("active");
    setAiStatus(`✓ Generated by ${modelName}${loadedRulesText ? " (with rules)" : ""}`);
  } catch (err) {
    setAiStatus(`✗ ${err.message}`, true);
  } finally {
    btnGenerate.disabled = false;
    btnGenerateLabel.textContent = "Generate Diagram";
  }
}

btnGenerate.addEventListener("click", () => {
  if (aiSettings.provider === "mock") {
    generateWithKeywords();
  } else {
    generateWithAI();
  }
});

promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    btnGenerate.click();
  }
});

// Copy Code Button
btnCopyCode.addEventListener("click", () => {
  navigator.clipboard.writeText(currentCode).then(() => {
    const tooltip = btnCopyCode.querySelector(".btn-tooltip");
    tooltip.classList.add("show");
    setTimeout(() => tooltip.classList.remove("show"), 1500);
  });
});

// Upload .c4rules.yaml Button
const rulesInput = document.getElementById("rules-file-input");
const btnUploadRules = document.getElementById("btn-upload-rules");
const rulesStatus = document.getElementById("rules-status");
const MAX_RULES_SIZE = 100 * 1024;

function showRulesResult(ok, message) {
  btnUploadRules.classList.toggle("loaded", ok);
  btnUploadRules.classList.toggle("error", !ok);
  rulesStatus.classList.toggle("error", !ok);
  rulesStatus.textContent = (ok ? "✓ " : "✗ ") + message;

  const tooltip = btnUploadRules.querySelector(".btn-tooltip");
  tooltip.textContent = ok ? "Rules loaded" : message;
  tooltip.classList.add("show");
  setTimeout(() => tooltip.classList.remove("show"), 2000);
}

function validateRulesFile(file) {
  if (!/\.ya?ml$/i.test(file.name)) {
    return Promise.resolve("Wrong file type (expected .yaml / .yml)");
  }
  if (file.size === 0) return Promise.resolve("Rules file is empty");
  if (file.size > MAX_RULES_SIZE) return Promise.resolve("Rules file too large (max 100 KB)");

  return file.text().then(text => {
    if (!text.trim()) return "Rules file is empty";
    if (!/^rules\s*:/m.test(text)) return "Missing top-level 'rules:' key";
    return null;
  });
}

btnUploadRules.addEventListener("click", () => rulesInput.click());

rulesInput.addEventListener("change", () => {
  const file = rulesInput.files[0];
  if (!file) return;

  validateRulesFile(file).then(async error => {
    if (error) {
      loadedRulesText = "";
      showRulesResult(false, error);
    } else {
      loadedRulesText = await file.text();
      showRulesResult(true, `Rules: ${file.name}`);
    }
    // Reset so picking the same file again still fires "change"
    rulesInput.value = "";
  });
});

// AI Settings (in-browser WebLLM or keyword mock)
const btnAiSettings = document.getElementById("btn-ai-settings");
const aiSettingsPanel = document.getElementById("ai-settings-panel");
const aiModeLabel = document.getElementById("ai-mode-label");
const aiProviderSelect = document.getElementById("ai-provider-select");
const aiModelRow = document.getElementById("ai-model-row");
const aiModelSelect = document.getElementById("ai-model-select");
const btnAiSave = document.getElementById("btn-ai-save");
const aiStatus = document.getElementById("ai-status");

let aiSettings = loadAiSettings();

function shortModelName(id) {
  return id.split("/").pop().replace(/-q4f\d+_\d-MLC$/, "");
}

function setAiStatus(text, isError = false) {
  aiStatus.textContent = text;
  aiStatus.classList.toggle("error", isError);
}

function refreshAiMode() {
  const provider = aiSettings.provider;
  const on = provider !== "mock";
  const modelName = on ? shortModelName(aiSettings.models[provider]) : "";
  aiModeLabel.textContent = on ? `AI: ${modelName}` : "AI: Keyword mock";
  btnAiSettings.classList.toggle("ai-on", on);
  setAiStatus(on ? `AI: ${modelName} (in browser)` : "AI: keyword mock");
}

// Fill the model list for the provider picked in the settings panel
function fillModelOptions(provider) {
  const models = AI_PROVIDERS[provider].models;
  aiModelSelect.innerHTML = "";
  models.forEach(m => {
    const option = document.createElement("option");
    option.value = m.id;
    option.textContent = m.label;
    aiModelSelect.appendChild(option);
  });
  if (models.length) aiModelSelect.value = aiSettings.models[provider] || models[0].id;
  aiModelRow.hidden = models.length === 0;
}

Object.entries(AI_PROVIDERS).forEach(([key, p]) => {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = p.label;
  aiProviderSelect.appendChild(option);
});

aiProviderSelect.addEventListener("change", () => fillModelOptions(aiProviderSelect.value));

btnAiSettings.addEventListener("click", () => {
  const open = aiSettingsPanel.hidden;
  aiSettingsPanel.hidden = !open;
  btnAiSettings.setAttribute("aria-expanded", String(open));
  if (open) {
    aiProviderSelect.value = aiSettings.provider;
    fillModelOptions(aiSettings.provider);
  }
});

btnAiSave.addEventListener("click", () => {
  const provider = aiProviderSelect.value;
  aiSettings.provider = provider;
  if (AI_PROVIDERS[provider].models.length) aiSettings.models[provider] = aiModelSelect.value;
  saveAiSettings(aiSettings);
  refreshAiMode();
  aiSettingsPanel.hidden = true;
  btnAiSettings.setAttribute("aria-expanded", "false");
});

// Initialize on Load
refreshAiMode();
setState("ecommerce");

// ====================================================================
//  INTERACTIVE DIAGRAM EDITING: Drag & Drop, Connect, Delete, Code Sync
// ====================================================================

// Live mutable state that tracks the current diagram for editing
let liveState = null;

// Connection source tracking
let connectSource = null;    // card id of the first box clicked in connect mode

const btnConnectMode = document.getElementById("btn-connect-mode");
const btnDeleteMode = document.getElementById("btn-delete-mode");
const editHintText = document.getElementById("edit-hint-text");
const palette = document.getElementById("component-palette");

// --- Mode toggling ---
function setMode(mode) {
  interactionMode = mode;
  connectSource = null;
  btnConnectMode.classList.toggle("active", mode === "connect");
  btnDeleteMode.classList.toggle("active", mode === "delete");

  // Update hint text
  if (mode === "connect") {
    editHintText.innerHTML = "🔗 <b>Connect mode</b>: Click the <b>source</b> box, then click the <b>target</b> box to create a relationship";
  } else if (mode === "delete") {
    editHintText.innerHTML = "🗑️ <b>Delete mode</b>: Click a <b>box</b> to remove it (and its connections), or click a <b>connection line</b> to remove it";
  } else {
    editHintText.innerHTML = "Drag components from the palette onto the canvas • Click <b>Connect</b> to link two boxes • Click <b>Delete</b> to remove";
  }

  // Re-render to apply mode-specific classes
  if (liveState) rerenderLive();
}

btnConnectMode.addEventListener("click", () => setMode(interactionMode === "connect" ? "move" : "connect"));
btnDeleteMode.addEventListener("click", () => setMode(interactionMode === "delete" ? "move" : "delete"));

// --- Keep liveState in sync when showState is called ---
const originalShowState = showState;
showState = function (state) {
  // Deep clone so we can mutate freely
  liveState = JSON.parse(JSON.stringify(state));
  originalShowState(state);
};

// --- Re-render from liveState without full reset ---
function rerenderLive() {
  // Once the user edits, keep the zoom fixed: refitting would rescale the
  // diagram and make cards jump away from where they were placed
  zoomIsAuto = false;

  // Recalculate connections edge points based on current card positions
  recalcConnections();

  currentCode = generateCodeFromState(liveState);
  liveState.code = currentCode;

  // Update code view
  codeDisplay.innerHTML = highlightC4(currentCode);
  const totalLines = currentCode.split("\n").length;
  lineNumbers.innerHTML = Array.from({ length: totalLines }, (_, i) => i + 1).join("<br>");

  // Update status
  liveState.nodeSummary = `${liveState.cards.length} Components • ${liveState.connections.length} Relations`;
  nodeCount.textContent = liveState.nodeSummary;

  // Re-render diagram
  renderDiagramFromLive(liveState);
}

// Render without resetting liveState (avoids infinite loop)
function renderDiagramFromLive(state) {
  let svgContent = `
    <svg class="c4-svg-overlay${interactionMode === 'delete' ? ' delete-mode' : ''}" id="svg-overlay" width="100%" height="100%">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#4fa6ff"/>
        </marker>
        <filter id="label-bg" x="-10%" y="-10%" width="120%" height="120%">
          <feFlood flood-color="#18181c" flood-opacity="0.9" result="bg" />
          <feMerge>
            <feMergeNode in="bg" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
  `;

  state.connections.forEach((conn, i) => {
    svgContent += `
      <path d="M ${conn.from.x} ${conn.from.y} L ${conn.to.x} ${conn.to.y}" marker-end="url(#arrow)" data-conn-index="${i}" />
      <text x="${conn.labelPos.x}" y="${conn.labelPos.y}" class="c4-conn-label" filter="url(#label-bg)">${conn.label}</text>
    `;
  });
  svgContent += `</svg>`;

  let cardsHtml = `<div class="c4-cards-layer">`;
  state.cards.forEach(card => {
    const modeClass = interactionMode === 'connect' ? 'connect-selectable' :
                      interactionMode === 'delete' ? 'delete-target' : 'draggable';
    const sourceClass = (interactionMode === 'connect' && connectSource === card.id) ? ' connect-source' : '';
    cardsHtml += `
      <div class="c4-card ${card.type} ${modeClass}${sourceClass}" data-card-id="${card.id}"
           style="top: ${card.pos.top}px; left: ${card.pos.left}px; width: ${card.pos.width}px; min-height: ${card.pos.height}px;">
        <div class="c4-card-header">
          <span class="c4-badge">${card.typeLabel}</span>
          <span class="c4-card-icon">${card.icon}</span>
        </div>
        <div class="c4-card-title">${card.title}</div>
        ${card.tech ? `<div class="c4-card-tech">[${card.tech}]</div>` : ''}
        <div class="c4-card-desc">${card.desc}</div>
      </div>
    `;
  });
  cardsHtml += `</div>`;

  diagramMount.innerHTML = `
    <div class="c4-diagram">
      ${svgContent}
      ${cardsHtml}
    </div>
  `;

  sizeDiagramToCards();
  // sizeDiagramToCards resets the zoom to 1 to measure; restore it
  setZoom(zoomLevel);
  attachCardInteractions();
}

// --- Attach interactions to cards based on the current mode ---
function attachCardInteractions() {
  const cardEls = diagramMount.querySelectorAll(".c4-card");

  cardEls.forEach(el => {
    const cardId = el.dataset.cardId;

    if (interactionMode === "move") {
      // Drag to move
      el.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        startCardDrag(el, cardId, e);
      });
    } else if (interactionMode === "connect") {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        handleConnectClick(cardId);
      });
    } else if (interactionMode === "delete") {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteCard(cardId);
      });
    }
  });

  // Delete mode: clickable connections
  if (interactionMode === "delete") {
    const paths = diagramMount.querySelectorAll(".c4-svg-overlay path[data-conn-index]");
    paths.forEach(path => {
      path.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(path.dataset.connIndex);
        deleteConnection(idx);
      });
    });
  }
}

// --- Card Drag to Move ---
function startCardDrag(el, cardId, startEvent) {
  const card = liveState.cards.find(c => c.id === cardId);
  if (!card) return;

  // Stop auto-fit and show scrollbars so a card dragged past the edge is not clipped
  zoomIsAuto = false;
  previewCanvas.style.overflow = "";

  el.classList.add("dragging");
  const startX = startEvent.clientX;
  const startY = startEvent.clientY;
  const origLeft = card.pos.left;
  const origTop = card.pos.top;

  function onMove(e) {
    const dx = (e.clientX - startX) / zoomLevel;
    const dy = (e.clientY - startY) / zoomLevel;
    card.pos.left = Math.max(0, origLeft + dx);
    card.pos.top = Math.max(0, origTop + dy);

    el.style.left = card.pos.left + "px";
    el.style.top = card.pos.top + "px";

    // Update SVG connections live
    updateSVGConnections();
  }

  function onUp() {
    el.classList.remove("dragging");
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    rerenderLive();
  }

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

// --- Update SVG lines without full re-render (for smooth dragging) ---
function updateSVGConnections() {
  recalcConnections();
  const svgOverlay = document.getElementById("svg-overlay");
  if (!svgOverlay) return;

  const paths = svgOverlay.querySelectorAll("path[data-conn-index]");
  const texts = svgOverlay.querySelectorAll("text.c4-conn-label");

  liveState.connections.forEach((conn, i) => {
    if (paths[i]) {
      paths[i].setAttribute("d", `M ${conn.from.x} ${conn.from.y} L ${conn.to.x} ${conn.to.y}`);
    }
    if (texts[i]) {
      texts[i].setAttribute("x", conn.labelPos.x);
      texts[i].setAttribute("y", conn.labelPos.y);
    }
  });
}

// --- Recalculate connection endpoints from card positions ---
function recalcConnections() {
  liveState.connections.forEach(conn => {
    const fromCard = liveState.cards.find(c => c.id === conn.fromId);
    const toCard = liveState.cards.find(c => c.id === conn.toId);
    if (!fromCard || !toCard) return;

    const pts = edgePointsFromPos(fromCard.pos, toCard.pos);
    conn.from = pts.from;
    conn.to = pts.to;
    conn.labelPos = { x: (pts.from.x + pts.to.x) / 2, y: (pts.from.y + pts.to.y) / 2 - 8 };
  });
}

function edgePointsFromPos(a, b) {
  const ac = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
  const bc = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  if (b.left >= a.left + a.width) return { from: { x: a.left + a.width, y: ac.y }, to: { x: b.left, y: bc.y } };
  if (a.left >= b.left + b.width) return { from: { x: a.left, y: ac.y }, to: { x: b.left + b.width, y: bc.y } };
  if (bc.y > ac.y) return { from: { x: ac.x, y: a.top + a.height }, to: { x: bc.x, y: b.top } };
  return { from: { x: ac.x, y: a.top }, to: { x: bc.x, y: b.top + b.height } };
}

// --- Palette Drag & Drop onto Canvas ---
palette.querySelectorAll(".palette-item").forEach(item => {
  item.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", item.dataset.kind);
    e.dataTransfer.effectAllowed = "copy";
  });
});

previewCanvas.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
  previewCanvas.classList.add("drag-over");
});

previewCanvas.addEventListener("dragleave", () => {
  previewCanvas.classList.remove("drag-over");
});

previewCanvas.addEventListener("drop", (e) => {
  e.preventDefault();
  previewCanvas.classList.remove("drag-over");

  const kind = e.dataTransfer.getData("text/plain");
  if (!kind || !liveState) return;

  // Calculate drop position in diagram coordinates
  const rect = diagramMount.getBoundingClientRect();
  const dropX = (e.clientX - rect.left) / zoomLevel;
  const dropY = (e.clientY - rect.top) / zoomLevel;

  // Switch to move mode if we were in a different mode
  setMode("move");

  // Show dialog to get element details
  showNewCardDialog(kind, Math.max(0, dropX - 100), Math.max(0, dropY - 70));
});

// --- New Card Dialog ---
function showNewCardDialog(kind, left, top) {
  const style = elementStyle(kind);
  const hasTech = kind.startsWith("Container") || kind.startsWith("Component");

  const overlay = document.createElement("div");
  overlay.className = "card-edit-dialog-overlay";
  overlay.innerHTML = `
    <div class="card-edit-dialog">
      <h3>${style.icon} Add ${style.label}</h3>
      <label for="new-card-label">Label (name)</label>
      <input type="text" id="new-card-label" placeholder="e.g. My Service" autofocus />
      ${hasTech ? `
        <label for="new-card-tech">Technology</label>
        <input type="text" id="new-card-tech" placeholder="e.g. Node.js, PostgreSQL" />
      ` : ''}
      <label for="new-card-desc">Description</label>
      <input type="text" id="new-card-desc" placeholder="Short description of this component" />
      <div class="dialog-actions">
        <button class="secondary-btn" id="dialog-cancel">Cancel</button>
        <button class="primary-btn" id="dialog-ok">Add</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const labelInput = overlay.querySelector("#new-card-label");
  const descInput = overlay.querySelector("#new-card-desc");
  const techInput = overlay.querySelector("#new-card-tech");

  function close() { overlay.remove(); }

  overlay.querySelector("#dialog-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  overlay.querySelector("#dialog-ok").addEventListener("click", () => {
    const label = labelInput.value.trim() || "New " + style.label;
    const desc = descInput.value.trim() || "";
    const tech = techInput ? techInput.value.trim() : "";

    addCardToState(kind, label, tech, desc, left, top);
    close();
  });

  // Enter key on last input triggers OK
  const lastInput = techInput || descInput;
  lastInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") overlay.querySelector("#dialog-ok").click();
  });
  labelInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  setTimeout(() => labelInput.focus(), 50);
}

function addCardToState(kind, label, tech, desc, left, top) {
  // Generate a unique camelCase alias
  const baseAlias = label.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/)
    .map((w, i) => i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join("");
  let alias = baseAlias || "element";
  let counter = 1;
  while (liveState.cards.some(c => c.id === alias)) {
    alias = baseAlias + counter++;
  }

  const style = elementStyle(kind);
  const newCard = {
    id: alias,
    type: style.type,
    typeLabel: `[ ${style.label} ]`,
    icon: style.icon,
    title: escapeHtml(label),
    tech: escapeHtml(tech),
    desc: escapeHtml(desc),
    pos: { left, top, width: 200, height: 140 },
    // Store kind for code generation
    _kind: kind
  };

  liveState.cards.push(newCard);
  rerenderLive();
}

// --- Connect Mode ---
function handleConnectClick(cardId) {
  if (!connectSource) {
    // First click: select source
    connectSource = cardId;
    editHintText.innerHTML = `🔗 Source: <b>${getCardTitle(cardId)}</b> — now click the <b>target</b> box`;
    rerenderLive(); // show highlight
  } else if (connectSource === cardId) {
    // Clicked same card, deselect
    connectSource = null;
    editHintText.innerHTML = "🔗 <b>Connect mode</b>: Click the <b>source</b> box, then click the <b>target</b> box";
    rerenderLive();
  } else {
    // Second click: create connection
    const fromId = connectSource;
    const toId = cardId;
    connectSource = null;
    showConnectionDialog(fromId, toId);
  }
}

function getCardTitle(cardId) {
  const card = liveState.cards.find(c => c.id === cardId);
  return card ? card.title : cardId;
}

function showConnectionDialog(fromId, toId) {
  const overlay = document.createElement("div");
  overlay.className = "connection-dialog-overlay";
  overlay.innerHTML = `
    <div class="connection-dialog">
      <h3>🔗 Connect: ${getCardTitle(fromId)} → ${getCardTitle(toId)}</h3>
      <label for="conn-label">Relationship label</label>
      <input type="text" id="conn-label" placeholder="e.g. Sends requests" autofocus />
      <label for="conn-tech">Technology / Protocol</label>
      <input type="text" id="conn-tech" placeholder="e.g. HTTPS, gRPC, SQL" />
      <div class="dialog-actions">
        <button class="secondary-btn" id="conn-cancel">Cancel</button>
        <button class="primary-btn" id="conn-ok">Create</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const labelInput = overlay.querySelector("#conn-label");
  const techInput = overlay.querySelector("#conn-tech");

  function close() { overlay.remove(); }

  overlay.querySelector("#conn-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  overlay.querySelector("#conn-ok").addEventListener("click", () => {
    const label = labelInput.value.trim() || "Uses";
    const tech = techInput.value.trim();
    addConnection(fromId, toId, label, tech);
    close();
  });

  techInput.addEventListener("keydown", (e) => { if (e.key === "Enter") overlay.querySelector("#conn-ok").click(); });
  labelInput.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  setTimeout(() => labelInput.focus(), 50);
}

function addConnection(fromId, toId, label, tech) {
  // Check for duplicate
  if (liveState.connections.some(c => c.fromId === fromId && c.toId === toId)) {
    return;
  }

  const fromCard = liveState.cards.find(c => c.id === fromId);
  const toCard = liveState.cards.find(c => c.id === toId);
  if (!fromCard || !toCard) return;

  const displayLabel = tech ? `${label} (${tech})` : label;
  const pts = edgePointsFromPos(fromCard.pos, toCard.pos);

  liveState.connections.push({
    fromId,
    toId,
    label: escapeHtml(displayLabel.length > 34 ? displayLabel.slice(0, 33) + "…" : displayLabel),
    _rawLabel: label,
    _rawTech: tech,
    from: pts.from,
    to: pts.to,
    labelPos: { x: (pts.from.x + pts.to.x) / 2, y: (pts.from.y + pts.to.y) / 2 - 8 }
  });

  rerenderLive();
}

// --- Delete Mode ---
function deleteCard(cardId) {
  liveState.cards = liveState.cards.filter(c => c.id !== cardId);
  liveState.connections = liveState.connections.filter(c => c.fromId !== cardId && c.toId !== cardId);
  rerenderLive();
}

function deleteConnection(index) {
  if (index >= 0 && index < liveState.connections.length) {
    liveState.connections.splice(index, 1);
    rerenderLive();
  }
}

// --- Generate Mermaid C4 Code from Live State ---
function generateCodeFromState(state) {
  // Determine diagram type from first line of previous code, or default
  let diagramType = "C4Context";
  if (state.code) {
    const match = state.code.match(/^(C4Context|C4Container|C4Component)/m);
    if (match) diagramType = match[1];
  }

  let lines = [diagramType];
  lines.push(`  title ${state.title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')}`);
  lines.push("");

  // Elements
  state.cards.forEach(card => {
    const kind = card._kind || kindFromType(card);
    const label = unescapeHtml(card.title);
    const desc = unescapeHtml(card.desc);
    const tech = unescapeHtml(card.tech);

    if (kind.startsWith("Container") || kind.startsWith("Component")) {
      lines.push(`  ${kind}(${card.id}, "${label}", "${tech}", "${desc}")`);
    } else {
      lines.push(`  ${kind}(${card.id}, "${label}", "${desc}")`);
    }
  });

  lines.push("");

  // Relations
  state.connections.forEach(conn => {
    const label = conn._rawLabel || unescapeHtml(conn.label);
    const tech = conn._rawTech || "";
    if (tech) {
      lines.push(`  Rel(${conn.fromId}, ${conn.toId}, "${label}", "${tech}")`);
    } else {
      lines.push(`  Rel(${conn.fromId}, ${conn.toId}, "${label}")`);
    }
  });

  return lines.join("\n");
}

function kindFromType(card) {
  // Reverse-map from display type back to Mermaid kind
  const tl = card.typeLabel.toLowerCase();
  if (tl.includes("person")) return "Person";
  if (tl.includes("external")) return "System_Ext";
  if (tl.includes("database")) return "ContainerDb";
  if (tl.includes("container")) return "Container";
  if (tl.includes("component")) return "Component";
  return "System";
}

function unescapeHtml(text) {
  if (!text) return "";
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// escapeHtml is already defined in ai.js (loaded before app.js)

// --- Enrich existing hardcoded connections with fromId/toId ---
// When a preset state is loaded, connections only have {from, to, label, labelPos}
// but no fromId/toId. We need to infer them for editing.
const originalSetState = setState;
setState = function (key) {
  originalSetState(key);
  enrichConnections();
};

function enrichConnections() {
  if (!liveState) return;
  liveState.connections.forEach(conn => {
    if (conn.fromId && conn.toId) return; // already enriched

    // Find closest card to the from/to points
    conn.fromId = findClosestCard(conn.from, liveState.cards);
    conn.toId = findClosestCard(conn.to, liveState.cards);

    // Extract raw label and tech from display label
    const match = conn.label.match(/^(.+?)\s*\(([^)]+)\)$/);
    if (match) {
      conn._rawLabel = unescapeHtml(match[1].trim());
      conn._rawTech = unescapeHtml(match[2].trim());
    } else {
      conn._rawLabel = unescapeHtml(conn.label);
      conn._rawTech = "";
    }
  });

  // Also assign _kind to cards based on preset data
  liveState.cards.forEach(card => {
    if (!card._kind) {
      card._kind = kindFromType(card);
    }
  });
}

function findClosestCard(point, cards) {
  let best = null, bestDist = Infinity;
  cards.forEach(card => {
    const cx = card.pos.left + card.pos.width / 2;
    const cy = card.pos.top + card.pos.height / 2;
    // Check edge proximity: the point should be on or near the card's edge
    const dx = Math.min(Math.abs(point.x - card.pos.left), Math.abs(point.x - (card.pos.left + card.pos.width)));
    const dy = Math.min(Math.abs(point.y - card.pos.top), Math.abs(point.y - (card.pos.top + card.pos.height)));
    const dist = Math.min(dx, dy) + Math.abs(cx - point.x) * 0.01 + Math.abs(cy - point.y) * 0.01;
    if (dist < bestDist) {
      bestDist = dist;
      best = card.id;
    }
  });
  return best;
}

// --- Keyboard shortcuts ---
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.key === "Escape") setMode("move");
  if (e.key === "c" && !e.ctrlKey && !e.metaKey) setMode(interactionMode === "connect" ? "move" : "connect");
  if (e.key === "d" && !e.ctrlKey && !e.metaKey) setMode(interactionMode === "delete" ? "move" : "delete");
});

// --- Re-initialize with overrides active ---
// The initial setState("ecommerce") ran before the overrides were installed,
// so liveState is still null. Re-run to populate it and enrich connections.
setState(currentStateKey);
