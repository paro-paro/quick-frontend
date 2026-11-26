export const QUERY_KEYS = {
  CONNECTION: ['woocommerce', 'connection'],
  IMPORTS_PREVIEW: ['woocommerce', 'products', 'imports', 'preview'],
  UPDATE_STORE_PREVIEW: ['woocommerce', 'update', 'store', 'preview'],
  ORDERS_SYNC_PREVIEW: ['woocommerce', 'orders', 'sync', 'preview'],
} as const

export const MUTATION_KEYS = {
  AUTH_LOGIN: ['auth', 'login'],
  CONNECTION_CREATE: ['woocommerce', 'connection', 'create'],
  CONNECTION_UPDATE: ['woocommerce', 'connection', 'update'],
  CONNECTION_TOGGLE_ACTIVE: ['woocommerce', 'connection', 'toggle-active'],
  CONNECTION_DELETE: ['woocommerce', 'connection', 'delete'],
  IMPORT_PRODUCTS: ['woocommerce', 'products', 'import'],
  UPDATE_STORE: ['woocommerce', 'update', 'store'],
  SYNC_ORDERS: ['woocommerce', 'orders', 'sync'],
} as const
