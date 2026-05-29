<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();

const items: NavigationMenuItem[] = [
  {
    label: "WooCommerce",
    icon: "i-lucide-store",
    to: "/woocommerce",
  },
];
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar>
      <template #header>
        <span class="text-lg font-bold text-primary">Pod</span>
      </template>

      <UNavigationMenu
        :items="items"
        orientation="vertical"
      />
    </UDashboardSidebar>

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar :title="String(route.meta.title || route.name)" />
      </template>

      <slot />
    </UDashboardPanel>
  </UDashboardGroup>
</template>
