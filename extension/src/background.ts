/** Background service worker — auth token refresh + message relay */

chrome.runtime.onInstalled.addListener(() => {
  console.log("[MioSalon Extension] Installed");
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_AUTH") {
    chrome.storage.local.get(["token", "user", "apiBase", "tokenExpiresAt"], (data) => {
      sendResponse(data);
    });
    return true;
  }

  if (message?.type === "SET_AUTH") {
    chrome.storage.local.set(
      {
        token: message.token,
        user: message.user,
        apiBase: message.apiBase,
        tokenExpiresAt: message.tokenExpiresAt,
      },
      () => sendResponse({ ok: true })
    );
    return true;
  }

  if (message?.type === "CLEAR_AUTH") {
    chrome.storage.local.remove(["token", "user", "tokenExpiresAt"], () => sendResponse({ ok: true }));
    return true;
  }

  return false;
});
