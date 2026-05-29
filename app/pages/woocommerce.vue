<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

interface ApiResponse<T> {
    status: "ok" | "error";
    data: T;
}

interface WooCommerceConnection {
    connected: boolean;
    store_url?: string;
    is_active?: boolean;
}

interface WooCommerceConnectionMutated {
    id: number;
    store_url: string;
}

interface UpdatePayload {
    store_url?: string;
    consumer_key?: string;
    consumer_secret?: string;
    is_active?: boolean;
}

const API_BASE = "http://localhost:5000";
const CONNECTION_URL = `${API_BASE}/woocommerce/connection`;

definePageMeta({
    title: "WooCommerce",
});

const queryClient = useQueryClient();

// --- Fetch ---

const { data: connexion, isLoading } = useQuery({
    queryKey: ["woocommerce-connexion"],
    queryFn: async () => {
        const res = await $fetch<ApiResponse<WooCommerceConnection>>(CONNECTION_URL);
        return res.data;
    },
    retry: false,
});

// --- Create ---

const form = reactive({
    store_url: "",
    consumer_key: "",
    consumer_secret: "",
});

const {
    mutate: createConnection,
    isPending: isCreating,
    isSuccess: createSuccess,
    isError: createError,
    error: createErrorObj,
} = useMutation({
    mutationFn: async (payload: typeof form) => {
        const res = await $fetch<ApiResponse<WooCommerceConnectionMutated>>(CONNECTION_URL, {
            method: "POST",
            body: payload,
            headers: { "Content-Type": "application/json" },
        });
        return res.data;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["woocommerce-connexion"] });
    },
});

function onSubmitCreate() {
    createConnection({ ...form });
}

// --- Update (PUT any subset of fields) ---

const {
    mutate: updateConnection,
    isPending: isUpdating,
    isError: updateError,
    error: updateErrorObj,
} = useMutation({
    mutationFn: async (payload: UpdatePayload) => {
        const res = await $fetch<ApiResponse<WooCommerceConnectionMutated>>(CONNECTION_URL, {
            method: "PUT",
            body: payload,
            headers: { "Content-Type": "application/json" },
        });
        return res.data;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["woocommerce-connexion"] });
    },
});

// --- Update-dialog state ---

const isUpdateOpen = ref(false);
const updateForm = reactive({
    store_url: "",
    consumer_key: "",
    consumer_secret: "",
});

function openUpdateDialog() {
    updateForm.store_url = connexion.value?.store_url ?? "";
    updateForm.consumer_key = "";
    updateForm.consumer_secret = "";
    isUpdateOpen.value = true;
}

function onSubmitUpdate() {
    // Only include fields the user actually filled in (don't overwrite secrets with empty strings)
    const payload: UpdatePayload = {};
    if (updateForm.store_url) payload.store_url = updateForm.store_url;
    if (updateForm.consumer_key) payload.consumer_key = updateForm.consumer_key;
    if (updateForm.consumer_secret) payload.consumer_secret = updateForm.consumer_secret;

    updateConnection(payload, {
        onSuccess: () => {
            isUpdateOpen.value = false;
        },
    });
}

// --- Toggle active / inactive (PUT is_active only) ---

const { isPending: isToggling } = { isPending: computed(() => isUpdating.value) };

function onToggleActive(is_active: boolean) {
    updateConnection({ is_active });
}

// --- Sync products ---

const { mutate: syncProducts, isPending: isSyncing } = useMutation({
    mutationFn: () =>
        $fetch(`${API_BASE}/woocommerce/sync/products`, { method: "POST" }),
});

// --- Delete ---

const isDeleteConfirmOpen = ref(false);

const { mutate: deleteConnection, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
        await $fetch(CONNECTION_URL, { method: "DELETE" });
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["woocommerce-connexion"] });
        isDeleteConfirmOpen.value = false;
    },
});
</script>

<template>
    <div class="p-6 max-w-lg">
        <h1 class="text-2xl font-semibold mb-6">WooCommerce</h1>

        <div class="mb-6">
            <h2 class="text-lg font-medium mb-4">Integration</h2>

            <div v-if="isLoading" class="flex items-center gap-2 text-muted">
                <UIcon name="i-lucide-loader" class="animate-spin" />
                Loading...
            </div>

            <!-- Connected: details + toggle + update + delete -->
            <div v-else-if="connexion?.connected" class="flex flex-col gap-4">
                <UAlert
                    color="success"
                    :title="`Connected to: ${connexion.store_url}`"
                />

                <UFormField label="Active">
                    <USwitch
                        :model-value="connexion.is_active ?? true"
                        :loading="isToggling"
                        @update:model-value="onToggleActive"
                    />
                </UFormField>

                <div class="flex gap-2">
                    <UButton
                        color="primary"
                        label="Sync products"
                        icon="i-lucide-refresh-cw"
                        :loading="isSyncing"
                        @click="syncProducts()"
                    />

                    <UButton
                        color="primary"
                        variant="soft"
                        label="Update"
                        icon="i-lucide-pencil"
                        @click="openUpdateDialog"
                    />

                    <UButton
                        color="error"
                        variant="soft"
                        label="Delete"
                        icon="i-lucide-trash-2"
                        @click="isDeleteConfirmOpen = true"
                    />
                </div>
            </div>

            <!-- Not connected: create form -->
            <div v-else>
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

                <form class="flex flex-col gap-4" @submit.prevent="onSubmitCreate">
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
                        <UButton
                            type="submit"
                            :loading="isCreating"
                            label="Connect WooCommerce store"
                        />
                    </div>
                </form>
            </div>
        </div>

        <!-- Delete confirmation dialog -->
        <UModal v-model:open="isDeleteConfirmOpen" title="Delete WooCommerce connection">
            <template #body>
                <p class="mb-4">
                    Are you sure you want to delete this connection? This will stop all
                    WooCommerce syncs for this account.
                </p>

                <div class="flex justify-end gap-2">
                    <UButton
                        type="button"
                        color="neutral"
                        variant="ghost"
                        label="Cancel"
                        @click="isDeleteConfirmOpen = false"
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

        <!-- Update dialog -->
        <UModal v-model:open="isUpdateOpen" title="Update WooCommerce connection">
            <template #body>
                <UAlert
                    v-if="updateError"
                    color="error"
                    :title="updateErrorObj?.message || 'Failed to update.'"
                    class="mb-4"
                />

                <form class="flex flex-col gap-4" @submit.prevent="onSubmitUpdate">
                    <UFormField label="Store URL">
                        <UInput
                            v-model="updateForm.store_url"
                            placeholder="https://yourstore.com"
                            class="w-full"
                        />
                    </UFormField>

                    <UFormField
                        label="Consumer Key"
                        help="Leave blank to keep the current value."
                    >
                        <UInput
                            v-model="updateForm.consumer_key"
                            placeholder="ck_..."
                            class="w-full"
                        />
                    </UFormField>

                    <UFormField
                        label="Consumer Secret"
                        help="Leave blank to keep the current value."
                    >
                        <UInput
                            v-model="updateForm.consumer_secret"
                            type="password"
                            placeholder="cs_..."
                            class="w-full"
                        />
                    </UFormField>

                    <div class="flex justify-end gap-2">
                        <UButton
                            type="button"
                            color="neutral"
                            variant="ghost"
                            label="Cancel"
                            @click="isUpdateOpen = false"
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
    </div>
</template>
