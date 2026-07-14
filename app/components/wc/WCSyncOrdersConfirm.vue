<script setup lang="ts">
import { computed, ref, useNuxtApp, useToast, watch } from "#imports";
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

// skips don't touch POD — only the other three actions are selectable
const actionableRows = computed(() =>
    orderRows.value.filter((o) => o.action !== "skip"),
);

// wc_order_id -> whether the user wants this order in the sync run
const selectedOrders = ref<Set<number>>(new Set());

// Pre-check every actionable order when the preview lands. User opts out per-row.
watch(preview, (data) => {
    if (!data) return;
    selectedOrders.value = new Set(
        data.orders
            .filter((o) => o.action !== "skip")
            .map((o) => o.wc_order_id),
    );
});

const allOrdersSelected = computed(
    () =>
        !!actionableRows.value.length &&
        actionableRows.value.every((o) =>
            selectedOrders.value.has(o.wc_order_id),
        ),
);
const someOrdersSelected = computed(() => {
    const selected = actionableRows.value.filter((o) =>
        selectedOrders.value.has(o.wc_order_id),
    ).length;
    return selected > 0 && selected < actionableRows.value.length;
});

function toggleAllOrders(checked: boolean) {
    const next = new Set(selectedOrders.value);
    for (const o of actionableRows.value) {
        if (checked) next.add(o.wc_order_id);
        else next.delete(o.wc_order_id);
    }
    selectedOrders.value = next;
}

function toggleOneOrder(wcOrderId: number, checked: boolean) {
    const next = new Set(selectedOrders.value);
    if (checked) next.add(wcOrderId);
    else next.delete(wcOrderId);
    selectedOrders.value = next;
}

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
            {
                method: "POST",
                body: { wc_order_ids: [...selectedOrders.value] },
                headers: { "Content-Type": "application/json" },
            },
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
                        From this view you can review the action planned for
                        each order before running it.
                    </p>
                </div>

                <div class="rounded-md border border-default overflow-hidden">
                    <!-- header and rows share the same grid template so the columns always align -->
                    <div
                        class="grid grid-cols-[1rem_5rem_5rem_6rem_1fr] items-center gap-3 border-b border-default bg-elevated/40 px-3 py-2 text-xs font-medium uppercase text-muted"
                    >
                        <UCheckbox
                            :model-value="allOrdersSelected"
                            :indeterminate="someOrdersSelected"
                            @update:model-value="
                                toggleAllOrders($event as boolean)
                            "
                        />
                        <div>WC order</div>
                        <div>POD order</div>
                        <div>WC status</div>
                        <div>Action</div>
                    </div>
                    <ul
                        class="max-h-72 divide-y divide-default overflow-y-auto"
                    >
                        <li
                            v-for="row in orderRows"
                            :key="row.wc_order_id"
                            class="grid grid-cols-[1rem_5rem_5rem_6rem_1fr] items-center gap-3 px-3 py-2 text-sm"
                            :class="
                                row.action !== 'skip'
                                    ? 'cursor-pointer hover:bg-elevated/40'
                                    : ''
                            "
                            @click="
                                row.action !== 'skip' &&
                                    toggleOneOrder(
                                        row.wc_order_id,
                                        !selectedOrders.has(row.wc_order_id),
                                    )
                            "
                        >
                            <!-- skipped orders are not selectable — the run ignores them either way -->
                            <UCheckbox
                                v-if="row.action !== 'skip'"
                                :model-value="
                                    selectedOrders.has(row.wc_order_id)
                                "
                                @click.stop
                                @update:model-value="
                                    toggleOneOrder(
                                        row.wc_order_id,
                                        $event as boolean,
                                    )
                                "
                            />
                            <div v-else></div>
                            <div>#{{ row.wc_order_id }}</div>
                            <div>
                                <template v-if="row.pod_order_id">
                                    PED{{ row.pod_order_id }}
                                </template>
                                <span v-else class="text-dimmed">—</span>
                            </div>
                            <div class="truncate">
                                {{ row.status }}
                            </div>
                            <div class="min-w-0">
                                <UBadge
                                    :color="ACTION_BADGES[row.action].color"
                                    variant="soft"
                                >
                                    {{ ACTION_BADGES[row.action].label }}
                                </UBadge>
                                <div
                                    v-if="row.reason"
                                    class="mt-1 text-xs text-muted"
                                >
                                    {{ row.reason }}
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>

                <div class="flex items-center justify-between gap-2">
                    <span
                        v-if="actionableRows.length"
                        class="text-sm text-muted"
                    >
                        {{ selectedOrders.size }} /
                        {{ actionableRows.length }} orders selected
                    </span>
                    <span v-else></span>

                    <div class="flex gap-2">
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
                            :disabled="!selectedOrders.size"
                            label="Sync"
                            @click="syncOrders()"
                        />
                    </div>
                </div>
            </div>
        </template>
    </UModal>
</template>
