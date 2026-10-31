"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

function formatTimeLeft(difference: number): string {
  if (difference < DAY) {
    const h = Math.floor(difference / HOUR);
    const m = Math.floor((difference % HOUR) / MINUTE);
    const s = Math.floor((difference % MINUTE) / SECOND);
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  if (difference < WEEK) {
    const d = Math.floor(difference / DAY);
    const h = Math.floor((difference % DAY) / HOUR);
    const m = Math.floor((difference % HOUR) / MINUTE);
    return `${d}d ${h}h ${m}m`;
  }

  if (difference < MONTH) {
    const w = Math.floor(difference / WEEK);
    const d = Math.floor((difference % WEEK) / DAY);
    return d > 0 ? `${w}w ${d}d` : `${w}w`;
  }

  const mo = Math.floor(difference / MONTH);
  const w = Math.floor((difference % MONTH) / WEEK);
  return w > 0 ? `${mo}mo ${w}w` : `${mo}mo`;
}

export function PromoTimer({ endDate }: { endDate: string }) {
  const router = useRouter();
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const targetTime = new Date(endDate).getTime();
    let timeout: ReturnType<typeof setTimeout>;

    function tick() {
      const difference = targetTime - Date.now();

      if (difference <= 0) {
        setLabel(null);
        // Re-fetch server data para bumalik sa original price
        router.refresh();
        return;
      }

      setLabel(formatTimeLeft(difference));

      const delay = difference < DAY ? SECOND : MINUTE;
      timeout = setTimeout(tick, delay);
    }

    tick();
    return () => clearTimeout(timeout);
  }, [endDate, router]);

  if (!label) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold mb-3">
      <Clock className="w-3.5 h-3.5 animate-pulse" />
      <span>Promo ends in {label}</span>
    </div>
  );
}