import { defineAppConfig } from "#imports";

// Global Nuxt UI theme overrides — component slot classes here apply app-wide.
export default defineAppConfig({
    ui: {
        alert: {
            slots: {
                icon: "shrink-0 size-4",
            },
        },
        tabs: {
            variants: {
                size: {
                    md: {
                        leadingIcon: "size-4",
                    },
                },
            },
        },
        button: {
            variants: {
                size: {
                    md: {
                        leadingIcon: "size-4",
                        trailingIcon: "size-4",
                    },
                },
            },
        },
    },
});
