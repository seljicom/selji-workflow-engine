export default [
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["dist/**"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      "react-refresh": require("eslint-plugin-react-refresh"),
      "react-hooks": require("eslint-plugin-react-hooks")
    },
    rules: {
      "react-refresh/only-export-components": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn"
    }
  }
];