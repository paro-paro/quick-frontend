<script setup lang="ts">
import {
    computed,
    ref,
    useNuxtApp,
    useToast,
    useUiSettings,
    watch,
} from "#imports";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

import type {
    ApiResponse,
    WooCommerceImportProductsPreview,
    WooCommerceUpdateProductsResult,
} from "~/types/woocommerce";
import { getApiErrorMessage } from "~/utils/api-errors";

const open = defineModel<boolean>("open", { required: true });

const emit = defineEmits<{
    (e: "updated", result: WooCommerceUpdateProductsResult): void;
}>();

const { $api } = useNuxtApp();
const queryClient = useQueryClient();
const toast = useToast();
const { showProductIds } = useUiSettings();

const { data: preview, isPending: isPreviewLoading } = useQuery({
    queryKey: ["woocommerce-products-import-preview"],
    queryFn: async () => {
        const [res] = await Promise.all([
            $api<ApiResponse<WooCommerceImportProductsPreview>>(
                "/woocommerce/products/import/preview",
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
    mappingRows.value.filter((r) => r.pod_product_source === "WC"),
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
              hint: null,
              rows: updatableRows.value,
              emptyText: "No products created from WooCommerce.",
          }
        : {
              title: "Will be skipped",
              description:
                  "These WooCommerce products are mapped to pre-existing POD products. POD remains their source of truth, so the update leaves them untouched.",
              hint: "From this view you can update a mapping by selecting a different POD product from the dropdown, or delete it with the X button. Changes are applied immediately.",
              rows: skippedRows.value,
              emptyText: "No products mapped to existing POD products.",
          },
);

// --- Selection (created rows only) ---

// wc_product_id -> whether the user wants this product in the update run
const selectedForUpdate = ref<Set<number>>(new Set());

// Pre-check every updatable row when the preview lands. User opts out per-row.
watch(preview, (data) => {
    if (!data) return;
    selectedForUpdate.value = new Set(
        data.mappings
            .filter((m) => m.pod_product_source === "WC")
            .map((m) => m.wc_product_id),
    );
});

const allUpdatableSelected = computed(
    () =>
        !!updatableRows.value.length &&
        updatableRows.value.every((r) =>
            selectedForUpdate.value.has(r.wc_product_id),
        ),
);
const someUpdatableSelected = computed(() => {
    const selected = updatableRows.value.filter((r) =>
        selectedForUpdate.value.has(r.wc_product_id),
    ).length;
    return selected > 0 && selected < updatableRows.value.length;
});

function toggleAllUpdate(checked: boolean) {
    const next = new Set(selectedForUpdate.value);
    for (const r of updatableRows.value) {
        if (checked) next.add(r.wc_product_id);
        else next.delete(r.wc_product_id);
    }
    selectedForUpdate.value = next;
}

function toggleOneUpdate(wcId: number, checked: boolean) {
    const next = new Set(selectedForUpdate.value);
    if (checked) next.add(wcId);
    else next.delete(wcId);
    selectedForUpdate.value = next;
}

// --- Re-map (mapped rows only) ---

// POD ids already claimed by a mapping — excluded as re-map targets (a row keeps its own pick)
const mappedPodIds = computed<Set<number>>(
    () => new Set((preview.value?.mappings ?? []).map((m) => m.pod_product_id)),
);

function podOptionsForRow(currentPodId: number) {
    return (preview.value?.pod_products ?? [])
        .filter(
            (p) =>
                p.pod_product_id === currentPodId ||
                !mappedPodIds.value.has(p.pod_product_id),
        )
        .map((p) => ({
            label: p.format ? `${p.name} ${p.format}` : p.name,
            name: p.name,
            format: p.format,
            value: p.pod_product_id,
        }));
}

// USelectMenu emits update:model-value even when re-selecting the current item — skip those
function onRemap(
    row: { wc_product_id: number; pod_product_id: number },
    podProductId: number,
) {
    if (podProductId === row.pod_product_id) return;
    remapProduct({
        wc_product_id: row.wc_product_id,
        pod_product_id: podProductId,
    });
}

const { mutate: remapProduct, isPending: isRemapping } = useMutation({
    mutationFn: async (payload: {
        wc_product_id: number;
        pod_product_id: number;
    }) => {
        await $api(`/woocommerce/products/mappings/${payload.wc_product_id}`, {
            method: "PUT",
            body: { pod_product_id: payload.pod_product_id },
            headers: { "Content-Type": "application/json" },
        });
    },
    onSuccess: () => {
        queryClient.invalidateQueries({
            queryKey: ["woocommerce-products-import-preview"],
        });
        toast.add({
            title: "Mapping updated.",
            color: "success",
            icon: "i-lucide-check-circle-2",
        });
    },
    onError: (error) => {
        toast.add({
            title: getApiErrorMessage(error),
            color: "error",
            icon: "i-lucide-alert-triangle",
        });
    },
});

const { mutate: unmapProduct, isPending: isUnmapping } = useMutation({
    mutationFn: async (wcProductId: number) => {
        await $api(`/woocommerce/products/mappings/${wcProductId}`, {
            method: "DELETE",
        });
    },
    onSuccess: () => {
        queryClient.invalidateQueries({
            queryKey: ["woocommerce-products-import-preview"],
        });
        toast.add({
            title: "Mapping deleted.",
            color: "success",
            icon: "i-lucide-check-circle-2",
        });
    },
    onError: (error) => {
        toast.add({
            title: getApiErrorMessage(error),
            color: "error",
            icon: "i-lucide-alert-triangle",
        });
    },
});

const { mutate: refreshMappedProducts, isPending: isRefreshing } = useMutation({
    mutationFn: async () => {
        const res = await $api<ApiResponse<WooCommerceUpdateProductsResult>>(
            "/woocommerce/products/update",
            {
                method: "PUT",
                body: { wc_product_ids: [...selectedForUpdate.value] },
                headers: { "Content-Type": "application/json" },
            },
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
        title="Update products"
        :ui="{ content: 'max-w-2xl' }"
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
                    <template v-if="tabContent.hint">
                        <USeparator class="my-2" />
                        <p class="text-sm text-muted">
                            {{ tabContent.hint }}
                        </p>
                    </template>
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
                        <UCheckbox
                            v-if="activeTab === 'created'"
                            :model-value="allUpdatableSelected"
                            :indeterminate="someUpdatableSelected"
                            @update:model-value="
                                toggleAllUpdate($event as boolean)
                            "
                        />
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
                            :class="
                                row.pod_product_source === 'WC'
                                    ? 'cursor-pointer hover:bg-elevated/40'
                                    : ''
                            "
                            @click="
                                row.pod_product_source === 'WC' &&
                                    toggleOneUpdate(
                                        row.wc_product_id,
                                        !selectedForUpdate.has(
                                            row.wc_product_id,
                                        ),
                                    )
                            "
                        >
                            <UCheckbox
                                v-if="row.pod_product_source === 'WC'"
                                :model-value="
                                    selectedForUpdate.has(row.wc_product_id)
                                "
                                @click.stop
                                @update:model-value="
                                    toggleOneUpdate(
                                        row.wc_product_id,
                                        $event as boolean,
                                    )
                                "
                            />
                            <div class="min-w-0 flex-1">
                                <div class="truncate">{{ row.wc_name }}</div>
                                <div
                                    v-if="showProductIds"
                                    class="text-xs text-muted"
                                >
                                    ID: {{ row.wc_product_id }}
                                </div>
                            </div>
                            <UIcon
                                name="i-lucide-arrow-right"
                                class="size-4 shrink-0 text-muted"
                            />
                            <!-- Mapped rows: the POD target is editable — selecting re-maps
                                 immediately, the X unmaps (WC product becomes importable again) -->
                            <div
                                v-if="row.pod_product_source === 'POD'"
                                class="min-w-0 flex-1"
                            >
                                <div class="flex items-center gap-1">
                                    <USelectMenu
                                        :model-value="row.pod_product_id"
                                        :items="
                                            podOptionsForRow(
                                                row.pod_product_id,
                                            )
                                        "
                                        value-key="value"
                                        :disabled="isRemapping || isUnmapping"
                                        class="flex-1"
                                        @update:model-value="
                                            onRemap(row, $event as number)
                                        "
                                    >
                                    <template #default>
                                        <span>
                                            {{ row.pod_name
                                            }}<span
                                                v-if="row.pod_format"
                                                class="ml-2 text-xs text-muted"
                                                >{{ row.pod_format }}</span
                                            >
                                        </span>
                                    </template>
                                    <template #item-label="{ item }">
                                        <span>{{
                                            (item as { name: string }).name
                                        }}</span>
                                        <span
                                            v-if="
                                                (item as { format: string })
                                                    .format
                                            "
                                            class="ml-2 text-xs text-muted"
                                        >
                                            {{
                                                (item as { format: string })
                                                    .format
                                            }}
                                        </span>
                                    </template>
                                    </USelectMenu>
                                    <UButton
                                        color="neutral"
                                        variant="ghost"
                                        size="xs"
                                        icon="i-lucide-x"
                                        aria-label="Unmap"
                                        :disabled="isRemapping || isUnmapping"
                                        @click="
                                            unmapProduct(row.wc_product_id)
                                        "
                                    />
                                </div>
                                <div
                                    v-if="showProductIds"
                                    class="mt-1 text-xs text-muted"
                                >
                                    ID: {{ row.pod_product_id }}
                                </div>
                            </div>

                            <div v-else class="min-w-0 flex-1">
                                <div class="truncate">
                                    {{ row.pod_name }}
                                    <span
                                        v-if="row.pod_format"
                                        class="ml-1 text-xs text-muted"
                                        >{{ row.pod_format }}</span
                                    >
                                </div>
                                <div
                                    v-if="showProductIds"
                                    class="text-xs text-muted"
                                >
                                    ID: {{ row.pod_product_id }}
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>

                <div class="flex items-center justify-between gap-2">
                    <span
                        v-if="activeTab === 'created' && updatableRows.length"
                        class="text-sm text-muted"
                    >
                        {{ selectedForUpdate.size }} /
                        {{ updatableRows.length }} products selected
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
                            v-if="activeTab === 'created'"
                            color="primary"
                            :loading="isRefreshing"
                            :disabled="!selectedForUpdate.size"
                            label="Update"
                            @click="refreshMappedProducts()"
                        />
                    </div>
                </div>
            </div>
        </template>
    </UModal>
</template>
