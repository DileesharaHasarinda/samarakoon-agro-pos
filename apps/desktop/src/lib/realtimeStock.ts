import Pusher from "pusher-js";

/* =========================================================
   TYPES
   ========================================================= */

export interface RealtimeStockBatchUpdate {
  id: number;

  product_id: number;

  product_variant_id: number | null;

  /*
   * Physical available stock.
   *
   * Normal product:
   * Piece / Bottle / Packet etc.
   *
   * Dual-unit product:
   * normally Kg.
   */
  available_quantity: number;

  updated_at: string | null;
}

export interface RealtimeStockUpdatedEvent {
  sale_id: number;

  sale_number: string;

  batches: RealtimeStockBatchUpdate[];
}

export type RealtimeStockStatus =
  "connecting" | "connected" | "disconnected" | "error";

interface ServerConfig {
  apiBaseUrl: string;
}

interface ServerConfigBridge {
  getConfig: () => Promise<ServerConfig | null>;
}

interface RealtimeStockOptions {
  token: string;

  onStockUpdated: (event: RealtimeStockUpdatedEvent) => void;

  onStatusChange?: (status: RealtimeStockStatus) => void;

  onReconnected?: () => void;
}

export interface RealtimeStockSubscription {
  disconnect: () => void;
}

/* =========================================================
   SERVER CONFIG
   ========================================================= */

function getServerConfigBridge(): ServerConfigBridge | undefined {
  return (
    window as unknown as {
      serverConfig?: ServerConfigBridge;
    }
  ).serverConfig;
}

function normaliseBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

/**
 * Your Server Setup may contain either:
 *
 * http://192.168.1.100:8000
 *
 * OR
 *
 * http://192.168.1.100:8000/api/v1
 *
 * Support both.
 */
function getBroadcastAuthEndpoint(baseUrl: string): string {
  const cleanUrl = normaliseBaseUrl(baseUrl);

  if (/\/api\/v1$/i.test(cleanUrl)) {
    return `${cleanUrl}/broadcasting/auth`;
  }

  const parsed = new URL(cleanUrl);

  return `${parsed.origin}/api/v1/broadcasting/auth`;
}

/* =========================================================
   ENV HELPERS
   ========================================================= */

function parsePositiveInteger(
  value: string | undefined,
  fallback: number
): number {
  const parsed = Number(value);

  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
}

/* =========================================================
   EVENT VALIDATION
   ========================================================= */

function parseStockEvent(payload: unknown): RealtimeStockUpdatedEvent | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const data = payload as Record<string, unknown>;

  const rawBatches = Array.isArray(data.batches) ? data.batches : [];

  const batches = rawBatches
    .map((rawBatch): RealtimeStockBatchUpdate | null => {
      if (typeof rawBatch !== "object" || rawBatch === null) {
        return null;
      }

      const item = rawBatch as Record<string, unknown>;

      const id = Number(item.id);

      const productId = Number(item.product_id);

      const availableQuantity = Number(item.available_quantity);

      if (
        !Number.isInteger(id) ||
        id <= 0 ||
        !Number.isInteger(productId) ||
        productId <= 0 ||
        !Number.isFinite(availableQuantity)
      ) {
        return null;
      }

      const rawVariantId = item.product_variant_id;

      let productVariantId: number | null = null;

      if (rawVariantId !== null && rawVariantId !== undefined) {
        const parsedVariantId = Number(rawVariantId);

        if (Number.isInteger(parsedVariantId) && parsedVariantId > 0) {
          productVariantId = parsedVariantId;
        }
      }

      return {
        id,

        product_id: productId,

        product_variant_id: productVariantId,

        available_quantity: Math.max(0, availableQuantity),

        updated_at:
          typeof item.updated_at === "string" ? item.updated_at : null,
      };
    })
    .filter((item): item is RealtimeStockBatchUpdate => item !== null);

  if (batches.length === 0) {
    return null;
  }

  const saleId = Number(data.sale_id ?? 0);

  return {
    sale_id: Number.isInteger(saleId) ? saleId : 0,

    sale_number: typeof data.sale_number === "string" ? data.sale_number : "",

    batches,
  };
}

/* =========================================================
   SUBSCRIBE
   ========================================================= */

export async function subscribeToRealtimeStock(
  options: RealtimeStockOptions
): Promise<RealtimeStockSubscription> {
  const bridge = getServerConfigBridge();

  if (!bridge) {
    throw new Error("Server configuration bridge is unavailable.");
  }

  const serverConfig = await bridge.getConfig();

  if (!serverConfig || !serverConfig.apiBaseUrl.trim()) {
    throw new Error("The API server has not been configured.");
  }

  const apiBaseUrl = normaliseBaseUrl(serverConfig.apiBaseUrl);

  const serverUrl = new URL(apiBaseUrl);

  /*
   * Normally VITE_REVERB_HOST can be omitted.
   *
   * In that case we use the same machine/address
   * configured for the Laravel API.
   */
  const configuredHost = String(import.meta.env.VITE_REVERB_HOST ?? "").trim();

  const wsHost = configuredHost || serverUrl.hostname;

  const wsPort = parsePositiveInteger(import.meta.env.VITE_REVERB_PORT, 8080);

  const scheme = String(import.meta.env.VITE_REVERB_SCHEME ?? "http")
    .trim()
    .toLowerCase();

  const forceTLS = scheme === "https" || scheme === "wss";

  const appKey = String(import.meta.env.VITE_REVERB_APP_KEY ?? "").trim();

  if (!appKey) {
    throw new Error("VITE_REVERB_APP_KEY is not configured.");
  }

  const authEndpoint = getBroadcastAuthEndpoint(apiBaseUrl);

  options.onStatusChange?.("connecting");

  /*
   * Reverb speaks the Pusher protocol.
   *
   * The private channel authorization request
   * includes the current Sanctum bearer token.
   */
  const pusher = new Pusher(appKey, {
    cluster: "mt1",

    wsHost,

    wsPort,

    wssPort: wsPort,

    forceTLS,

    enabledTransports: forceTLS ? ["wss"] : ["ws"],

    channelAuthorization: {
      endpoint: authEndpoint,

      transport: "ajax",

      headers: {
        Accept: "application/json",

        Authorization: `Bearer ${options.token}`,
      },
    },
  });

  let hasSubscribedBefore = false;

  const handleConnecting = (): void => {
    options.onStatusChange?.("connecting");
  };

  const handleTransportConnected = (): void => {
    /*
     * A connected WebSocket does not yet prove that our authenticated
     * private stock channel was successfully authorized. Keep showing
     * "connecting" until pusher:subscription_succeeded is received.
     */
    options.onStatusChange?.("connecting");
  };

  const handleDisconnected = (): void => {
    options.onStatusChange?.("disconnected");
  };

  const handleConnectionError = (): void => {
    options.onStatusChange?.("error");
  };

  const handleUnavailable = (): void => {
    options.onStatusChange?.("error");
  };

  pusher.connection.bind("connecting", handleConnecting);

  pusher.connection.bind("connected", handleTransportConnected);

  pusher.connection.bind("disconnected", handleDisconnected);

  pusher.connection.bind("error", handleConnectionError);

  pusher.connection.bind("unavailable", handleUnavailable);

  pusher.connection.bind("failed", handleUnavailable);

  /*
   * Laravel PrivateChannel('pos.stock')
   *
   * becomes:
   *
   * private-pos.stock
   *
   * at the Pusher protocol level.
   */
  const channel = pusher.subscribe("private-pos.stock");

  const handleSubscriptionSucceeded = (): void => {
    const reconnected = hasSubscribedBefore;

    hasSubscribedBefore = true;

    options.onStatusChange?.("connected");

    if (reconnected) {
      options.onReconnected?.();
    }
  };

  const handleSubscriptionError = (error: unknown): void => {
    options.onStatusChange?.("error");

    console.error(
      "Realtime POS private stock channel authorization/subscription failed.",
      error
    );
  };

  channel.bind("pusher:subscription_succeeded", handleSubscriptionSucceeded);

  channel.bind("pusher:subscription_error", handleSubscriptionError);

  const handleStockUpdated = (payload: unknown): void => {
    const event = parseStockEvent(payload);

    if (!event) {
      return;
    }

    options.onStockUpdated(event);
  };

  channel.bind("stock.updated", handleStockUpdated);

  return {
    disconnect: (): void => {
      channel.unbind(
        "pusher:subscription_succeeded",
        handleSubscriptionSucceeded
      );

      channel.unbind("pusher:subscription_error", handleSubscriptionError);

      channel.unbind("stock.updated", handleStockUpdated);

      pusher.connection.unbind("connecting", handleConnecting);

      pusher.connection.unbind("connected", handleTransportConnected);

      pusher.connection.unbind("disconnected", handleDisconnected);

      pusher.connection.unbind("error", handleConnectionError);

      pusher.connection.unbind("unavailable", handleUnavailable);

      pusher.connection.unbind("failed", handleUnavailable);

      pusher.unsubscribe("private-pos.stock");

      pusher.disconnect();
    },
  };
}
