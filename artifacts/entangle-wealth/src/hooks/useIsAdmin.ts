import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";

export function useIsAdmin(): boolean | null {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const checkAdmin = useCallback(async () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setIsAdmin(false);
      return;
    }
    try {
      const res = await authFetch("/marketing/agents", getToken);
      setIsAdmin(res.ok);
    } catch {
      setIsAdmin(false);
    }
  }, [getToken, isSignedIn, isLoaded]);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  return isAdmin;
}
