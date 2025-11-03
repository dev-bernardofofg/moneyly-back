import { defineConfig } from "orval";

export default defineConfig({
  moneyly: {
    input: {
      target: "./openapi.json",
    },
    output: {
      mode: "tags-split",
      target: "./src/generated/hooks",
      client: "react-query",
      mock: false,
      prettier: true,
      override: {
        mutator: {
          path: "./src/lib/axios-instance.ts",
          name: "customInstance",
        },
      },
    },
  },
});
