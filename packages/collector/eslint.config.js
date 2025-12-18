import { config } from "@workspace/eslint-config/base";

export default [
  ...config,
  {
    files: ["**/*.cjs"],
    languageOptions: {
      globals: {
        module: "readonly",
        __dirname: "readonly",
        require: "readonly",
      },
    },
  },
];
