import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor wrap for the Next.js farmer/buyer/lender portals.
 *
 * Dev: point `server.url` at the Next.js dev server (and set DEV_ENV=True on API).
 * Prod: set server.url to the Vercel deployment, or switch to a static export later.
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.agriscan.app",
  appName: "AgriScan",
  webDir: "out",
  server: {
    // Dev only: live-reload against the local Next server. A release build must
    // NOT set CAPACITOR_SERVER_URL, so Capacitor loads the bundled web assets.
    // Cleartext is permitted solely because the dev target is http://localhost.
    ...(serverUrl ? { url: serverUrl, cleartext: serverUrl.startsWith("http://") } : {}),
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
