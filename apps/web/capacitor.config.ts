import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor wrap for the Next.js farmer/buyer/lender portals.
 *
 * Dev: point `server.url` at the Next.js dev server (and set DEV_ENV=True on API).
 * Prod: set server.url to the Vercel deployment, or switch to a static export later.
 */
const config: CapacitorConfig = {
  appId: "com.agriscan.app",
  appName: "AgriScan",
  webDir: "out",
  server: {
    // Live-reload against local Next during development.
    // Comment out `url` for production builds that load bundled `out/`.
    url: process.env.CAPACITOR_SERVER_URL || "http://localhost:3000",
    cleartext: true,
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#0f3d24",
    },
  },
};

export default config;
