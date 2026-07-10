<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

import type {
    ApiResponse,
    WooCommerceImportProductsPreview,
    WooCommerceUpdateProductsResult,
} from "~/types/woocommerce";
import { WC_API_BASE } from "~/types/woocommerce";

const open = defineModel<boolean>("open", { required: true });

const emit = defineEmits<{
    (e: "updated", result: WooCommerceUpdateProductsResult): void;
}>();

const queryClient = useQueryClient();

const { data: preview, isLoading: isPreviewLoading } = useQuery({
    queryKey: ["woocommerce-products-import-preview"],
    queryFn: async () => {
        const [res] = await Promise.all([
            $fetch<ApiResponse<WooCommerceImportProductsPreview>>(
                `${WC_API_BASE}/woocommerce/products/import/preview`,
            ),
            new Promise((resolve) => setTimeout(resolve, 320)),
        ]);
        return res.data;
    },
    enabled: computed(() => open.value),
    retry: false,
});

// Join `mappings` with the WC/POD name lookups so we can render side-by-side rows.
const mappingRows = computed(() => {
    if (!preview.value) return [];
    const wcById = new Map(
        preview.value.wc_products.map((p) => [p.wc_product_id, p]),
    );
    const podById = new Map(
        preview.value.pod_products.map((p) => [p.pod_product_id, p]),
    );
    return preview.value.mappings
        .map((m) => {
            const wc = wcById.get(m.wc_product_id);
            const pod = podById.get(m.pod_product_id);
            if (!wc || !pod) return null;
            return {
                wc_product_id: wc.wc_product_id,
                wc_name: wc.name,
                pod_product_id: pod.pod_product_id,
                pod_name: pod.name,
                pod_format: pod.format,
            };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);
});

const { mutate: refreshMappedProducts, isPending: isRefreshing } = useMutation({
    mutationFn: async () => {
        const res = await $fetch<ApiResponse<WooCommerceUpdateProductsResult>>(
            `${WC_API_BASE}/woocommerce/products/update`,
            { method: "PUT" },
        );
        return res.data;
    },
    onSuccess: (data) => {
        queryClient.invalidateQueries({
            queryKey: ["woocommerce-products-import-preview"],
        });
        open.value = false;
        emit("updated", data);
    },
});
</script>

<template>
    <UModal v-model:open="open" title="Update imported products">
        <template #body>
            <div class="mb-4 space-y-2 text-sm text-muted">
                <p>
                    Every POD product mapped to a WooCommerce product will be
                    updated. All their fields (name, ref, price, tax, categories, etc.) will be
                    overwritten with the current WooCommerce values.
                </p>
            </div>

            <div class="mb-4">
                <div v-if="isPreviewLoading" class="flex items-center gap-2 text-sm text-muted">
                    <UIcon name="i-lucide-loader" class="animate-spin" />
                    Loading mappings...
                </div>

                <div
                    v-else-if="!mappingRows.length"
                    class="rounded-md border border-default p-3 text-sm text-muted"
                >
                    No mapped products to update.
                </div>

                <div
                    v-else
                    class="rounded-md border border-default overflow-hidden"
                >
                    <div
                        class="flex items-center gap-3 border-b border-default bg-elevated/40 px-3 py-2 text-xs font-medium uppercase text-muted"
                    >
                        <div class="min-w-0 flex-1">WooCommerce</div>
                        <div class="w-4 shrink-0"></div>
                        <div class="min-w-0 flex-1">POD</div>
                    </div>
                    <ul class="max-h-80 divide-y divide-default overflow-y-auto">
                        <li
                            v-for="row in mappingRows"
                            :key="row.wc_product_id"
                            class="flex items-center gap-3 px-3 py-2 text-sm"
                        >
                        <div class="min-w-0 flex-1">
                            <div class="truncate">{{ row.wc_name }}</div>
                            <div class="text-xs text-muted">
                                WC ID: {{ row.wc_product_id }}
                            </div>
                        </div>
                        <UIcon
                            name="i-lucide-arrow-right"
                            class="shrink-0 text-muted"
                        />
                        <div class="min-w-0 flex-1">
                            <div class="truncate">
                                {{ row.pod_name }}
                                <span
                                    v-if="row.pod_format"
                                    class="ml-1 text-xs text-muted"
                                >{{ row.pod_format }}</span>
                            </div>
                            <div class="text-xs text-muted">
                                POD ID: {{ row.pod_product_id }}
                            </div>
                        </div>
                        </li>
                    </ul>
                </div>
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
                    :loading="isRefreshing"
                    :disabled="!mappingRows.length"
                    label="Update"
                    icon="i-lucide-refresh-cw"
                    @click="refreshMappedProducts()"
                />
            </div>
        </template>
    </UModal>
</template>
