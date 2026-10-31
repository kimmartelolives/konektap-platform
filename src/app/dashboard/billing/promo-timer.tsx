"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function PromoTimer({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState<{ hours: string; minutes: string; seconds: string } | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const targetTime = new Date(endDate).getTime();

    function updateTimer() {
      const now = Date.now();
      const difference = targetTime - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft(null);
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({
        hours: String(hours).padStart(2, "0"),
        minutes: String(minutes).padStart(2, "0"),
        seconds: String(seconds).padStart(2, "0"),
      });
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (isExpired || !timeLeft) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold mb-3">
      <Clock className="w-3.5 h-3.5 animate-pulse" />
      <span>Promo ends in {timeLeft.hours}:{timeLeft.minutes}:{timeLeft.seconds}</span>
    </div>
  );
}