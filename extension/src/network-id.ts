/** Active salon context stored by the host page. */

const STORAGE_KEYS = {
  networkId: "mio_active_network_id",
  storeId: "mio_active_store_id",
  userId: "mio_active_user_id",
} as const;

export type ActivePageContext = {
  networkId: string | null;
  storeId: string | null;
  userId: string | null;
};

const EMPTY_CONTEXT: ActivePageContext = {
  networkId: null,
  storeId: null,
  userId: null,
};

let cachedContext: ActivePageContext | undefined;

function clean(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

export function getCachedPageContext(): ActivePageContext {
  return cachedContext ?? EMPTY_CONTEXT;
}

export function invalidatePageContextCache() {
  cachedContext = undefined;
}

/**
 * Content scripts can read localStorage for the current page origin directly.
 * This avoids inline script injection, which the host page's CSP can block.
 */
export async function readActivePageContext(force = false): Promise<ActivePageContext> {
  if (!force && cachedContext) return cachedContext;

  try {
    cachedContext = {
      networkId: clean(window.localStorage.getItem(STORAGE_KEYS.networkId)),
      storeId: clean(window.localStorage.getItem(STORAGE_KEYS.storeId)),
      userId: clean(window.localStorage.getItem(STORAGE_KEYS.userId)),
    };
  } catch {
    cachedContext = EMPTY_CONTEXT;
  }

  return cachedContext;
}
