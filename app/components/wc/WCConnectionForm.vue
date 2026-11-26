<script setup lang="ts">
import type { ApiResponse, CreatePayload, WooCommerceConnectionMutated } from '~/types/woocommerce'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { reactive, useNuxtApp, useToast } from '#imports'
import { WC_CONNECTION_URL } from '~/types/woocommerce'
import { getApiErrorMessage } from '~/utils/api-errors'
import { MUTATION_KEYS, QUERY_KEYS } from '~/utils/query-keys'

const { $api } = useNuxtApp()
const queryClient = useQueryClient()
const toast = useToast()

// Kept out of the template: vue-tsc 3.3.14 mangles `//` inside template
// attribute values, which breaks type-checking for the rest of the template.
const STORE_URL_PLACEHOLDER = 'https://yourstore.com'

const form = reactive<CreatePayload>({
  store_url: '',
  consumer_key: '',
  consumer_secret: '',
  webhook_secret: '',
})

const { mutate: createConnection, isPending: isCreating } = useMutation({
  mutationKey: MUTATION_KEYS.CONNECTION_CREATE,
  onMutate: async () => {
    await new Promise((resolve) => setTimeout(resolve, 400))
  },
  mutationFn: async (payload: CreatePayload) => {
    const res = await $api<ApiResponse<WooCommerceConnectionMutated>>(WC_CONNECTION_URL, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
    })
    return res.data
  },
  // await the refetch so the submit button keeps spinning until the connected view swaps in
  onSuccess: async () => {
    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.CONNECTION,
    })
    toast.add({
      title: 'Connection created.',
      color: 'success',
      icon: 'i-lucide-check-circle-2',
    })
  },
  onError: (error) => {
    toast.add({
      title: getApiErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-alert-triangle',
    })
  },
})

function onSubmit() {
  // webhook_secret is optional — omit if left blank so the backend uses its None default.
  const payload: CreatePayload = {
    store_url: form.store_url,
    consumer_key: form.consumer_key,
    consumer_secret: form.consumer_secret,
  }
  if (form.webhook_secret) payload.webhook_secret = form.webhook_secret
  createConnection(payload)
}
</script>

<template>
  <div>
    <form
      class="flex flex-col gap-4"
      @submit.prevent="onSubmit"
    >
      <UFormField
        label="Store URL"
        required
      >
        <UInput
          v-model="form.store_url"
          name="store_url"
          :placeholder="STORE_URL_PLACEHOLDER"
          class="w-full"
          required
        />
      </UFormField>

      <UFormField
        label="Consumer Key"
        required
      >
        <UInput
          v-model="form.consumer_key"
          name="consumer_key"
          placeholder="ck_..."
          class="w-full"
          required
        />
      </UFormField>

      <UFormField
        label="Consumer Secret"
        required
      >
        <UInput
          v-model="form.consumer_secret"
          name="consumer_secret"
          type="password"
          placeholder="cs_..."
          class="w-full"
          required
        />
      </UFormField>

      <UFormField label="Webhook Secret">
        <UInput
          v-model="form.webhook_secret"
          name="webhook_secret"
          type="password"
          placeholder="..."
          class="w-full"
        />
      </UFormField>

      <div>
        <UButton
          type="submit"
          :loading="isCreating"
          label="Connect store"
        />
      </div>
    </form>
  </div>
</template>
