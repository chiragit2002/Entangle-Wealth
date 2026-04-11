import { useState, useEffect, useCallback, useRef } from "react";
import { useUser, useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { User, MapPin, Loader2, ChevronRight, Briefcase, Building2, Upload, X, FileText, CheckCircle } from "lucide-react";
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

function getCompletionPct(data: ProfileGateData, isBusinessOwner: boolean, docPaths: string[]): number {
  const profileFields = [data.firstName, data.lastName, data.headline, data.location];
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
    data.headline.trim().length > 0 &&
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

export function ProfileCompletionGate({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();
  const [showGate, setShowGate] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileGateData>({ firstName: "", lastName: "", headline: "", location: "" });

  const [isBusinessOwner, setIsBusinessOwner] = useState<boolean | null>(null);
  const [businessOwnerAnswered, setBusinessOwnerAnswered] = useState(false);
  const [docFiles, setDocFiles] = useState<{ type: string; file: File; preview: string }[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!isProfileComplete(form)) {
      toast({ title: "All fields required", description: "Please fill in your first name, last name, headline, and location.", variant: "destructive" });
      return;
    }

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
          headline: form.headline.trim(),
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
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    } finally {
      setSaving(false);
      setUploadingDocs(false);
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

  const pct = getCompletionPct(form, isBusinessOwner === true, uploadedPaths.concat(docFiles.map(d => d.file.name)));
  const profileDone = isProfileComplete(form);
  const needsBusinessDocs = isBusinessOwner === true && (docFiles.length === 0 && uploadedPaths.length === 0);
  const canSave = profileDone && businessOwnerAnswered && !needsBusinessDocs;

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0f18] p-8 my-4">
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

          <div className="border-t border-white/10 pt-3">
            <label className="text-[11px] text-white/50 mb-2 block">
              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> Are you a business owner? <span className="text-primary">*</span></span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setIsBusinessOwner(true); setBusinessOwnerAnswered(true); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all border ${isBusinessOwner === true ? "bg-primary/15 text-primary border-primary/40" : "bg-white/[0.03] text-white/50 border-white/[0.06] hover:border-white/20"}`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => { setIsBusinessOwner(false); setBusinessOwnerAnswered(true); setDocFiles([]); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all border ${isBusinessOwner === false ? "bg-white/10 text-white border-white/30" : "bg-white/[0.03] text-white/50 border-white/[0.06] hover:border-white/20"}`}
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
                      <button onClick={() => removeDoc(idx)} className="text-white/30 hover:text-white/70">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {uploadedPaths.length > 0 && docFiles.length === 0 && (
                <div className="flex items-center gap-2 text-green-400 text-xs mb-3">
                  <CheckCircle className="w-3.5 h-3.5" /> {uploadedPaths.length} document{uploadedPaths.length !== 1 ? "s" : ""} already uploaded
                </div>
              )}

              {docFiles.length < 3 && uploadedPaths.length === 0 && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                    multiple
                    className="hidden"
                    onChange={e => handleFileAdd(e.target.files)}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={e => { e.preventDefault(); setDragActive(false); handleFileAdd(e.dataTransfer.files); }}
                    className={`w-full h-20 border border-dashed rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${dragActive ? "border-primary/60 bg-primary/10" : "border-white/20 hover:border-primary/40 hover:bg-primary/5"}`}
                  >
                    <Upload className="w-4 h-4 text-white/30" />
                    <span className="text-[10px] text-white/30">{dragActive ? "Drop to upload" : "Click or drag files here"}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <Button
          className="w-full mt-6 bg-primary text-black font-bold gap-1"
          onClick={handleSave}
          disabled={saving || !canSave}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {uploadingDocs ? "Uploading documents..." : "Saving..."}</>
          ) : (
            <>Save & Continue <ChevronRight className="w-4 h-4" /></>
          )}
        </Button>

        {!canSave && (
          <p className="text-center text-xs text-white/30 mt-2">
            {!businessOwnerAnswered ? "Please answer all questions to continue" : needsBusinessDocs ? "Upload at least one business document to continue" : "All fields are required to continue"}
          </p>
        )}
      </div>
    </div>
  );
}
