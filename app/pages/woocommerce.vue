<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

import type {
    ApiResponse,
    WooCommerceConnection,
    WooCommerceSyncResult,
} from "~/types/woocommerce";
import { WC_API_BASE, WC_CONNECTION_URL } from "~/types/woocommerce";

definePageMeta({
    title: "WooCommerce",
});

const queryClient = useQueryClient();

// --- Connection query (source of truth for the whole page's mode) ---

const { data: connexion, isLoading } = useQuery({
    queryKey: ["woocommerce-connexion"],
    queryFn: async () => {
        const res = await $fetch<ApiResponse<WooCommerceConnection>>(WC_CONNECTION_URL);
        return res.data;
    },
    retry: false,
});

// --- Modal open flags ---

const isUpdateOpen = ref(false);
const isDeleteConfirmOpen = ref(false);
const isImportOpen = ref(false);

// --- Sync result dialog (shared by import / refresh / order sync) ---

const syncResult = ref<WooCommerceSyncResult | null>(null);
const syncResultLabel = ref<"products" | "orders" | null>(null);
const isSyncResultOpen = ref(false);

function openSyncResult(label: "products" | "orders", result: WooCommerceSyncResult) {
    syncResultLabel.value = label;
    syncResult.value = result;
    isSyncResultOpen.value = true;
}

// --- Refresh mapped products (one-click; hits the old auto-sync endpoint) ---

const { mutate: refreshMappedProducts, isPending: isRefreshingProducts } = useMutation({
    mutationFn: async () => {
        const res = await $fetch<ApiResponse<WooCommerceSyncResult>>(
            `${WC_API_BASE}/woocommerce/sync/products`,
            { method: "POST" },
        );
        return res.data;
    },
    onSuccess: (data) => {
        queryClient.invalidateQueries({
            queryKey: ["woocommerce-sync-products-preview"],
        });
        openSyncResult("products", data);
    },
});

// --- Sync orders (one-click) ---

const { mutate: syncOrders, isPending: isSyncingOrders } = useMutation({
    mutationFn: async () => {
        const res = await $fetch<ApiResponse<WooCommerceSyncResult>>(
            `${WC_API_BASE}/woocommerce/sync/orders`,
            { method: "POST" },
        );
        return res.data;
    },
    onSuccess: (data) => openSyncResult("orders", data),
});
</script>

<template>
    <div class="p-6">
        <h1 class="text-2xl font-semibold mb-6">WooCommerce</h1>

        <div class="mb-6 max-w-lg">
            <h2 class="text-lg font-medium mb-4">Integration</h2>

            <div v-if="isLoading" class="flex items-center gap-2 text-muted">
                <UIcon name="i-lucide-loader" class="animate-spin" />
                Loading...
            </div>

            <WCConnectionDetails
                v-else-if="connexion?.connected"
                :connexion="connexion"
                @request-update="isUpdateOpen = true"
                @request-delete="isDeleteConfirmOpen = true"
            />

            <WCConnectionForm v-else />
        </div>

        <div v-if="connexion?.connected" class="mb-6 max-w-lg">
            <h2 class="text-lg font-medium mb-4">Actions</h2>

            <div class="flex flex-col gap-4 rounded-md border border-default p-4">
                <div>
                    <div class="mb-2 text-xs font-medium uppercase text-muted">
                        Products
                    </div>
                    <div class="flex gap-2">
                        <UButton
                            color="primary"
                            label="Import products"
                            icon="i-lucide-download"
                            @click="isImportOpen = true"
                        />
                        <UButton
                            color="primary"
                            variant="soft"
                            label="Refresh products"
                            icon="i-lucide-refresh-cw"
                            :loading="isRefreshingProducts"
                            @click="refreshMappedProducts()"
                        />
                    </div>
                </div>

                <div>
                    <div class="mb-2 text-xs font-medium uppercase text-muted">
                        Orders
                    </div>
                    <div class="flex gap-2">
                        <UButton
                            color="primary"
                            label="Sync orders"
                            icon="i-lucide-refresh-cw"
                            :loading="isSyncingOrders"
                            @click="syncOrders()"
                        />
                    </div>
                </div>
            </div>
        </div>

        <WCConnectionUpdateModal
            v-model:open="isUpdateOpen"
            :connexion="connexion"
        />

        <WCConnectionDeleteConfirm v-model:open="isDeleteConfirmOpen" />

        <WCImportProductsModal
            v-model:open="isImportOpen"
            @applied="(result) => openSyncResult('products', result)"
        />

        <WCSyncResultDialog
            v-model:open="isSyncResultOpen"
            :label="syncResultLabel"
            :result="syncResult"
        />
    </div>
</template>
