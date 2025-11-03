// ===== NOVA unified app.js (Stable 11/3 QA) =====

// Cache-bust to avoid stale JSON
const CACHE_BUST = `?v=${Date.now()}`;

// ---- Robust JSON loader that works locally & on Vercel ----
async function loadJSON(file) {
  const paths = [
    `/assets/data/${file}${CACHE_BUST}`,
    `./assets/data/${file}${CACHE_BUST}`,
    `assets/data/${file}${CACHE_BUST}`
  ];

  for (const url of paths) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn(`Fetch failed for ${url}`);
    }
  }
  throw new Error(`❌ Failed to load ${file} from /assets/data`);
}

// ---- Helpers ----
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }
function setLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
function getLS(k, d = null) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (_) { return d; } }

// ---- Normalize category objects ----
function normalizeCategory(c) {
  const name = c.name || c.title || c.label || c.category || c.Category || "Unnamed";
  const subtitle = c.subtitle || c.sub || c.description || "";
  const id = c.id || c.key || c.slug || name.replace(/\s+/g, "_").toLowerCase();
  return { id, name, subtitle };
}

// ---- Welcome ----
function initWelcome() {
  const start = qs('a[href="categories.html"]');
  if (start) start.onclick = e => {
    e.preventDefault();
    location.href = "categories.html";
  };
}

// ---- Categories ----
async function initCategories() {
  const container = qs("#categoryGrid");
  if (!container) return console.error("No #categoryGrid found.");

  try {
    const data = await loadJSON("categories.json");
    console.log("[NOVA] Loaded categories:", data.length);
    container.innerHTML = "";

    data.forEach(cat => {
      const c = normalizeCategory(cat);
      const div = document.createElement("div");
      div.className = "cat-pill";
      div.innerHTML = `
        <strong>${c.name}</strong>
        <small>${c.subtitle}</small>
      `;
      div.onclick = () => div.classList.toggle("cat-pill_selected");
      container.appendChild(div);
    });

  } catch (err) {
    console.error("⚠️ Could not load categories:", err);
    container.innerHTML = `<p style="color:red">Failed to load categories data.</p>`;
  }
}

// ---- Traits ----
async function initTraits() {
  const container = qs("#traitsGrid");
  if (!container) return;

  try {
    const data = await loadJSON("traits_with_categories.json");
    container.innerHTML = "";
    data.forEach(t => {
      const div = document.createElement("div");
      div.className = "trait-pill";
      div.innerHTML = `<strong>${t.trait}</strong><small>${t.category}</small>`;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Failed to load traits:", err);
    container.innerHTML = `<p style="color:red">Traits data missing.</p>`;
  }
}

// ---- Roles ----
async function initRoles() {
  const container = qs("#rolesGrid");
  if (!container) return;

  try {
    const data = await loadJSON("roles_400.json");
    container.innerHTML = "";
    data.forEach(r => {
      const div = document.createElement("div");
      div.className = "role-card";
      div.innerHTML = `
        <strong>${r.title}</strong>
        <small>${r.outlook || ""}</small>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Failed to load roles:", err);
    container.innerHTML = `<p style="color:red">Roles data missing.</p>`;
  }
}

// ---- Reflection / Invest placeholders ----
function initReflection() {
  const box = qs("#reflectionBox");
  if (box) box.innerHTML = `<p>Take a moment to reflect on your selections...</p>`;
}
function initInvest() {
  const box = qs("#investBox");
  if (box) box.innerHTML = `<p>Now invest in yourself — your purpose journey begins here.</p>`;
}

// ---- Simple router (detects page & calls proper init) ----
document.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname.toLowerCase();

  if (path.includes("index")) return initWelcome();
  if (path.includes("categories")) return initCategories();
  if (path.includes("traits")) return initTraits();
  if (path.includes("roles")) return initRoles();
  if (path.includes("reflection")) return initReflection();
  if (path.includes("invest")) return initInvest();

  console.warn("[router] No page match for", path);
});

// --- END of app.js ---
