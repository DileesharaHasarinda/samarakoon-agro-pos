declare global {
  interface Window {
    serverConfig?: {
      getConfig: () => Promise<{ apiBaseUrl: string } | null>;
      saveConfig: (config: {
        apiBaseUrl: string;
      }) => Promise<{ success: boolean }>;
    };
  }
}

let cachedApiBaseUrl: string | null = null;

/**
 * Reads the persisted server configuration written by the main
 * process (stored in the app's userData folder, so it survives
 * app updates/restarts). Call this once when the app starts,
 * before rendering the main UI.
 */
export async function loadServerConfig(): Promise<string | null> {
  if (!window.serverConfig) {
    return null;
  }

  const config = await window.serverConfig.getConfig();

  if (config?.apiBaseUrl) {
    cachedApiBaseUrl = config.apiBaseUrl;
    return config.apiBaseUrl;
  }

  return null;
}

/**
 * Saves a new server URL (called from the first-run setup screen,
 * or from a "Change Server" option in Settings later). Persists it
 * to disk via the main process and updates the in-memory value used
 * by every subsequent API call.
 */
export async function saveServerConfig(apiBaseUrl: string): Promise<void> {
  if (!window.serverConfig) {
    throw new Error("Server configuration is not available in this build.");
  }

  const normalized = normalizeApiBaseUrl(apiBaseUrl);

  await window.serverConfig.saveConfig({
    apiBaseUrl: normalized,
  });

  cachedApiBaseUrl = normalized;
}

/**
 * Returns the currently active API base URL. Throws if it hasn't
 * been loaded/configured yet — callers (api.ts) should only run
 * after loadServerConfig() has resolved during app startup.
 */
export function getApiBaseUrl(): string {
  if (!cachedApiBaseUrl) {
    throw new Error("The POS server address has not been configured yet.");
  }

  return cachedApiBaseUrl;
}

export function hasServerConfig(): boolean {
  return cachedApiBaseUrl !== null;
}

/**
 * Ensures the URL has a scheme and no trailing slash, and appends
 * the standard API path if the user only entered a bare host/IP.
 */
function normalizeApiBaseUrl(input: string): string {
  let value = input.trim();

  if (!/^https?:\/\//i.test(value)) {
    value = `http://${value}`;
  }

  value = value.replace(/\/+$/, "");

  if (!/\/api\/v\d+$/i.test(value)) {
    value = `${value}/api/v1`;
  }

  return value;
}
