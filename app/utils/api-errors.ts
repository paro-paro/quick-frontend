import { FetchError } from "ofetch";

// The backend deliberately returns only `{ status: "error", error: "<ClassName>" }`,
// so map those codes to human copy instead of showing ofetch's raw
// `[PUT] "http://…": 502 BAD GATEWAY` message.
const API_ERROR_MESSAGES: Record<string, string> = {
    ValidationError: "Some fields are invalid. Review the form and try again.",
    AuthenticationError: "Your session has expired — sign in again.",
    AuthorizationError: "You don't have permission to do that.",
    NotFoundError: "The requested resource was not found.",
    ConflictError: "This conflicts with something that already exists.",
    ExternalServiceError:
        "Could not reach the WooCommerce store. Check the store URL and credentials.",
};

export function getApiErrorMessage(
    error: unknown,
    fallback = "Something went wrong. Try again.",
): string {
    if (error instanceof FetchError) {
        const code = (error.data as { error?: string } | undefined)?.error;
        if (code && API_ERROR_MESSAGES[code]) return API_ERROR_MESSAGES[code];
    }
    return fallback;
}
