import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    // The MongoDB data layer replaces a generated Prisma client, so it has to
    // accept and return dynamically shaped values (`where`, `include`,
    // `select` are runtime keys, not compile-time ones). Typing them strictly
    // would mean hand-maintaining a type system for arbitrary query shapes,
    // which buys nothing over the Mongoose schemas that are the real source of
    // truth. These files are intentionally `any`-permissive; application code
    // is not.
    files: [
      "lib/db.ts",
      "lib/db/**/*.ts",
      "lib/types.ts",
      "lib/auth-adapter.ts",
      "models/**/*.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_|^tx$|^fn$", varsIgnorePattern: "^_" },
      ],
    },
  },
];
