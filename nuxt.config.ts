import { env } from "node:process";

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
      baseUrlApi: env.NUXT_PUBLIC_BASE_URL_API,
      firebase: {
        appId: env.NUXT_PUBLIC_FIREBASE_APP_ID,
        projectId: env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
        authDomain: env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        apiKey: env.NUXT_PUBLIC_FIREBASE_API_KEY,
      },
    },
  },
});
