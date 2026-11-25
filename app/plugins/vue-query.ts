import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin({
  name: 'query',
  setup(nuxtApp) {
    const queryClient = new QueryClient()
    nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })
  },
})
