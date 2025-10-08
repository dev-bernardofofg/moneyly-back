import { defineConfig } from "@kubb/core";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";

export default defineConfig({
  root: ".",
  input: {
    // Lê a especificação OpenAPI do arquivo JSON
    path: "./openapi.json",
  },
  output: {
    // Schemas TypeScript e Zod gerados aqui
    path: "./src/generated",
    clean: true,
  },
  plugins: [
    pluginOas(),
    pluginTs({
      output: {
        path: "types",
      },
    }),
    pluginZod({
      output: {
        path: "zod",
      },
    }),
  ],
});
