"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createCheckoutSession } from "./actions";

interface UpgradeButtonProps {
  tier: "standard" | "premium";
  label: string;
  isPopular?: boolean;
}

export function UpgradeButton({ tier, label, isPopular }: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const result = await createCheckoutSession(tier);
      if (result?.error) {
        alert(result.error);
        setIsLoading(false);
      } else if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (error) {
      alert("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleUpgrade}
      disabled={isLoading}
      className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed shadow-sm ${
        isPopular
          ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 active:scale-[0.99]"
          : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 active:scale-[0.99]"
      }`}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {isLoading ? "Loading..." : label}
    </button>
  );
}