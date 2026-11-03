"use client";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

function Providers({ children }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Register the minimal SW that clears workbox caches from next-pwa
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}

export default Providers;
