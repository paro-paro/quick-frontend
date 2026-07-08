<script setup lang="ts">
import type { WooCommerceSyncResult } from "~/types/woocommerce";

const open = defineModel<boolean>("open", { required: true });

defineProps<{
    label: "products" | "orders" | null;
    result: WooCommerceSyncResult | null;
}>();
</script>

<template>
    <UModal v-model:open="open" :title="`Sync ${label} result`">
        <template #body>
            <div v-if="result" class="flex flex-col gap-4">
                <div class="grid grid-cols-4 gap-2">
                    <div class="rounded-md border border-default p-3">
                        <div class="text-xs text-muted">Created</div>
                        <div class="text-xl font-semibold">{{ result.created }}</div>
                    </div>
                    <div class="rounded-md border border-default p-3">
                        <div class="text-xs text-muted">Updated</div>
                        <div class="text-xl font-semibold">{{ result.updated }}</div>
                    </div>
                    <div class="rounded-md border border-default p-3">
                        <div class="text-xs text-muted">Deleted</div>
                        <div class="text-xl font-semibold">{{ result.deleted }}</div>
                    </div>
                    <div class="rounded-md border border-default p-3">
                        <div class="text-xs text-muted">Skipped</div>
                        <div class="text-xl font-semibold">{{ result.skipped }}</div>
                    </div>
                </div>

                <div v-if="result.errors.length">
                    <div class="text-sm font-medium mb-2">
                        Errors ({{ result.errors.length }})
                    </div>
                    <ul
                        class="max-h-60 overflow-auto rounded-md border border-default divide-y divide-default text-sm"
                    >
                        <li
                            v-for="(err, i) in result.errors"
                            :key="i"
                            class="p-2 text-error"
                        >
                            {{ err }}
                        </li>
                    </ul>
                </div>
                <div
                    v-else
                    class="flex items-center gap-2 rounded-md border border-success/50 px-4 py-3 text-sm"
                >
                    <UIcon name="i-lucide-check-circle-2" class="text-success" />
                    <span>No errors.</span>
                </div>

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
        </template>
    </UModal>
</template>
