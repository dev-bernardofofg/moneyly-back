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
        // Customizar os imports gerados para usar o caminho do frontend
        query: {
          useQuery: true,
          useInfinite: false,
          useInfiniteQueryParam: "limit",
          options: {
            staleTime: 10000,
          },
        },
      },
    },
    hooks: {
      afterAllFilesWrite: "prettier --write",
    },
  },
});
