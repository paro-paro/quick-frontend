<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";

import type {
    ApiResponse,
    UpdatePayload,
    WooCommerceConnection,
    WooCommerceConnectionMutated,
} from "~/types/woocommerce";
import { WC_CONNECTION_URL } from "~/types/woocommerce";

defineProps<{
    connexion: WooCommerceConnection;
}>();

const emit = defineEmits<{
    (e: "requestUpdate"): void;
    (e: "requestDelete"): void;
}>();

const queryClient = useQueryClient();

const { mutate: toggleActive, isPending: isToggling } = useMutation({
    mutationFn: async (payload: UpdatePayload) => {
        const res = await $fetch<ApiResponse<WooCommerceConnectionMutated>>(
            WC_CONNECTION_URL,
            {
                method: "PUT",
                body: payload,
                headers: { "Content-Type": "application/json" },
            },
        );
        return res.data;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["woocommerce-connexion"] });
    },
});

function onToggleActive(is_active: boolean) {
    toggleActive({ is_active });
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <div
            class="flex items-center justify-between gap-4 rounded-md border border-success/50 px-4 py-3"
        >
            <div class="flex items-center gap-2 text-sm">
                <UIcon name="i-lucide-check-circle-2" class="text-success" />
                <span>Connected to: {{ connexion.store_url }}</span>
            </div>

            <USwitch
                :model-value="connexion.is_active ?? true"
                :loading="isToggling"
                @update:model-value="onToggleActive"
            />
        </div>

        <div class="flex justify-end gap-2">
            <UButton
                color="primary"
                variant="soft"
                label="Update"
                icon="i-lucide-pencil"
                @click="emit('requestUpdate')"
            />
            <UButton
                color="error"
                variant="soft"
                label="Delete"
                icon="i-lucide-trash-2"
                @click="emit('requestDelete')"
            />
        </div>
    </div>
</template>
