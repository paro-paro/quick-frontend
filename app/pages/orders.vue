<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { h } from "vue";

definePageMeta({
  title: "Orders",
});

interface OrderLineItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number | null;
  total: number | null;
}

interface Order {
  id: number;
  ref: string | null;
  wc_order_id: number | null;
  wc_status: string | null;
  contact_name: string | null;
  amount: number | null;
  amount_taxed: number | null;
  comment: string | null;
  date: string | null;
  line_items: OrderLineItem[];
}

const queryClient = useQueryClient();

const { data: orders, isLoading } = useQuery({
  queryKey: ["orders"],
  queryFn: () =>
    $fetch<Order[]>("http://localhost:5000/woocommerce/orders/1"),
});

const { mutate: syncOrders, isPending: isSyncing } = useMutation({
  mutationFn: () =>
    $fetch("http://localhost:5000/woocommerce/sync/orders", {
      method: "POST",
      body: { account_id: 1 },
      headers: { "Content-Type": "application/json" },
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  },
});

const expandedRows = ref<Set<number>>(new Set());

function toggleRow(id: number) {
  const next = new Set(expandedRows.value);
  next.has(id) ? next.delete(id) : next.add(id);
  expandedRows.value = next;
}

const columns = [
  {
    accessorKey: "expand",
    header: "",
    cell: ({ row }: any) =>
      h("button", {
        class: "text-muted hover:text-foreground",
        onClick: () => toggleRow(row.original.id),
      }, expandedRows.value.has(row.original.id) ? "▾" : "▸"),
  },
  { accessorKey: "ref", header: "Ref" },
  { accessorKey: "wc_order_id", header: "WC Order ID" },
  { accessorKey: "wc_status", header: "Status" },
  { accessorKey: "contact_name", header: "Contact" },
  { accessorKey: "amount", header: "Amount" },
  { accessorKey: "amount_taxed", header: "Amount (Tax)" },
  { accessorKey: "date", header: "Date" },
  { accessorKey: "comment", header: "Comment" },
  {
    accessorKey: "line_items",
    header: "Items",
    cell: ({ row }: any) =>
      h("span", `${row.original.line_items?.length ?? 0} item(s)`),
  },
];
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Orders</h1>
      <UButton
        label="Sync Orders"
        icon="i-lucide-refresh-cw"
        :loading="isSyncing"
        @click="() => syncOrders()"
      />
    </div>

    <div v-if="isLoading" class="flex items-center gap-2 text-muted">
      <UIcon name="i-lucide-loader" class="animate-spin" />
      Loading orders...
    </div>

    <template v-else-if="orders?.length">
      <UTable :data="orders" :columns="columns" />

      <template v-for="order in orders" :key="order.id">
        <div
          v-if="expandedRows.has(order.id) && order.line_items.length"
          class="border border-default rounded-md p-4 mt-2 mb-4 ml-8"
        >
          <p class="text-sm font-medium mb-2">Line items for order {{ order.ref }}</p>
          <UTable
            :data="order.line_items"
            :columns="[
              { accessorKey: 'product_name', header: 'Product' },
              { accessorKey: 'quantity', header: 'Qty' },
              { accessorKey: 'price', header: 'Price' },
              { accessorKey: 'total', header: 'Total' },
            ]"
          />
        </div>
      </template>
    </template>

    <p v-else class="text-muted">No orders found.</p>
  </div>
</template>
