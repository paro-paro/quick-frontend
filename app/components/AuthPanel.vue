<script setup lang="ts">
import { reactive, useNuxtApp, useToast } from "#imports";
import { useMutation } from "@tanstack/vue-query";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";

const { $firebaseAuth } = useNuxtApp();
const toast = useToast();

// Map firebase auth error codes to human copy — the raw messages leak
// implementation noise like `Firebase: Error (auth/invalid-credential).`
const AUTH_ERROR_MESSAGES: Record<string, string> = {
    "auth/too-many-requests": "Too many attempts. Try again later.",
};

function getAuthErrorMessage(error: unknown): string {
    if (error instanceof FirebaseError && AUTH_ERROR_MESSAGES[error.code]) {
        return AUTH_ERROR_MESSAGES[error.code];
    }
    return "Invalid credentials.";
}

interface LoginPayload {
    email: string;
    password: string;
}

const form = reactive<LoginPayload>({
    email: "",
    password: "",
});

const { mutate, isPending } = useMutation({
    mutationFn: async (payload: LoginPayload) => {
        await signInWithEmailAndPassword(
            $firebaseAuth,
            payload.email,
            payload.password,
        );
    },
    onError: (error) => {
        toast.add({
            title: getAuthErrorMessage(error),
            color: "error",
            icon: "i-lucide-alert-triangle",
        });
    },
});

function onSubmit() {
    mutate({ email: form.email, password: form.password });
}
</script>

<template>
    <div>
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
