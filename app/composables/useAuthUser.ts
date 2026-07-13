import { useState } from "#imports";
import type { User } from "firebase/auth";

/** Reactive Firebase auth state, tracked by the firebase plugin. */
export function useAuthUser() {
  const user = useState<User | null>("auth-user", () => null);
  const isAuthReady = useState<boolean>("auth-ready", () => false);
  return { user, isAuthReady };
}
