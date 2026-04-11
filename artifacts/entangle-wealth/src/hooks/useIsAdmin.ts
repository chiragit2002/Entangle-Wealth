import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";

export function useIsAdmin() {
  const { getToken, isSignedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdmin = useCallback(async () => {
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
  }, [getToken, isSignedIn]);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  return isAdmin;
}
