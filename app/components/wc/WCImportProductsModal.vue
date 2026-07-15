<script setup lang="ts">
import { computed, ref, useNuxtApp, useToast, useUiSettings, watch } from "#imports";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

import type {
    ApiResponse,
    WooCommerceImportProductsApply,
    WooCommerceImportProductsApplyItem,
    WooCommerceImportProductsApplyResult,
    WooCommerceImportProductsPreview,
} from "~/types/woocommerce";
import { getApiErrorMessage } from "~/utils/api-errors";

const open = defineModel<boolean>("open", { required: true });

const emit = defineEmits<{
    (e: "applied", result: WooCommerceImportProductsApplyResult): void;
}>();

const { $api } = useNuxtApp();
const queryClient = useQueryClient();
const toast = useToast();
const { showProductIds } = useUiSettings();


const IMPORT_HINT =
    "For each WooCommerce product, you can choose to create a new POD product by leaving the dropdown blank, or map it to an existing one by selecting it from the dropdown.";

// wc_product_id -> whether the user wants to import this one
const selectedForImport = ref<Set<number>>(new Set());
// wc_product_id -> pod_product_id chosen for the "map" action (null = "create")
const selectedMappings = ref<Record<number, number | null>>({});

const {
    data: syncPreview,
    isPending: isPreviewLoading,
    isError: isPreviewError,
    error: previewError,
} = useQuery({
    queryKey: ["woocommerce-products-import-preview"],
    queryFn: async () => {
        // Race the fetch against a min-delay so the spinner doesn't flash on
        // fast networks — isPending stays true for at least 320ms.
        const [res] = await Promise.all([
            $api<ApiResponse<WooCommerceImportProductsPreview>>(
                "/woocommerce/products/import/preview",
            ),
            new Promise((resolve) => setTimeout(resolve, 500)),
        ]);
        return res.data;
    },
    enabled: computed(() => open.value),
    retry: false,
});

// Import flow only handles NEW products — mapped ones are the refresh flow's job.
const importableWcProducts = computed(() => {
    const mapped = new Set(
        (syncPreview.value?.mappings ?? []).map((m) => m.wc_product_id),
    );
    return (syncPreview.value?.wc_products ?? []).filter(
        (p) => !mapped.has(p.wc_product_id),
    );
});

// POD ids already claimed by existing DB mappings — can't be picked as map targets.
const alreadyMappedPodIds = computed<Set<number>>(
    () =>
        new Set(
            (syncPreview.value?.mappings ?? []).map((m) => m.pod_product_id),
        ),
);

// Pre-check every importable row when preview lands. User opts out per-row.
watch(syncPreview, (data) => {
    if (!data) return;
    const mapped = new Set(data.mappings.map((m) => m.wc_product_id));
    selectedForImport.value = new Set(
        data.wc_products
            .filter((p) => !mapped.has(p.wc_product_id))
            .map((p) => p.wc_product_id),
    );
    selectedMappings.value = {};
});

const allImportableSelected = computed(
    () =>
        !!importableWcProducts.value.length &&
        importableWcProducts.value.every((p) =>
            selectedForImport.value.has(p.wc_product_id),
        ),
);
const someImportableSelected = computed(() => {
    const selected = importableWcProducts.value.filter((p) =>
        selectedForImport.value.has(p.wc_product_id),
    ).length;
    return selected > 0 && selected < importableWcProducts.value.length;
});

function toggleAll(checked: boolean) {
    const next = new Set(selectedForImport.value);
    for (const p of importableWcProducts.value) {
        if (checked) next.add(p.wc_product_id);
        else next.delete(p.wc_product_id);
    }
    selectedForImport.value = next;
}

function toggleOne(wcId: number, checked: boolean) {
    const next = new Set(selectedForImport.value);
    if (checked) next.add(wcId);
    else {
        next.delete(wcId);
        // Deselecting a row frees its POD pick.
        selectedMappings.value = { ...selectedMappings.value, [wcId]: null };
    }
    selectedForImport.value = next;
}

function clearMapping(wcId: number) {
    selectedMappings.value = { ...selectedMappings.value, [wcId]: null };
}

// pod_product_id -> {name, format} lookup for rendering the selected value in
// the dropdown trigger (mirrors the list's #item-label styling).
const podInfoById = computed<Map<number, { name: string; format: string }>>(
    () => {
        const m = new Map<number, { name: string; format: string }>();
        for (const p of syncPreview.value?.pod_products ?? []) {
            m.set(p.pod_product_id, { name: p.name, format: p.format });
        }
        return m;
    },
);

// POD ids currently picked by *any* row in this modal session — used to
// prevent two rows from mapping to the same POD.
const claimedPodIdsBySession = computed<Set<number>>(() => {
    const set = new Set<number>();
    for (const [, podId] of Object.entries(selectedMappings.value)) {
        if (podId != null) set.add(podId);
    }
    return set;
});

function podOptionsForRow(wcId: number) {
    const ownPick = selectedMappings.value[wcId];
    return (syncPreview.value?.pod_products ?? [])
        .filter((p) => {
            // Exclude PODs already mapped in the DB.
            if (alreadyMappedPodIds.value.has(p.pod_product_id)) return false;
            // Exclude PODs picked by another row this session (keep own pick).
            if (
                p.pod_product_id !== ownPick &&
                claimedPodIdsBySession.value.has(p.pod_product_id)
            ) {
                return false;
            }
            return true;
        })
        .map((p) => ({
            // Combined text stays in `label` so it shows in the trigger and
            // powers search. The dropdown list uses the #item-label slot below
            // to render name normally + format muted inline (no parentheses).
            label: p.format ? `${p.name} ${p.format}` : p.name,
            name: p.name,
            format: p.format,
            value: p.pod_product_id,
        }));
}

const { mutate: applySyncProducts, isPending: isApplying } = useMutation({
    mutationFn: async (payload: WooCommerceImportProductsApply) => {
        const res = await $api<
            ApiResponse<WooCommerceImportProductsApplyResult>
        >("/woocommerce/products/import/apply", {
            method: "POST",
            body: payload,
            headers: { "Content-Type": "application/json" },
        });
        return res.data;
    },
    onSuccess: (data) => {
        queryClient.invalidateQueries({
            queryKey: ["woocommerce-products-import-preview"],
        });
        open.value = false;
        emit("applied", data);
    },
    onError: (error) => {
        toast.add({
            title: getApiErrorMessage(error),
            color: "error",
            icon: "i-lucide-alert-triangle",
        });
    },
});

const selectedCount = computed(() => selectedForImport.value.size);

function onConfirm() {
    const items: WooCommerceImportProductsApplyItem[] = [];
    for (const wc of importableWcProducts.value) {
        const wcId = wc.wc_product_id;
        if (!selectedForImport.value.has(wcId)) continue;
        const podId = selectedMappings.value[wcId];
        if (podId != null) {
            items.push({
                wc_product_id: wcId,
                action: "map",
                pod_product_id: podId,
            });
        } else {
            items.push({ wc_product_id: wcId, action: "create" });
        }
    }
    applySyncProducts({ items });
}
</script>

<template>
    <UModal
        v-model:open="open"
        title="Import products"
        description="Bring your WooCommerce products into POD."
        :ui="{ content: 'max-w-2xl' }"
    >
        <template #body>
            <div
                v-if="isPreviewLoading"
                class="flex items-center gap-2 text-muted"
            >
                <UIcon name="i-lucide-loader" class="size-4 animate-spin" />
                Loading products...
            </div>

            <UAlert
                v-else-if="isPreviewError"
                color="error"
                :title="previewError?.message || 'Failed to load preview.'"
            />

            <div v-else-if="syncPreview" class="flex flex-col gap-4">
                <!-- Empty state: no importable products, only a Close button. -->
                <template v-if="!importableWcProducts.length">
                    <UAlert
                        color="neutral"
                        variant="soft"
                        icon="i-lucide-info"
                        description="No new products found."
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
                </template>

                <template v-else>
                    <p class="mb-2 text-sm text-muted">
                        {{ IMPORT_HINT }}
                    </p>

                    <div class="rounded-md border border-default">
                        <div
                            class="flex items-center gap-4 px-3 py-2 border-b border-default bg-elevated/50"
                        >
                            <UCheckbox
                                :model-value="allImportableSelected"
                                :indeterminate="someImportableSelected"
                                @update:model-value="
                                    toggleAll($event as boolean)
                                "
                            />
                            <div
                                class="flex-1 text-xs font-medium uppercase text-muted"
                            >
                                WC product
                            </div>
                            <div
                                class="w-64 text-xs font-medium uppercase text-muted"
                            >
                                POD product
                            </div>
                        </div>

                        <ul
                            class="max-h-96 divide-y divide-default overflow-y-auto"
                        >
                            <li
                                v-for="wc in importableWcProducts"
                                :key="wc.wc_product_id"
                                class="flex items-center gap-4 p-3 cursor-pointer hover:bg-elevated/40"
                                @click="
                                    toggleOne(
                                        wc.wc_product_id,
                                        !selectedForImport.has(
                                            wc.wc_product_id,
                                        ),
                                    )
                                "
                            >
                                <UCheckbox
                                    :model-value="
                                        selectedForImport.has(wc.wc_product_id)
                                    "
                                    @click.stop
                                    @update:model-value="
                                        toggleOne(
                                            wc.wc_product_id,
                                            $event as boolean,
                                        )
                                    "
                                />

                                <div class="min-w-0 flex-1">
                                    <div class="truncate text-sm font-medium">
                                        {{ wc.name }}
                                    </div>
                                    <div
                                        v-if="showProductIds"
                                        class="text-xs text-muted"
                                    >
                                        ID: {{ wc.wc_product_id }}
                                    </div>
                                </div>

                                <div class="w-64" @click.stop>
                                    <div class="flex items-center gap-1">
                                        <USelectMenu
                                        v-model="
                                            selectedMappings[wc.wc_product_id]
                                        "
                                        :items="
                                            podOptionsForRow(wc.wc_product_id)
                                        "
                                        value-key="value"
                                        :disabled="
                                            !selectedForImport.has(
                                                wc.wc_product_id,
                                            )
                                        "
                                        placeholder="Create new (or map…)"
                                        class="flex-1"
                                    >
                                        <template #default="{ modelValue }">
                                            <template v-if="modelValue == null">
                                                <span class="text-dimmed"
                                                    >Create new (or map…)</span
                                                >
                                            </template>
                                            <template v-else>
                                                <!-- single inline parent so name + format share a text baseline
                                                     (as flex children they'd be box-centered instead) -->
                                                <span>
                                                    {{
                                                        podInfoById.get(
                                                            modelValue as number,
                                                        )?.name
                                                    }}<span
                                                        v-if="
                                                            podInfoById.get(
                                                                modelValue as number,
                                                            )?.format
                                                        "
                                                        class="ml-2 text-xs text-muted"
                                                        >{{
                                                            podInfoById.get(
                                                                modelValue as number,
                                                            )?.format
                                                        }}</span
                                                    >
                                                </span>
                                            </template>
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
                                        <template #empty>
                                            No POD products available
                                        </template>
                                    </USelectMenu>
                                    <UButton
                                        v-if="
                                            selectedMappings[
                                                wc.wc_product_id
                                            ] != null
                                        "
                                        color="neutral"
                                        variant="ghost"
                                        size="xs"
                                        icon="i-lucide-x"
                                        aria-label="Clear mapping"
                                        :disabled="
                                            !selectedForImport.has(
                                                wc.wc_product_id,
                                            )
                                        "
                                        @click="clearMapping(wc.wc_product_id)"
                                    />
                                    </div>
                                    <div
                                        v-if="
                                            showProductIds &&
                                            selectedMappings[
                                                wc.wc_product_id
                                            ] != null
                                        "
                                        class="mt-1 text-xs text-muted"
                                    >
                                        ID:
                                        {{ selectedMappings[wc.wc_product_id] }}
                                    </div>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div class="flex items-center justify-between gap-2">
                        <span class="text-sm text-muted">
                            {{ selectedCount }} / {{ importableWcProducts.length }}
                            products selected
                        </span>

                        <div class="flex gap-2">
                            <UButton
                                type="button"
                                color="neutral"
                                variant="ghost"
                                label="Cancel"
                                :disabled="isApplying"
                                @click="open = false"
                            />
                            <UButton
                                type="button"
                                color="primary"
                                label="Import"
                                :loading="isApplying"
                                :disabled="!selectedCount"
                                @click="onConfirm"
                            />
                        </div>
                    </div>
                </template>
            </div>
        </template>
    </UModal>
</template>
