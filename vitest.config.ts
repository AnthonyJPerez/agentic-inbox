import { defineConfig } from "vitest/config";

// A separate config so vitest does not load vite.config.ts, whose Cloudflare
// and React Router plugins are for the app build, not for unit tests.
export default defineConfig({
	test: {
		include: ["workers/**/*.test.ts"],
		environment: "node",
	},
});
