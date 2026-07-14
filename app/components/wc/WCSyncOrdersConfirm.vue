<script setup lang="ts">
import { computed, useNuxtApp, useToast } from "#imports";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

import type {
    ApiResponse,
    WCOrderSyncAction,
    WooCommerceSyncOrdersPreview,
    WooCommerceSyncOrdersResult,
} from "~/types/woocommerce";
import { getApiErrorMessage } from "~/utils/api-errors";

const open = defineModel<boolean>("open", { required: true });

const emit = defineEmits<{
    (e: "synced", result: WooCommerceSyncOrdersResult): void;
}>();

const { $api } = useNuxtApp();
const queryClient = useQueryClient();
const toast = useToast();

const { data: preview, isPending: isPreviewLoading } = useQuery({
    queryKey: ["woocommerce-orders-sync-preview"],
    queryFn: async () => {
        const [res] = await Promise.all([
            $api<ApiResponse<WooCommerceSyncOrdersPreview>>(
                "/woocommerce/orders/sync/preview",
            ),
            new Promise((resolve) => setTimeout(resolve, 320)),
        ]);
        return res.data;
    },
    enabled: computed(() => open.value),
    retry: false,
});

// newest orders first — the run itself still processes oldest-first
const orderRows = computed(() =>
    [...(preview.value?.orders ?? [])].sort(
        (a, b) => b.wc_order_id - a.wc_order_id,
    ),
);

// skips don't touch POD — the run only acts on the other three
const actionableCount = computed(
    () => orderRows.value.filter((o) => o.action !== "skip").length,
);

const ACTION_BADGES: Record<
    WCOrderSyncAction,
    { label: string; color: "success" | "info" | "error" | "neutral" }
> = {
    create: { label: "Create", color: "success" },
    update: { label: "Update", color: "info" },
    delete: { label: "Delete", color: "error" },
    skip: { label: "Skip", color: "neutral" },
};

const { mutate: syncOrders, isPending: isSyncing } = useMutation({
    mutationFn: async () => {
        const res = await $api<ApiResponse<WooCommerceSyncOrdersResult>>(
            "/woocommerce/orders/sync",
            { method: "POST" },
        );
        return res.data;
    },
    onSuccess: (data) => {
        queryClient.invalidateQueries({
            queryKey: ["woocommerce-orders-sync-preview"],
        });
        open.value = false;
        emit("synced", data);
    },
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
    <UModal
        v-model:open="open"
        title="Sync orders"
        :ui="{ content: 'max-w-2xl' }"
    >
        <template #body>
            <div
                v-if="isPreviewLoading"
                class="flex items-center gap-2 text-sm text-muted"
            >
                <UIcon name="i-lucide-loader" class="size-4 animate-spin" />
                Loading orders...
            </div>

            <div v-else-if="!orderRows.length" class="flex flex-col gap-4">
                <UAlert
                    color="info"
                    variant="soft"
                    icon="i-lucide-info"
                    description="No orders found on the WooCommerce store."
                />
                <div class="flex justify-end">
                    <UButton
                        type="button"
                        color="neutral"
                        variant="ghost"
                        label="Close"
                        @click="open = false"
                    />
                </div>
            </div>

            <div v-else class="flex flex-col gap-6">
                <div class="space-y-2 text-sm text-muted">
                    <p>Syncing brings your WooCommerce orders into POD.</p>
                    <p>
                        Here you can review the action planned for each order
                        before running it.
                    </p>
                </div>

                <div class="rounded-md border border-default overflow-hidden">
                    <div
                        class="flex items-center gap-3 border-b border-default bg-elevated/40 px-3 py-2 text-xs font-medium uppercase text-muted"
                    >
                        <div class="w-24 shrink-0">WC order</div>
                        <div class="w-24 shrink-0">POD order</div>
                        <div class="min-w-0 flex-1">WC status</div>
                        <div class="w-20 shrink-0 text-right">Action</div>
                    </div>
                    <ul
                        class="max-h-72 divide-y divide-default overflow-y-auto"
                    >
                        <li
                            v-for="row in orderRows"
                            :key="row.wc_order_id"
                            class="flex items-center gap-3 px-3 py-2 text-sm"
                        >
                            <div class="w-24 shrink-0">
                                #{{ row.wc_order_id }}
                            </div>
                            <div class="w-24 shrink-0">
                                <template v-if="row.pod_order_id">
                                    PED{{ row.pod_order_id }}
                                </template>
                                <span v-else class="text-dimmed">—</span>
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="truncate">{{ row.status }}</div>
                                <div
                                    v-if="row.reason"
                                    class="text-xs text-muted"
                                >
                                    {{ row.reason }}
                                </div>
                            </div>
                            <div class="w-20 shrink-0 text-right">
                                <UBadge
                                    :color="ACTION_BADGES[row.action].color"
                                    variant="soft"
                                >
                                    {{ ACTION_BADGES[row.action].label }}
                                </UBadge>
                            </div>
                        </li>
                    </ul>
                </div>

                <div class="flex justify-end gap-2">
                    <UButton
                        type="button"
                        color="neutral"
                        variant="ghost"
                        label="Cancel"
                        @click="open = false"
                    />
                    <UButton
                        color="primary"
                        :loading="isSyncing"
                        :disabled="!actionableCount"
                        label="Sync"
                        @click="syncOrders()"
                    />
                </div>
            </div>
        </template>
    </UModal>
</template>
