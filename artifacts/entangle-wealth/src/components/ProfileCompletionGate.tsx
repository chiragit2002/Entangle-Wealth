import { useState, useEffect, useCallback, useRef } from "react";
import { useUser, useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { User, MapPin, Loader2, ChevronRight, Briefcase, Building2, Upload, X, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OccupationDropdown } from "@/components/OccupationDropdown";
import { getOccupationById } from "@workspace/occupations";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";

const BYPASS_PATHS = ["/sign-in", "/sign-up", "/terms", "/privacy", "/about", "/cookies", "/disclaimer", "/dmca", "/accessibility", "/status", "/help"];

interface ProfileGateData {
  firstName: string;
  lastName: string;
  occupationId: string;
  location: string;
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  occupationId?: string;
  location?: string;
}

function getCompletionPct(data: ProfileGateData, isBusinessOwner: boolean, docPaths: string[]): number {
  const profileFields = [data.firstName, data.lastName, data.occupationId, data.location];
  const filledProfile = profileFields.filter(f => f.trim().length > 0).length;
  if (!isBusinessOwner) {
    return Math.round((filledProfile / profileFields.length) * 100);
  }
  const hasDoc = docPaths.length > 0 ? 1 : 0;
  return Math.round(((filledProfile + hasDoc) / (profileFields.length + 1)) * 100);
}

function isProfileComplete(data: ProfileGateData): boolean {
  return (
    data.firstName.trim().length > 0 &&
    data.lastName.trim().length > 0 &&
    data.occupationId.trim().length > 0 &&
    data.location.trim().length > 0
  );
}

const ALLOWED_DOC_MIME_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"];
const DOC_MAX_SIZE = 10 * 1024 * 1024;

const DOC_LABELS: Record<string, string> = {
  business_license: "Business License",
  ein_letter: "EIN Letter",
  articles_of_incorporation: "Articles of Incorporation",
};

function validateField(name: keyof ProfileGateData, value: string): string | undefined {
  if (!value.trim()) {
    const labels: Record<keyof ProfileGateData, string> = {
      firstName: "First name",
      lastName: "Last name",
      occupationId: "Occupation",
      location: "Location",
    };
    return `${labels[name]} is required`;
  }
  if (name === "firstName" || name === "lastName") {
    if (value.trim().length < 2) return "Must be at least 2 characters";
  }
  return undefined;
}

const SKIP_STORAGE_PREFIX = "ew_profile_gate_skip_until_";
const SKIP_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

function getSkipKey(userId: string): string {
  return `${SKIP_STORAGE_PREFIX}${userId}`;
}

function isSkipped(userId: string): boolean {
  try {
    const val = localStorage.getItem(getSkipKey(userId));
    if (!val) return false;
    return Date.now() < parseInt(val, 10);
  } catch {
    return false;
  }
}

function setSkipped(userId: string) {
  try {
    localStorage.setItem(getSkipKey(userId), String(Date.now() + SKIP_DURATION_MS));
  } catch {}
}

export function ProfileCompletionGate({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();
  const [showGate, setShowGate] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof ProfileGateData, boolean>>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState<ProfileGateData>({ firstName: "", lastName: "", occupationId: "", location: "" });

  const [isBusinessOwner, setIsBusinessOwner] = useState<boolean | null>(null);
  const [businessOwnerAnswered, setBusinessOwnerAnswered] = useState(false);
  const [docFiles, setDocFiles] = useState<{ type: string; file: File; preview: string }[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shouldBypass = BYPASS_PATHS.some(p => location.startsWith(p));

  const handleRemindLater = () => {
    if (user?.id) setSkipped(user.id);
    setShowGate(false);
  };

  const checkProfile = useCallback(async () => {
    if (!isLoaded || !isSignedIn || shouldBypass) {
      setChecking(false);
      return;
    }

    if (user?.id && isSkipped(user.id)) {
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
          occupationId: data.occupationId || "",
          location: data.location || "",
        };

        if (isProfileComplete(profileData)) {
          if (data.isBusinessOwner && data.businessDocStatus !== "pending_review" && data.businessDocStatus !== "verified") {
            setIsBusinessOwner(true);
            setBusinessOwnerAnswered(true);
            setForm(profileData);
            setShowGate(true);
            setChecking(false);
            return;
          }
          setChecking(false);
          return;
        }
      } else {
        profileData = {
          firstName: user?.firstName || "",
          lastName: user?.lastName || "",
          occupationId: "",
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
        occupationId: "",
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

  const handleFieldChange = (field: keyof ProfileGateData, value: string) => {
    setForm(p => ({ ...p, [field]: value }));
    if (touched[field]) {
      const err = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: err }));
    }
  };

  const handleBlur = (field: keyof ProfileGateData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const err = validateField(field, form[field]);
    setErrors(prev => ({ ...prev, [field]: err }));
  };

  const handleFileAdd = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!ALLOWED_DOC_MIME_TYPES.includes(file.type)) {
        toast({ title: "Invalid file type", description: "Please upload JPG, PNG, WebP, or PDF.", variant: "destructive" });
        continue;
      }
      if (file.size > DOC_MAX_SIZE) {
        toast({ title: "File too large", description: "Max 10MB per file.", variant: "destructive" });
        continue;
      }
      if (docFiles.length >= 3) {
        toast({ title: "Maximum 3 documents", description: "You can upload up to 3 business documents.", variant: "destructive" });
        break;
      }
      const docType = docFiles.length === 0 ? "business_license" : docFiles.length === 1 ? "ein_letter" : "articles_of_incorporation";
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
      setDocFiles(prev => [...prev, { type: docType, file, preview }]);
    }
  };

  const removeDoc = (idx: number) => {
    setDocFiles(prev => {
      const copy = [...prev];
      if (copy[idx].preview) URL.revokeObjectURL(copy[idx].preview);
      copy.splice(idx, 1);
      return copy;
    });
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const urlRes = await authFetch("/storage/uploads/request-url", getToken, {
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

  const handleSave = async () => {
    const allFields: (keyof ProfileGateData)[] = ["firstName", "lastName", "occupationId", "location"];
    const newTouched: Partial<Record<keyof ProfileGateData, boolean>> = {};
    const newErrors: FieldErrors = {};
    allFields.forEach(f => {
      newTouched[f] = true;
      const err = validateField(f, form[f]);
      if (err) newErrors[f] = err;
    });
    setTouched(newTouched);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    if (isBusinessOwner && docFiles.length === 0 && uploadedPaths.length === 0) {
      toast({ title: "Documents required", description: "Please upload at least one business document.", variant: "destructive" });
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
          occupationId: form.occupationId.trim(),
          location: form.location.trim(),
        }),
      });

      if (isBusinessOwner && docFiles.length > 0) {
        setUploadingDocs(true);
        const paths: string[] = [...uploadedPaths];
        for (const doc of docFiles) {
          const path = await uploadFile(doc.file);
          if (!path) {
            toast({ title: "Upload failed", description: `Failed to upload ${doc.file.name}. Please try again.`, variant: "destructive" });
            setSaving(false);
            setUploadingDocs(false);
            return;
          }
          paths.push(path);
        }
        setUploadingDocs(false);

        const submitRes = await authFetch("/business-docs/submit", getToken, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ docPaths: paths }),
        });
        if (!submitRes.ok) {
          toast({ title: "Error", description: "Failed to submit business documents.", variant: "destructive" });
          setSaving(false);
          return;
        }
        setUploadedPaths(paths);
      } else if (isBusinessOwner === false) {
        await authFetch("/users/me", getToken, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isBusinessOwner: false }),
        });
      }

      setShowGate(false);
      toast({ title: "Profile completed!", description: "Welcome to EntangleWealth." });
    } catch {
      toast({ title: "Error", description: "Failed to save profile. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
      setUploadingDocs(false);
    }
  };

  if (checking && isSignedIn && !shouldBypass) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center" role="status" aria-label="Loading">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-white/30 font-mono">Checking your profile...</p>
        </div>
      </div>
    );
  }

  if (!showGate) {
    return <>{children}</>;
  }

  const pct = getCompletionPct(form, isBusinessOwner === true, uploadedPaths.concat(docFiles.map(d => d.file.name)));
  const profileDone = isProfileComplete(form);
  const needsBusinessDocs = isBusinessOwner === true && (docFiles.length === 0 && uploadedPaths.length === 0);
  const canSave = profileDone && businessOwnerAnswered && !needsBusinessDocs;

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="profile-gate-title">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0f18] p-8 my-4 shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[#0099cc] flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-black" aria-hidden="true" />
            </div>
            <div>
              <h2 id="profile-gate-title" className="text-xl font-bold text-white">Complete Your Profile</h2>
              <p className="text-xs text-white/50">Personalize your experience on EntangleWealth</p>
            </div>
          </div>
          <button
            onClick={handleRemindLater}
            className="text-white/20 hover:text-white/50 transition-colors p-1 rounded-md hover:bg-white/[0.04] shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="Remind me later"
            title="Remind me later"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-6" aria-label={`Profile ${pct}% complete`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-white/40">Profile completion</span>
            <span className="text-xs text-primary font-bold tabular-nums">{pct}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="gate-firstName" className="text-[11px] text-white/50 mb-1 block">
                First Name <span className="text-primary" aria-hidden="true">*</span>
              </label>
              <Input
                id="gate-firstName"
                placeholder="John"
                value={form.firstName}
                onChange={e => handleFieldChange("firstName", e.target.value)}
                onBlur={() => handleBlur("firstName")}
                className={`bg-white/5 border-white/10 transition-colors ${errors.firstName ? "border-red-500/50 focus:border-red-500" : "focus:border-primary/50"}`}
                aria-invalid={!!errors.firstName}
                aria-describedby={errors.firstName ? "gate-firstName-error" : undefined}
                autoComplete="given-name"
              />
              {errors.firstName && (
                <p id="gate-firstName-error" className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.firstName}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="gate-lastName" className="text-[11px] text-white/50 mb-1 block">
                Last Name <span className="text-primary" aria-hidden="true">*</span>
              </label>
              <Input
                id="gate-lastName"
                placeholder="Doe"
                value={form.lastName}
                onChange={e => handleFieldChange("lastName", e.target.value)}
                onBlur={() => handleBlur("lastName")}
                className={`bg-white/5 border-white/10 transition-colors ${errors.lastName ? "border-red-500/50 focus:border-red-500" : "focus:border-primary/50"}`}
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? "gate-lastName-error" : undefined}
                autoComplete="family-name"
              />
              {errors.lastName && (
                <p id="gate-lastName-error" className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="gate-occupation" className="text-[11px] text-white/50 mb-1 flex items-center gap-1">
              <Briefcase className="w-3 h-3" aria-hidden="true" />
              Occupation <span className="text-primary" aria-hidden="true">*</span>
            </label>
            <OccupationDropdown
              inputId="gate-occupation"
              value={form.occupationId}
              onChange={(id) => {
                handleFieldChange("occupationId", id);
              }}
              error={errors.occupationId}
              placeholder="Select your occupation..."
            />
            {errors.occupationId && (
              <p id="gate-occupation-error" className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {errors.occupationId}
              </p>
            )}
            {form.occupationId && !errors.occupationId && (
              <p className="text-[10px] text-primary/60 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                {getOccupationById(form.occupationId)?.name}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="gate-location" className="text-[11px] text-white/50 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" aria-hidden="true" />
              Location <span className="text-primary" aria-hidden="true">*</span>
            </label>
            <Input
              id="gate-location"
              placeholder="City, State"
              value={form.location}
              onChange={e => handleFieldChange("location", e.target.value)}
              onBlur={() => handleBlur("location")}
              className={`bg-white/5 border-white/10 transition-colors ${errors.location ? "border-red-500/50 focus:border-red-500" : "focus:border-primary/50"}`}
              aria-invalid={!!errors.location}
              aria-describedby={errors.location ? "gate-location-error" : undefined}
              autoComplete="address-level2"
            />
            {errors.location && (
              <p id="gate-location-error" className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {errors.location}
              </p>
            )}
          </div>

          <div className="border-t border-white/10 pt-3">
            <label className="text-[11px] text-white/50 mb-2 block">
              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> Are you a business owner? <span className="text-primary">*</span></span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setIsBusinessOwner(true); setBusinessOwnerAnswered(true); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all border ${isBusinessOwner === true ? "bg-primary/15 text-primary border-primary/40" : "bg-white/[0.03] text-white/50 border-white/[0.06] hover:border-white/20"}`}
                aria-pressed={isBusinessOwner === true}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => { setIsBusinessOwner(false); setBusinessOwnerAnswered(true); setDocFiles([]); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all border ${isBusinessOwner === false ? "bg-white/10 text-white border-white/30" : "bg-white/[0.03] text-white/50 border-white/[0.06] hover:border-white/20"}`}
                aria-pressed={isBusinessOwner === false}
              >
                No
              </button>
            </div>
          </div>

          {isBusinessOwner === true && (
            <div className="border border-primary/20 rounded-xl p-4 bg-primary/[0.03]">
              <p className="text-[11px] text-white/70 font-medium mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-primary" /> Business Document Upload <span className="text-primary">*</span>
              </p>
              <p className="text-[10px] text-white/40 mb-3">Upload at least one: business license, EIN letter, or articles of incorporation. (JPG, PNG, WebP, or PDF · Max 10MB each)</p>

              {docFiles.length > 0 && (
                <div className="space-y-2 mb-3">
                  {docFiles.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                      {doc.preview ? (
                        <img src={doc.preview} alt="" className="w-8 h-8 object-cover rounded border border-white/10" />
                      ) : (
                        <div className="w-8 h-8 rounded border border-white/10 bg-white/5 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-white/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white/60 truncate">{doc.file.name}</p>
                        <select
                          value={doc.type}
                          onChange={e => setDocFiles(prev => prev.map((d, i) => i === idx ? { ...d, type: e.target.value } : d))}
                          className="text-[10px] bg-transparent text-primary border-0 outline-none cursor-pointer"
                        >
                          {Object.entries(DOC_LABELS).map(([v, l]) => (
                            <option key={v} value={v} className="bg-[#0d0f18] text-white">{l}</option>
                          ))}
                        </select>
                      </div>
                      <button onClick={() => removeDoc(idx)} className="text-white/30 hover:text-white/70" aria-label={`Remove ${doc.file.name}`}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_DOC_MIME_TYPES.join(",")}
                multiple
                className="hidden"
                onChange={e => handleFileAdd(e.target.files)}
                aria-label="Upload business documents"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={e => { e.preventDefault(); setDragActive(false); handleFileAdd(e.dataTransfer.files); }}
                className={`w-full py-6 border border-dashed rounded-xl flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${dragActive ? "border-primary/60 bg-primary/10" : "border-white/15 hover:border-primary/40 hover:bg-primary/5"}`}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === "Enter" || e.key === " " ? fileInputRef.current?.click() : undefined}
                aria-label="Click or drag to upload business documents"
              >
                <Upload className="w-5 h-5 text-white/30" aria-hidden="true" />
                <span className="text-[11px] text-white/40">{dragActive ? "Drop files here" : "Click or drag to upload"}</span>
                <span className="text-[10px] text-white/20">JPG, PNG, WebP, PDF · Max 10MB</span>
              </div>
            </div>
          )}
        </div>

        <Button
          className="w-full mt-6 bg-primary text-black font-bold gap-1 h-12 text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
          onClick={handleSave}
          disabled={saving || !businessOwnerAnswered}
          aria-busy={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>{uploadingDocs ? "Uploading documents..." : "Saving..."}</span>
            </>
          ) : (
            <>
              Save & Continue
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </Button>

        {!canSave && (
          <p className="text-center text-xs text-white/30 mt-2" aria-live="polite">
            {!businessOwnerAnswered ? "Please answer all required questions to continue" : "All fields are required to continue"}
          </p>
        )}

        <button
          onClick={handleRemindLater}
          className="w-full mt-3 text-center text-xs text-white/20 hover:text-white/40 transition-colors py-1"
        >
          Remind me later
        </button>
      </div>
    </div>
  );
}
