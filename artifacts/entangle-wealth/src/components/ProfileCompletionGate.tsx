import { useState, useEffect, useCallback } from "react";
import { useUser, useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { User, MapPin, Loader2, ChevronRight, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";

const BYPASS_PATHS = ["/sign-in", "/sign-up", "/terms", "/privacy", "/about", "/cookies", "/disclaimer", "/dmca", "/accessibility", "/status", "/help"];

interface ProfileGateData {
  firstName: string;
  lastName: string;
  headline: string;
  location: string;
}

function getCompletionPct(data: ProfileGateData): number {
  const fields = [data.firstName, data.lastName, data.headline, data.location];
  const filled = fields.filter(f => f.trim().length > 0).length;
  return Math.round((filled / fields.length) * 100);
}

function isProfileComplete(data: ProfileGateData): boolean {
  return (
    data.firstName.trim().length > 0 &&
    data.lastName.trim().length > 0 &&
    data.headline.trim().length > 0 &&
    data.location.trim().length > 0
  );
}

export function ProfileCompletionGate({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();
  const [showGate, setShowGate] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileGateData>({ firstName: "", lastName: "", headline: "", location: "" });

  const shouldBypass = BYPASS_PATHS.some(p => location.startsWith(p));

  const checkProfile = useCallback(async () => {
    if (!isLoaded || !isSignedIn || shouldBypass) {
      setChecking(false);
      return;
    }

    try {
      const res = await authFetch("/users/me", getToken);
      let profileData: ProfileGateData;

      if (res.ok) {
        const data = await res.json();
        profileData = {
          firstName: data.firstName || user?.firstName || "",
          lastName: data.lastName || user?.lastName || "",
          headline: data.headline || "",
          location: data.location || "",
        };
      } else {
        profileData = {
          firstName: user?.firstName || "",
          lastName: user?.lastName || "",
          headline: "",
          location: "",
        };
      }

      if (!isProfileComplete(profileData)) {
        setForm(profileData);
        setShowGate(true);
      }
    } catch {
      const profileData: ProfileGateData = {
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        headline: "",
        location: "",
      };
      if (!isProfileComplete(profileData)) {
        setForm(profileData);
        setShowGate(true);
      }
    }
    setChecking(false);
  }, [isLoaded, isSignedIn, shouldBypass, getToken, user]);

  useEffect(() => {
    checkProfile();
  }, [checkProfile]);

  const handleSave = async () => {
    if (!isProfileComplete(form)) {
      toast({ title: "All fields required", description: "Please fill in your first name, last name, headline, and location.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await authFetch("/users/sync", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: user?.primaryEmailAddress?.emailAddress,
          photoUrl: user?.imageUrl,
        }),
      });

      await authFetch("/users/me", getToken, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: form.headline.trim(),
          location: form.location.trim(),
        }),
      });

      setShowGate(false);
      toast({ title: "Profile completed!", description: "Welcome to EntangleWealth." });
    } catch {
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (checking && isSignedIn && !shouldBypass) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!showGate) {
    return <>{children}</>;
  }

  const pct = getCompletionPct(form);
  const canSave = isProfileComplete(form);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0f18] p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[#0099cc] flex items-center justify-center">
            <User className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Complete Your Profile</h2>
            <p className="text-xs text-white/50">Required before accessing EntangleWealth</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/40">Profile completion</span>
            <span className="text-xs text-primary font-bold">{pct}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-white/50 mb-1 block">First Name <span className="text-primary">*</span></label>
              <Input
                placeholder="John"
                value={form.firstName}
                onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/50 mb-1 block">Last Name <span className="text-primary">*</span></label>
              <Input
                placeholder="Doe"
                value={form.lastName}
                onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-white/50 mb-1 block">
              <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> Headline <span className="text-primary">*</span></span>
            </label>
            <Input
              placeholder="e.g., Freelance Developer & Investor"
              value={form.headline}
              onChange={e => setForm(p => ({ ...p, headline: e.target.value }))}
              className="bg-white/5 border-white/10"
            />
          </div>
          <div>
            <label className="text-[11px] text-white/50 mb-1 block">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Location <span className="text-primary">*</span></span>
            </label>
            <Input
              placeholder="City, State"
              value={form.location}
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              className="bg-white/5 border-white/10"
            />
          </div>
        </div>

        <Button
          className="w-full mt-6 bg-primary text-black font-bold gap-1"
          onClick={handleSave}
          disabled={saving || !canSave}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save & Continue <ChevronRight className="w-4 h-4" /></>}
        </Button>

        {!canSave && (
          <p className="text-center text-xs text-white/30 mt-2">All fields are required to continue</p>
        )}
      </div>
    </div>
  );
}
