import { useState } from "#imports";

const STORAGE_KEY = "ui-show-product-ids";

/**
 * Global UI preferences, persisted in localStorage.
 * The app is SSR-off, so reading localStorage in the initializer is safe.
 */
export function useUiSettings() {
    const showProductIds = useState<boolean>(
        "ui-show-product-ids",
        () => localStorage.getItem(STORAGE_KEY) === "true",
    );

    function setShowProductIds(value: boolean) {
        showProductIds.value = value;
        localStorage.setItem(STORAGE_KEY, String(value));
    }

    return { showProductIds, setShowProductIds };
}
