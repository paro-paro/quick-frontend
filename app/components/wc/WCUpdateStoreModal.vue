<script setup lang="ts">
import { computed, ref, useNuxtApp, useToast, useUiSettings } from "#imports";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

import type {
    ApiResponse,
    WCUpdateStoreAction,
    WooCommerceUpdateStorePreview,
    WooCommerceUpdateStoreResult,
} from "~/types/woocommerce";
import { getApiErrorMessage } from "~/utils/api-errors";

const open = defineModel<boolean>("open", { required: true });

const emit = defineEmits<{
    (e: "updated", result: WooCommerceUpdateStoreResult): void;
}>();

const { $api } = useNuxtApp();
const queryClient = useQueryClient();
const toast = useToast();
const { showProductIds } = useUiSettings();

// Selects which WC offer of the tax pair drives the run (and its preview).
const useTaxedOffer = ref(false);

const { data: preview, isPending: isPreviewLoading } = useQuery({
    queryKey: ["woocommerce-update-store-preview", useTaxedOffer],
    queryFn: async () => {
        const [res] = await Promise.all([
            $api<ApiResponse<WooCommerceUpdateStorePreview>>(
                "/woocommerce/update/store/preview",
                { query: { use_taxed_offer: useTaxedOffer.value } },
            ),
            new Promise((resolve) => setTimeout(resolve, 320)),
        ]);
        return res.data;
    },
    enabled: computed(() => open.value),
    retry: false,
});

// The POD WooCommerce offer dictates what the user sells on the store — rows come
// pre-bucketed from the preview: create (new on WC), update (overwrite WC values),
// deactivate (product left the offer, drafted on WC).
// No selection: the run always covers every row, keeping POD and WC in 1:1 parity.
const productRows = computed(() => preview.value?.products ?? []);

const ACTION_BADGES: Record<
    WCUpdateStoreAction,
    { label: string; color: "success" | "info" | "neutral" }
> = {
    create: { label: "Create", color: "success" },
    update: { label: "Update", color: "info" },
    activate: { label: "Activate + Update", color: "success" },
    deactivate: { label: "Deactivate", color: "neutral" },
};

const { mutate: updateStore, isPending: isUpdating } = useMutation({
    mutationFn: async () => {
        const res = await $api<ApiResponse<WooCommerceUpdateStoreResult>>(
            "/woocommerce/update/store",
            {
                method: "PUT",
                body: { use_taxed_offer: useTaxedOffer.value },
                headers: { "Content-Type": "application/json" },
            },
        );
        return res.data;
    },
    onSuccess: (data) => {
        queryClient.invalidateQueries({
            queryKey: ["woocommerce-update-store-preview"],
        });
        queryClient.invalidateQueries({
            queryKey: ["woocommerce-products-import-preview"],
        });
        open.value = false;
        emit("updated", data);
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
        title="Update store"
        description="Update your WooCommerce store from your POD catalog."
        :ui="{ content: 'max-w-2xl' }"
    >
        <template #body>
            <div
                v-if="isPreviewLoading"
                class="flex items-center gap-2 text-sm text-muted"
            >
                <UIcon name="i-lucide-loader" class="size-4 animate-spin" />
                Loading products...
            </div>

            <div v-else-if="!productRows.length" class="flex flex-col gap-4">
                <UAlert
                    color="neutral"
                    variant="soft"
                    icon="i-lucide-info"
                    description="No products found in your catalog."
                />
                <div class="flex items-center justify-between gap-2">
                    <UCheckbox
                        v-model="useTaxedOffer"
                        label="Use taxed catalog"
                    />
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
                <p class="text-sm text-muted">
                    The table below summarizes the per-product changes that
                    will be applied to your store.
                </p>

                <div class="rounded-md border border-default overflow-hidden">
                    <!-- header and rows share the same grid template so the columns always align -->
                    <div
                        class="grid grid-cols-[1fr_1rem_1fr_9rem] items-center gap-3 border-b border-default bg-elevated/40 px-3 py-2 text-xs font-medium uppercase text-muted"
                    >
                        <div>pod</div>
                        <div></div>
                        <div>WooCommerce</div>
                        <div>Action</div>
                    </div>
                    <ul
                        class="max-h-72 divide-y divide-default overflow-y-auto"
                    >
                        <li
                            v-for="row in productRows"
                            :key="row.pod_product_id"
                            class="grid grid-cols-[1fr_1rem_1fr_9rem] items-center gap-3 px-3 py-2 text-sm"
                        >
                            <div class="min-w-0">
                                <div class="truncate">
                                    {{ row.pod_product_name }}
                                    <span
                                        v-if="row.pod_product_format"
                                        class="ml-1 text-xs text-muted"
                                        >{{ row.pod_product_format }}</span
                                    >
                                </div>
                                <div
                                    v-if="showProductIds"
                                    class="text-xs text-muted"
                                >
                                    ID: {{ row.pod_product_id }}
                                </div>
                            </div>
                            <UIcon
                                name="i-lucide-arrow-right"
                                class="size-4 text-muted"
                            />
                            <div class="min-w-0">
                                <template v-if="row.wc_product_id !== null">
                                    <div class="truncate">
                                        {{ row.wc_product_name }}
                                    </div>
                                    <div
                                        v-if="showProductIds"
                                        class="text-xs text-muted"
                                    >
                                        ID: {{ row.wc_product_id }}
                                    </div>
                                </template>
                                <span v-else class="text-dimmed">—</span>
                            </div>
                            <div>
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

                <div class="flex items-center justify-between gap-2">
                    <UCheckbox
                        v-model="useTaxedOffer"
                        label="Use taxed catalog"
                    />
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
                            :loading="isUpdating"
                            label="Update"
                            @click="updateStore()"
                        />
                    </div>
                </div>
            </div>
        </template>
    </UModal>
</template>
