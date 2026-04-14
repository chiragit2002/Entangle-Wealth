import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { useUser, useAuth, useClerk } from "@clerk/react";
import { User, MapPin, Mail, Phone, Edit2, Save, Shield, ShieldCheck, ShieldAlert, Loader2, FileText, Briefcase, Award, ExternalLink, TrendingUp, Zap, DollarSign, AlertTriangle, Eye, EyeOff, Bell, Globe, Trophy, Flame, Star, Target, Wallet, Coins, Users, Fingerprint, Upload, X, Image, Building2, MessageSquare, CheckCircle, Clock } from "lucide-react";
import { OccupationDropdown } from "@/components/OccupationDropdown";
import { getOccupationById } from "@workspace/occupations";
import { ReferralSection } from "@/components/viral/ReferralSection";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/authFetch";
import { getStoredReferralCode, clearStoredReferralCode } from "@/lib/referral";
import { IdentityLabel } from "@/components/IdentityLabel";

interface PasskeyResource {
  id: string;
  name?: string | null;
  createdAt: Date;
}

type ClerkUserWithPasskeys = ReturnType<typeof useUser>["user"] & {
  passkeys: PasskeyResource[];
  createPasskey: () => Promise<PasskeyResource>;
};

interface GamificationData {
  xp: { totalXp: number; level: number; tier: string; monthlyXp: number; weeklyXp: number };
  streak: { currentStreak: number; longestStreak: number; multiplier: number };
  badges: { badge: { id: number; name: string; icon: string; description: string }; earnedAt: string }[];
  levelProgress: number;
  xpToNextLevel: number;
}

interface ProfileData {
  headline: string;
  occupationId: string;
  bio: string;
  phone: string;
  location: string;
  isPublicProfile: boolean;
  kycStatus: string;
  subscriptionTier: string;
  isBusinessOwner?: boolean;
  businessDocStatus?: string;
  businessDocRejectionReason?: string | null;
}

interface SavedJob {
  id: number;
  jobTitle: string;
  company: string;
  location: string;
  salary: string;
  savedAt: string;
}

interface ResumePreview {
  id: number;
  title: string;
  summary: string;
  skills: string[];
  experiences: { company: string; title: string; isGigWork: string }[];
}

interface FeedbackItem {
  id: number;
  rating: number;
  comment?: string;
  category: string;
  admin_response?: string;
  created_at: string;
}

function MyFeedback() {
  const { getToken } = useAuth();
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    authFetch("/feedback/mine", getToken)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setFeedbackList(data.feedback || []);
          setTotal(data.total || 0);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [getToken]);

  if (loading) return null;

  return (
    <div className="glass-panel p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-[#FF8C00]" /> My Feedback
        {feedbackList.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{total} submission{total !== 1 ? "s" : ""}</span>
        )}
      </h3>
      {feedbackList.length === 0 && (
        <div className="text-center py-6 text-white/30 text-sm">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>You haven&apos;t submitted any feedback yet.</p>
          <p className="text-xs mt-1 opacity-70">Use the feedback button to share your thoughts!</p>
        </div>
      )}
      <div className="space-y-3">
        {feedbackList.map((fb) => (
          <div
            key={fb.id}
            className="rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-3.5 h-3.5 ${s <= fb.rating ? "text-[#FFB800] fill-[#FFB800]" : "text-white/40"}`} />
                  ))}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full capitalize text-white/50" style={{ background: "rgba(255,255,255,0.05)" }}>
                  {fb.category}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                {fb.admin_response ? (
                  <><CheckCircle className="w-3 h-3 text-[#FF8C00]" /><span className="text-[#FF8C00]">Responded</span></>
                ) : (
                  <><Clock className="w-3 h-3" /><span>Pending</span></>
                )}
              </div>
            </div>
            {fb.comment && (
              <p className="text-sm text-white/60 mb-2">{fb.comment}</p>
            )}
            {fb.admin_response && (
              <div
                className="rounded-lg p-3 text-sm text-[#FF8C00]"
                style={{ background: "rgba(255,140,0,0.05)", borderLeft: "3px solid rgba(255,140,0,0.3)" }}
              >
                <p className="text-[10px] text-[#FF8C00]/60 uppercase tracking-wider mb-1">Team Response</p>
                {fb.admin_response}
              </div>
            )}
            <p className="text-[10px] text-white/25 mt-2">
              {new Date(fb.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataManagementSection() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { signOut } = useClerk();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await authFetch("/users/me/export", getToken);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `entanglewealth-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export Complete", description: "Your data has been downloaded." });
    } catch (err) {
      console.error("Export error:", err);
      toast({ title: "Export Failed", description: "Could not export your data. Please try again.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== "DELETE MY ACCOUNT") return;
    setDeleting(true);
    try {
      const res = await authFetch("/users/me", getToken, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE MY ACCOUNT" }),
      });
      if (!res.ok) throw new Error("Deletion failed");
      toast({ title: "Account Deleted", description: "Your account has been permanently deleted." });
      setTimeout(() => signOut(), 1500);
    } catch (err) {
      console.error("Account deletion error:", err);
      toast({ title: "Deletion Failed", description: "Could not delete your account. Please try again.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="glass-panel p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" /> Data & Account
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">Export Your Data</p>
            <p className="text-xs text-muted-foreground">Download all your profile, trades, alerts, and gamification data</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
            className="border-white/10 hover:bg-white/5"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FileText className="w-4 h-4 mr-1" />}
            {exporting ? "Exporting..." : "Export"}
          </Button>
        </div>

        <div className="border-t border-white/5 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-400">Delete Account</p>
              <p className="text-xs text-muted-foreground">Permanently delete your account and all associated data</p>
            </div>
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <AlertTriangle className="w-4 h-4 mr-1" /> Delete
              </Button>
            ) : null}
          </div>
          {showDeleteConfirm && (
            <div className="mt-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
              <p className="text-xs text-red-300 mb-3">This action is permanent and cannot be undone. Type <span className="font-mono font-bold">DELETE MY ACCOUNT</span> to confirm.</p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE MY ACCOUNT"
                className="mb-3 bg-black/30 border-red-500/30 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowDeleteConfirm(false); setConfirmText(""); }}
                  className="border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={confirmText !== "DELETE MY ACCOUNT" || deleting}
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {deleting ? "Deleting..." : "Permanently Delete"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertDigestSettings() {
  const { getToken } = useAuth();
  const [freq, setFreq] = useState("off");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    authFetch("/alerts/digest-preference", getToken)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setFreq(data.digestFrequency || "off");
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [getToken]);

  const update = (val: string) => {
    setFreq(val);
    authFetch("/alerts/digest-preference", getToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frequency: val }),
    }).catch((err: unknown) => console.error("Failed to update digest preference:", err));
  };

  if (!loaded) return null;

  return (
    <div className="glass-panel p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" /> Alert Digest
      </h3>
      <p className="text-xs text-muted-foreground mb-3">Receive a summary of triggered alerts via email</p>
      <div className="flex gap-2">
        {[
          { value: "off", label: "Off" },
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => update(opt.value)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${freq === opt.value ? "bg-primary/15 text-primary border border-primary/30" : "bg-white/[0.03] text-muted-foreground border border-white/[0.06] hover:text-white/50"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {freq !== "off" && (
        <p className="text-[10px] text-green-400/60 mt-2">
          {freq === "daily" ? "Daily digest at 8:00 AM UTC" : "Weekly digest every Monday at 8:00 AM UTC"}
        </p>
      )}
    </div>
  );
}

export default function Profile() {
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData>({
    headline: "", occupationId: "", bio: "", phone: "", location: "",
    isPublicProfile: true, kycStatus: "not_started", subscriptionTier: "free",
  });
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [resume, setResume] = useState<ResumePreview | null>(null);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [tokenData, setTokenData] = useState<{ balance: number; walletAddress: string | null; tokenValue: number; totalValue: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kycForm, setKycForm] = useState({ fullLegalName: "", dateOfBirth: "", address: "", idType: "drivers_license", idNumber: "" });
  const [showKyc, setShowKyc] = useState(false);
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [isAmbassador, setIsAmbassador] = useState(false);
  const [kycIdPhoto, setKycIdPhoto] = useState<File | null>(null);
  const [kycSelfie, setKycSelfie] = useState<File | null>(null);
  const [kycIdPhotoPreview, setKycIdPhotoPreview] = useState<string | null>(null);
  const [kycSelfiePreview, setKycSelfiePreview] = useState<string | null>(null);
  const [uploadingKycDocs, setUploadingKycDocs] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ idPhoto: number; selfie: number }>({ idPhoto: 0, selfie: 0 });
  const [dragActive, setDragActive] = useState<"id" | "selfie" | null>(null);
  const [passkeyRegistering, setPasskeyRegistering] = useState(false);
  const [showBusinessDocUpload, setShowBusinessDocUpload] = useState(false);
  const [businessDocFiles, setBusinessDocFiles] = useState<File[]>([]);
  const [businessDocPreviews, setBusinessDocPreviews] = useState<string[]>([]);
  const [submittingBusinessDocs, setSubmittingBusinessDocs] = useState(false);
  const [businessDocDragActive, setBusinessDocDragActive] = useState(false);
  const businessDocInputRef = useRef<HTMLInputElement>(null);
  const idPhotoRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const { client: clerkClient } = useClerk();

  const fetchAuth = useCallback((path: string, options: RequestInit = {}) => {
    return authFetch(path, getToken, options);
  }, [getToken]);

  useEffect(() => {
    if (!userLoaded) return;
    loadProfile();
    loadSavedJobs();
    loadResume();
    loadGamification();
    loadTokenData();
    fetchAuth("/viral/referral/milestones")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.milestones) {
          const amb = data.milestones.find((m: { key: string; unlocked: boolean }) => m.key === "ambassador");
          if (amb?.unlocked) setIsAmbassador(true);
        }
      })
      .catch((err) => { console.error("[Profile] Failed to load referral milestones:", err); });
  }, [userLoaded]);

  const loadProfile = async () => {
    try {
      let res = await fetchAuth("/users/me");
      if (res.ok) {
        let data = await res.json();
        if (data.needsSync && user) {
          const referredBy = getStoredReferralCode();
          await fetchAuth("/users/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.primaryEmailAddress?.emailAddress,
              firstName: user.firstName,
              lastName: user.lastName,
              photoUrl: user.imageUrl,
              ...(referredBy ? { referredBy } : {}),
            }),
          });
          if (referredBy) clearStoredReferralCode();
          res = await fetchAuth("/users/me");
          if (res.ok) {
            data = await res.json();
          }
        }
        if (!data.needsSync) {
          setProfile({
            headline: data.headline || "",
            occupationId: data.occupationId || "",
            bio: data.bio || "",
            phone: data.phone || "",
            location: data.location || "",
            isPublicProfile: data.isPublicProfile ?? true,
            kycStatus: data.kycStatus || "not_started",
            subscriptionTier: data.subscriptionTier || "free",
            isBusinessOwner: data.isBusinessOwner ?? false,
            businessDocStatus: data.businessDocStatus || "not_started",
            businessDocRejectionReason: data.businessDocRejectionReason ?? null,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
    setLoading(false);
  };

  const loadSavedJobs = async () => {
    try {
      const res = await fetchAuth("/jobs/saved");
      if (res.ok) setSavedJobs(await res.json());
    } catch (err) {
      console.error("Failed to load saved jobs:", err);
    }
  };

  const loadResume = async () => {
    try {
      const res = await fetchAuth("/resumes");
      if (res.ok) {
        const resumes = await res.json();
        if (resumes.length > 0) {
          const detailRes = await fetchAuth(`/resumes/${resumes[0].id}`);
          if (detailRes.ok) setResume(await detailRes.json());
        }
      }
    } catch (err) {
      console.error("Failed to load resume:", err);
    }
  };

  const loadGamification = async () => {
    try {
      const [gamRes, rankRes] = await Promise.allSettled([
        fetchAuth("/gamification/me"),
        fetchAuth("/gamification/leaderboard/rank"),
      ]);
      if (gamRes.status === "fulfilled" && gamRes.value.ok) {
        setGamification(await gamRes.value.json());
      }
      if (rankRes.status === "fulfilled" && rankRes.value.ok) {
        const data = await rankRes.value.json();
        setMyRank(data.rank);
      }
    } catch (err) {
      console.error("[Profile] Failed to load gamification data:", err);
    }
  };

  const loadTokenData = async () => {
    try {
      const res = await fetchAuth("/token/balance");
      if (res.ok) setTokenData(await res.json());
    } catch (err) {
      console.error("[Profile] Failed to load token balance:", err);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetchAuth("/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Profile updated", description: "Your profile has been saved." });
      setEditing(false);
    } catch {
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleKycFileChange = (type: "id" | "selfie", file: File | null) => {
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPG, PNG or WebP image.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB per file.", variant: "destructive" });
      return;
    }
    const preview = URL.createObjectURL(file);
    if (type === "id") {
      setKycIdPhoto(file);
      setKycIdPhotoPreview(preview);
    } else {
      setKycSelfie(file);
      setKycSelfiePreview(preview);
    }
  };

  const uploadKycFile = async (file: File, kind: "idPhoto" | "selfie"): Promise<string | null> => {
    try {
      const urlRes = await fetchAuth("/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) {
        const errData = await urlRes.json().catch(() => ({}));
        toast({ title: "Upload rejected", description: (errData as { error?: string }).error || "Failed to get upload URL.", variant: "destructive" });
        return null;
      }
      const { uploadURL, objectPath } = await urlRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadURL as string);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(prev => ({ ...prev, [kind]: pct }));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Upload network error"));
        xhr.send(file);
      });

      setUploadProgress(prev => ({ ...prev, [kind]: 100 }));
      return objectPath as string;
    } catch {
      return null;
    }
  };

  const submitKyc = async () => {
    if (!kycForm.fullLegalName || !kycForm.dateOfBirth || !kycForm.address || !kycForm.idNumber) {
      toast({ title: "Missing fields", description: "All required text fields are needed.", variant: "destructive" });
      return;
    }
    setSubmittingKyc(true);
    setUploadingKycDocs(true);
    try {
      let idPhotoPath: string | null = null;
      let selfiePath: string | null = null;

      if (kycIdPhoto) {
        idPhotoPath = await uploadKycFile(kycIdPhoto, "idPhoto");
        if (!idPhotoPath) {
          toast({ title: "Upload failed", description: "Failed to upload ID photo. Please try again.", variant: "destructive" });
          setSubmittingKyc(false);
          setUploadingKycDocs(false);
          return;
        }
      }

      if (kycSelfie) {
        selfiePath = await uploadKycFile(kycSelfie, "selfie");
        if (!selfiePath) {
          toast({ title: "Upload failed", description: "Failed to upload selfie. Please try again.", variant: "destructive" });
          setSubmittingKyc(false);
          setUploadingKycDocs(false);
          return;
        }
      }

      setUploadingKycDocs(false);

      const res = await fetchAuth("/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...kycForm,
          ...(idPhotoPath ? { idPhotoPath } : {}),
          ...(selfiePath ? { selfiePath } : {}),
        }),
      });
      if (!res.ok) throw new Error("Submission failed");
      const data = await res.json();
      setProfile(prev => ({ ...prev, kycStatus: data.status }));
      setShowKyc(false);
      toast({ title: "KYC Submitted", description: data.message });
    } catch {
      toast({ title: "Error", description: "Failed to submit KYC.", variant: "destructive" });
    } finally {
      setSubmittingKyc(false);
      setUploadingKycDocs(false);
    }
  };

  const handleBusinessDocFileAdd = (files: FileList | null) => {
    if (!files) return;
    const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"];
    for (const file of Array.from(files)) {
      if (!allowed.includes(file.type)) {
        toast({ title: "Invalid file type", description: "Please upload JPG, PNG, WebP, or PDF.", variant: "destructive" });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 10MB per file.", variant: "destructive" });
        continue;
      }
      if (businessDocFiles.length >= 3) {
        toast({ title: "Max 3 documents", description: "You can upload up to 3 documents.", variant: "destructive" });
        break;
      }
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
      setBusinessDocFiles(prev => [...prev, file]);
      setBusinessDocPreviews(prev => [...prev, preview]);
    }
  };

  const removeBusinessDoc = (idx: number) => {
    setBusinessDocFiles(prev => { const c = [...prev]; c.splice(idx, 1); return c; });
    setBusinessDocPreviews(prev => {
      const c = [...prev];
      if (c[idx]) URL.revokeObjectURL(c[idx]);
      c.splice(idx, 1);
      return c;
    });
  };

  const uploadBusinessDocFile = async (file: File): Promise<string | null> => {
    try {
      const urlRes = await fetchAuth("/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) return null;
      const { uploadURL, objectPath } = await urlRes.json();
      const uploadRes = await fetch(uploadURL as string, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) return null;
      return objectPath as string;
    } catch {
      return null;
    }
  };

  const submitBusinessDocs = async () => {
    if (businessDocFiles.length === 0) {
      toast({ title: "No files selected", description: "Please select at least one business document.", variant: "destructive" });
      return;
    }
    setSubmittingBusinessDocs(true);
    try {
      const paths: string[] = [];
      for (const file of businessDocFiles) {
        const path = await uploadBusinessDocFile(file);
        if (!path) {
          toast({ title: "Upload failed", description: `Failed to upload ${file.name}. Please try again.`, variant: "destructive" });
          setSubmittingBusinessDocs(false);
          return;
        }
        paths.push(path);
      }
      const res = await fetchAuth("/business-docs/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docPaths: paths }),
      });
      if (!res.ok) throw new Error("Submission failed");
      const data = await res.json();
      setProfile(prev => ({ ...prev, businessDocStatus: data.status, businessDocRejectionReason: null }));
      setShowBusinessDocUpload(false);
      setBusinessDocFiles([]);
      setBusinessDocPreviews([]);
      toast({ title: "Documents Submitted", description: data.message });
    } catch {
      toast({ title: "Error", description: "Failed to submit business documents.", variant: "destructive" });
    } finally {
      setSubmittingBusinessDocs(false);
    }
  };

  const registerPasskey = async () => {
    setPasskeyRegistering(true);
    try {
      const clerkUser = user as ClerkUserWithPasskeys;
      await clerkUser.createPasskey();
      toast({ title: "Passkey registered", description: "You can now sign in with Face ID or fingerprint." });
    } catch (err: any) {
      if (err?.message?.includes("cancel") || err?.message?.includes("abort")) {
        toast({ title: "Cancelled", description: "Passkey registration was cancelled." });
      } else {
        toast({ title: "Error", description: "Failed to register passkey. Your browser may not support this feature.", variant: "destructive" });
      }
    } finally {
      setPasskeyRegistering(false);
    }
  };

  const removeSavedJob = async (jobId: number) => {
    try {
      await fetchAuth(`/jobs/saved/${jobId}`, { method: "DELETE" });
      setSavedJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (err) {
      console.error("Failed to remove saved job:", err);
    }
  };

  const kycStatusIcon = () => {
    switch (profile.kycStatus) {
      case "verified": return <ShieldCheck className="w-5 h-5 text-green-400" />;
      case "pending_review": return <Shield className="w-5 h-5 text-yellow-400" />;
      case "rejected": return <ShieldAlert className="w-5 h-5 text-red-400" />;
      default: return <Shield className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const kycStatusText = () => {
    switch (profile.kycStatus) {
      case "verified": return "Verified";
      case "pending_review": return "Under Review";
      case "rejected": return "Rejected";
      default: return "Not Started";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white pb-20 lg:pb-0">
        <Navbar />
        <main className="container mx-auto px-4 md:px-6 py-8 max-w-4xl" aria-busy="true" aria-label="Loading profile">
          <div className="glass-panel p-8 mb-6 animate-pulse">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-white/[0.06] shrink-0" />
              <div className="flex-1 space-y-2 pt-2">
                <div className="h-7 bg-white/[0.06] rounded-lg w-48" />
                <div className="h-4 bg-white/[0.04] rounded w-36" />
                <div className="h-3 bg-white/[0.03] rounded w-56" />
              </div>
              <div className="w-20 h-9 bg-white/[0.04] rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-panel p-4 h-20 animate-pulse">
                <div className="h-full bg-white/[0.03] rounded-lg" />
              </div>
            ))}
          </div>
          <div className="glass-panel p-6 mb-6 h-48 animate-pulse">
            <div className="h-6 bg-white/[0.06] rounded w-40 mb-4" />
            <div className="space-y-3">
              <div className="h-10 bg-white/[0.04] rounded-lg" />
              <div className="h-20 bg-white/[0.04] rounded-lg" />
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20 lg:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 md:px-6 py-8 max-w-4xl">
        <div className="glass-panel p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="" className="w-20 h-20 rounded-full border-2 border-primary/50" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/50">
                  <User className="w-10 h-10 text-primary" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold">{user?.fullName || "Your Profile"}</h1>
                  {isAmbassador && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border border-yellow-500/40 bg-yellow-500/10 text-yellow-400">
                      🏆 Ambassador
                    </span>
                  )}
                  <IdentityLabel variant="badge" />
                </div>
                {(profile.occupationId ? getOccupationById(profile.occupationId)?.name : profile.headline) && (
                  <p className="text-primary">{profile.occupationId ? getOccupationById(profile.occupationId)?.name : profile.headline}</p>
                )}
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  {user?.primaryEmailAddress && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{user.primaryEmailAddress.emailAddress}</span>}
                  {profile.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{profile.location}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {editing && (
                <Button variant="ghost" size="sm" className="text-white/50 hover:text-white/60" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
              <Button
                className={editing ? "bg-[#FF8C00] text-black font-bold hover:bg-[#FF8C00]/90 active:scale-[0.97] transition-all duration-150 gap-2" : "border-white/20 gap-2"}
                variant={editing ? "default" : "outline"}
                onClick={() => editing ? saveProfile() : setEditing(true)}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                {editing ? "Save my profile" : "Edit profile"}
              </Button>
            </div>
          </div>

          {editing && (
            <div className="space-y-4 border-t border-white/10 pt-4">
              <div className="form-field">
                <label className="form-label flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> Occupation
                </label>
                <OccupationDropdown
                  value={profile.occupationId}
                  onChange={(id) => setProfile(prev => ({ ...prev, occupationId: id }))}
                  placeholder="Select your occupation..."
                />
                <p className="form-helper">Used to personalize tax recommendations and AI coaching based on your tax class (W-2, 1099, etc.).</p>
              </div>
              <div className="form-field">
                <label htmlFor="profile-bio" className="form-label">Bio</label>
                <textarea
                  id="profile-bio"
                  placeholder="Tell employers about yourself — your skills, experience, and what you're looking for."
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-muted-foreground/50 min-h-[80px] resize-none focus:outline-none focus:border-primary/50 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-field">
                  <label htmlFor="profile-phone" className="form-label">Phone</label>
                  <Input
                    id="profile-phone"
                    placeholder="+1 (555) 000-0000"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-white/5 border-white/10 focus:border-primary/50"
                    type="tel"
                    autoComplete="tel"
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="profile-location" className="form-label">Location</label>
                  <Input
                    id="profile-location"
                    placeholder="City, State"
                    value={profile.location}
                    onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                    className="bg-white/5 border-white/10 focus:border-primary/50"
                    autoComplete="address-level2"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={profile.isPublicProfile} onChange={(e) => setProfile(prev => ({ ...prev, isPublicProfile: e.target.checked }))} className="accent-primary" />
                Public profile — visible to employers and the community
              </label>
            </div>
          )}

          {!editing && profile.bio && (
            <p className="text-muted-foreground text-sm border-t border-white/10 pt-4">{profile.bio}</p>
          )}

          {!editing && !profile.occupationId && profile.headline && (
            <div className="border-t border-white/10 pt-4">
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-amber-300 font-medium">Update your occupation</p>
                  <p className="text-[11px] text-amber-300/60 mt-0.5">You have an old-style headline (&ldquo;{profile.headline}&rdquo;). Select a structured occupation to improve tax recommendations and AI coaching.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    onClick={() => setEditing(true)}
                  >
                    Update Occupation
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass-panel p-4 flex items-center gap-3">
            {kycStatusIcon()}
            <div>
              <p className="text-xs text-muted-foreground">KYC Status</p>
              <p className="font-medium">{kycStatusText()}</p>
            </div>
            {profile.kycStatus === "not_started" && (
              <Button size="sm" variant="outline" className="ml-auto border-primary/30 text-primary active:scale-[0.97] transition-all duration-150" onClick={() => setShowKyc(true)}>
                Verify identity
              </Button>
            )}
          </div>
          <div className="glass-panel p-4 flex items-center gap-3">
            <Award className="w-5 h-5 text-gold" />
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="font-medium capitalize">{profile.subscriptionTier}</p>
            </div>
          </div>
          <div className="glass-panel p-4 flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Saved Jobs</p>
              <p className="font-medium">{savedJobs.length}</p>
            </div>
          </div>
        </div>

        {showKyc && (
          <div className="glass-panel p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Identity Verification (KYC)</h3>
            <p className="text-sm text-muted-foreground mb-4">Your information is handled securely and used only for identity verification.</p>
            <div className="space-y-3">
              <Input placeholder="Full Legal Name *" value={kycForm.fullLegalName} onChange={(e) => setKycForm(prev => ({ ...prev, fullLegalName: e.target.value }))} className="bg-white/5 border-white/10" />
              <div>
                <label className="text-[11px] text-white/50 mb-1 block">Date of Birth *</label>
                <Input type="date" value={kycForm.dateOfBirth} onChange={(e) => setKycForm(prev => ({ ...prev, dateOfBirth: e.target.value }))} className="bg-white/5 border-white/10" />
              </div>
              <Input placeholder="Full Address *" value={kycForm.address} onChange={(e) => setKycForm(prev => ({ ...prev, address: e.target.value }))} className="bg-white/5 border-white/10" />
              <select
                value={kycForm.idType}
                onChange={(e) => setKycForm(prev => ({ ...prev, idType: e.target.value }))}
                className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary/50"
              >
                <option value="drivers_license">Driver's License</option>
                <option value="passport">Passport</option>
                <option value="national_id">National ID</option>
              </select>
              <Input placeholder="ID Number *" value={kycForm.idNumber} onChange={(e) => setKycForm(prev => ({ ...prev, idNumber: e.target.value }))} className="bg-white/5 border-white/10" />

              <div className="border-t border-white/10 pt-3">
                <p className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2"><Image className="w-4 h-4 text-primary" /> Document Upload (Optional but recommended)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-white/50 mb-2">Government ID Photo</p>
                    <input ref={idPhotoRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" className="hidden" onChange={e => handleKycFileChange("id", e.target.files?.[0] || null)} />
                    {kycIdPhotoPreview ? (
                      <div className="relative">
                        <img src={kycIdPhotoPreview} alt="ID preview" className="w-full h-24 object-cover rounded-lg border border-white/10" />
                        <button onClick={() => { setKycIdPhoto(null); setKycIdPhotoPreview(null); setUploadProgress(p => ({ ...p, idPhoto: 0 })); }} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white/70 hover:text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                        {uploadProgress.idPhoto > 0 && uploadProgress.idPhoto < 100 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 rounded-b-lg overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress.idPhoto}%` }} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        onClick={() => idPhotoRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDragActive("id"); }}
                        onDragLeave={() => setDragActive(null)}
                        onDrop={e => { e.preventDefault(); setDragActive(null); handleKycFileChange("id", e.dataTransfer.files?.[0] || null); }}
                        className={`w-full h-24 border border-dashed rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${dragActive === "id" ? "border-primary/60 bg-primary/10" : "border-white/20 hover:border-primary/40 hover:bg-primary/5"}`}
                      >
                        <Upload className="w-5 h-5 text-white/30" />
                        <span className="text-[11px] text-white/30">{dragActive === "id" ? "Drop to upload" : "Upload or drag photo"}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-white/50 mb-2">Selfie with ID</p>
                    <input ref={selfieRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" className="hidden" onChange={e => handleKycFileChange("selfie", e.target.files?.[0] || null)} />
                    {kycSelfiePreview ? (
                      <div className="relative">
                        <img src={kycSelfiePreview} alt="Selfie preview" className="w-full h-24 object-cover rounded-lg border border-white/10" />
                        <button onClick={() => { setKycSelfie(null); setKycSelfiePreview(null); setUploadProgress(p => ({ ...p, selfie: 0 })); }} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white/70 hover:text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                        {uploadProgress.selfie > 0 && uploadProgress.selfie < 100 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 rounded-b-lg overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress.selfie}%` }} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        onClick={() => selfieRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDragActive("selfie"); }}
                        onDragLeave={() => setDragActive(null)}
                        onDrop={e => { e.preventDefault(); setDragActive(null); handleKycFileChange("selfie", e.dataTransfer.files?.[0] || null); }}
                        className={`w-full h-24 border border-dashed rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${dragActive === "selfie" ? "border-primary/60 bg-primary/10" : "border-white/20 hover:border-primary/40 hover:bg-primary/5"}`}
                      >
                        <Upload className="w-5 h-5 text-white/30" />
                        <span className="text-[11px] text-white/30">{dragActive === "selfie" ? "Drop to upload" : "Upload or drag selfie"}</span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-white/30 mt-2">JPG, PNG or WebP · Max 10MB each</p>
              </div>

              <div className="flex gap-2">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all duration-150" onClick={submitKyc} disabled={submittingKyc}>
                  {submittingKyc ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />{uploadingKycDocs ? "Uploading..." : "Submitting..."}</>
                  ) : "Verify my identity"}
                </Button>
                <Button variant="ghost" className="text-muted-foreground" onClick={() => setShowKyc(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {profile.isBusinessOwner && (
          <div className="glass-panel p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Business Documents
              </h3>
              {(profile.businessDocStatus === "not_started" || profile.businessDocStatus === "rejected") && (
                <Button size="sm" variant="outline" className="border-primary/30 text-primary" onClick={() => setShowBusinessDocUpload(v => !v)}>
                  {showBusinessDocUpload ? "Cancel" : "Upload Docs"}
                </Button>
              )}
            </div>

            {profile.businessDocStatus === "pending_review" && (
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <Shield className="w-4 h-4" /> Documents under review — you'll be notified once verified.
              </div>
            )}
            {profile.businessDocStatus === "verified" && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <ShieldCheck className="w-4 h-4" /> Business documents verified.
              </div>
            )}
            {profile.businessDocStatus === "rejected" && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
                <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-1">
                  <ShieldAlert className="w-4 h-4" /> Documents rejected — please re-upload.
                </div>
                {profile.businessDocRejectionReason && (
                  <p className="text-xs text-red-300/70">Reason: {profile.businessDocRejectionReason}</p>
                )}
              </div>
            )}
            {profile.businessDocStatus === "not_started" && (
              <p className="text-sm text-muted-foreground">No documents uploaded yet. Please upload your business documents to complete verification.</p>
            )}

            {showBusinessDocUpload && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-white/50">Upload at least one: business license, EIN letter, or articles of incorporation. (JPG, PNG, WebP, or PDF · Max 10MB)</p>
                {businessDocFiles.length > 0 && (
                  <div className="space-y-2">
                    {businessDocFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                        {businessDocPreviews[idx] ? (
                          <img src={businessDocPreviews[idx]} alt="" className="w-8 h-8 object-cover rounded border border-white/10" />
                        ) : (
                          <div className="w-8 h-8 rounded border border-white/10 bg-white/5 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-white/40" />
                          </div>
                        )}
                        <span className="flex-1 text-xs text-white/60 truncate">{file.name}</span>
                        <button onClick={() => removeBusinessDoc(idx)} className="text-white/30 hover:text-white/70">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {businessDocFiles.length < 3 && (
                  <>
                    <input
                      ref={businessDocInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                      multiple
                      className="hidden"
                      onChange={e => handleBusinessDocFileAdd(e.target.files)}
                    />
                    <div
                      onClick={() => businessDocInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setBusinessDocDragActive(true); }}
                      onDragLeave={() => setBusinessDocDragActive(false)}
                      onDrop={e => { e.preventDefault(); setBusinessDocDragActive(false); handleBusinessDocFileAdd(e.dataTransfer.files); }}
                      className={`w-full h-20 border border-dashed rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${businessDocDragActive ? "border-primary/60 bg-primary/10" : "border-white/20 hover:border-primary/40 hover:bg-primary/5"}`}
                    >
                      <Upload className="w-5 h-5 text-white/30" />
                      <span className="text-[11px] text-white/30">{businessDocDragActive ? "Drop to upload" : "Click or drag files here"}</span>
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all duration-150" onClick={submitBusinessDocs} disabled={submittingBusinessDocs || businessDocFiles.length === 0}>
                    {submittingBusinessDocs ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting...</> : "Submit for review"}
                  </Button>
                  <Button variant="ghost" className="text-muted-foreground" onClick={() => { setShowBusinessDocUpload(false); setBusinessDocFiles([]); setBusinessDocPreviews([]); }}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {resume && (
          <div className="glass-panel p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> My Résumé</h3>
              <Link href="/resume">
                <Button variant="outline" size="sm" className="border-primary/30 text-primary gap-1">
                  Edit <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
            <p className="text-sm font-medium mb-1">{resume.title}</p>
            {resume.summary && <p className="text-sm text-muted-foreground mb-3">{resume.summary.slice(0, 200)}...</p>}
            {resume.skills && resume.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(resume.skills as string[]).slice(0, 10).map((skill: string, i: number) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">{skill}</span>
                ))}
              </div>
            )}
            {resume.experiences && resume.experiences.length > 0 && (
              <div className="space-y-1">
                {resume.experiences.slice(0, 3).map((exp: any, i: number) => (
                  <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>{exp.title} at {exp.company}</span>
                    {exp.isGigWork === "true" && <span className="text-xs text-primary">Gig</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="glass-panel p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Investment Progress</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/5">
              <DollarSign className="w-5 h-5 text-[#FF8C00] mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground uppercase">This Month</p>
              <p className="text-xl font-bold font-mono text-[#FF8C00]">$1,247</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/5">
              <Zap className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground uppercase">Signals Used</p>
              <p className="text-xl font-bold font-mono text-primary">18</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/5">
              <Briefcase className="w-5 h-5 text-secondary mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground uppercase">Gig Earned</p>
              <p className="text-xl font-bold font-mono text-secondary">$320</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/5">
              <AlertTriangle className="w-5 h-5 text-[#ff3366] mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground uppercase">Max Risk</p>
              <p className="text-xl font-bold font-mono text-[#ff3366]">8.4%</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" /> Your Progress
          </h3>
          {gamification ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/5">
                  <Star className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground uppercase">Level</p>
                  <p className="text-xl font-bold font-mono text-primary">{gamification.xp.level}</p>
                  <p className="text-[9px] text-muted-foreground">{gamification.xp.tier}</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/5">
                  <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground uppercase">Total XP</p>
                  <p className="text-xl font-bold font-mono text-yellow-400">{gamification.xp.totalXp.toLocaleString()}</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/5">
                  <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground uppercase">Streak</p>
                  <p className="text-xl font-bold font-mono text-orange-400">{gamification.streak.currentStreak}</p>
                  <p className="text-[9px] text-muted-foreground">{gamification.streak.multiplier.toFixed(1)}x multi</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/5">
                  <Trophy className="w-5 h-5 text-[#FFB800] mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground uppercase">Rank</p>
                  <p className="text-xl font-bold font-mono text-[#FFB800]">{myRank ? `#${myRank}` : "--"}</p>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Level {gamification.xp.level} Progress</span>
                  <span className="text-muted-foreground">{gamification.xpToNextLevel} XP to next</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-primary to-amber-500 transition-all"
                    style={{ width: `${gamification.levelProgress}%` }}
                  />
                </div>
              </div>
              {gamification.badges.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Award className="w-4 h-4 text-primary" /> Earned Badges
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {gamification.badges.map((b) => (
                      <span
                        key={b.badge.id}
                        className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/30"
                        title={b.badge.description}
                      >
                        {b.badge.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 flex gap-2 flex-wrap">
                <Link href="/leaderboard">
                  <Button variant="outline" size="sm" className="border-primary/30 text-primary gap-1 active:scale-[0.97] transition-all duration-150">
                    <Trophy className="w-3.5 h-3.5" /> Leaderboard
                  </Button>
                </Link>
                <Link href="/achievements">
                  <Button variant="outline" size="sm" className="border-primary/30 text-primary gap-1 active:scale-[0.97] transition-all duration-150">
                    <Target className="w-3.5 h-3.5" /> Achievements
                  </Button>
                </Link>
                <Link href="/giveaway">
                  <Button variant="outline" size="sm" className="border-[#FFB800]/40 text-[#FFB800] gap-1 active:scale-[0.97] transition-all duration-150">
                    <Star className="w-3.5 h-3.5" /> Anniversary Giveaway
                  </Button>
                </Link>
              </div>
              <div
                className="mt-4 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg, rgba(245,200,66,0.08), rgba(255,140,0,0.06))", border: "1px solid rgba(245,200,66,0.2)" }}
                onClick={() => window.location.href = "/giveaway"}
              >
                <div className="flex-shrink-0 text-2xl">🎉</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#FFB800]">$50,000 Anniversary Giveaway</p>
                  <p className="text-xs text-white/50 mt-0.5">Your XP, trades, streak & referrals earn entries. Plus share in the <span className="text-[#00d4ff] font-medium">$36K referral bonus pool</span>.</p>
                </div>
                <div className="text-[#FFB800] text-lg">→</div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Loading gamification data...</p>
          )}
        </div>

        <div className="glass-panel p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-400" /> EntangleCoin
          </h3>
          {tokenData ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/5">
                <Coins className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground uppercase">Rewards Balance</p>
                <p className="text-xl font-bold font-mono text-yellow-400">{(tokenData.balance || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/5">
                <DollarSign className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground uppercase">USD Value</p>
                <p className="text-xl font-bold font-mono text-emerald-400">${(tokenData.totalValue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/5">
                <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground uppercase">Token Value</p>
                <p className="text-xl font-bold font-mono text-primary">${(tokenData.tokenValue || 0).toFixed(2)}</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/5">
                <Wallet className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground uppercase">Wallet</p>
                <p className="text-sm font-mono text-amber-500 truncate">
                  {tokenData.walletAddress ? `${tokenData.walletAddress.slice(0, 6)}...${tokenData.walletAddress.slice(-4)}` : "Not linked"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading token data...</p>
          )}
          <div className="flex gap-2">
            <Link href="/wallet">
              <Button variant="outline" size="sm" className="border-yellow-500/30 text-yellow-400 gap-1">
                <Wallet className="w-3.5 h-3.5" /> Wallet
              </Button>
            </Link>
            <Link href="/rewards">
              <Button variant="outline" size="sm" className="border-primary/30 text-primary gap-1">
                <Trophy className="w-3.5 h-3.5" /> Rewards
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline" size="sm" className="border-primary/30 text-primary gap-1">
                <ExternalLink className="w-3.5 h-3.5" /> Travel
              </Button>
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <ReferralSection />
        </div>

        <div className="glass-panel p-6 mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Fingerprint className="w-5 h-5 text-primary" /> Passkey / Biometric Sign-In</h3>
          <p className="text-sm text-muted-foreground mb-4">Sign in with Face ID, fingerprint, or security key | no password needed.</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Register a Passkey</p>
              <p className="text-xs text-muted-foreground mt-0.5">Works with Face ID, Touch ID, Windows Hello, and security keys</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-primary/30 text-primary gap-2 ml-4"
              onClick={registerPasskey}
              disabled={passkeyRegistering}
            >
              {passkeyRegistering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
              {passkeyRegistering ? "Registering..." : "Add Passkey"}
            </Button>
          </div>
          {((user as ClerkUserWithPasskeys)?.passkeys?.length > 0) && (
            <div className="mt-4 pt-3 border-t border-white/10">
              <p className="text-xs text-white/50 mb-2">Registered passkeys ({(user as ClerkUserWithPasskeys).passkeys.length})</p>
              <div className="space-y-1">
                {(user as ClerkUserWithPasskeys).passkeys.map((pk: PasskeyResource) => (
                  <div key={pk.id} className="flex items-center justify-between text-sm py-1.5">
                    <span className="text-white/70">{pk.name || "Passkey"}</span>
                    <span className="text-xs text-white/30">{new Date(pk.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Privacy Settings</h3>
          <div className="space-y-4">
            {[
              { key: "isPublicProfile" as const, label: "Public Profile", desc: "Make your profile visible to other users", icon: User },
            ].map((toggle) => (
              <div key={toggle.key} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <toggle.icon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{toggle.label}</p>
                    <p className="text-xs text-muted-foreground">{toggle.desc}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile[toggle.key] as boolean}
                    className="sr-only peer"
                    onChange={async (e) => {
                      const newVal = e.target.checked;
                      setProfile(prev => ({ ...prev, [toggle.key]: newVal }));
                      try {
                        const res = await fetchAuth("/users/me", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ...profile, [toggle.key]: newVal }),
                        });
                        if (!res.ok) throw new Error("Save failed");
                        toast({ title: "Settings saved", description: `${toggle.label} updated.` });
                      } catch {
                        setProfile(prev => ({ ...prev, [toggle.key]: !newVal }));
                        toast({ title: "Error", description: "Failed to save setting.", variant: "destructive" });
                      }
                    }}
                  />
                  <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary/60"></div>
                </label>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">Additional privacy controls (portfolio visibility, gig profile) coming soon.</p>
        </div>

        <DataManagementSection />

        <MyFeedback />

        <AlertDigestSettings />

        {savedJobs.length > 0 && (
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-gold" /> Saved Jobs</h3>
            <div className="space-y-3">
              {savedJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <p className="font-medium text-sm">{job.jobTitle}</p>
                    <p className="text-xs text-muted-foreground">{job.company} • {job.location}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => removeSavedJob(job.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
