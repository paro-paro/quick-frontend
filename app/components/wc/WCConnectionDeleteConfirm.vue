<script setup lang="ts">
import { useNuxtApp, useToast } from "#imports";
import { useMutation, useQueryClient } from "@tanstack/vue-query";

import { WC_CONNECTION_URL } from "~/types/woocommerce";
import { getApiErrorMessage } from "~/utils/api-errors";

const open = defineModel<boolean>("open", { required: true });

const { $api } = useNuxtApp();
const queryClient = useQueryClient();
const toast = useToast();

const { mutate: deleteConnection, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
        await $api(WC_CONNECTION_URL, { method: "DELETE" });
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["woocommerce-connexion"] });
        open.value = false;
        toast.add({
            title: "Store deleted.",
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
</script>

<template>
    <UModal v-model:open="open" title="Delete WooCommerce connection">
        <template #body>
            <p class="mb-4 text-sm text-muted">
                Are you sure you want to delete this connection? This will stop all
                WooCommerce syncs for this account.
            </p>

            <div class="flex justify-end gap-2">
                <UButton
                    type="button"
                    color="neutral"
                    variant="ghost"
                    label="Cancel"
                    @click="open = false"
                />
                <UButton
                    color="error"
                    :loading="isDeleting"
                    label="Delete"
                    icon="i-lucide-trash-2"
                    @click="deleteConnection()"
                />
            </div>
        </template>
    </UModal>
</template>
