<script setup lang="ts">
import { useMutation, useQuery } from "@tanstack/vue-query";

import type {
    ApiResponse,
    WooCommerceConnection,
    WooCommerceSyncOrdersResult,
    WooCommerceSyncResultAny,
} from "~/types/woocommerce";
import { WC_API_BASE, WC_CONNECTION_URL } from "~/types/woocommerce";

definePageMeta({
    title: "WooCommerce",
});

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
const isUpdateProductsConfirmOpen = ref(false);

// --- Sync result dialog (shared by import / refresh / order sync) ---

const syncResult = ref<WooCommerceSyncResultAny | null>(null);
const syncResultTitle = ref<string>("");
const isSyncResultOpen = ref(false);

function openSyncResult(title: string, result: WooCommerceSyncResultAny) {
    syncResultTitle.value = title;
    syncResult.value = result;
    isSyncResultOpen.value = true;
}

// --- Sync orders (one-click) ---

const { mutate: syncOrders, isPending: isSyncingOrders } = useMutation({
    mutationFn: async () => {
        const res = await $fetch<ApiResponse<WooCommerceSyncOrdersResult>>(
            `${WC_API_BASE}/woocommerce/orders/sync`,
            { method: "POST" },
        );
        return res.data;
    },
    onSuccess: (data) => openSyncResult("Sync orders result", data),
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
                            label="Update imported products"
                            icon="i-lucide-refresh-cw"
                            @click="isUpdateProductsConfirmOpen = true"
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
            @applied="(result) => openSyncResult('Import products result', result)"
        />

        <WCUpdateProductsConfirm
            v-model:open="isUpdateProductsConfirmOpen"
            @updated="(result) => openSyncResult('Update imported products result', result)"
        />

        <WCSyncResultDialog
            v-model:open="isSyncResultOpen"
            :title="syncResultTitle"
            :result="syncResult"
        />
    </div>
</template>
