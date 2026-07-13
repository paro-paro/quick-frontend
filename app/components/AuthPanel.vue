<script setup lang="ts">
import { reactive, useNuxtApp } from "#imports";
import { useMutation } from "@tanstack/vue-query";
import { signInWithEmailAndPassword } from "firebase/auth";

const { $firebaseAuth } = useNuxtApp();

interface LoginPayload {
    email: string;
    password: string;
}

const form = reactive<LoginPayload>({
    email: "",
    password: "",
});

const { mutate, isPending, isError, error } = useMutation({
    mutationFn: async (payload: LoginPayload) => {
        await signInWithEmailAndPassword(
            $firebaseAuth,
            payload.email,
            payload.password,
        );
    },
});

function onSubmit() {
    mutate({ email: form.email, password: form.password });
}
</script>

<template>
    <div>
        <UAlert
            v-if="isError"
            color="error"
            :title="error?.message || 'Failed to sign in.'"
            class="mb-4"
        />

        <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
            <UFormField label="Email" required>
                <UInput
                    v-model="form.email"
                    type="email"
                    placeholder="you@example.com"
                    icon="i-lucide-mail"
                    class="w-full"
                    required
                />
            </UFormField>

            <UFormField label="Password" required>
                <UInput
                    v-model="form.password"
                    type="password"
                    placeholder="..."
                    icon="i-lucide-key-round"
                    class="w-full"
                    required
                />
            </UFormField>

            <UButton
                type="submit"
                block
                icon="i-lucide-log-in"
                :loading="isPending"
                label="Sign in"
            />
        </form>
    </div>
</template>
