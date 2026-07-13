<script setup lang="ts">
import { useNuxtApp, useToast } from "#imports";
import { useMutation, useQueryClient } from "@tanstack/vue-query";

import type {
    ApiResponse,
    UpdatePayload,
    WooCommerceConnection,
    WooCommerceConnectionMutated,
} from "~/types/woocommerce";
import { WC_CONNECTION_URL } from "~/types/woocommerce";
import { getApiErrorMessage } from "~/utils/api-errors";

defineProps<{
    connexion: WooCommerceConnection;
}>();

const emit = defineEmits<{
    (e: "requestUpdate"): void;
    (e: "requestDelete"): void;
}>();

const { $api } = useNuxtApp();
const queryClient = useQueryClient();
const toast = useToast();

const { mutate: toggleActive, isPending: isToggling } = useMutation({
    mutationFn: async (payload: UpdatePayload) => {
        const res = await $api<ApiResponse<WooCommerceConnectionMutated>>(
            WC_CONNECTION_URL,
            {
                method: "PUT",
                body: payload,
                headers: { "Content-Type": "application/json" },
            },
        );
        return res.data;
    },
    onSuccess: (_, payload) => {
        queryClient.invalidateQueries({ queryKey: ["woocommerce-connexion"] });
        toast.add({
            title: payload.is_active ? "Connection activated." : "Connection deactivated.",
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
                <UIcon name="i-lucide-check-circle-2" class="size-4 text-success" />
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
                :disabled="!connexion.is_active"
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
