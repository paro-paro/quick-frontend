<script setup lang="ts">
import { computed, ref, useAuthUser, useNuxtApp, useToast } from "#imports";
import { useMutation, useQuery } from "@tanstack/vue-query";

import type {
    ApiResponse,
    WooCommerceConnection,
    WooCommerceSyncOrdersResult,
    WooCommerceSyncResultAny,
} from "~/types/woocommerce";
import { WC_API_BASE, WC_CONNECTION_URL } from "~/types/woocommerce";
import { getApiErrorMessage } from "~/utils/api-errors";
import { summarizeSyncResult } from "~/utils/sync-results";

const { user, isAuthReady } = useAuthUser();
const { $api } = useNuxtApp();
const toast = useToast();

// --- Connection query (source of truth for the whole page's mode) ---

const {
    isError,
    isPending,
    data: connexion,
} = useQuery({
    retry: false,
    staleTime: 0,
    queryKey: ["woocommerce-connexion"],
    queryFn: async () => {
        const res =
            await $api<ApiResponse<WooCommerceConnection>>(WC_CONNECTION_URL);
        return res.data;
    },
    // app.vue mounts before (and without) a signed-in user — only fetch once
    // there is one, otherwise this fires an unauthenticated call on page load.
    enabled: computed(() => !!user.value),
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

function openSyncResult(
    title: string,
    toastTitle: string,
    result: WooCommerceSyncResultAny,
) {
    syncResultTitle.value = title;
    syncResult.value = result;
    isSyncResultOpen.value = true;

    toast.add({
        title: toastTitle,
        description: summarizeSyncResult(result),
        color: result.errors.length ? "warning" : "success",
        icon: result.errors.length
            ? "i-lucide-alert-triangle"
            : "i-lucide-check-circle-2",
    });
}

// --- Sync orders (one-click) ---

const { mutate: syncOrders, isPending: isSyncingOrders } = useMutation({
    mutationFn: async () => {
        const res = await $api<ApiResponse<WooCommerceSyncOrdersResult>>(
            `${WC_API_BASE}/woocommerce/orders/sync`,
            { method: "POST" },
        );
        return res.data;
    },
    onSuccess: (data) =>
        openSyncResult("Sync orders result", "Sync orders done", data),
    onError: (error) => {
        toast.add({
            title: getApiErrorMessage(error),
            color: "error",
            icon: "i-lucide-alert-triangle",
        });
    },
});
</script>

<template>
    <UApp :toaster="{ position: 'top-right' }">
        <!-- Auth gate: loading → spinner, signed out → login form only, signed in → the app -->
        <div
            v-if="!isAuthReady"
            class="min-h-screen flex items-center justify-center"
        >
            <UIcon
                name="i-lucide-loader"
                class="size-8 animate-spin text-muted"
            />
        </div>

        <div
            v-else-if="!user"
            class="min-h-screen flex items-center justify-center p-4"
        >
            <UCard class="w-full max-w-sm">
                <template #header>
                    <span class="text-lg font-bold text-primary">pod</span>
                </template>

                <AuthPanel />
            </UCard>
        </div>

        <NuxtLayout v-else>
            <div class="p-6">
                <h1 class="text-2xl font-semibold mb-6">WooCommerce</h1>

                <div class="mb-6 max-w-lg">
                    <h2 class="text-lg font-medium mb-4">Integration</h2>

                    <div
                        v-if="isPending"
                        class="flex items-center gap-2 text-muted"
                    >
                        <UIcon name="i-lucide-loader" class="size-4 animate-spin" />
                        Loading...
                    </div>

                    <div
                        v-else-if="isError"
                        class="flex items-center gap-2 text-muted"
                    >
                        <UIcon name="i-lucide-alert-triangle" class="size-4" />
                        Something went wrong...
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

                    <div
                        class="flex flex-col gap-4 rounded-md border border-default p-4"
                    >
                        <div>
                            <div
                                class="mb-2 text-xs font-medium uppercase text-muted"
                            >
                                Products
                            </div>
                            <div class="flex gap-2">
                                <UButton
                                    color="primary"
                                    label="Import products"
                                    icon="i-lucide-download"
                                    :disabled="!connexion?.is_active"
                                    @click="isImportOpen = true"
                                />
                                <UButton
                                    color="primary"
                                    variant="soft"
                                    label="Update products"
                                    icon="i-lucide-refresh-cw"
                                    :disabled="!connexion?.is_active"
                                    @click="isUpdateProductsConfirmOpen = true"
                                />
                            </div>
                        </div>

                        <div>
                            <div
                                class="mb-2 text-xs font-medium uppercase text-muted"
                            >
                                Orders
                            </div>
                            <div class="flex gap-2">
                                <UButton
                                    color="primary"
                                    label="Sync orders"
                                    icon="i-lucide-refresh-cw"
                                    :loading="isSyncingOrders"
                                    :disabled="!connexion?.is_active"
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
                    @applied="
                        (result) =>
                            openSyncResult(
                                'Import products result',
                                'Import products done',
                                result,
                            )
                    "
                />

                <WCUpdateProductsConfirm
                    v-model:open="isUpdateProductsConfirmOpen"
                    @updated="
                        (result) =>
                            openSyncResult(
                                'Update products result',
                                'Update products done',
                                result,
                            )
                    "
                />

                <WCSyncResultDialog
                    v-model:open="isSyncResultOpen"
                    :title="syncResultTitle"
                    :result="syncResult"
                />
            </div>
        </NuxtLayout>
    </UApp>
</template>
