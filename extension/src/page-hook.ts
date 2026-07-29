/**
 * Runs in the page's MAIN world at document_start.
 * Observes MioSalon's existing customer-details request without issuing a new one.
 */

const RESPONSE_MESSAGE = "MIOSALON_EXT_CUSTOMER_DETAILS_RESPONSE";
const REQUEST_LATEST_MESSAGE = "MIOSALON_EXT_REQUEST_LATEST_CUSTOMER_DETAILS";
const ENDPOINT_FRAGMENT = "/customer/getCustomerBasicDetails";
const INSTALL_FLAG = "__miosalonCustomerDetailsHookInstalled";

type CaptureMessage = {
  source: "miosalon-extension-page-hook";
  type: typeof RESPONSE_MESSAGE;
  version: 1;
  endpoint: string;
  capturedAt: string;
  payload: unknown;
};

declare global {
  interface Window {
    [INSTALL_FLAG]?: boolean;
  }
}

function isTarget(url: string, method: string) {
  return method.toUpperCase() === "POST" && url.includes(ENDPOINT_FRAGMENT);
}

let latestCapture: CaptureMessage | null = null;

function publish(endpoint: string, payload: unknown) {
  if (payload == null || typeof payload !== "object") return;
  const message: CaptureMessage = {
    source: "miosalon-extension-page-hook",
    type: RESPONSE_MESSAGE,
    version: 1,
    endpoint,
    capturedAt: new Date().toISOString(),
    payload,
  };
  latestCapture = message;
  window.postMessage(message, window.location.origin);
}

function captureJson(endpoint: string, response: Response) {
  void response
    .clone()
    .json()
    .then((payload: unknown) => publish(endpoint, payload))
    .catch(() => {
      // A non-JSON/empty response is not customer data.
    });
}

function installFetchHook() {
  const nativeFetch = window.fetch;
  window.fetch = function (...args: Parameters<typeof fetch>) {
    const input = args[0];
    const init = args[1];
    const endpoint =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const result = nativeFetch.apply(this, args);
    if (isTarget(endpoint, method)) {
      void result.then((response) => captureJson(endpoint, response)).catch(() => undefined);
    }
    return result;
  };
}

function installXhrHook() {
  const nativeOpen = XMLHttpRequest.prototype.open;
  const nativeSend = XMLHttpRequest.prototype.send;
  const requestMeta = new WeakMap<XMLHttpRequest, { method: string; endpoint: string }>();

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    requestMeta.set(this, { method, endpoint: String(url) });
    return nativeOpen.apply(this, [method, url, ...rest] as Parameters<typeof nativeOpen>);
  };

  XMLHttpRequest.prototype.send = function (...args: Parameters<typeof nativeSend>) {
    const meta = requestMeta.get(this);
    if (meta && isTarget(meta.endpoint, meta.method)) {
      this.addEventListener(
        "loadend",
        () => {
          try {
            const payload =
              this.responseType === "json"
                ? this.response
                : JSON.parse(this.responseText) as unknown;
            publish(meta.endpoint, payload);
          } catch {
            // A non-JSON/empty response is not customer data.
          } finally {
            requestMeta.delete(this);
          }
        },
        { once: true }
      );
    }
    return nativeSend.apply(this, args);
  };
}

if (!window[INSTALL_FLAG]) {
  window[INSTALL_FLAG] = true;
  installFetchHook();
  installXhrHook();

  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (event.source !== window || !latestCapture) return;
    const data = event.data as { source?: unknown; type?: unknown } | null;
    if (
      data?.source === "miosalon-extension-content" &&
      data.type === REQUEST_LATEST_MESSAGE
    ) {
      window.postMessage(latestCapture, window.location.origin);
    }
  });
}

export {};
