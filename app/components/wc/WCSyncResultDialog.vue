<script setup lang="ts">
import type { WooCommerceSyncResultAny } from "~/types/woocommerce";

const open = defineModel<boolean>("open", { required: true });

const props = defineProps<{
    title: string;
    result: WooCommerceSyncResultAny | null;
}>();

// Result shapes:
// - Import apply result: created / mapped / skipped / errors (all string[]; counts = lengths).
// - Update products result: updated / skipped / errors (all string[]; counts = lengths).
// - Sync orders result: created / updated / deleted / skipped (numbers) + errors (string[]).
//
// Each tile shows a count — either the numeric value or the length of a string[].
// Below the tiles, any non-empty string[] field renders its per-row messages.

type ResultRecord = Record<string, number | string[] | undefined>;

function countOf(value: number | string[] | undefined): number | null {
    if (typeof value === "number") return value;
    if (Array.isArray(value)) return value.length;
    return null;
}

function messagesOf(value: number | string[] | undefined): string[] {
    return Array.isArray(value) ? value : [];
}

const tiles = computed(() => {
    const r = props.result as ResultRecord | null;
    if (!r) return [] as { label: string; value: number }[];

    const list: { label: string; value: number }[] = [];
    for (const [key, label] of [
        ["created", "Created"],
        ["mapped", "Mapped"],
        ["updated", "Updated"],
        ["deleted", "Deleted"],
        ["skipped", "Skipped"],
    ] as const) {
        const value = countOf(r[key]);
        if (value !== null) list.push({ label, value });
    }
    return list;
});

const sections = computed(() => {
    const r = props.result as ResultRecord | null;
    if (!r) return [] as { key: string; label: string; messages: string[] }[];

    const defs: { key: string; label: string }[] = [
        { key: "created", label: "Created" },
        { key: "mapped", label: "Mapped" },
        { key: "updated", label: "Updated" },
        { key: "skipped", label: "Skipped" },
    ];
    return defs
        .map((def) => ({ ...def, messages: messagesOf(r[def.key]) }))
        .filter((s) => s.messages.length > 0);
});

const errorMessages = computed<string[]>(() =>
    messagesOf((props.result as ResultRecord | null)?.errors),
);

const gridColsClass = computed(() => {
    switch (tiles.value.length) {
        case 2:
            return "grid-cols-2";
        case 3:
            return "grid-cols-3";
        case 4:
            return "grid-cols-4";
        default:
            return "grid-cols-3";
    }
});
</script>

<template>
    <UModal v-model:open="open" :title="title">
        <template #body>
            <div v-if="result" class="flex flex-col gap-4">
                <div class="grid gap-2" :class="gridColsClass">
                    <div
                        v-for="tile in tiles"
                        :key="tile.label"
                        class="rounded-md border border-default p-3"
                    >
                        <div class="text-xs text-muted">{{ tile.label }}</div>
                        <div class="text-xl font-semibold">{{ tile.value }}</div>
                    </div>
                </div>

                <div v-for="section in sections" :key="section.key">
                    <div class="text-sm font-medium mb-2">
                        {{ section.label }} ({{ section.messages.length }})
                    </div>
                    <ul
                        class="max-h-60 overflow-auto rounded-md border border-default divide-y divide-default text-sm"
                    >
                        <li
                            v-for="(msg, i) in section.messages"
                            :key="i"
                            class="p-2 text-muted"
                        >
                            {{ msg }}
                        </li>
                    </ul>
                </div>

                <div v-if="errorMessages.length">
                    <div class="text-sm font-medium mb-2">
                        Errors ({{ errorMessages.length }})
                    </div>
                    <ul
                        class="max-h-60 overflow-auto rounded-md border border-default divide-y divide-default text-sm"
                    >
                        <li
                            v-for="(err, i) in errorMessages"
                            :key="i"
                            class="p-2 text-error"
                        >
                            {{ err }}
                        </li>
                    </ul>
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
