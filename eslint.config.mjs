import js from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          legacyDecorators: true,
        },
      },
      globals: {
        ...globals.es6,
        ...globals.node,
      },
    },
  },
  {
    ignores: ["dist/*"],
  },
);
