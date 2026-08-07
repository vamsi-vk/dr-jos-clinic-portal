/**
 * Content script — 2-tab sidebar: Attached Forms + Share a Form (QR share).
 * Optimized for instant UI, caching, and lazy dialogs.
 */

import {
  clearStoredAuth,
  ensureValidAuth,
  getStoredAuth,
} from "./auth-storage";
import { cacheGet, cacheInvalidate, cacheSet } from "./cache";
import {
  CUSTOMER_DETAILS_REQUEST_MESSAGE,
  loadCapturedCustomerDetails,
  parseCustomerDetailsMessage,
  profileMatchesCustomer,
  saveCapturedCustomerDetails,
  type CapturedCustomerDetails,
} from "./customer-details";
import { extractMiosalonProfile } from "./miosalon-profile";
import { closeNotesDialog, notesDialogStyles, openNotesDialog, type NoteItem } from "./notes-dialog";
import {
  getCachedPageContext,
  readActivePageContext,
  type ActivePageContext,
} from "./network-id";
import { publicFormUrl, renderQrDataUrl } from "./qr";
import {
  renderReadonlySummaryHtml,
  viewDialogStyles,
  type FormFieldJson,
} from "./view-dialog";

const PANEL_HOST_ID = "miosalon-ext-panel-host";
const PAGE_LAYOUT_STYLE_ID = "miosalon-ext-page-layout";
const SIDEBAR_WIDTH = 340;
const STORAGE_KEY_OPEN = "sidebarOpen";
const STORAGE_KEY_TAB = "sidebarTab";

type SavedStyles = {
  el: HTMLElement;
  right: string;
  width: string;
  left: string;
  maxWidth: string;
};

type AuthState = {
  token?: string;
  user?: { name?: string; email?: string };
  apiBase?: string;
};

type FormTemplateSummary = {
  id: string;
  name: string;
  publicToken: string;
  active: boolean;
};

type AttachedForm = {
  templateId: string;
  templateName: string;
  publicToken: string | null;
  fields: FormFieldJson[];
  submissionId: string;
  submittedAt: string;
  networkId: string | null;
  data: Record<string, unknown>;
};

type TabId = "attached" | "save";

let adjustedFixedEls: SavedStyles[] = [];
let shadowRoot: ShadowRoot | null = null;
let sidebarOpen = true;
let shellReady = false;
let currentLinkId: string | null = null;
let currentPageContext: ActivePageContext = {
  networkId: null,
  storeId: null,
  userId: null,
};
let cachedTemplates: FormTemplateSummary[] = [];
let selectedTemplateId: string | null = null;
let attachedForms: AttachedForm[] = [];
let activeTab: TabId = "attached";
let attachedLoading = false;
let capturedCustomerDetails: CapturedCustomerDetails | null = null;
let captureFromCurrentDocument = false;
let lastHandledCapture = "";
let lastSyncedProfile = "";

/** MioSalon URLs often use mobile in the path — that is not Customer Id. */
function looksLikePhoneId(value: string): boolean {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return false;
  return /^[\d\s+().-]+$/.test(trimmed);
}

function isRealCustomerId(value: string | null | undefined): value is string {
  if (!value) return false;
  const id = value.trim();
  if (!id || /^(new|create|list)$/i.test(id)) return false;
  return !looksLikePhoneId(id);
}

function extractCustomerIdFromInfoPanel(): string | null {
  const profile = extractMiosalonProfile();
  if (isRealCustomerId(profile?.customerId)) return profile!.customerId!.trim();

  const labeled = (document.body?.innerText ?? "").match(
    /Customer\s*Id\s*[:：]?\s*([A-Za-z0-9_-]+)/i
  );
  if (labeled?.[1] && isRealCustomerId(labeled[1])) return labeled[1].trim();

  const nodes = document.querySelectorAll("label, span, div, p, td, th, li, dt, strong");
  for (const el of nodes) {
    const text = (el.textContent ?? "").trim();
    if (!/^Customer\s*Id\s*:?\s*$/i.test(text)) continue;
    const next =
      el.nextElementSibling?.textContent?.trim() ||
      el.parentElement?.textContent?.replace(text, "").trim();
    const candidate = (next?.split(/\s/)[0] ?? "").trim();
    if (isRealCustomerId(candidate)) return candidate;
  }
  return null;
}

function extractCustomerIdFromUrl(): string | null {
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
    if (isRealCustomerId(id)) return id;
  }
  return null;
}

/**
 * Prefer Customer Id from the Info Panel (e.g. JSR3191).
 * Never treat the URL phone/mobile segment as the customer ID.
 */
function extractPatientId(): string | null {
  const fromPanel = extractCustomerIdFromInfoPanel();
  if (fromPanel) return fromPanel;

  const fromCapture = capturedCustomerDetails?.profile.customerId;
  if (isRealCustomerId(fromCapture)) return fromCapture.trim();

  return extractCustomerIdFromUrl();
}

function detailsForCustomer(customerId: string | null) {
  if (!customerId || !capturedCustomerDetails) return null;
  const profile = capturedCustomerDetails.profile;
  const hasIdentity = Boolean(profile.customerId || profile.mobile);
  if (
    profileMatchesCustomer(profile, customerId) ||
    (captureFromCurrentDocument && !hasIdentity)
  ) {
    return capturedCustomerDetails;
  }
  return null;
}

async function syncCapturedProfile(
  customerId: string,
  authOverride?: AuthState
) {
  const details = detailsForCustomer(customerId);
  if (!details) return;
  const panelId = details.profile.customerId;
  const linkId = isRealCustomerId(panelId) ? panelId.trim() : customerId;
  const profile = {
    ...details.profile,
    customerId: linkId,
  };
  const signature = `${linkId}:${JSON.stringify(profile)}`;
  if (signature === lastSyncedProfile) return;

  const auth = authOverride ?? await getAuth();
  if (!auth.token || !auth.apiBase) return;

  try {
    const response = await fetch(
      `${auth.apiBase.replace(/\/$/, "")}/api/patients/${encodeURIComponent(linkId)}/profile`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile }),
      }
    );
    if (response.ok) lastSyncedProfile = signature;
    else console.warn("[Clinic Extension] Customer profile sync failed", response.status);
  } catch (error) {
    console.warn("[Clinic Extension] Customer profile sync failed", error);
  }
}

async function getAuth(): Promise<AuthState> {
  const auth = await ensureValidAuth(await getStoredAuth());
  return auth ?? {};
}

function getSidebarOpenPreference(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY_OPEN], (data) => {
      resolve(typeof data[STORAGE_KEY_OPEN] === "boolean" ? data[STORAGE_KEY_OPEN] : true);
    });
  });
}

function setSidebarOpenPreference(open: boolean) {
  chrome.storage.local.set({ [STORAGE_KEY_OPEN]: open });
}

function getTabPreference(): Promise<TabId> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY_TAB], (data) => {
      resolve(data[STORAGE_KEY_TAB] === "save" ? "save" : "attached");
    });
  });
}

function setTabPreference(tab: TabId) {
  chrome.storage.local.set({ [STORAGE_KEY_TAB]: tab });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
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
  for (const node of Array.from(document.querySelectorAll("body *"))) {
    if (!(node instanceof HTMLElement) || node.id === PANEL_HOST_ID) continue;
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
    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid #e7e5e4;
      background: #fff;
      flex-shrink: 0;
    }
    .tab-btn {
      flex: 1;
      border: 0;
      background: transparent;
      padding: 10px 8px;
      font-size: 12px;
      font-weight: 600;
      color: #78716c;
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }
    .tab-btn[aria-selected="true"] {
      color: #0f766e;
      border-bottom-color: #0f766e;
    }
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
    .customer-card {
      padding: 14px;
      border-color: #e5e7eb;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
    }
    .customer-head {
      display: flex;
      align-items: center;
      gap: 11px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .customer-avatar, .customer-row-icon, .context-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
      color: #2563eb;
      background: #eff6ff;
      border-radius: 10px;
    }
    .customer-avatar { width: 42px; height: 42px; border-radius: 50%; }
    .customer-avatar svg { width: 25px; height: 25px; }
    .customer-row-icon { width: 31px; height: 31px; }
    .customer-row-icon svg, .context-icon svg { width: 18px; height: 18px; }
    .customer-kicker {
      color: #6b7280;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .customer-name {
      margin-top: 1px;
      color: #111827;
      font-size: 17px;
      font-weight: 800;
      letter-spacing: 0.02em;
      line-height: 1.2;
      text-transform: uppercase;
      overflow-wrap: anywhere;
    }
    .customer-details { padding: 10px 0; }
    .customer-detail-row {
      display: grid;
      grid-template-columns: 31px 50px minmax(0, 1fr);
      align-items: center;
      gap: 8px;
      margin: 7px 0;
    }
    .customer-detail-row.mobile .customer-row-icon {
      color: #16a34a;
      background: #ecfdf3;
    }
    .customer-detail-label {
      color: #6b7280;
      font-size: 12px;
      font-weight: 600;
    }
    .customer-detail-value {
      width: fit-content;
      max-width: 100%;
      overflow-wrap: anywhere;
      border-radius: 6px;
      background: #eff6ff;
      padding: 3px 7px;
      color: #111827;
      font-size: 13px;
      font-weight: 700;
    }
    .customer-detail-row.mobile .customer-detail-value { background: #ecfdf3; }
    .customer-context {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0;
      padding-top: 11px;
      border-top: 1px solid #e5e7eb;
    }
    .context-item {
      min-width: 0;
      padding: 0 7px;
      border-right: 1px solid #e5e7eb;
    }
    .context-item:first-child { padding-left: 0; }
    .context-item:last-child { padding-right: 0; border-right: 0; }
    .context-icon { width: 27px; height: 27px; margin-bottom: 4px; }
    .context-item.network .context-icon { color: #7c3aed; background: #f5f3ff; }
    .context-item.store .context-icon { color: #ea580c; background: #fff7ed; }
    .context-label {
      color: #6b7280;
      font-size: 9px;
      font-weight: 600;
    }
    .context-value {
      margin-top: 2px;
      overflow-wrap: anywhere;
      color: #374151;
      font-family: ui-monospace, monospace;
      font-size: 10px;
      font-weight: 700;
    }
    .status { font-size: 12px; margin-top: 6px; }
    .ok { color: #0f766e; }
    .warn { color: #b45309; }
    .reopen-tab {
      pointer-events: auto;
      position: fixed;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      writing-mode: vertical-rl;
      border: 0;
      border-radius: 8px 0 0 8px;
      background: #0f766e;
      color: #fff;
      padding: 12px 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: -2px 0 12px rgba(0,0,0,0.12);
    }
    .reopen-tab:hover { background: #115e59; }
    .form-select-wrap { margin-bottom: 10px; }
    .form-select {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #d6d3d1;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 12px;
      background: #fff;
      color: #1c1917;
    }
    .qr-btn {
      width: 100%;
      border: 0;
      border-radius: 6px;
      padding: 8px;
      background: #0f766e;
      color: #fff;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
    }
    .qr-btn:hover { background: #115e59; }
    .qr-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .qr-box {
      margin-top: 12px;
      text-align: center;
      padding: 12px;
      background: #fff;
      border: 1px solid #e7e5e4;
      border-radius: 8px;
    }
    .qr-box img {
      display: block;
      margin: 0 auto 8px;
      width: 180px;
      height: 180px;
      border-radius: 4px;
    }
    .qr-link { font-size: 10px; word-break: break-all; color: #57534e; margin: 0; }
    .copy-link-btn {
      margin-top: 8px;
      width: 100%;
      border: 1px solid #d6d3d1;
      border-radius: 6px;
      padding: 6px;
      background: #fff;
      font-size: 11px;
      cursor: pointer;
      color: #44403c;
    }
    .copy-link-btn:hover { background: #f5f5f4; }
    .form-msg-inline { font-size: 11px; margin-top: 6px; min-height: 14px; color: #78716c; }
    .form-msg-inline.ok { color: #0f766e; }
    .form-msg-inline.err { color: #b91c1c; }
    .attached-card {
      border: 1px solid #e7e5e4;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 8px;
      background: #fff;
    }
    .attached-card h4 {
      margin: 0 0 4px;
      font-size: 13px;
      font-weight: 600;
      color: #1c1917;
    }
    .attached-meta { font-size: 11px; color: #78716c; margin-bottom: 8px; }
    .attached-actions { display: flex; gap: 6px; }
    .attached-actions button {
      flex: 1;
      border: 1px solid #d6d3d1;
      background: #fff;
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      color: #1c1917;
    }
    .attached-actions button:hover { background: #f5f5f4; }
    .attached-actions button.primary {
      background: #0f766e;
      border-color: #0f766e;
      color: #fff;
    }
    .attached-actions button.primary:hover { background: #115e59; }
    ${viewDialogStyles}
    ${notesDialogStyles}
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
    console.error("[Clinic Extension] attachShadow failed, recreating host", err);
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
    <aside class="sidebar" id="sidebar" data-open="true" role="complementary" aria-label="Clinic Extension">
      <div class="head">
        <span>Clinic Extension</span>
        <button type="button" class="close-btn" id="closeBtn" title="Close sidebar" aria-label="Close sidebar">×</button>
      </div>
      <div class="tabs" role="tablist">
        <button type="button" class="tab-btn" role="tab" id="tabAttached" data-tab="attached" aria-selected="true">Attached Forms</button>
        <button type="button" class="tab-btn" role="tab" id="tabSave" data-tab="save" aria-selected="false">Share a Form</button>
      </div>
      <div class="scroll" id="scroll">
        <div class="section customer-card" id="patientSection"></div>
        <div id="tabPanels">
          <div id="attachedTabPanel" role="tabpanel">
            <div id="attachedPanel"></div>
            <div class="section" id="notesSection"></div>
          </div>
          <div id="savePanel" role="tabpanel" hidden></div>
        </div>
        <div class="section" id="statusSection">
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
    const tabBtn = (ev.target as HTMLElement).closest("[data-tab]") as HTMLElement | null;
    if (tabBtn?.dataset.tab === "attached" || tabBtn?.dataset.tab === "save") {
      void switchTab(tabBtn.dataset.tab);
      return;
    }
    const viewBtn = (ev.target as HTMLElement).closest("[data-view-form]") as HTMLElement | null;
    if (viewBtn) {
      const id = viewBtn.getAttribute("data-view-form");
      if (id) openViewDialog(id);
      return;
    }
    const notesBtn = (ev.target as HTMLElement).closest("#openNotesBtn");
    if (notesBtn) {
      void openCustomerNotes();
      return;
    }
    const qrBtn = (ev.target as HTMLElement).closest("#generateQrBtn");
    if (qrBtn) {
      void generateQrCode();
      return;
    }
    const copyBtn = (ev.target as HTMLElement).closest("#copyQrLinkBtn");
    if (copyBtn) void copyQrLink();
  });

  shadowRoot.addEventListener("change", (ev) => {
    const sel = (ev.target as HTMLElement).closest("#formSelect");
    if (sel instanceof HTMLSelectElement) {
      selectedTemplateId = sel.value || null;
    }
  });

  shellReady = true;
}

function switchTab(tab: TabId) {
  activeTab = tab;
  setTabPreference(tab);
  if (!shadowRoot) return;
  const attachedBtn = shadowRoot.getElementById("tabAttached");
  const saveBtn = shadowRoot.getElementById("tabSave");
  const attachedPanel = shadowRoot.getElementById("attachedTabPanel");
  const savePanel = shadowRoot.getElementById("savePanel");
  if (attachedBtn) attachedBtn.setAttribute("aria-selected", tab === "attached" ? "true" : "false");
  if (saveBtn) saveBtn.setAttribute("aria-selected", tab === "save" ? "true" : "false");
  if (attachedPanel) attachedPanel.hidden = tab !== "attached";
  if (savePanel) savePanel.hidden = tab !== "save";
}

function customerIcon(
  kind: "user" | "id" | "phone" | "email" | "network" | "store"
) {
  const paths = {
    user: `<circle cx="12" cy="8" r="4"></circle><path d="M4.5 21v-2.5a5.5 5.5 0 0 1 5.5-5.5h4a5.5 5.5 0 0 1 5.5 5.5V21"></path>`,
    id: `<rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8" cy="11" r="2"></circle><path d="M5.5 16c.7-1.6 1.5-2.3 2.5-2.3s1.8.7 2.5 2.3M13 10h5M13 14h4"></path>`,
    phone: `<path d="M7.3 3.7 10 7.4 8.4 9.5c1.3 2.6 3.4 4.7 6 6l2.1-1.6 3.8 2.7-.8 3.2c-.2.8-1 1.3-1.8 1.2C10 19.9 4.1 14 3 6.3c-.1-.8.4-1.6 1.2-1.8l3.1-.8Z"></path>`,
    email: `<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m4 7 8 6 8-6"></path>`,
    network: `<path d="M8.5 16a5 5 0 0 1 7 0M6 13.5a8.5 8.5 0 0 1 12 0M3.5 11a12 12 0 0 1 17 0"></path><circle cx="12" cy="19" r="1.2"></circle>`,
    store: `<path d="M4 10v10h16V10M3 10l2-6h14l2 6"></path><path d="M3 10c0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0"></path>`,
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind]}</svg>`;
}

function setPatientSection(patientId: string | null, context: ActivePageContext) {
  if (!shadowRoot) return;
  const el = shadowRoot.getElementById("patientSection");
  if (!el) return;
  if (!patientId) {
    el.innerHTML = `<h3>Customer</h3><p class="muted">Open a Customer 360° page to link a customer.</p>`;
    return;
  }
  const profile = detailsForCustomer(patientId)?.profile;
  const displayName = profile?.name ?? "Customer";
  el.innerHTML = `
    <div class="customer-head">
      <span class="customer-avatar">${customerIcon("user")}</span>
      <div>
        <div class="customer-kicker">Customer</div>
        <div class="customer-name">${escapeHtml(displayName)}</div>
      </div>
    </div>
    <div class="customer-details">
      <div class="customer-detail-row">
        <span class="customer-row-icon">${customerIcon("id")}</span>
        <span class="customer-detail-label">ID</span>
        <span class="customer-detail-value">${escapeHtml(patientId)}</span>
      </div>
      ${
        profile?.mobile
          ? `<div class="customer-detail-row mobile">
              <span class="customer-row-icon">${customerIcon("phone")}</span>
              <span class="customer-detail-label">Mobile</span>
              <span class="customer-detail-value">${escapeHtml(profile.mobile)}</span>
            </div>`
          : ""
      }
      ${
        profile?.email
          ? `<div class="customer-detail-row">
              <span class="customer-row-icon">${customerIcon("email")}</span>
              <span class="customer-detail-label">Email</span>
              <span class="customer-detail-value">${escapeHtml(profile.email)}</span>
            </div>`
          : ""
      }
    </div>
    <div class="customer-context">
      <div class="context-item network">
        <span class="context-icon">${customerIcon("network")}</span>
        <div class="context-label">Network</div>
        <div class="context-value">${escapeHtml(context.networkId ?? "n/a")}</div>
      </div>
      <div class="context-item store">
        <span class="context-icon">${customerIcon("store")}</span>
        <div class="context-label">Store</div>
        <div class="context-value">${escapeHtml(context.storeId ?? "n/a")}</div>
      </div>
      <div class="context-item">
        <span class="context-icon">${customerIcon("user")}</span>
        <div class="context-label">User</div>
        <div class="context-value">${escapeHtml(context.userId ?? "n/a")}</div>
      </div>
    </div>
  `;
}

function renderNotesSection() {
  if (!shadowRoot) return;
  const section = shadowRoot.getElementById("notesSection");
  if (!section) return;

  section.innerHTML = `
    <h3>Notes</h3>
    <p class="muted" style="margin:0 0 10px">${
      currentLinkId
        ? "Notes for this customer are independent from attached forms."
        : "Open a customer page to view notes."
    }</p>
    <button type="button" class="qr-btn" id="openNotesBtn"${
      currentLinkId ? "" : " disabled"
    }>Open Notes</button>
  `;
}

function renderAttachedPanel() {
  if (!shadowRoot) return;
  const panel = shadowRoot.getElementById("attachedPanel");
  if (!panel) return;

  if (!currentLinkId) {
    panel.innerHTML = `<div class="section"><p class="muted">Open a customer page to see attached forms.</p></div>`;
    return;
  }
  if (attachedLoading) {
    panel.innerHTML = `<div class="section"><p class="muted">Loading attached forms…</p></div>`;
    return;
  }
  if (!attachedForms.length) {
    panel.innerHTML = `<div class="section"><h3>Attached Forms</h3><p class="muted">No forms attached yet. Use Share a Form to generate a QR and collect a submission.</p></div>`;
    return;
  }

  panel.innerHTML = `
    <div class="section">
      <h3>Attached Forms</h3>
      ${attachedForms
        .map(
          (f) => `
        <div class="attached-card">
          <h4>${escapeHtml(f.templateName)}</h4>
          <div class="attached-meta">Attached ${escapeHtml(formatDate(f.submittedAt))}</div>
          <div class="attached-actions">
            <button type="button" class="primary" data-view-form="${escapeHtml(f.templateId)}">View</button>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderSavePanelHtml(templates: FormTemplateSummary[]) {
  if (!templates.length) {
    return `<div class="section"><p class="muted">No active forms — create one in Dashboard → Forms.</p></div>`;
  }
  const options = templates
    .map(
      (t) =>
        `<option value="${escapeHtml(t.id)}"${t.id === selectedTemplateId ? " selected" : ""}>${escapeHtml(t.name)}</option>`
    )
    .join("");
  const patientHint = currentLinkId
    ? `QR codes link submissions to customer <span class="id">${escapeHtml(currentLinkId)}</span>${
        currentPageContext.networkId
          ? ` · network <span class="id">${escapeHtml(currentPageContext.networkId)}</span>`
          : ""
      }.`
    : "Open a Customer 360° page first — the QR must include the customer ID.";

  return `
    <div class="section">
      <h3>Share a Form</h3>
      <p class="muted" style="margin:0 0 10px">Select a form and generate a QR code. Submissions are saved against this customer.</p>
      <p class="muted" style="margin:0 0 10px">${patientHint}</p>
      <div class="form-select-wrap">
        <select id="formSelect" class="form-select" aria-label="Select form">${options}</select>
      </div>
      <button type="button" class="qr-btn" id="generateQrBtn"${currentLinkId ? "" : " disabled"}>Generate QR Code</button>
      <p class="form-msg-inline" id="qrMsg"></p>
      <div class="qr-box" id="qrBox" hidden></div>
    </div>
  `;
}

async function loadActiveTemplates(apiBase: string, token: string) {
  const cacheKey = `templates:${apiBase}`;
  const cached = cacheGet<FormTemplateSummary[]>(cacheKey);
  if (cached) {
    cachedTemplates = cached;
    if (!selectedTemplateId || !cached.some((t) => t.id === selectedTemplateId)) {
      selectedTemplateId = cached[0]?.id ?? null;
    }
    return cached;
  }

  const tplRes = await fetch(`${apiBase}/api/form-templates?active=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!tplRes.ok) throw new Error("templates");
  const { templates } = (await tplRes.json()) as { templates: FormTemplateSummary[] };
  cachedTemplates = templates ?? [];
  if (!selectedTemplateId || !cachedTemplates.some((t) => t.id === selectedTemplateId)) {
    selectedTemplateId = cachedTemplates[0]?.id ?? null;
  }
  cacheSet(cacheKey, cachedTemplates, 60_000);
  return cachedTemplates;
}

async function loadAttachedForms(apiBase: string, token: string, patientId: string) {
  const { networkId, storeId, userId } = currentPageContext;
  const cacheKey = `attached:${apiBase}:${patientId}:${networkId ?? ""}:${storeId ?? ""}`;
  const cached = cacheGet<AttachedForm[]>(cacheKey);
  if (cached) {
    attachedForms = cached;
    return cached;
  }

  attachedLoading = true;
  renderAttachedPanel();

  const qs = new URLSearchParams();
  if (networkId) qs.set("networkId", networkId);
  if (storeId) qs.set("storeId", storeId);
  if (userId) qs.set("activeUserId", userId);
  const query = qs.toString();
  const res = await fetch(
    `${apiBase}/api/patients/${encodeURIComponent(patientId)}/forms${query ? `?${query}` : ""}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  attachedLoading = false;
  if (!res.ok) {
    attachedForms = [];
    return [];
  }
  const body = (await res.json()) as { forms?: AttachedForm[] };
  attachedForms = body.forms ?? [];
  cacheSet(cacheKey, attachedForms, 20_000);
  return attachedForms;
}

function openViewDialog(templateId: string) {
  if (!shadowRoot) return;
  const form = attachedForms.find((f) => f.templateId === templateId);
  if (!form) return;

  closeNotesDialog(shadowRoot);
  shadowRoot.getElementById("modalHost")?.remove();

  const host = document.createElement("div");
  host.id = "modalHost";
  host.innerHTML = `
    <div class="modal-backdrop" id="viewBackdrop">
      <div class="modal" role="dialog" aria-modal="true">
        ${renderReadonlySummaryHtml(form.templateName, form.fields, form.data)}
        <div class="modal-actions">
          <button type="button" class="modal-btn" id="viewClose">Close</button>
        </div>
      </div>
    </div>
  `;
  shadowRoot.appendChild(host);
  host.querySelector("#viewClose")?.addEventListener("click", () => host.remove());
  host.querySelector("#viewBackdrop")?.addEventListener("click", (ev) => {
    if (ev.target === host.querySelector("#viewBackdrop")) host.remove();
  });
}

async function openCustomerNotes() {
  if (!shadowRoot || !currentLinkId) return;

  const context = currentPageContext.networkId
    ? currentPageContext
    : getCachedPageContext();
  const { networkId, storeId, userId } = context;
  if (!networkId || !storeId || !userId) {
    const status = shadowRoot.getElementById("status");
    if (status) {
      status.className = "status warn";
      status.textContent =
        "Network, store, and user IDs are required in page local storage for notes";
    }
    return;
  }

  const auth = await getAuth();
  if (!auth.token || !auth.apiBase) return;
  const apiBase = auth.apiBase.replace(/\/$/, "");

  const cacheKey = `notes:${apiBase}:${currentLinkId}:${networkId}:${storeId}`;
  let notes = cacheGet<NoteItem[]>(cacheKey);
  if (!notes) {
    const res = await fetch(
      `${apiBase}/api/patients/${encodeURIComponent(currentLinkId)}/notes?networkId=${encodeURIComponent(networkId)}&storeId=${encodeURIComponent(storeId)}&activeUserId=${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${auth.token}` } }
    );
    const body = res.ok ? await res.json() : { notes: [] };
    notes = (body.notes ?? []) as NoteItem[];
    cacheSet(cacheKey, notes, 15_000);
  }

  openNotesDialog({
    shadowRoot,
    title: "Customer Notes",
    notes,
    onClose: () => undefined,
    onSave: async (html, editingId) => {
      if (editingId) {
        const res = await fetch(
          `${apiBase}/api/patients/${encodeURIComponent(currentLinkId!)}/notes`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${auth.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ noteId: editingId, content: html }),
          }
        );
        if (!res.ok) return null;
        const body = await res.json();
        const note = body.note as NoteItem;
        const next = (notes ?? []).map((n) => (n.id === note.id ? note : n));
        cacheSet(cacheKey, next, 15_000);
        notes = next;
        return note;
      }

      const res = await fetch(
        `${apiBase}/api/patients/${encodeURIComponent(currentLinkId!)}/notes`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: html,
            networkId,
            storeId,
            activeUserId: userId,
          }),
        }
      );
      if (!res.ok) return null;
      const body = await res.json();
      const note = body.note as NoteItem;
      const next = [note, ...(notes ?? [])];
      cacheSet(cacheKey, next, 15_000);
      notes = next;
      return note;
    },
  });
}

async function copyQrLink() {
  if (!shadowRoot || !selectedTemplateId || !currentLinkId) return;
  const auth = await getAuth();
  if (!auth.apiBase) return;
  const template = cachedTemplates.find((t) => t.id === selectedTemplateId);
  if (!template?.publicToken) return;
  const url = publicFormUrl(
    auth.apiBase,
    template.publicToken,
    currentLinkId,
    currentPageContext
  );
  const msg = shadowRoot.getElementById("qrMsg");
  try {
    await navigator.clipboard.writeText(url);
    if (msg) {
      msg.textContent = "Link copied (linked to this customer)";
      msg.className = "form-msg-inline ok";
    }
  } catch {
    if (msg) {
      msg.textContent = "Could not copy link";
      msg.className = "form-msg-inline err";
    }
  }
}

async function generateQrCode() {
  if (!shadowRoot || !selectedTemplateId) return;
  const auth = await getAuth();
  if (!auth.apiBase) return;
  const template = cachedTemplates.find((t) => t.id === selectedTemplateId);
  if (!template?.publicToken) return;

  const qrBox = shadowRoot.getElementById("qrBox");
  const qrBtn = shadowRoot.getElementById("generateQrBtn") as HTMLButtonElement | null;
  const msg = shadowRoot.getElementById("qrMsg");
  if (!qrBox) return;

  if (!currentLinkId) {
    if (msg) {
      msg.textContent = "Open a Customer 360° page first so the form links to that customer ID.";
      msg.className = "form-msg-inline err";
    }
    return;
  }

  const url = publicFormUrl(
    auth.apiBase,
    template.publicToken,
    currentLinkId,
    currentPageContext
  );
  if (qrBtn) qrBtn.disabled = true;
  if (msg) {
    msg.textContent = "Generating QR code…";
    msg.className = "form-msg-inline";
  }

  try {
    const dataUrl = await renderQrDataUrl(url);
    qrBox.innerHTML = `
      <img src="${dataUrl}" alt="QR code for ${escapeHtml(template.name)}" width="180" height="180" />
      <p class="qr-link">${escapeHtml(url)}</p>
      <p class="muted" style="margin:6px 0 0">Linked to customer <span class="id">${escapeHtml(currentLinkId)}</span></p>
      <button type="button" class="copy-link-btn" id="copyQrLinkBtn">Copy link</button>
    `;
    qrBox.hidden = false;
    if (msg) {
      msg.textContent = "Scan to open the form for this customer.";
      msg.className = "form-msg-inline ok";
    }
  } catch {
    if (msg) {
      msg.textContent = "Could not generate QR code";
      msg.className = "form-msg-inline err";
    }
  } finally {
    if (qrBtn) qrBtn.disabled = false;
  }
}

async function updatePanel(patientId: string | null) {
  try {
    ensureShell();
  } catch (err) {
    console.error("[Clinic Extension] Panel mount failed", err);
    return;
  }

  sidebarOpen = await getSidebarOpenPreference();
  activeTab = await getTabPreference();
  applySidebarOpenState();
  switchTab(activeTab);

  currentLinkId = patientId;
  currentPageContext = await readActivePageContext();
  setPatientSection(patientId, currentPageContext);
  renderNotesSection();

  const status = shadowRoot!.getElementById("status");
  if (!status) return;
  const statusSection = shadowRoot!.getElementById("statusSection");

  const auth = await getAuth();
  const savePanel = shadowRoot!.getElementById("savePanel");
  const attachedPanel = shadowRoot!.getElementById("attachedPanel");

  if (!auth.token) {
    if (statusSection) statusSection.hidden = false;
    status.className = "status warn";
    status.textContent = "Please login";
    if (attachedPanel) attachedPanel.innerHTML = "";
    if (savePanel) savePanel.innerHTML = "";
    return;
  }

  if (statusSection) statusSection.hidden = true;
  status.className = "status";
  status.textContent = "";

  if (!auth.apiBase) return;
  const apiBase = auth.apiBase.replace(/\/$/, "");

  try {
    const templates = await loadActiveTemplates(apiBase, auth.token);
    if (savePanel) savePanel.innerHTML = renderSavePanelHtml(templates);
  } catch {
    if (savePanel) {
      savePanel.innerHTML = `<div class="section"><p class="muted">Could not load forms.</p></div>`;
    }
  }

  if (patientId) {
    currentLinkId = patientId;
    try {
      const res = await fetch(`${apiBase}/api/patients/${encodeURIComponent(patientId)}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.status === 401) {
        await clearStoredAuth();
        if (statusSection) statusSection.hidden = false;
        status.className = "status warn";
        status.textContent = "Please login";
        return;
      }
      if (res.ok) {
        await syncCapturedProfile(patientId, auth);
      }
      await loadAttachedForms(apiBase, auth.token, patientId);
      renderAttachedPanel();
    } catch {
      attachedForms = [];
      renderAttachedPanel();
    }
  } else {
    currentLinkId = null;
    attachedForms = [];
    renderAttachedPanel();
  }
}

function scan() {
  void updatePanel(extractPatientId());
}

function hookSpaNavigation() {
  const notify = () => {
    cacheInvalidate("attached:");
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

window.addEventListener("message", (event: MessageEvent<unknown>) => {
  const details = parseCustomerDetailsMessage(event);
  if (!details) return;

  // Keep API/panel Customer Id (e.g. JSR3191). Never overwrite with URL phone.
  const panelId = extractCustomerIdFromInfoPanel();
  if (isRealCustomerId(panelId)) {
    details.profile.customerId = panelId;
  } else if (!isRealCustomerId(details.profile.customerId)) {
    delete details.profile.customerId;
  }

  const captureKey = `${details.endpoint}:${details.capturedAt}`;
  if (captureKey === lastHandledCapture) return;

  lastHandledCapture = captureKey;
  capturedCustomerDetails = details;
  captureFromCurrentDocument = true;
  void saveCapturedCustomerDetails(details).catch((error) => {
    console.warn("[Clinic Extension] Could not save customer details", error);
  });

  const resolvedId = extractPatientId();
  if (resolvedId && resolvedId !== currentLinkId) {
    void updatePanel(resolvedId);
    return;
  }
  setPatientSection(currentLinkId, currentPageContext);
  if (currentLinkId) void syncCapturedProfile(currentLinkId);
});

void loadCapturedCustomerDetails().then((details) => {
  if (!capturedCustomerDetails && details) {
    capturedCustomerDetails = details;
    setPatientSection(currentLinkId, currentPageContext);
  }
});

function requestLatestCapturedDetails() {
  window.postMessage(
    {
      source: "miosalon-extension-content",
      type: CUSTOMER_DETAILS_REQUEST_MESSAGE,
    },
    window.location.origin
  );
}

requestLatestCapturedDetails();
window.setTimeout(requestLatestCapturedDetails, 1_000);

boot();

let lastUrl = location.href;
setInterval(() => {
  const href = location.href;
  if (href !== lastUrl) {
    lastUrl = href;
    cacheInvalidate("attached:");
    scan();
    return;
  }
  if (!document.getElementById(PANEL_HOST_ID) || !shadowRoot?.getElementById("sidebar")) {
    shellReady = false;
    shadowRoot = null;
    scan();
    return;
  }
  // Info Panel may load after the URL — pick up real Customer Id (not phone).
  const resolved = extractPatientId();
  if (resolved && resolved !== currentLinkId) {
    cacheInvalidate("attached:");
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

console.log("[Clinic Extension] Sidebar active");
