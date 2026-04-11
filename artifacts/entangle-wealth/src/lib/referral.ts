const REFERRAL_KEY = "ew_referral_code";

export function captureReferralCode(): void {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref && ref.startsWith("EW-")) {
    sessionStorage.setItem(REFERRAL_KEY, ref);
  }
}

export function getStoredReferralCode(): string | null {
  return sessionStorage.getItem(REFERRAL_KEY);
}

export function clearStoredReferralCode(): void {
  sessionStorage.removeItem(REFERRAL_KEY);
}
