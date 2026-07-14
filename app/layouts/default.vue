<script setup lang="ts">
import { useAuthUser, useNuxtApp, useUiSettings } from "#imports";
import { useQueryClient } from "@tanstack/vue-query";
import { signOut } from "firebase/auth";

import type { NavigationMenuItem } from "@nuxt/ui";

const { $firebaseAuth } = useNuxtApp();
const { user } = useAuthUser();
const { showProductIds, setShowProductIds } = useUiSettings();
const queryClient = useQueryClient();

async function onSignOut() {
    await signOut($firebaseAuth);
    queryClient.clear(); // drop cached data so the next sign-in refetches instead of showing stale results
}

const items: NavigationMenuItem[] = [
    {
        label: "WooCommerce",
        icon: "i-lucide-store",
        active: true,
    },
];
</script>

<template>
    <UDashboardGroup>
        <UDashboardSidebar>
            <template #header>
                <span class="text-lg font-bold text-primary">pod</span>
            </template>

            <UNavigationMenu :items="items" orientation="vertical" />

            <!-- global UI settings -->
            <div class="mt-auto flex items-center justify-between gap-2">
                <span class="text-xs text-muted">show product IDs</span>
                <USwitch
                    :model-value="showProductIds"
                    size="sm"
                    @update:model-value="setShowProductIds"
                />
            </div>

            <USeparator />

            <template #footer>
                <div class="flex items-center gap-2 w-full min-w-0">
                    <span
                        class="text-xs text-muted truncate"
                        :title="user?.email ?? undefined"
                    >
                        {{ user?.email }}
                    </span>
                    <UButton
                        icon="i-lucide-log-out"
                        color="neutral"
                        variant="ghost"
                        size="lg"
                        class="ml-auto shrink-0"
                        title="Sign out"
                        @click="onSignOut"
                    />
                </div>
            </template>
        </UDashboardSidebar>

        <UDashboardPanel>
            <template #header>
                <UDashboardNavbar title="WooCommerce" />
            </template>

            <slot />
        </UDashboardPanel>
    </UDashboardGroup>
</template>
