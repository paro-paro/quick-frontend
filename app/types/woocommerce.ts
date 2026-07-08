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
    webhook_secret: string;
}

export interface UpdatePayload {
    store_url?: string;
    consumer_key?: string;
    consumer_secret?: string;
    webhook_secret?: string;
    is_active?: boolean;
}

// --- Sync result envelope (shared by import, refresh, orders) ---

export interface WooCommerceSyncResult {
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    errors: string[];
}

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

export interface WCSyncProductsPreview {
    wc_products: WCImportableProduct[];
    pod_products: PODProductPreview[];
    mappings: WCProductMappingPreview[];
}

export type WCImportProductAction =
    | { wc_product_id: number; type: "create" }
    | { wc_product_id: number; type: "map"; pod_product_id: number };

export interface WCSyncProductsApplyRequest {
    actions: WCImportProductAction[];
}

// --- Shared constants ---

export const WC_API_BASE = "http://localhost:5000";
export const WC_CONNECTION_URL = `${WC_API_BASE}/woocommerce/connection`;
