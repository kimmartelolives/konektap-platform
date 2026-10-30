"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";

// Inner component kung saan ligtas na magagamit ang usePathname
function ThemeToggleInner() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();

  // Prevent hydration mismatch by only rendering the icon after the client has mounted
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Itatago ang button kapag nasa public profile (URL na nagsisimula sa "/@")
  if (pathname?.startsWith("/@")) {
    return null;
  }

  if (!mounted) {
    return <div className="w-10 h-10 rounded-xl" />; // Layout placeholder
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="w-10 h-10 rounded-xl bg-slate-200/50 dark:bg-white/5 border border-slate-300/50 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-white/10 transition"
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="w-5 h-5 text-amber-400" />
      ) : (
        <Moon className="w-5 h-5 text-indigo-600" />
      )}
    </button>
  );
}

// Ang main component na ini-export ay ibabalot ang inner logic sa Suspense
export function ThemeToggle() {
  return (
    <React.Suspense fallback={<div className="w-10 h-10 rounded-xl" />}>
      <ThemeToggleInner />
    </React.Suspense>
  );
}