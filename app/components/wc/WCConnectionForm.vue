<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";

import type {
    ApiResponse,
    CreatePayload,
    WooCommerceConnectionMutated,
} from "~/types/woocommerce";
import { WC_CONNECTION_URL } from "~/types/woocommerce";

const queryClient = useQueryClient();

const form = reactive<CreatePayload>({
    store_url: "",
    consumer_key: "",
    consumer_secret: "",
    webhook_secret: "",
});

const {
    mutate: createConnection,
    isPending: isCreating,
    isSuccess: createSuccess,
    isError: createError,
    error: createErrorObj,
} = useMutation({
    mutationFn: async (payload: CreatePayload) => {
        const res = await $fetch<ApiResponse<WooCommerceConnectionMutated>>(
            WC_CONNECTION_URL,
            {
                method: "POST",
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

function onSubmit() {
    createConnection({ ...form });
}
</script>

<template>
    <div>
        <UAlert
            v-if="createSuccess"
            color="success"
            title="Integration saved successfully."
            class="mb-4"
        />
        <UAlert
            v-if="createError"
            color="error"
            :title="createErrorObj?.message || 'Failed to save integration.'"
            class="mb-4"
        />

        <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
            <UFormField label="Store URL" required>
                <UInput
                    v-model="form.store_url"
                    placeholder="https://yourstore.com"
                    class="w-full"
                    required
                />
            </UFormField>

            <UFormField label="Consumer Key" required>
                <UInput
                    v-model="form.consumer_key"
                    placeholder="ck_..."
                    class="w-full"
                    required
                />
            </UFormField>

            <UFormField label="Consumer Secret" required>
                <UInput
                    v-model="form.consumer_secret"
                    type="password"
                    placeholder="cs_..."
                    class="w-full"
                    required
                />
            </UFormField>

            <UFormField label="Webhook Secret" required>
                <UInput
                    v-model="form.webhook_secret"
                    type="password"
                    class="w-full"
                    required
                />
            </UFormField>

            <div>
                <UButton
                    type="submit"
                    :loading="isCreating"
                    label="Connect WooCommerce store"
                />
            </div>
        </form>
    </div>
</template>
