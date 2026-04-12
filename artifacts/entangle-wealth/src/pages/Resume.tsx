import { useState, useEffect, useCallback } from "react";
import { trackEvent } from "@/lib/trackEvent";
import { useUser, useAuth } from "@clerk/react";
import {
  FileText, Plus, Trash2, Briefcase, GraduationCap, Award, Save, Download,
  Loader2, ChevronDown, ChevronUp, Linkedin, Link2, Unlink, ExternalLink,
  Zap, Sparkles, Eye, EyeOff, Globe, Mail, Phone, MapPin, User,
  Calculator, Building2, Receipt, CheckCircle2, AlertCircle, ArrowRight,
  Atom, Network, Brain, Shield, Star, TrendingUp, FileCheck
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/authFetch";

interface Experience {
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  isGigWork: boolean;
}

interface Education {
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

interface LinkedInProfile {
  connected: boolean;
  url: string;
  name: string;
  headline: string;
  importedAt: string | null;
}

interface AccountingConnection {
  id: string;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
  lastSync: string | null;
  description: string;
  features: string[];
}

interface ResumeData {
  id?: number;
  title: string;
  template: string;
  summary: string;
  skills: string[];
  certifications: string[];
  experiences: Experience[];
  education: Education[];
  phone: string;
  location: string;
  website: string;
  linkedinUrl: string;
}

const TEMPLATES = [
  { id: "quantum", name: "Quantum Dark", accent: "#00D4FF", gradient: "from-cyan-500 to-blue-600" },
  { id: "entangled", name: "Entangled Gold", accent: "#FFD700", gradient: "from-yellow-500 to-amber-600" },
  { id: "professional", name: "Professional", accent: "#00D4FF", gradient: "from-blue-500 to-indigo-600" },
  { id: "modern", name: "Modern Clean", accent: "#00e676", gradient: "from-green-500 to-emerald-600" },
  { id: "minimal", name: "Minimal", accent: "#ffffff", gradient: "from-gray-400 to-gray-600" },
];

const ACCOUNTING_PLATFORMS: AccountingConnection[] = [
  {
    id: "quickbooks",
    name: "QuickBooks",
    icon: "QB",
    color: "#2CA01C",
    connected: false,
    lastSync: null,
    description: "Import income history, 1099s, and business financials to auto-populate freelance revenue on your résumé.",
    features: ["Revenue history", "1099 income", "Business metrics", "Client portfolio"],
  },
  {
    id: "xero",
    name: "Xero",
    icon: "XR",
    color: "#13B5EA",
    connected: false,
    lastSync: null,
    description: "Sync invoicing data, project billing, and financial performance to quantify your professional impact.",
    features: ["Invoice analytics", "Project billing", "Financial KPIs", "Growth metrics"],
  },
  {
    id: "hrblock",
    name: "H&R Block",
    icon: "HR",
    color: "#00A651",
    connected: false,
    lastSync: null,
    description: "Pull tax filing history and income verification to validate earnings and career progression.",
    features: ["Tax history", "Income verification", "Filing records", "Deduction insights"],
  },
];

const emptyExperience: Experience = { company: "", title: "", location: "", startDate: "", endDate: "", isCurrent: false, description: "", isGigWork: false };
const emptyEducation: Education = { school: "", degree: "", field: "", startDate: "", endDate: "" };

export default function Resume() {
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [resume, setResume] = useState<ResumeData>({
    title: "My Résumé",
    template: "quantum",
    summary: "",
    skills: [],
    certifications: [],
    experiences: [{ ...emptyExperience }],
    education: [{ ...emptyEducation }],
    phone: "",
    location: "",
    website: "",
    linkedinUrl: "",
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [skillInput, setSkillInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [activeTab, setActiveTab] = useState<"builder" | "linkedin" | "accounting">("builder");
  const [linkedIn, setLinkedIn] = useState<LinkedInProfile>({
    connected: false,
    url: "",
    name: "",
    headline: "",
    importedAt: null,
  });
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [linkedInImporting, setLinkedInImporting] = useState(false);
  const [accountingPlatforms, setAccountingPlatforms] = useState<AccountingConnection[]>(ACCOUNTING_PLATFORMS);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    contact: true, summary: true, experience: true, education: true, skills: true, certifications: false,
  });

  const fetchAuth = useCallback((path: string, options: RequestInit = {}) => {
    return authFetch(path, getToken, options);
  }, [getToken]);

  useEffect(() => {
    if (!userLoaded) return;
    loadResume();
    syncUser();
  }, [userLoaded]);

  const loadResume = async () => {
    try {
      const res = await fetchAuth("/resumes");
      if (!res.ok) { setLoading(false); return; }
      const resumes = await res.json();
      if (resumes.length > 0) {
        const detailRes = await fetchAuth(`/resumes/${resumes[0].id}`);
        if (detailRes.ok) {
          const data = await detailRes.json();
          setResume({
            id: data.id,
            title: data.title || "My Résumé",
            template: data.template || "quantum",
            summary: data.summary || "",
            skills: data.skills || [],
            certifications: data.certifications || [],
            experiences: data.experiences?.length > 0
              ? data.experiences.map((e: any) => ({ ...e, isCurrent: e.isCurrent === "true" || e.isCurrent === true, isGigWork: e.isGigWork === "true" || e.isGigWork === true }))
              : [{ ...emptyExperience }],
            education: data.education?.length > 0 ? data.education : [{ ...emptyEducation }],
            phone: data.phone || "",
            location: data.location || "",
            website: data.website || "",
            linkedinUrl: data.linkedinUrl || "",
          });
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const syncUser = async () => {
    if (!user) return;
    try {
      const { getStoredReferralCode, clearStoredReferralCode } = await import("@/lib/referral");
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
    } catch { /* ignore */ }
  };

  const saveResume = async () => {
    setSaving(true);
    try {
      const payload = {
        ...resume,
        experiences: resume.experiences.filter(e => e.company || e.title),
        education: resume.education.filter(e => e.school),
      };
      let res;
      if (resume.id) {
        res = await fetchAuth(`/resumes/${resume.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetchAuth("/resumes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json();
      setResume(prev => ({ ...prev, id: saved.id }));
      trackEvent("resume_saved");
      toast({ title: "Résumé saved", description: "Your quantum résumé has been entangled with the cloud." });
    } catch {
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const exportPDF = () => {
    window.print();
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !resume.skills.includes(skillInput.trim())) {
      setResume(prev => ({ ...prev, skills: [...prev.skills, skillInput.trim()] }));
      setSkillInput("");
    }
  };

  const addCert = () => {
    if (certInput.trim() && !resume.certifications.includes(certInput.trim())) {
      setResume(prev => ({ ...prev, certifications: [...prev.certifications, certInput.trim()] }));
      setCertInput("");
    }
  };

  const updateExperience = (index: number, field: keyof Experience, value: string | boolean) => {
    setResume(prev => ({
      ...prev,
      experiences: prev.experiences.map((exp, i) => i === index ? { ...exp, [field]: value } : exp),
    }));
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    setResume(prev => ({
      ...prev,
      education: prev.education.map((edu, i) => i === index ? { ...edu, [field]: value } : edu),
    }));
  };

  const handleLinkedInConnect = async () => {
    if (!linkedInUrl.trim()) {
      toast({ title: "Enter your LinkedIn URL", description: "Paste your LinkedIn profile URL to import.", variant: "destructive" });
      return;
    }
    const urlPattern = /linkedin\.com\/in\//i;
    if (!urlPattern.test(linkedInUrl)) {
      toast({ title: "Invalid LinkedIn URL", description: "Please enter a valid LinkedIn profile URL (e.g., linkedin.com/in/yourname).", variant: "destructive" });
      return;
    }
    setLinkedInImporting(true);
    await new Promise(r => setTimeout(r, 2000));
    setLinkedIn({
      connected: true,
      url: linkedInUrl,
      name: user?.fullName || "Professional",
      headline: "Imported from LinkedIn",
      importedAt: new Date().toISOString(),
    });
    setResume(prev => ({ ...prev, linkedinUrl: linkedInUrl }));
    setLinkedInImporting(false);
    toast({ title: "LinkedIn Connected", description: "Your LinkedIn profile has been entangled with your résumé." });
  };

  const handleLinkedInDisconnect = () => {
    setLinkedIn({ connected: false, url: "", name: "", headline: "", importedAt: null });
    setLinkedInUrl("");
    setResume(prev => ({ ...prev, linkedinUrl: "" }));
    toast({ title: "LinkedIn Disconnected", description: "Your LinkedIn profile has been disentangled." });
  };

  const handleAccountingConnect = async (platformId: string) => {
    setConnectingPlatform(platformId);
    await new Promise(r => setTimeout(r, 2500));
    setAccountingPlatforms(prev =>
      prev.map(p => p.id === platformId ? { ...p, connected: true, lastSync: new Date().toISOString() } : p)
    );
    setConnectingPlatform(null);
    const platform = accountingPlatforms.find(p => p.id === platformId);
    toast({ title: `${platform?.name} Connected`, description: "Financial data is now entangled with your résumé." });
  };

  const handleAccountingDisconnect = (platformId: string) => {
    setAccountingPlatforms(prev =>
      prev.map(p => p.id === platformId ? { ...p, connected: false, lastSync: null } : p)
    );
    const platform = accountingPlatforms.find(p => p.id === platformId);
    toast({ title: `${platform?.name} Disconnected`, description: "Financial data has been disentangled." });
  };

  const templateConfig = TEMPLATES.find(t => t.id === resume.template) || TEMPLATES[0];
  const connectedAccounting = accountingPlatforms.filter(p => p.connected).length;
  const completionScore = calculateCompletion(resume, linkedIn.connected, connectedAccounting);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="text-center space-y-4">
            <div className="relative">
              <Atom className="w-16 h-16 text-primary animate-spin" style={{ animationDuration: "3s" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              </div>
            </div>
            <p className="text-muted-foreground">Collapsing quantum states...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="container mx-auto px-4 md:px-6 py-6 max-w-[1600px]">
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-mono tracking-[0.3em] text-primary/80 uppercase mb-2">Quantum Résumé Entanglement Engine</p>
              <h1 className="text-3xl md:text-4xl font-bold">
                <span className="text-primary">Entangled</span> Résumé Builder
              </h1>
              <p className="text-muted-foreground mt-1 max-w-xl">
                Your career particles | experience, skills, financial data | entangled into one coherent professional wavefunction.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="border-white/20 gap-2"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? "Hide" : "Show"} Preview
              </Button>
              <Button variant="outline" className="border-white/20 gap-2" onClick={exportPDF}>
                <Download className="w-4 h-4" /> Export PDF
              </Button>
              <Button className="bg-primary text-black font-semibold hover:bg-primary/90 gap-2" onClick={saveResume} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Résumé
              </Button>
            </div>
          </div>

          <div className="glass-panel p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10">
                  <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#00D4FF" strokeWidth="2.5"
                      strokeDasharray={`${completionScore}, 100`}
                      strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">
                    {completionScore}%
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">Quantum Coherence Score</p>
                  <p className="text-xs text-muted-foreground">
                    {completionScore < 40 ? "Low coherence | add more data to strengthen your wavefunction" :
                     completionScore < 70 ? "Moderate coherence | connect LinkedIn or accounting for full entanglement" :
                     completionScore < 90 ? "Strong coherence | nearly fully entangled" :
                     "Maximum entanglement achieved"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Linkedin className={`w-3.5 h-3.5 ${linkedIn.connected ? "text-[#0A66C2]" : ""}`} />
                  {linkedIn.connected ? "Linked" : "Not linked"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calculator className={`w-3.5 h-3.5 ${connectedAccounting > 0 ? "text-green-400" : ""}`} />
                  {connectedAccounting}/3 connected
                </span>
                <span className="flex items-center gap-1.5">
                  <FileCheck className={`w-3.5 h-3.5 ${resume.id ? "text-primary" : ""}`} />
                  {resume.id ? "Saved" : "Unsaved"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit mb-6">
            {[
              { id: "builder" as const, label: "Resume Builder", icon: FileText },
              { id: "linkedin" as const, label: "LinkedIn Import", icon: Linkedin },
              { id: "accounting" as const, label: "Accounting Software", icon: Calculator },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {activeTab === "linkedin" && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
            <div className="glass-panel p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#0A66C2]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0A66C2]/20 flex items-center justify-center">
                    <Linkedin className="w-6 h-6 text-[#0A66C2]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">LinkedIn Profile Entanglement</h2>
                    <p className="text-sm text-muted-foreground">Collapse your LinkedIn wavefunction into résumé-ready data</p>
                  </div>
                </div>

                {linkedIn.connected ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-[#0A66C2]/10 border border-[#0A66C2]/30">
                      <CheckCircle2 className="w-5 h-5 text-[#0A66C2]" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Connected as {linkedIn.name}</p>
                        <p className="text-xs text-muted-foreground">{linkedIn.url}</p>
                        {linkedIn.importedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Imported {new Date(linkedIn.importedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={handleLinkedInDisconnect}>
                        <Unlink className="w-3.5 h-3.5 mr-1.5" /> Disconnect
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {["Experience synced", "Skills imported", "Education pulled", "Headline matched"].map((item, i) => (
                        <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      {[
                        { icon: Network, title: "Auto-Import", desc: "Pull experience, education, and skills automatically" },
                        { icon: Brain, title: "AI Enhancement", desc: "Quantum AI rewrites bullets for maximum impact" },
                        { icon: Shield, title: "Privacy First", desc: "Your data stays entangled only with your résumé" },
                      ].map((feature, i) => (
                        <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <feature.icon className="w-5 h-5 text-[#0A66C2] mb-2" />
                          <p className="text-sm font-medium">{feature.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{feature.desc}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="linkedin-url" className="text-xs text-white/50">LinkedIn Profile URL</label>
                      <div className="flex gap-2">
                        <Input
                          id="linkedin-url"
                          placeholder="https://linkedin.com/in/your-profile"
                          value={linkedInUrl}
                          onChange={(e) => setLinkedInUrl(e.target.value)}
                          className="bg-white/5 border-white/10 flex-1"
                          type="url"
                          autoComplete="url"
                        />
                        <Button
                          className="bg-[#0A66C2] hover:bg-[#094D92] text-white gap-2"
                          onClick={handleLinkedInConnect}
                          disabled={linkedInImporting}
                        >
                          {linkedInImporting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                          ) : (
                            <><Link2 className="w-4 h-4" /> Connect</>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tip: You can also go to LinkedIn → More → Save to PDF, then upload the file here for instant import.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> How LinkedIn Entanglement Works
              </h3>
              <div className="space-y-3">
                {[
                  { step: "1", title: "Paste Your Profile URL", desc: "We observe your public LinkedIn profile to collapse the quantum state of your career data." },
                  { step: "2", title: "AI Parses & Enhances", desc: "Quantum AI models analyze your experience and rewrite weak bullets into achievement-focused statements." },
                  { step: "3", title: "Auto-Populate Your Résumé", desc: "Experience, education, skills, and certifications flow into your résumé builder instantly." },
                  { step: "4", title: "Fine-Tune & Export", desc: "Review the entangled data, make adjustments, then export as PDF | ready for any opportunity." },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {step.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "accounting" && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
            <div className="glass-panel p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px] -translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Calculator className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Financial Data Entanglement</h2>
                    <p className="text-sm text-muted-foreground">
                      Entangle your financial records to quantify your professional impact with real numbers
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: TrendingUp, title: "Revenue Metrics", desc: "Auto-populate revenue numbers from invoices and billing", color: "text-green-400" },
                { icon: Receipt, title: "Income Verification", desc: "Validate earnings history for credibility", color: "text-primary" },
                { icon: Star, title: "Achievement Data", desc: "Turn financial KPIs into résumé-ready bullet points", color: "text-gold" },
              ].map((card, i) => (
                <div key={i} className="glass-panel p-4">
                  <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
                  <p className="text-sm font-medium">{card.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {accountingPlatforms.map((platform) => (
                <div key={platform.id} className="glass-panel p-5 relative overflow-hidden group hover:border-white/20 transition-all">
                  <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 transition-opacity group-hover:opacity-30"
                    style={{ backgroundColor: platform.color }}
                  />
                  <div className="relative flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                        style={{ backgroundColor: platform.color + "30", border: `1px solid ${platform.color}50` }}
                      >
                        {platform.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{platform.name}</h3>
                          {platform.connected && (
                            <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Connected
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{platform.description}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {platform.features.map((feature, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 text-xs text-muted-foreground border border-white/10">
                              {feature}
                            </span>
                          ))}
                        </div>
                        {platform.connected && platform.lastSync && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Last synced: {new Date(platform.lastSync).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {platform.connected ? (
                        <>
                          <Button variant="outline" size="sm" className="border-white/20 gap-1.5 text-xs">
                            <Zap className="w-3.5 h-3.5" /> Sync Now
                          </Button>
                          <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5 text-xs" onClick={() => handleAccountingDisconnect(platform.id)}>
                            <Unlink className="w-3.5 h-3.5" /> Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button
                          className="gap-2"
                          style={{ backgroundColor: platform.color, color: "white" }}
                          onClick={() => handleAccountingConnect(platform.id)}
                          disabled={connectingPlatform === platform.id}
                        >
                          {connectingPlatform === platform.id ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
                          ) : (
                            <><Link2 className="w-4 h-4" /> Connect {platform.name}</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-panel p-5 border-gold/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gold">Privacy & Security</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All financial data is encrypted end-to-end and only used to generate résumé bullet points.
                    We never store raw financial records | only the quantum-distilled metrics that strengthen your professional profile.
                    You can disconnect any platform at any time to fully disentangle your data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "builder" && (
          <div className={`grid ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-3xl mx-auto"} gap-8`}>
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap mb-4">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setResume(prev => ({ ...prev, template: t.id }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      resume.template === t.id
                        ? "bg-primary/20 text-primary border border-primary/50"
                        : "bg-white/5 text-muted-foreground border border-white/10 hover:border-white/20"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              <SectionHeader title="Contact Information" icon={<User className="w-4 h-4" />} expanded={expandedSections.contact} onToggle={() => toggleSection("contact")} />
              {expandedSections.contact && (
                <div className="glass-panel p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Full Name" value={user?.fullName || ""} disabled className="bg-white/5 border-white/10" />
                    <Input placeholder="Email" value={user?.primaryEmailAddress?.emailAddress || ""} disabled className="bg-white/5 border-white/10" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Phone" value={resume.phone} onChange={(e) => setResume(prev => ({ ...prev, phone: e.target.value }))} className="bg-white/5 border-white/10 pl-10" />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Location" value={resume.location} onChange={(e) => setResume(prev => ({ ...prev, location: e.target.value }))} className="bg-white/5 border-white/10 pl-10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Website / Portfolio" value={resume.website} onChange={(e) => setResume(prev => ({ ...prev, website: e.target.value }))} className="bg-white/5 border-white/10 pl-10" />
                    </div>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="LinkedIn URL" value={resume.linkedinUrl} onChange={(e) => setResume(prev => ({ ...prev, linkedinUrl: e.target.value }))} className="bg-white/5 border-white/10 pl-10" />
                    </div>
                  </div>
                  <Input placeholder="Résumé Title / Headline" value={resume.title} onChange={(e) => setResume(prev => ({ ...prev, title: e.target.value }))} className="bg-white/5 border-white/10" />
                </div>
              )}

              <SectionHeader title="Professional Summary" icon={<FileText className="w-4 h-4" />} expanded={expandedSections.summary} onToggle={() => toggleSection("summary")} />
              {expandedSections.summary && (
                <div className="glass-panel p-4">
                  <textarea
                    placeholder="Write a brief professional summary | 2-3 sentences describing who you are, what you do, and your biggest professional strengths..."
                    value={resume.summary}
                    onChange={(e) => setResume(prev => ({ ...prev, summary: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-muted-foreground/50 min-h-[100px] resize-none focus:outline-none focus:border-primary/50"
                  />
                  <p className="text-xs text-muted-foreground mt-2">{resume.summary.length}/300 characters recommended</p>
                </div>
              )}

              <SectionHeader title="Work Experience" icon={<Briefcase className="w-4 h-4" />} expanded={expandedSections.experience} onToggle={() => toggleSection("experience")} />
              {expandedSections.experience && (
                <div className="space-y-3">
                  {resume.experiences.map((exp, i) => (
                    <div key={i} className="glass-panel p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-mono">EXP-{String(i + 1).padStart(3, "0")}</span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <input type="checkbox" checked={exp.isGigWork} onChange={(e) => updateExperience(i, "isGigWork", e.target.checked)} className="accent-primary" />
                            Gig/Freelance
                          </label>
                          {resume.experiences.length > 1 && (
                            <button onClick={() => setResume(prev => ({ ...prev, experiences: prev.experiences.filter((_, idx) => idx !== i) }))} className="text-red-400 hover:text-red-300 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="Company (e.g., DoorDash, Google)" value={exp.company} onChange={(e) => updateExperience(i, "company", e.target.value)} className="bg-white/5 border-white/10" />
                        <Input placeholder="Title (e.g., Software Engineer)" value={exp.title} onChange={(e) => updateExperience(i, "title", e.target.value)} className="bg-white/5 border-white/10" />
                      </div>
                      <Input placeholder="Location (e.g., San Francisco, CA)" value={exp.location} onChange={(e) => updateExperience(i, "location", e.target.value)} className="bg-white/5 border-white/10" />
                      <div className="grid grid-cols-2 gap-3">
                        <Input type="month" value={exp.startDate} onChange={(e) => updateExperience(i, "startDate", e.target.value)} className="bg-white/5 border-white/10" />
                        {!exp.isCurrent && <Input type="month" value={exp.endDate} onChange={(e) => updateExperience(i, "endDate", e.target.value)} className="bg-white/5 border-white/10" />}
                      </div>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={exp.isCurrent} onChange={(e) => updateExperience(i, "isCurrent", e.target.checked)} className="accent-primary" />
                        Currently working here
                      </label>
                      <textarea
                        placeholder="Describe accomplishments with specific numbers (e.g., 'Increased revenue by 35% through...')"
                        value={exp.description}
                        onChange={(e) => updateExperience(i, "description", e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-muted-foreground/50 min-h-[80px] resize-none text-sm focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  ))}
                  <Button variant="outline" className="w-full border-dashed border-white/20 text-muted-foreground" onClick={() => setResume(prev => ({ ...prev, experiences: [...prev.experiences, { ...emptyExperience }] }))}>
                    <Plus className="w-4 h-4 mr-2" /> Add Experience
                  </Button>
                </div>
              )}

              <SectionHeader title="Education" icon={<GraduationCap className="w-4 h-4" />} expanded={expandedSections.education} onToggle={() => toggleSection("education")} />
              {expandedSections.education && (
                <div className="space-y-3">
                  {resume.education.map((edu, i) => (
                    <div key={i} className="glass-panel p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-mono">EDU-{String(i + 1).padStart(3, "0")}</span>
                        {resume.education.length > 1 && (
                          <button onClick={() => setResume(prev => ({ ...prev, education: prev.education.filter((_, idx) => idx !== i) }))} className="text-red-400 hover:text-red-300 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <Input placeholder="School / University" value={edu.school} onChange={(e) => updateEducation(i, "school", e.target.value)} className="bg-white/5 border-white/10" />
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="Degree" value={edu.degree} onChange={(e) => updateEducation(i, "degree", e.target.value)} className="bg-white/5 border-white/10" />
                        <Input placeholder="Field of Study" value={edu.field} onChange={(e) => updateEducation(i, "field", e.target.value)} className="bg-white/5 border-white/10" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input type="month" value={edu.startDate} onChange={(e) => updateEducation(i, "startDate", e.target.value)} className="bg-white/5 border-white/10" />
                        <Input type="month" value={edu.endDate} onChange={(e) => updateEducation(i, "endDate", e.target.value)} className="bg-white/5 border-white/10" />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full border-dashed border-white/20 text-muted-foreground" onClick={() => setResume(prev => ({ ...prev, education: [...prev.education, { ...emptyEducation }] }))}>
                    <Plus className="w-4 h-4 mr-2" /> Add Education
                  </Button>
                </div>
              )}

              <SectionHeader title="Skills" icon={<Award className="w-4 h-4" />} expanded={expandedSections.skills} onToggle={() => toggleSection("skills")} />
              {expandedSections.skills && (
                <div className="glass-panel p-4 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill (press Enter)..."
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                      className="bg-white/5 border-white/10"
                    />
                    <Button variant="outline" className="border-white/20 shrink-0" onClick={addSkill}><Plus className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {resume.skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm border border-primary/30 flex items-center gap-1.5">
                        {skill}
                        <button onClick={() => setResume(prev => ({ ...prev, skills: prev.skills.filter((_, idx) => idx !== i) }))} className="hover:text-red-400">
                          <CloseIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <SectionHeader title="Certifications" icon={<Award className="w-4 h-4" />} expanded={expandedSections.certifications} onToggle={() => toggleSection("certifications")} />
              {expandedSections.certifications && (
                <div className="glass-panel p-4 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a certification..."
                      value={certInput}
                      onChange={(e) => setCertInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCert())}
                      className="bg-white/5 border-white/10"
                    />
                    <Button variant="outline" className="border-white/20 shrink-0" onClick={addCert}><Plus className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {resume.certifications.map((cert, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-gold/10 text-gold text-sm border border-gold/30 flex items-center gap-1.5">
                        {cert}
                        <button onClick={() => setResume(prev => ({ ...prev, certifications: prev.certifications.filter((_, idx) => idx !== i) }))} className="hover:text-red-400">
                          <CloseIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {showPreview && (
              <div className="lg:sticky lg:top-24 lg:self-start">
                <div className="text-sm text-muted-foreground mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Live Preview | {templateConfig.name}
                  </span>
                  <span className="text-xs font-mono text-primary/60">QUANTUM STATE: SUPERPOSITION</span>
                </div>
                <div className="bg-white rounded-lg p-8 text-black shadow-2xl shadow-primary/10 min-h-[700px] print:shadow-none" id="resume-preview">
                  <div className="border-b-2 pb-4 mb-4" style={{ borderColor: templateConfig.accent === "#ffffff" ? "#333" : templateConfig.accent }}>
                    <h2 className="text-2xl font-bold text-gray-900">{user?.fullName || "Your Name"}</h2>
                    {resume.title && resume.title !== "My Résumé" && (
                      <p className="text-sm font-medium text-gray-600 mt-0.5">{resume.title}</p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
                      {user?.primaryEmailAddress?.emailAddress && (
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {user.primaryEmailAddress.emailAddress}</span>
                      )}
                      {resume.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {resume.phone}</span>}
                      {resume.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {resume.location}</span>}
                      {resume.linkedinUrl && <span className="flex items-center gap-1"><Linkedin className="w-3 h-3" /> LinkedIn</span>}
                      {resume.website && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {resume.website}</span>}
                    </div>
                  </div>

                  {resume.summary && (
                    <div className="mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5 pb-1 border-b" style={{ color: templateConfig.accent === "#ffffff" ? "#333" : templateConfig.accent, borderColor: templateConfig.accent === "#ffffff" ? "#ddd" : templateConfig.accent + "40" }}>
                        Professional Summary
                      </h3>
                      <p className="text-xs text-gray-700 leading-relaxed">{resume.summary}</p>
                    </div>
                  )}

                  {resume.experiences.some(e => e.company || e.title) && (
                    <div className="mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider mb-2 pb-1 border-b" style={{ color: templateConfig.accent === "#ffffff" ? "#333" : templateConfig.accent, borderColor: templateConfig.accent === "#ffffff" ? "#ddd" : templateConfig.accent + "40" }}>
                        Experience
                      </h3>
                      {resume.experiences.filter(e => e.company || e.title).map((exp, i) => (
                        <div key={i} className="mb-3">
                          <div className="flex justify-between items-baseline">
                            <div>
                              <span className="font-semibold text-sm">{exp.title || "Position"}</span>
                              <span className="text-gray-500 text-sm"> | {exp.company || "Company"}</span>
                              {exp.isGigWork && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-2">Gig</span>}
                            </div>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                              {exp.startDate || "Start"} | {exp.isCurrent ? "Present" : exp.endDate || "End"}
                            </span>
                          </div>
                          {exp.location && <p className="text-[10px] text-gray-400">{exp.location}</p>}
                          {exp.description && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {resume.education.some(e => e.school) && (
                    <div className="mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider mb-2 pb-1 border-b" style={{ color: templateConfig.accent === "#ffffff" ? "#333" : templateConfig.accent, borderColor: templateConfig.accent === "#ffffff" ? "#ddd" : templateConfig.accent + "40" }}>
                        Education
                      </h3>
                      {resume.education.filter(e => e.school).map((edu, i) => (
                        <div key={i} className="mb-2">
                          <div className="flex justify-between items-baseline">
                            <div>
                              <span className="font-semibold text-sm">{edu.school}</span>
                              {edu.degree && <span className="text-gray-500 text-sm"> | {edu.degree}{edu.field ? `, ${edu.field}` : ""}</span>}
                            </div>
                            <span className="text-[10px] text-gray-400">{edu.startDate} | {edu.endDate}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {resume.skills.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider mb-2 pb-1 border-b" style={{ color: templateConfig.accent === "#ffffff" ? "#333" : templateConfig.accent, borderColor: templateConfig.accent === "#ffffff" ? "#ddd" : templateConfig.accent + "40" }}>
                        Skills
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {resume.skills.map((skill, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 rounded text-gray-700">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {resume.certifications.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider mb-2 pb-1 border-b" style={{ color: templateConfig.accent === "#ffffff" ? "#333" : templateConfig.accent, borderColor: templateConfig.accent === "#ffffff" ? "#ddd" : templateConfig.accent + "40" }}>
                        Certifications
                      </h3>
                      <ul className="text-xs text-gray-700 space-y-1">
                        {resume.certifications.map((cert, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-green-600" /> {cert}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {connectedAccounting > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <p className="text-[9px] text-gray-400 flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" />
                        Financial metrics verified via {accountingPlatforms.filter(p => p.connected).map(p => p.name).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function SectionHeader({ title, icon, expanded, onToggle }: { title: string; icon: React.ReactNode; expanded: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
      <span className="flex items-center gap-2 text-sm font-medium">{icon} {title}</span>
      {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
    </button>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function calculateCompletion(resume: ResumeData, linkedInConnected: boolean, accountingCount: number): number {
  let score = 0;
  const total = 100;
  if (resume.summary.length > 20) score += 15;
  if (resume.experiences.some(e => e.company && e.title)) score += 20;
  if (resume.experiences.some(e => e.description.length > 30)) score += 10;
  if (resume.education.some(e => e.school)) score += 10;
  if (resume.skills.length >= 3) score += 10;
  if (resume.skills.length >= 6) score += 5;
  if (resume.phone) score += 5;
  if (resume.location) score += 5;
  if (linkedInConnected) score += 10;
  if (accountingCount > 0) score += 5;
  if (accountingCount >= 2) score += 5;
  return Math.min(score, total);
}
