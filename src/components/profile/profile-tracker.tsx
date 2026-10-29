"use client";

import { useEffect } from "react";
import { trackProfileView } from "@/app/[username]/actions";

export function ProfileTracker({ username }: { username: string }) {
  useEffect(() => {
    // I-check kung nabisita na niya ito sa kasalukuyang session
    const visited = sessionStorage.getItem(`visited_${username}`);
    
    if (!visited) {
      // Kung first time i-open, i-record ang view sa database
      trackProfileView(username);
      // Markahan na nabisita na para hindi mag-count sa refresh
      sessionStorage.setItem(`visited_${username}`, 'true');
    }
  }, [username]);

  return null; // Wala itong UI, invisible tracking lang
}