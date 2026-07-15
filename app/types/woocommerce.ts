// Response envelope every POD endpoint returns.
export interface ApiResponse<T> {
    status: "ok" | "error";
    data: T;
}

// --- Connection ---

export interface WooCommerceConnection {
    connected: boolean;
    store_url?: string;
    is_active?: boolean;
}

export interface WooCommerceConnectionMutated {
    id: number;
    store_url: string;
}

export interface CreatePayload {
    store_url: string;
    consumer_key: string;
    consumer_secret: string;
    webhook_secret?: string;
}

export interface UpdatePayload {
    store_url?: string;
    consumer_key?: string;
    consumer_secret?: string;
    webhook_secret?: string;
    is_active?: boolean;
}

// --- Sync result envelopes ---

/** Response from POST /woocommerce/products/import/apply.
 *
 * Every field is a list of per-row messages — one entry per WC product processed,
 * describing what happened. Counts are derived from the list lengths.
 */
export interface WooCommerceImportProductsApplyResult {
    created: string[];
    mapped: string[];
    skipped: string[];
    errors: string[];
}

/** Response from POST /woocommerce/orders/sync.
 *
 * Every field is a list of per-row messages — one entry per WC order processed,
 * describing what happened. Counts are derived from the list lengths.
 */
export interface WooCommerceSyncOrdersResult {
    created: string[];
    updated: string[];
    deleted: string[];
    skipped: string[];
    errors: string[];
}

/** Response from PUT /woocommerce/products/push (full reconcile: create/update/deactivate).
 *
 * Every field is a list of per-row messages — one entry per product processed,
 * describing what happened. Counts are derived from the list lengths.
 */
export interface WooCommerceUpdateStoreResult {
    created: string[];
    updated: string[];
    deactivated: string[];
    skipped: string[];
    errors: string[];
}

/** Union used by the shared result dialog. */
export type WooCommerceSyncResultAny =
    | WooCommerceImportProductsApplyResult
    | WooCommerceUpdateStoreResult
    | WooCommerceSyncOrdersResult;

// --- Import flow ---

export interface WCImportableProduct {
    wc_product_id: number;
    name: string;
}

export interface PODProductPreview {
    pod_product_id: number;
    name: string;
    format: string;
}

export interface WCProductMappingPreview {
    wc_product_id: number;
    /** Resolved from the unfiltered WC list; falls back to the WC id. */
    wc_product_name: string;
    /** False when the WC product is disabled or deleted on the store. */
    wc_product_active: boolean;
    pod_product_id: number;
}

export interface WooCommerceImportProductsPreview {
    wc_products: WCImportableProduct[];
    pod_products: PODProductPreview[];
    mappings: WCProductMappingPreview[];
}

// --- Push updates flow ---

export type WCUpdateStoreAction = "create" | "update" | "activate" | "deactivate";

export interface WCUpdateStoreProductPreview {
    pod_product_id: number;
    pod_product_name: string;
    pod_product_format: string;
    /** null for products not yet created on the store. */
    wc_product_id: number | null;
    /** Resolved from the store; falls back to the WC id. Null for create rows. */
    wc_product_name: string | null;
    action: WCUpdateStoreAction;
}

export interface WooCommerceUpdateStorePreview {
    products: WCUpdateStoreProductPreview[];
}

// --- Sync orders flow ---

export type WCOrderSyncAction = "create" | "update" | "delete" | "skip";

export interface WCOrderSyncPreview {
    wc_order_id: number;
    /** The mapped POD order, when one exists (updates/deletes). */
    pod_order_id: number | null;
    status: string;
    action: WCOrderSyncAction;
    /** Only set for skips. */
    reason: string | null;
}

export interface WooCommerceSyncOrdersPreview {
    orders: WCOrderSyncPreview[];
}

export type WooCommerceImportProductsApplyItem =
    | { wc_product_id: number; action: "create" }
    | { wc_product_id: number; action: "map"; pod_product_id: number };

export interface WooCommerceImportProductsApply {
    items: WooCommerceImportProductsApplyItem[];
}

// --- Shared constants ---

// Paths are relative — $api carries the backend base URL from runtimeConfig
// (NUXT_PUBLIC_BASE_URL_API: local .env vs Vercel environment variable).
export const WC_CONNECTION_URL = "/woocommerce/connection";
