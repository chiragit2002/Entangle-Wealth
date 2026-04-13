import { useEffect } from "react";
import { initUxTracker } from "@/lib/uxTracker";

export function useUxTracker() {
  useEffect(() => {
    initUxTracker();
  }, []);
}
