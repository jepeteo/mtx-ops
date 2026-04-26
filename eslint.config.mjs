import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
});

const config = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [".next/**", "node_modules/**", "test-results/**", "playwright-report/**"],
    rules: {
      // Keep parity with prior lint behavior from `next/core-web-vitals` before strict purity checks.
      "react-hooks/purity": "off",
    },
  },
];

export default config;
