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

/** Response from PUT /woocommerce/products/update.
 *
 * Every field is a list of per-row messages — one entry per WC product processed,
 * describing what happened. Counts are derived from the list lengths.
 */
export interface WooCommerceUpdateProductsResult {
    updated: string[];
    skipped: string[];
    errors: string[];
}

/** Response from POST /woocommerce/orders/sync. */
export interface WooCommerceSyncOrdersResult {
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    errors: string[];
}

/** Union used by the shared result dialog. */
export type WooCommerceSyncResultAny =
    | WooCommerceImportProductsApplyResult
    | WooCommerceUpdateProductsResult
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
    pod_product_id: number;
}

export interface WooCommerceImportProductsPreview {
    wc_products: WCImportableProduct[];
    pod_products: PODProductPreview[];
    mappings: WCProductMappingPreview[];
}

export type WooCommerceImportProductsApplyItem =
    | { wc_product_id: number; action: "create" }
    | { wc_product_id: number; action: "map"; pod_product_id: number };

export interface WooCommerceImportProductsApply {
    items: WooCommerceImportProductsApplyItem[];
}

// --- Shared constants ---

export const WC_API_BASE = "http://localhost:5000";
export const WC_CONNECTION_URL = `${WC_API_BASE}/woocommerce/connection`;
