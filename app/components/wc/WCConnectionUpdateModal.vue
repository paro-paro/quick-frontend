<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";

import type {
    ApiResponse,
    UpdatePayload,
    WooCommerceConnection,
    WooCommerceConnectionMutated,
} from "~/types/woocommerce";
import { WC_CONNECTION_URL } from "~/types/woocommerce";

const open = defineModel<boolean>("open", { required: true });

const props = defineProps<{
    connexion: WooCommerceConnection | undefined;
}>();

const queryClient = useQueryClient();

const form = reactive({
    store_url: "",
    consumer_key: "",
    consumer_secret: "",
    webhook_secret: "",
});

// Reset fields whenever the modal opens.
watch(open, (isOpen) => {
    if (!isOpen) return;
    form.store_url = props.connexion?.store_url ?? "";
    form.consumer_key = "";
    form.consumer_secret = "";
    form.webhook_secret = "";
});

const {
    mutate: updateConnection,
    isPending: isUpdating,
    isError: updateError,
    error: updateErrorObj,
} = useMutation({
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
        open.value = false;
    },
});

function onSubmit() {
    // Only send fields the user actually filled — don't overwrite secrets with "".
    const payload: UpdatePayload = {};
    if (form.store_url) payload.store_url = form.store_url;
    if (form.consumer_key) payload.consumer_key = form.consumer_key;
    if (form.consumer_secret) payload.consumer_secret = form.consumer_secret;
    if (form.webhook_secret) payload.webhook_secret = form.webhook_secret;

    updateConnection(payload);
}
</script>

<template>
    <UModal v-model:open="open" title="Update WooCommerce connection">
        <template #body>
            <UAlert
                v-if="updateError"
                color="error"
                :title="updateErrorObj?.message || 'Failed to update.'"
                class="mb-4"
            />

            <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
                <UFormField label="Store URL">
                    <UInput
                        v-model="form.store_url"
                        placeholder="https://yourstore.com"
                        class="w-full"
                    />
                </UFormField>

                <UFormField
                    label="Consumer Key"
                    help="Leave blank to keep the current value."
                >
                    <UInput
                        v-model="form.consumer_key"
                        placeholder="ck_..."
                        class="w-full"
                    />
                </UFormField>

                <UFormField
                    label="Consumer Secret"
                    help="Leave blank to keep the current value."
                >
                    <UInput
                        v-model="form.consumer_secret"
                        type="password"
                        placeholder="cs_..."
                        class="w-full"
                    />
                </UFormField>

                <UFormField
                    label="Webhook Secret"
                    help="Leave blank to keep the current value."
                >
                    <UInput
                        v-model="form.webhook_secret"
                        type="password"
                        placeholder="..."
                        class="w-full"
                    />
                </UFormField>

                <div class="flex justify-end gap-2">
                    <UButton
                        type="button"
                        color="neutral"
                        variant="ghost"
                        label="Cancel"
                        @click="open = false"
                    />
                    <UButton
                        type="submit"
                        :loading="isUpdating"
                        label="Save changes"
                    />
                </div>
            </form>
        </template>
    </UModal>
</template>
