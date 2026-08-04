import {
  clearStoredAuth,
  ensureValidAuth,
  getStoredAuth,
  setStoredAuth,
} from "./auth-storage";

const apiBaseInput = document.getElementById("apiBase") as HTMLInputElement;
const emailInput = document.getElementById("email") as HTMLInputElement;
const passwordInput = document.getElementById("password") as HTMLInputElement;
const togglePasswordBtn = document.getElementById("togglePassword") as HTMLButtonElement;
const eyeIcon = document.getElementById("eyeIcon") as SVGSVGElement;
const loginBtn = document.getElementById("loginBtn") as HTMLButtonElement;
const logoutBtn = document.getElementById("logoutBtn") as HTMLButtonElement;
const signedOut = document.getElementById("signedOut") as HTMLElement;
const signedIn = document.getElementById("signedIn") as HTMLElement;
const who = document.getElementById("who") as HTMLElement;
const message = document.getElementById("message") as HTMLElement;

function setMessage(text: string, kind: "ok" | "err" | "" = "") {
  message.textContent = text;
  message.className = `msg ${kind}`;
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function render(auth: {
  token?: string;
  user?: { name?: string; email?: string };
  apiBase?: string;
}) {
  if (auth.apiBase) apiBaseInput.value = auth.apiBase;
  if (auth.token) {
    signedOut.hidden = true;
    signedIn.hidden = false;
    who.textContent = `Signed in as ${auth.user?.name ?? auth.user?.email ?? "staff"}`;
  } else {
    signedOut.hidden = false;
    signedIn.hidden = true;
  }
}

async function initAuth() {
  const stored = await getStoredAuth();
  if (stored.apiBase) apiBaseInput.value = stored.apiBase;

  if (!stored.token) {
    render({});
    return;
  }

  setMessage("Checking connection…");
  const valid = await ensureValidAuth(stored);
  if (!valid?.token) {
    render({});
    setMessage("Session expired. Sign in again.", "err");
    return;
  }

  render(valid);
  setMessage("Connected", "ok");
}

void initAuth();

const EYE_OPEN =
  '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
const EYE_OFF =
  '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><line x1="1" y1="1" x2="23" y2="23"></line>';

togglePasswordBtn.addEventListener("click", () => {
  const show = passwordInput.type === "password";
  passwordInput.type = show ? "text" : "password";
  eyeIcon.innerHTML = show ? EYE_OFF : EYE_OPEN;
  togglePasswordBtn.setAttribute("aria-label", show ? "Hide password" : "Show password");
  togglePasswordBtn.title = show ? "Hide password" : "Show password";
});

loginBtn.addEventListener("click", async () => {
  setMessage("Signing in…");
  loginBtn.disabled = true;
  const apiBase = apiBaseInput.value.replace(/\/$/, "");
  try {
    const res = await fetchWithTimeout(`${apiBase}/api/extension/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailInput.value,
        password: passwordInput.value,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Login failed", "err");
      return;
    }
    await setStoredAuth({
      token: data.token,
      user: data.user,
      apiBase,
      expiresIn: data.expiresIn ?? 604800,
    });
    render({ token: data.token, user: data.user, apiBase });
    setMessage("Connected", "ok");
  } catch (err) {
    const msg =
      err instanceof DOMException && err.name === "AbortError"
        ? "Request timed out. Start the web app: cd web && npm run dev"
        : err instanceof Error && err.message
          ? err.message
          : "Could not reach API. Is https://dr-jos-clinic-portal-nm56.vercel.app/ available?";
    setMessage(msg, "err");
  } finally {
    loginBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", () => {
  void clearStoredAuth().then(() => {
    render({});
    setMessage("Signed out");
  });
});
