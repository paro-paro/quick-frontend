// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  devServer: {
    port: 9000,
  },
  modules: ["@nuxt/ui"],
  css: ["~/assets/css/main.css"],
});
