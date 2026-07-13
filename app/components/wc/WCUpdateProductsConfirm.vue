<script setup lang="ts">
import { computed, ref, useNuxtApp } from "#imports";
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

const { $api } = useNuxtApp();
const queryClient = useQueryClient();

const { data: preview, isLoading: isPreviewLoading } = useQuery({
    queryKey: ["woocommerce-products-import-preview"],
    queryFn: async () => {
        const [res] = await Promise.all([
            $api<ApiResponse<WooCommerceImportProductsPreview>>(
                `${WC_API_BASE}/woocommerce/products/import/preview`,
            ),
            new Promise((resolve) => setTimeout(resolve, 320)),
        ]);
        return res.data;
    },
    enabled: computed(() => open.value),
    retry: false,
});

// Mappings are self-contained on the WC side (name/state come with the row, even for
// WC products disabled or deleted on the store) — only the POD side needs a lookup.
const mappingRows = computed(() => {
    if (!preview.value) return [];
    const podById = new Map(
        preview.value.pod_products.map((p) => [p.pod_product_id, p]),
    );
    return preview.value.mappings
        .map((m) => {
            const pod = podById.get(m.pod_product_id);
            if (!pod) return null;
            return {
                wc_product_id: m.wc_product_id,
                wc_name: m.wc_product_name,
                pod_product_id: pod.pod_product_id,
                pod_name: pod.name,
                pod_format: pod.format,
                pod_product_source: m.pod_product_source,
            };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => a.wc_name.localeCompare(b.wc_name));
});

// Only products created from WC get updated; ones mapped to a pre-existing
// POD product keep POD as their source of truth and are skipped by the sync.
const updatableRows = computed(() =>
    mappingRows.value.filter((r) => r.pod_product_source === "WOOCOMMERCE"),
);
const skippedRows = computed(() =>
    mappingRows.value.filter((r) => r.pod_product_source === "POD"),
);

const activeTab = ref("created");

const tabItems = computed(() => [
    {
        value: "created",
        label: "Created",
        icon: "i-lucide-refresh-cw",
        badge: updatableRows.value.length,
    },
    {
        value: "mapped",
        label: "Mapped",
        icon: "i-lucide-link",
        badge: skippedRows.value.length,
    },
]);

const tabContent = computed(() =>
    activeTab.value === "created"
        ? {
              title: "Will be updated",
              description:
                  "These POD products were created from WooCommerce. All their fields (ref, name, price, tax, categories, etc.) will be overwritten with the current WooCommerce values.",
              rows: updatableRows.value,
              emptyText: "No products created from WooCommerce.",
          }
        : {
              title: "Will be skipped",
              description:
                  "These WooCommerce products are mapped to pre-existing POD products. POD stays their source of truth, so the update leaves them untouched.",
              rows: skippedRows.value,
              emptyText: "No products mapped to existing POD products.",
          },
);

const { mutate: refreshMappedProducts, isPending: isRefreshing } = useMutation({
    mutationFn: async () => {
        const res = await $api<ApiResponse<WooCommerceUpdateProductsResult>>(
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
    <UModal
        v-model:open="open"
        title="Update products"
        :ui="{
            content:
                isPreviewLoading || mappingRows.length
                    ? 'max-w-2xl'
                    : 'max-w-lg',
        }"
    >
        <template #body>
            <div
                v-if="isPreviewLoading"
                class="flex items-center gap-2 text-sm text-muted"
            >
                <UIcon name="i-lucide-loader" class="size-4 animate-spin" />
                Loading mappings...
            </div>

            <div v-else-if="!mappingRows.length" class="flex flex-col gap-4">
                <UAlert
                    color="info"
                    variant="soft"
                    icon="i-lucide-info"
                    description="No imported products found. Nothing to update."
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
                <UTabs
                    v-model="activeTab"
                    :items="tabItems"
                    variant="link"
                    :content="false"
                />

                <div class="flex flex-col gap-1">
                    <div class="text-sm font-medium">
                        {{ tabContent.title }}
                    </div>
                    <p class="text-sm text-muted">
                        {{ tabContent.description }}
                    </p>
                </div>

                <UAlert
                    v-if="!tabContent.rows.length"
                    color="neutral"
                    variant="soft"
                    icon="i-lucide-info"
                    :description="tabContent.emptyText"
                />

                <div
                    v-else
                    class="rounded-md border border-default overflow-hidden"
                >
                    <div
                        class="flex items-center gap-3 border-b border-default bg-elevated/40 px-3 py-2 text-xs font-medium uppercase text-muted"
                    >
                        <div class="min-w-0 flex-1">WooCommerce</div>
                        <div class="w-4 shrink-0"></div>
                        <div class="min-w-0 flex-1">pod</div>
                    </div>
                    <ul
                        class="max-h-72 divide-y divide-default overflow-y-auto"
                    >
                        <li
                            v-for="row in tabContent.rows"
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
                                class="size-4 shrink-0 text-muted"
                            />
                            <div class="min-w-0 flex-1">
                                <div class="truncate">
                                    {{ row.pod_name }}
                                    <span
                                        v-if="row.pod_format"
                                        class="ml-1 text-xs text-muted"
                                        >{{ row.pod_format }}</span
                                    >
                                </div>
                                <div class="text-xs text-muted">
                                    POD ID: {{ row.pod_product_id }}
                                </div>
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
                        :loading="isRefreshing"
                        :disabled="!updatableRows.length"
                        label="Update"
                        icon="i-lucide-refresh-cw"
                        @click="refreshMappedProducts()"
                    />
                </div>
            </div>
        </template>
    </UModal>
</template>
