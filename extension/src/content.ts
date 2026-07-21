/**
 * Content script — sidebar UI and patient-linked forms (no MioSalon page scraping).
 */

import {
  AUTH_INVALID_MESSAGE,
  clearStoredAuth,
  ensureValidAuth,
  getStoredAuth,
  SESSION_EXPIRED_MESSAGE,
} from "./auth-storage";
import {
  collectFormData,
  formStyles,
  renderFormHtml,
  type FormTemplateJson,
} from "./form-render";

const PANEL_HOST_ID = "miosalon-ext-panel-host";
const PAGE_LAYOUT_STYLE_ID = "miosalon-ext-page-layout";
const SIDEBAR_WIDTH = 320;
const STORAGE_KEY_OPEN = "sidebarOpen";

type SavedStyles = {
  el: HTMLElement;
  right: string;
  width: string;
  left: string;
  maxWidth: string;
};

let adjustedFixedEls: SavedStyles[] = [];

type AuthState = {
  token?: string;
  user?: { name?: string; email?: string };
  apiBase?: string;
};

let shadowRoot: ShadowRoot | null = null;
let sidebarOpen = true;
let shellReady = false;
let lastRenderedPatientId: string | null = null;
let currentLinkId: string | null = null;

function extractPatientId(): string | null {
  const href = window.location.href;
  const path = window.location.pathname;

  const patterns = [
    /\/product\/feature\/customer\/([^/?#]+)/i,
    /\/feature\/customer\/([^/?#]+)/i,
    /\/customer\/([^/?#]+)/i,
    /\/customers?\/([^/?#]+)/i,
    /\/patients?\/([a-zA-Z0-9_-]+)/i,
    /\/patient\/([a-zA-Z0-9_-]+)/i,
    /[?&]customerId=([a-zA-Z0-9_-]+)/i,
    /[?&]customer_id=([a-zA-Z0-9_-]+)/i,
    /[?&]patientId=([a-zA-Z0-9_-]+)/i,
    /[?&]patient_id=([a-zA-Z0-9_-]+)/i,
  ];

  for (const re of patterns) {
    const match = href.match(re) || path.match(re);
    const id = match?.[1]?.trim();
    if (id && !/^(new|create|list)$/i.test(id)) return id;
  }

  return null;
}

async function getAuth(): Promise<AuthState> {
  const auth = await ensureValidAuth(await getStoredAuth());
  return auth ?? {};
}

function getSidebarOpenPreference(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY_OPEN], (data) => {
      if (typeof data[STORAGE_KEY_OPEN] === "boolean") {
        resolve(data[STORAGE_KEY_OPEN]);
      } else {
        resolve(true);
      }
    });
  });
}

function setSidebarOpenPreference(open: boolean) {
  chrome.storage.local.set({ [STORAGE_KEY_OPEN]: open });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clearFixedChromeAdjustments() {
  for (const { el, right, width, left, maxWidth } of adjustedFixedEls) {
    el.style.right = right;
    el.style.width = width;
    el.style.left = left;
    el.style.maxWidth = maxWidth;
    el.removeAttribute("data-miosalon-ext-adjusted");
  }
  adjustedFixedEls = [];
}

function adjustFixedChrome() {
  clearFixedChromeAdjustments();
  const w = SIDEBAR_WIDTH;
  const vw = window.innerWidth;

  for (const node of document.querySelectorAll("body *")) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.id === PANEL_HOST_ID) continue;

    const cs = getComputedStyle(node);
    if (cs.position !== "fixed" && cs.position !== "sticky") continue;

    const rect = node.getBoundingClientRect();
    if (rect.width < 80 || rect.height < 20) continue;

    const isFullWidthBar = rect.width >= vw * 0.7 && rect.height < 220 && rect.top < 160;
    const underSidebar =
      sidebarOpen && rect.right > vw - w - 4 && rect.left > vw - w - 120;

    if (!isFullWidthBar && !underSidebar) continue;

    adjustedFixedEls.push({
      el: node,
      right: node.style.right,
      width: node.style.width,
      left: node.style.left,
      maxWidth: node.style.maxWidth,
    });
    node.setAttribute("data-miosalon-ext-adjusted", "1");

    if (isFullWidthBar) {
      node.style.setProperty("width", `calc(100vw - ${w}px)`, "important");
      node.style.setProperty("max-width", `calc(100vw - ${w}px)`, "important");
      node.style.setProperty("right", `${w}px`, "important");
      node.style.setProperty("left", "0", "important");
    } else {
      node.style.setProperty("right", `${w + Math.max(0, vw - rect.right)}px`, "important");
    }
  }
}

function ensurePageLayoutStyles() {
  let style = document.getElementById(PAGE_LAYOUT_STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = PAGE_LAYOUT_STYLE_ID;
    style.textContent = `
      html.miosalon-ext-sidebar-open {
        margin-right: ${SIDEBAR_WIDTH}px !important;
        overflow-x: hidden;
      }
      html.miosalon-ext-sidebar-open body {
        margin-right: 0 !important;
        overflow-x: auto;
      }
    `;
    document.head.appendChild(style);
  }
}

function applyPageLayout() {
  ensurePageLayoutStyles();
  const html = document.documentElement;
  html.style.setProperty("--miosalon-ext-sidebar-w", `${SIDEBAR_WIDTH}px`);

  if (sidebarOpen) {
    html.classList.add("miosalon-ext-sidebar-open");
    requestAnimationFrame(() => {
      adjustFixedChrome();
      setTimeout(adjustFixedChrome, 400);
    });
  } else {
    html.classList.remove("miosalon-ext-sidebar-open");
    clearFixedChromeAdjustments();
  }
}

function applySidebarOpenState() {
  if (!shadowRoot) return;
  const sidebar = shadowRoot.getElementById("sidebar");
  const reopen = shadowRoot.getElementById("reopenTab");
  if (sidebar) sidebar.dataset.open = sidebarOpen ? "true" : "false";
  if (reopen) reopen.hidden = sidebarOpen;
  applyPageLayout();
}

function setSidebarOpen(open: boolean) {
  sidebarOpen = open;
  setSidebarOpenPreference(open);
  applySidebarOpenState();
}

function sidebarStyles() {
  return `
    :host {
      all: initial;
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483000;
      font-family: "Segoe UI", system-ui, sans-serif;
    }
    .sidebar {
      pointer-events: auto;
      position: fixed;
      top: 0;
      right: 0;
      width: ${SIDEBAR_WIDTH}px;
      height: 100vh;
      max-height: 100dvh;
      background: #fafaf9;
      border-left: 1px solid #d6d3d1;
      box-shadow: -8px 0 32px rgba(28, 25, 23, 0.08);
      display: flex;
      flex-direction: column;
      transform: translateX(0);
      transition: transform 0.22s ease;
      box-sizing: border-box;
    }
    .sidebar[data-open="false"] {
      transform: translateX(100%);
      pointer-events: none;
    }
    .head {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: #0f766e;
      color: #fff;
      padding: 12px 14px;
      font-size: 14px;
      font-weight: 600;
    }
    .close-btn {
      pointer-events: auto;
      border: 0;
      background: rgba(255,255,255,0.15);
      color: #fff;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .close-btn:hover { background: rgba(255,255,255,0.28); }
    .scroll {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      color: #1c1917;
      font-size: 13px;
      line-height: 1.5;
    }
    .section {
      background: #fff;
      border: 1px solid #e7e5e4;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }
    .section h3 {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #78716c;
    }
    .id {
      font-family: ui-monospace, monospace;
      background: #f5f5f4;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
    .muted { color: #78716c; font-size: 12px; }
    .status { font-size: 12px; margin-top: 6px; }
    .ok { color: #0f766e; }
    .warn { color: #b45309; }
    .profile-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 4px 0;
      border-bottom: 1px solid #f5f5f4;
      font-size: 12px;
    }
    .profile-row:last-child { border-bottom: 0; }
    .profile-row dt { color: #78716c; flex-shrink: 0; }
    .profile-row dd { margin: 0; text-align: right; color: #1c1917; }
    .reopen-tab {
      pointer-events: auto;
      position: fixed;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      writing-mode: vertical-rl;
      text-orientation: mixed;
      border: 0;
      border-radius: 8px 0 0 8px;
      background: #0f766e;
      color: #fff;
      padding: 12px 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: -2px 0 12px rgba(0,0,0,0.12);
      letter-spacing: 0.02em;
    }
    .reopen-tab:hover { background: #115e59; }
    .signin-prompt h3 { margin: 0 0 8px; font-size: 13px; color: #1c1917; }
    .signin-steps { margin: 10px 0 0; padding-left: 18px; font-size: 12px; color: #44403c; }
    .signin-steps li { margin-bottom: 8px; }
    .signin-prompt code { font-size: 11px; background: #f5f5f4; padding: 1px 4px; border-radius: 4px; }
    ${formStyles}
  `;
}

function ensureShell() {
  if (shellReady && shadowRoot?.getElementById("sidebar")) return;

  let host = document.getElementById(PANEL_HOST_ID) as HTMLElement | null;

  if (host?.shadowRoot?.getElementById("sidebar")) {
    shadowRoot = host.shadowRoot;
    shellReady = true;
    return;
  }

  if (host?.shadowRoot) {
    host.remove();
    host = null;
    shellReady = false;
    shadowRoot = null;
  }

  if (!host) {
    host = document.createElement("div");
    host.id = PANEL_HOST_ID;
    host.style.cssText =
      "position:fixed;inset:0;z-index:2147483646;pointer-events:none;margin:0;padding:0;border:0;";
    document.documentElement.appendChild(host);
  }

  try {
    shadowRoot = host.attachShadow({ mode: "open" });
  } catch (err) {
    console.error("[MioSalon Extension] attachShadow failed, recreating host", err);
    host.remove();
    host = document.createElement("div");
    host.id = PANEL_HOST_ID;
    host.style.cssText =
      "position:fixed;inset:0;z-index:2147483646;pointer-events:none;margin:0;padding:0;border:0;";
    document.documentElement.appendChild(host);
    shadowRoot = host.attachShadow({ mode: "open" });
  }

  shadowRoot.innerHTML = `
    <style>${sidebarStyles()}</style>
    <aside class="sidebar" id="sidebar" data-open="true" role="complementary" aria-label="MioSalon Extension">
      <div class="head">
        <span>MioSalon Extension</span>
        <button type="button" class="close-btn" id="closeBtn" title="Close sidebar" aria-label="Close sidebar">×</button>
      </div>
      <div class="scroll" id="scroll">
        <div class="section" id="patientSection"></div>
        <div class="section" id="formsSection"></div>
        <div class="section">
          <h3>Status</h3>
          <div class="status" id="status">Checking…</div>
        </div>
      </div>
    </aside>
    <button type="button" class="reopen-tab" id="reopenTab" hidden>Open panel</button>
  `;

  shadowRoot.getElementById("closeBtn")?.addEventListener("click", () => setSidebarOpen(false));
  shadowRoot.getElementById("reopenTab")?.addEventListener("click", () => setSidebarOpen(true));

  shadowRoot.addEventListener("click", (ev) => {
    const btn = (ev.target as HTMLElement).closest(".save-form-btn");
    if (!btn || !shadowRoot) return;
    void saveFormFromSidebar(btn as HTMLButtonElement);
  });

  shellReady = true;
}

async function saveFormFromSidebar(btn: HTMLButtonElement) {
  if (!shadowRoot || !currentLinkId) return;
  const templateId = btn.getAttribute("data-template-id");
  if (!templateId) return;

  const auth = await getAuth();
  if (!auth.token || !auth.apiBase) return;

  const data = collectFormData(shadowRoot, templateId);
  const apiBase = auth.apiBase.replace(/\/$/, "");
  const msg = shadowRoot.querySelector(`[data-form-msg="${templateId}"]`);
  btn.disabled = true;

  try {
    const res = await fetch(
      `${apiBase}/api/patients/${encodeURIComponent(currentLinkId)}/forms/${templateId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
      }
    );
    if (!res.ok) {
      if (msg) {
        msg.textContent = "Save failed";
        msg.className = "form-msg err";
      }
      return;
    }
    if (msg) {
      msg.textContent = "Saved to database";
      msg.className = "form-msg ok";
    }
  } catch {
    if (msg) {
      msg.textContent = "Could not reach API";
      msg.className = "form-msg err";
    }
  } finally {
    btn.disabled = false;
  }
}

async function loadActiveForms(linkId: string, apiBase: string, token: string) {
  if (!shadowRoot) return;
  const formsSection = shadowRoot.getElementById("formsSection");
  if (!formsSection) return;

  formsSection.innerHTML = `<p class="muted">Loading forms…</p>`;

  try {
    const tplRes = await fetch(`${apiBase}/api/form-templates?active=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!tplRes.ok) {
      formsSection.innerHTML = `<p class="muted">Could not load forms.</p>`;
      return;
    }
    const { templates } = (await tplRes.json()) as { templates: FormTemplateJson[] };
    if (!templates?.length) {
      formsSection.innerHTML = `<p class="muted">No active form — create one in Dashboard → Form builder.</p>`;
      return;
    }

    const parts: string[] = [];
    for (const template of templates) {
      const subRes = await fetch(
        `${apiBase}/api/patients/${encodeURIComponent(linkId)}/forms/${template.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const subJson = subRes.ok ? await subRes.json() : { data: {} };
      const data = (subJson.data ?? {}) as Record<string, unknown>;
      parts.push(`<div class="section">${renderFormHtml(template, data)}</div>`);
    }
    formsSection.innerHTML = parts.join("");
  } catch {
    formsSection.innerHTML = `<p class="muted">Could not load forms.</p>`;
  }
}

function setPatientSection(patientId: string | null) {
  if (!shadowRoot) return;
  const el = shadowRoot.getElementById("patientSection");
  if (!el) return;
  el.innerHTML = patientId
    ? `<h3>Patient</h3><p>ID <span class="id">${escapeHtml(patientId)}</span></p>`
    : `<h3>Patient</h3><p class="muted">Open a Customer 360° page to link a patient.</p>`;
}

async function updatePanel(patientId: string | null) {
  try {
    ensureShell();
  } catch (err) {
    console.error("[MioSalon Extension] Panel mount failed", err);
    return;
  }

  lastRenderedPatientId = patientId;
  sidebarOpen = await getSidebarOpenPreference();
  applySidebarOpenState();
  setPatientSection(patientId);

  const status = shadowRoot!.getElementById("status");
  if (!status) return;

  const auth = await getAuth();
  const formsSection = shadowRoot!.getElementById("formsSection");

  if (!auth.token) {
    status.className = "status warn";
    status.textContent = "Sign-in required";
    if (formsSection) {
      formsSection.innerHTML = `
        <div class="section signin-prompt">
          <h3>Staff sign-in required</h3>
          <p class="muted">Per clinic policy, the extension must authenticate before loading forms or saving data.</p>
          <ol class="signin-steps">
            <li>Click the <strong>MioSalon Extension</strong> icon in the Chrome toolbar (puzzle piece if hidden).</li>
            <li>Set API base to <code>http://localhost:3002</code> (or your deployed portal URL).</li>
            <li>Sign in with the same staff email and password as the admin portal.</li>
          </ol>
          <p class="muted">After sign-in, refresh this page or navigate to another customer.</p>
        </div>
      `;
    }
    return;
  }

  status.className = "status ok";
  status.textContent = `Signed in as ${auth.user?.name ?? auth.user?.email ?? "staff"}`;

  const linkId = patientId;
  if (!linkId) {
    status.className = "status warn";
    status.textContent = "Open a customer page (URL with customer id) to load forms.";
    if (formsSection) formsSection.innerHTML = "";
    return;
  }
  if (!auth.apiBase) return;

  const apiBase = auth.apiBase.replace(/\/$/, "");

  try {
    const res = await fetch(`${apiBase}/api/patients/${encodeURIComponent(linkId)}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (res.status === 401) {
      await clearStoredAuth();
      status.className = "status warn";
      status.textContent = SESSION_EXPIRED_MESSAGE;
      if (formsSection) formsSection.innerHTML = "";
      return;
    }
    if (!res.ok) {
      status.className = "status warn";
      status.textContent = AUTH_INVALID_MESSAGE;
      return;
    }
    const data = await res.json();
    const groupCount = data.fieldGroups?.length ?? 0;
    status.className = "status ok";
    status.textContent = `Linked patient · ${groupCount} legacy field group(s) · fill forms below`;
    currentLinkId = linkId;
    await loadActiveForms(linkId, apiBase, auth.token);
  } catch {
    status.className = "status warn";
    status.textContent = "Could not reach API — is the web app running on port 3002?";
  }
}

function scan() {
  void updatePanel(extractPatientId());
}

function hookSpaNavigation() {
  const notify = () => {
    lastRenderedPatientId = null;
    scan();
  };
  window.addEventListener("popstate", notify);
  const wrap = (fn: History["pushState"]) =>
    function (this: History, ...args: Parameters<History["pushState"]>) {
      const result = fn.apply(this, args);
      notify();
      return result;
    };
  history.pushState = wrap(history.pushState);
  history.replaceState = wrap(history.replaceState);
}

function boot() {
  if (!document.body) {
    requestAnimationFrame(boot);
    return;
  }
  hookSpaNavigation();
  scan();
}

boot();

let lastUrl = location.href;
setInterval(() => {
  const href = location.href;
  if (href !== lastUrl) {
    lastUrl = href;
    lastRenderedPatientId = null;
    scan();
    return;
  }
  if (!document.getElementById(PANEL_HOST_ID) || !shadowRoot?.getElementById("sidebar")) {
    shellReady = false;
    shadowRoot = null;
    scan();
  }
}, 800);

window.addEventListener(
  "resize",
  () => {
    if (sidebarOpen) adjustFixedChrome();
  },
  { passive: true }
);

console.log("[MioSalon Extension] Sidebar active");
