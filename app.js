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

let currentCode = "";
let loadedRulesText = "";

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
    <svg class="c4-svg-overlay" width="100%" height="100%">
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

  state.connections.forEach(conn => {
    svgContent += `
      <path d="M ${conn.from.x} ${conn.from.y} L ${conn.to.x} ${conn.to.y}" marker-end="url(#arrow)" />
      <text x="${conn.labelPos.x}" y="${conn.labelPos.y}" class="c4-conn-label" filter="url(#label-bg)">${conn.label}</text>
    `;
  });

  svgContent += `</svg>`;

  // HTML Cards
  // AI-generated layouts carry their own canvas size; presets use the CSS default
  const sizeStyle = state.canvas
    ? `style="width: ${state.canvas.width}px; min-width: ${state.canvas.width}px; min-height: ${state.canvas.height}px;"`
    : "";
  const layerStyle = state.canvas ? `style="height: ${state.canvas.height}px;"` : "";

  let cardsHtml = `<div class="c4-cards-layer" ${layerStyle}>`;
  state.cards.forEach(card => {
    cardsHtml += `
      <div class="c4-card ${card.type}" style="top: ${card.pos.top}px; left: ${card.pos.left}px; width: ${card.pos.width}px; min-height: ${card.pos.height}px;">
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
    <div class="c4-diagram animate-fade" ${sizeStyle}>
      ${svgContent}
      ${cardsHtml}
    </div>
  `;
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
