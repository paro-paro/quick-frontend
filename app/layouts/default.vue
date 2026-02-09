<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();

const items: NavigationMenuItem[] = [
  {
    label: "Account",
    icon: "i-lucide-user",
    to: "/account",
  },
  {
    label: "Products",
    icon: "i-lucide-package",
    to: "/products",
  },
  {
    label: "Orders",
    icon: "i-lucide-shopping-cart",
    to: "/orders",
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
