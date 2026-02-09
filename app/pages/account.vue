<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

definePageMeta({
  title: "Account",
});

const queryClient = useQueryClient();

const { data: connexion, isLoading } = useQuery({
  queryKey: ["woocommerce-connexion"],
  queryFn: () =>
    $fetch<{ connected: boolean; store_url?: string }>(
      "http://localhost:5000/woocommerce/connections/1"
    ),
  retry: false,
});

const form = reactive({
  store_url: "",
  consumer_key: "",
  consumer_secret: "",
});

const { mutate, isPending, isSuccess, isError, error } = useMutation({
  mutationFn: async (payload: typeof form) => {
    const res = await $fetch("http://localhost:5000/woocommerce/connections", {
      method: "POST",
      body: {
        account_id: 1,
        ...payload,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["woocommerce-connexion"] });
  },
});

function onSubmit() {
  mutate({ ...form });
}
</script>

<template>
  <div class="p-6 max-w-lg">
    <h1 class="text-2xl font-semibold mb-6">Account</h1>

    <div class="mb-6">
      <h2 class="text-lg font-medium mb-4">WooCommerce Integration</h2>

      <div v-if="isLoading" class="flex items-center gap-2 text-muted">
        <UIcon name="i-lucide-loader" class="animate-spin" />
        Loading...
      </div>

      <div v-else-if="connexion?.connected">
        <UAlert
          color="success"
          :title="`Connected to WooCommerce store: ${connexion.store_url}`"
          class="mb-4"
        />
      </div>

      <div v-else>
        <UAlert
          v-if="isSuccess"
          color="success"
          title="Integration saved successfully."
          class="mb-4"
        />
        <UAlert
          v-if="isError"
          color="error"
          :title="error?.message || 'Failed to save integration.'"
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

          <div>
            <UButton type="submit" :loading="isPending" label="Coonect woocommerce store" />
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
