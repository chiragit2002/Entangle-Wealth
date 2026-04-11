import { useEffect, useCallback, useRef } from "react";
import { useClerk, useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function AuthErrorHandler() {
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const handlingRef = useRef(false);

  const handleAuthError = useCallback(() => {
    if (handlingRef.current) return;
    handlingRef.current = true;

    toast({
      title: "Session Expired",
      description: "Your session has expired. Please sign in again.",
      variant: "destructive",
    });

    queryClient.clear();

    const returnUrl = encodeURIComponent(location);
    signOut().then(() => {
      setLocation(`/sign-in?redirect_url=${returnUrl}`);
      handlingRef.current = false;
    }).catch(() => {
      setLocation(`/sign-in?redirect_url=${returnUrl}`);
      handlingRef.current = false;
    });
  }, [signOut, setLocation, location, toast, queryClient]);

  useEffect(() => {
    const handleEvent = () => {
      if (isSignedIn) {
        handleAuthError();
      }
    };

    window.addEventListener("auth-error", handleEvent);
    return () => window.removeEventListener("auth-error", handleEvent);
  }, [handleAuthError, isSignedIn]);

  return null;
}
