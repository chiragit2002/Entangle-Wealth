import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { Shield, ShieldCheck, Loader2, ExternalLink, User, Check, X, RefreshCw, FileText, Calendar, MapPin, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface KycSubmission {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  kycStatus: string;
  kycSubmittedAt: string | null;
  kycVerifiedAt: string | null;
  kycIdPhotoPath: string | null;
  kycSelfiePath: string | null;
  kycFullLegalName: string | null;
  kycDateOfBirth: string | null;
  kycAddress: string | null;
  kycIdType: string | null;
  kycIdNumber: string | null;
  idPhotoUrl: string | null;
  selfieUrl: string | null;
}

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export default function AdminKyc() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/kyc/admin/submissions", getToken);
      if (res.ok) {
        setSubmissions(await res.json());
      } else if (res.status === 403) {
        toast({ title: "Access Denied", description: "Admin access required.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to load submissions.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleApprove = async (userId: string) => {
    setActionLoading(userId + "-approve");
    try {
      const res = await authFetch(`/kyc/approve/${userId}`, getToken, { method: "POST" });
      if (res.ok) {
        setSubmissions(prev => prev.filter(s => s.id !== userId));
        toast({ title: "KYC Approved", description: "User identity verified successfully." });
      } else {
        toast({ title: "Error", description: "Failed to approve KYC.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to approve KYC.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId + "-reject");
    try {
      const res = await authFetch(`/kyc/reject/${userId}`, getToken, { method: "POST" });
      if (res.ok) {
        setSubmissions(prev => prev.filter(s => s.id !== userId));
        toast({ title: "KYC Rejected", description: "User submission rejected." });
      } else {
        toast({ title: "Error", description: "Failed to reject KYC.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to reject KYC.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const getDocUrl = (path: string) => `${BASE_URL}/api/storage${path}`;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">KYC Review</h1>
              <p className="text-sm text-muted-foreground">Admin · Identity Verification Queue</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-white/20 gap-2" onClick={fetchSubmissions} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="glass-panel p-12 text-center">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-green-400 opacity-60" />
            <p className="text-lg font-semibold">No pending submissions</p>
            <p className="text-sm text-muted-foreground mt-1">All KYC reviews are up to date.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">{submissions.length} pending submission{submissions.length !== 1 ? "s" : ""}</p>
            {submissions.map(s => (
              <div key={s.id} className="glass-panel p-6 rounded-xl">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-white/60" />
                    </div>
                    <div>
                      <p className="font-semibold">{s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : s.email}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                      {s.kycSubmittedAt && (
                        <p className="text-xs text-muted-foreground">Submitted {new Date(s.kycSubmittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      )}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    <Shield className="w-3 h-3" /> Pending Review
                  </span>
                </div>

                {(s.kycFullLegalName || s.kycDateOfBirth || s.kycAddress || s.kycIdType) && (
                  <div className="mb-4 p-4 rounded-lg border border-white/5 bg-white/[0.02]">
                    <p className="text-xs text-white/50 mb-3 font-medium uppercase tracking-wide flex items-center gap-1.5">
                      <FileText className="w-3 h-3" /> Submitted Information
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {s.kycFullLegalName && (
                        <div className="flex items-start gap-2">
                          <User className="w-3.5 h-3.5 text-white/30 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wide">Full Legal Name</p>
                            <p className="text-sm text-white font-medium">{s.kycFullLegalName}</p>
                          </div>
                        </div>
                      )}
                      {s.kycDateOfBirth && (
                        <div className="flex items-start gap-2">
                          <Calendar className="w-3.5 h-3.5 text-white/30 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wide">Date of Birth</p>
                            <p className="text-sm text-white font-medium">{s.kycDateOfBirth}</p>
                          </div>
                        </div>
                      )}
                      {s.kycAddress && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-white/30 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wide">Address</p>
                            <p className="text-sm text-white font-medium">{s.kycAddress}</p>
                          </div>
                        </div>
                      )}
                      {s.kycIdType && (
                        <div className="flex items-start gap-2">
                          <CreditCard className="w-3.5 h-3.5 text-white/30 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wide">ID Type / Number</p>
                            <p className="text-sm text-white font-medium">{s.kycIdType}{s.kycIdNumber ? ` — ${s.kycIdNumber}` : ""}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(s.idPhotoUrl || s.selfieUrl) && (
                  <div className="mb-4">
                    <p className="text-xs text-white/50 mb-2 font-medium uppercase tracking-wide">Uploaded Documents</p>
                    <div className="grid grid-cols-2 gap-3">
                      {s.idPhotoUrl && (
                        <div>
                          <p className="text-xs text-white/40 mb-1">Government ID</p>
                          <div
                            className="relative cursor-pointer group"
                            onClick={() => setPreviewUrl(getDocUrl(s.kycIdPhotoPath!))}
                          >
                            <img
                              src={getDocUrl(s.kycIdPhotoPath!)}
                              alt="Government ID"
                              className="w-full h-36 object-cover rounded-lg border border-white/10 group-hover:border-primary/40 transition-colors"
                              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
                              <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <a href={getDocUrl(s.kycIdPhotoPath!)} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary/60 hover:text-primary mt-1 inline-flex items-center gap-0.5">
                            Open full size <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}
                      {s.selfieUrl && (
                        <div>
                          <p className="text-xs text-white/40 mb-1">Selfie with ID</p>
                          <div
                            className="relative cursor-pointer group"
                            onClick={() => setPreviewUrl(getDocUrl(s.kycSelfiePath!))}
                          >
                            <img
                              src={getDocUrl(s.kycSelfiePath!)}
                              alt="Selfie with ID"
                              className="w-full h-36 object-cover rounded-lg border border-white/10 group-hover:border-primary/40 transition-colors"
                              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
                              <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <a href={getDocUrl(s.kycSelfiePath!)} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary/60 hover:text-primary mt-1 inline-flex items-center gap-0.5">
                            Open full size <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!s.kycFullLegalName && !s.kycDateOfBirth && !s.idPhotoUrl && !s.selfieUrl && (
                  <div className="mb-4 p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                    <p className="text-xs text-white/40">No details or documents in this submission</p>
                  </div>
                )}

                <div className="flex gap-3 pt-3 border-t border-white/10">
                  <Button
                    className="flex-1 bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 gap-2"
                    variant="outline"
                    onClick={() => handleApprove(s.id)}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === s.id + "-approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Approve
                  </Button>
                  <Button
                    className="flex-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 gap-2"
                    variant="outline"
                    onClick={() => handleReject(s.id)}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === s.id + "-reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {previewUrl && (
          <div
            className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewUrl(null)}
          >
            <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
              <button
                className="absolute -top-10 right-0 text-white/60 hover:text-white"
                onClick={() => setPreviewUrl(null)}
              >
                <X className="w-6 h-6" />
              </button>
              <img src={previewUrl} alt="Document preview" className="w-full rounded-xl border border-white/20" />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
