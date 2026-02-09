<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { h } from "vue";

definePageMeta({
  title: "Products",
});

interface Product {
  id: number;
  ref: string;
  name: string;
  price: number;
  price_tax: number;
  stock: number;
  main_image: string;
}

const queryClient = useQueryClient();

const { data: products, isLoading } = useQuery({
  queryKey: ["products"],
  queryFn: () =>
    $fetch<Product[]>("http://localhost:5000/woocommerce/products/1"),
});

const { mutate: syncProducts, isPending: isSyncing } = useMutation({
  mutationFn: () =>
    $fetch(
      "http://localhost:5000/woocommerce/sync/products",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
          account_id: 1,
        },
      }
    ),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
  },
});

const columns = [
  {
    accessorKey: "main_image",
    header: "Image",
    cell: ({ row }: any) =>
      row.original.main_image
        ? h("img", {
            src: row.original.main_image,
            alt: row.original.name,
            class: "size-10 rounded object-cover",
          })
        : h("span", { class: "text-muted" }, "—"),
  },
  { accessorKey: "ref", header: "Ref" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "price", header: "Price" },
  { accessorKey: "price_tax", header: "Price (Tax)" },
  { accessorKey: "stock", header: "Stock" },
];
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Products</h1>
      <UButton
        label="Sync Products"
        icon="i-lucide-refresh-cw"
        :loading="isSyncing"
        @click="() => syncProducts()"
      />
    </div>

    <div v-if="isLoading" class="flex items-center gap-2 text-muted">
      <UIcon name="i-lucide-loader" class="animate-spin" />
      Loading products...
    </div>

    <UTable
      v-else-if="products?.length"
      :data="products"
      :columns="columns"
    />

    <p v-else class="text-muted">No products found.</p>
  </div>
</template>
