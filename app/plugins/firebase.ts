import { defineNuxtPlugin, useRuntimeConfig, useState } from "#imports";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";

/**
 * Initializes the Firebase client and provides:
 *  - $firebaseAuth — the Auth instance (sign-in/out, auth state)
 *  - $api — an ofetch instance that attaches `Authorization: Bearer <idToken>`
 *    to every request when a user is signed in. Use it instead of the global
 *    $fetch for all POD backend calls.
 */
export default defineNuxtPlugin({
  name: "firebase",
  setup() {
    const config = useRuntimeConfig();
    const firebaseApp = initializeApp(config.public.firebase);
    const auth = getAuth(firebaseApp);

    // Shared reactive auth state — read via useAuthUser(). `isAuthReady` stays
    // false until Firebase restores (or rules out) a persisted session, so the
    // app can show a loading state instead of flashing the login form.
    const user = useState<User | null>("auth-user", () => null);
    const isAuthReady = useState<boolean>("auth-ready", () => false);

    onAuthStateChanged(auth, (u) => {
      user.value = u;
      isAuthReady.value = true;
    });

    const api = $fetch.create({
      // backend base URL comes from NUXT_PUBLIC_BASE_URL_API (local .env / Vercel env)
      baseURL: config.public.baseUrlApi,
      async onRequest({ options }) {
        // Wait for the persisted session to be restored on first page load,
        // otherwise early requests (e.g. vue-query on mount) would go out
        // unauthenticated even though the user is signed in.
        await auth.authStateReady();
        const user = auth.currentUser;
        if (user) {
          // getIdToken() is cached and auto-refreshes when expired
          options.headers.set(
            "Authorization",
            `Bearer ${await user.getIdToken()}`,
          );
        }
      },
    });

    return {
      provide: {
        firebaseAuth: auth,
        api,
      },
    };
  },
});
