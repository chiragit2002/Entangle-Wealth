import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import { FileText, Plus, Trash2, GripVertical, Briefcase, GraduationCap, Award, Save, Download, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "/api";

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

interface ResumeData {
  id?: number;
  title: string;
  template: string;
  summary: string;
  skills: string[];
  certifications: string[];
  experiences: Experience[];
  education: Education[];
}

const TEMPLATES = [
  { id: "professional", name: "Professional", accent: "#00D4FF" },
  { id: "modern", name: "Modern", accent: "#FFD700" },
  { id: "minimal", name: "Minimal", accent: "#ffffff" },
];

const emptyExperience: Experience = { company: "", title: "", location: "", startDate: "", endDate: "", isCurrent: false, description: "", isGigWork: false };
const emptyEducation: Education = { school: "", degree: "", field: "", startDate: "", endDate: "" };

export default function Resume() {
  const { user } = useUser();
  const { toast } = useToast();
  const [resume, setResume] = useState<ResumeData>({
    title: "My Résumé",
    template: "professional",
    summary: "",
    skills: [],
    certifications: [],
    experiences: [{ ...emptyExperience }],
    education: [{ ...emptyEducation }],
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [skillInput, setSkillInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    contact: true, summary: true, experience: true, education: true, skills: true, certifications: false,
  });

  useEffect(() => {
    loadResume();
  }, []);

  const loadResume = async () => {
    try {
      const res = await fetch(`${API_BASE}/resumes`);
      if (!res.ok) { setLoading(false); return; }
      const resumes = await res.json();
      if (resumes.length > 0) {
        const detailRes = await fetch(`${API_BASE}/resumes/${resumes[0].id}`);
        if (detailRes.ok) {
          const data = await detailRes.json();
          setResume({
            id: data.id,
            title: data.title || "My Résumé",
            template: data.template || "professional",
            summary: data.summary || "",
            skills: data.skills || [],
            certifications: data.certifications || [],
            experiences: data.experiences?.length > 0
              ? data.experiences.map((e: any) => ({ ...e, isCurrent: e.isCurrent === "true", isGigWork: e.isGigWork === "true" }))
              : [{ ...emptyExperience }],
            education: data.education?.length > 0 ? data.education : [{ ...emptyEducation }],
          });
        }
      }
    } catch {
      // No saved resume yet
    } finally {
      setLoading(false);
    }
  };

  const syncUser = async () => {
    if (!user) return;
    try {
      await fetch(`${API_BASE}/users/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.primaryEmailAddress?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          photoUrl: user.imageUrl,
        }),
      });
    } catch { /* ignore */ }
  };

  useEffect(() => { syncUser(); }, [user]);

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
        res = await fetch(`${API_BASE}/resumes/${resume.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/resumes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json();
      setResume(prev => ({ ...prev, id: saved.id }));
      toast({ title: "Résumé saved", description: "Your résumé has been saved successfully." });
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

  const templateConfig = TEMPLATES.find(t => t.id === resume.template) || TEMPLATES[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="container mx-auto px-4 md:px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              Résumé Builder
            </h1>
            <p className="text-muted-foreground mt-1">Build your professional résumé — gig work, freelance, corporate, all welcome</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-white/20 gap-2" onClick={exportPDF}>
              <Download className="w-4 h-4" /> Export PDF
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" onClick={saveResume} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setResume(prev => ({ ...prev, template: t.id }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                resume.template === t.id
                  ? "bg-primary/20 text-primary border border-primary/50"
                  : "bg-white/5 text-muted-foreground border border-white/10 hover:border-white/20"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <SectionHeader title="Contact Information" icon={<GripVertical className="w-4 h-4" />} expanded={expandedSections.contact} onToggle={() => toggleSection("contact")} />
            {expandedSections.contact && (
              <div className="glass-panel p-4 space-y-3">
                <Input placeholder="Full Name" value={user?.fullName || ""} disabled className="bg-white/5 border-white/10" />
                <Input placeholder="Email" value={user?.primaryEmailAddress?.emailAddress || ""} disabled className="bg-white/5 border-white/10" />
                <Input placeholder="Résumé Title" value={resume.title} onChange={(e) => setResume(prev => ({ ...prev, title: e.target.value }))} className="bg-white/5 border-white/10" />
              </div>
            )}

            <SectionHeader title="Professional Summary" icon={<FileText className="w-4 h-4" />} expanded={expandedSections.summary} onToggle={() => toggleSection("summary")} />
            {expandedSections.summary && (
              <div className="glass-panel p-4">
                <textarea
                  placeholder="Write a brief professional summary..."
                  value={resume.summary}
                  onChange={(e) => setResume(prev => ({ ...prev, summary: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-muted-foreground/50 min-h-[100px] resize-none focus:outline-none focus:border-primary/50"
                />
              </div>
            )}

            <SectionHeader title="Work Experience" icon={<Briefcase className="w-4 h-4" />} expanded={expandedSections.experience} onToggle={() => toggleSection("experience")} />
            {expandedSections.experience && (
              <div className="space-y-3">
                {resume.experiences.map((exp, i) => (
                  <div key={i} className="glass-panel p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Experience #{i + 1}</span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <input type="checkbox" checked={exp.isGigWork} onChange={(e) => updateExperience(i, "isGigWork", e.target.checked)} className="accent-primary" />
                          Gig/Freelance
                        </label>
                        {resume.experiences.length > 1 && (
                          <button onClick={() => setResume(prev => ({ ...prev, experiences: prev.experiences.filter((_, idx) => idx !== i) }))} className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Company (e.g., DoorDash)" value={exp.company} onChange={(e) => updateExperience(i, "company", e.target.value)} className="bg-white/5 border-white/10" />
                      <Input placeholder="Title (e.g., Delivery Driver)" value={exp.title} onChange={(e) => updateExperience(i, "title", e.target.value)} className="bg-white/5 border-white/10" />
                    </div>
                    <Input placeholder="Location" value={exp.location} onChange={(e) => updateExperience(i, "location", e.target.value)} className="bg-white/5 border-white/10" />
                    <div className="grid grid-cols-2 gap-3">
                      <Input type="month" placeholder="Start Date" value={exp.startDate} onChange={(e) => updateExperience(i, "startDate", e.target.value)} className="bg-white/5 border-white/10" />
                      {!exp.isCurrent && <Input type="month" placeholder="End Date" value={exp.endDate} onChange={(e) => updateExperience(i, "endDate", e.target.value)} className="bg-white/5 border-white/10" />}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="checkbox" checked={exp.isCurrent} onChange={(e) => updateExperience(i, "isCurrent", e.target.checked)} className="accent-primary" />
                      Currently working here
                    </label>
                    <textarea
                      placeholder="Describe your responsibilities and achievements..."
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
                      <span className="text-xs text-muted-foreground">Education #{i + 1}</span>
                      {resume.education.length > 1 && (
                        <button onClick={() => setResume(prev => ({ ...prev, education: prev.education.filter((_, idx) => idx !== i) }))} className="text-red-400 hover:text-red-300">
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
                      <Input type="month" placeholder="Start" value={edu.startDate} onChange={(e) => updateEducation(i, "startDate", e.target.value)} className="bg-white/5 border-white/10" />
                      <Input type="month" placeholder="End" value={edu.endDate} onChange={(e) => updateEducation(i, "endDate", e.target.value)} className="bg-white/5 border-white/10" />
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
                  <Input placeholder="Add a skill..." value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} className="bg-white/5 border-white/10" />
                  <Button variant="outline" className="border-white/20" onClick={addSkill}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {resume.skills.map((skill, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm border border-primary/30 flex items-center gap-1.5">
                      {skill}
                      <button onClick={() => setResume(prev => ({ ...prev, skills: prev.skills.filter((_, idx) => idx !== i) }))} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <SectionHeader title="Certifications" icon={<Award className="w-4 h-4" />} expanded={expandedSections.certifications} onToggle={() => toggleSection("certifications")} />
            {expandedSections.certifications && (
              <div className="glass-panel p-4 space-y-3">
                <div className="flex gap-2">
                  <Input placeholder="Add a certification..." value={certInput} onChange={(e) => setCertInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCert())} className="bg-white/5 border-white/10" />
                  <Button variant="outline" className="border-white/20" onClick={addCert}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {resume.certifications.map((cert, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-gold/10 text-gold text-sm border border-gold/30 flex items-center gap-1.5">
                      {cert}
                      <button onClick={() => setResume(prev => ({ ...prev, certifications: prev.certifications.filter((_, idx) => idx !== i) }))} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live Preview
            </div>
            <div className="bg-white rounded-lg p-8 text-black shadow-2xl shadow-primary/10 min-h-[600px] print:shadow-none" id="resume-preview">
              <div className="border-b-2 pb-4 mb-4" style={{ borderColor: templateConfig.accent }}>
                <h2 className="text-2xl font-bold text-gray-900">{user?.fullName || "Your Name"}</h2>
                <p className="text-sm text-gray-500">{user?.primaryEmailAddress?.emailAddress || "email@example.com"}</p>
              </div>

              {resume.summary && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: templateConfig.accent === "#ffffff" ? "#333" : templateConfig.accent }}>Professional Summary</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{resume.summary}</p>
                </div>
              )}

              {resume.experiences.some(e => e.company || e.title) && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: templateConfig.accent === "#ffffff" ? "#333" : templateConfig.accent }}>Experience</h3>
                  {resume.experiences.filter(e => e.company || e.title).map((exp, i) => (
                    <div key={i} className="mb-3">
                      <div className="flex justify-between items-baseline">
                        <div>
                          <span className="font-semibold text-sm">{exp.title || "Position"}</span>
                          <span className="text-gray-500 text-sm"> — {exp.company || "Company"}</span>
                          {exp.isGigWork && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-2">Gig</span>}
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                          {exp.startDate || "Start"} — {exp.isCurrent ? "Present" : exp.endDate || "End"}
                        </span>
                      </div>
                      {exp.location && <p className="text-xs text-gray-400">{exp.location}</p>}
                      {exp.description && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{exp.description}</p>}
                    </div>
                  ))}
                </div>
              )}

              {resume.education.some(e => e.school) && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: templateConfig.accent === "#ffffff" ? "#333" : templateConfig.accent }}>Education</h3>
                  {resume.education.filter(e => e.school).map((edu, i) => (
                    <div key={i} className="mb-2">
                      <div className="flex justify-between items-baseline">
                        <div>
                          <span className="font-semibold text-sm">{edu.school}</span>
                          {edu.degree && <span className="text-gray-500 text-sm"> — {edu.degree}{edu.field ? `, ${edu.field}` : ""}</span>}
                        </div>
                        <span className="text-xs text-gray-400">{edu.startDate} — {edu.endDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {resume.skills.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: templateConfig.accent === "#ffffff" ? "#333" : templateConfig.accent }}>Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {resume.skills.map((skill, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-700">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {resume.certifications.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: templateConfig.accent === "#ffffff" ? "#333" : templateConfig.accent }}>Certifications</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {resume.certifications.map((cert, i) => (
                      <li key={i}>• {cert}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
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

function X({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
