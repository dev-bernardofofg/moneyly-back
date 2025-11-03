import { defineConfig, devices } from "@playwright/test";

/**
 * Configuração do Playwright para testes E2E
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./__tests__/e2e",

  // Executar testes em paralelo
  fullyParallel: true,

  // Falhar build em CI se houver testes sem .only
  forbidOnly: !!process.env.CI,

  // Número de tentativas em CI
  retries: process.env.CI ? 2 : 0,

  // Número de workers
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: process.env.CI ? "github" : "html",

  // Configurações compartilhadas para todos os projetos
  use: {
    // URL base para usar em navegação
    baseURL: process.env.API_URL || "http://localhost:5000",

    // Coletar trace em caso de falha
    trace: "on-first-retry",

    // Screenshot em caso de falha
    screenshot: "only-on-failure",

    // Video em caso de falha
    video: "retain-on-failure",

    // Headers padrão
    extraHTTPHeaders: {
      "Content-Type": "application/json",
    },
  },

  // Configurar projetos para diferentes browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    // Descomente para testar em outros browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Servidor de desenvolvimento (opcional - para APIs)
  // webServer: {
  //   command: 'pnpm dev',
  //   url: 'http://localhost:5000',
  //   reuseExistingServer: !process.env.CI,
  // },
});


