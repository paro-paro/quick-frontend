// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  modules: ["@nuxt/ui"],
  css: ["~/assets/css/main.css"],
  imports: {
    autoImport: false,
  },
  components: [
    {
      path: "~/components",
      pathPrefix: true,
      extensions: [".vue"],
    },
    {
      path: "~/components/wc",
      pathPrefix: false,
      extensions: [".vue"],
    },
  ],
  devServer: {
    port: 9000,
  },
  runtimeConfig: {
    public: {
      firebase: {
        appId: "",
        projectId: "",
        authDomain: "",
        apiKey: "",
      },
    },
  },
});
