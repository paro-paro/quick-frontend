import type { WooCommerceSyncResultAny } from "~/types/woocommerce";

/** "2 created, 1 skipped" — zero-count buckets are omitted. */
export function summarizeSyncResult(result: WooCommerceSyncResultAny): string {
    const parts = Object.entries(result)
        .filter(([, messages]) => (messages as string[]).length > 0)
        .map(([key, messages]) => `${(messages as string[]).length} ${key}`);
    return parts.length ? parts.join(", ") : "No changes.";
}
