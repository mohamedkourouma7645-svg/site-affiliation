import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: {
      ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
      // Software WebGL so the 3D configurator also renders on CI machines without a GPU.
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  // The server reads the catalogue from a JSON dump of the real schema + demo data
  // (supabase/tests/dump-fixture.sh), so the full ordering flow is tested without a hosted DB.
  webServer: {
    command: `pnpm start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { CATALOG_FIXTURE: path.resolve(import.meta.dirname, "e2e/fixtures/catalog.json"), ALLOW_CATALOG_FIXTURE: "1" },
  },
});
