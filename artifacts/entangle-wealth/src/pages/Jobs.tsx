import { useState, useEffect, useCallback } from "react";
import { trackEvent } from "@/lib/trackEvent";
import { Search, MapPin, Briefcase, Clock, ExternalLink, Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useUser, useAuth } from "@clerk/react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/authFetch";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  jobType: string;
  description: string;
  applyUrl: string | null;
  postedDate: string;
  source: string;
  companyLogo: string | null;
  isRemote: boolean;
}

export default function Jobs() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [jobType] = useState("");
  const [remoteOnly] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);

  const searchJobs = useCallback(async (resetPage = true) => {
    const searchPage = resetPage ? 1 : page;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (location) params.set("location", location);
      if (jobType) params.set("type", jobType);
      if (remoteOnly) params.set("remote", "true");
      params.set("page", String(searchPage));

      const res = await authFetch(`/jobs/search?${params.toString()}`, getToken);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();

      if (resetPage) {
        setJobs(data.jobs);
        setPage(1);
      } else {
        setJobs(prev => [...prev, ...data.jobs]);
      }
      setHasMore(data.hasMore);
      setHasSearched(true);
    } catch {
      toast({ title: "Search failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [query, location, jobType, remoteOnly, page, toast]);

  useEffect(() => {
    if (user) searchJobs(true);
  }, [user]);

  const saveJob = async (job: Job) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to save jobs." });
      return;
    }
    try {
      const res = await authFetch("/jobs/save", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: job.title,
          company: job.company,
          location: job.location,
          salary: job.salary,
          jobType: job.jobType,
          sourceUrl: job.applyUrl,
          source: job.source,
          externalId: job.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSavedJobIds(prev => new Set(prev).add(job.id));
      trackEvent("job_saved", { company: job.company });
      toast({ title: "Job saved", description: `${job.title} at ${job.company} saved to your profile.` });
    } catch {
      toast({ title: "Error", description: "Failed to save job.", variant: "destructive" });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 md:px-6 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Briefcase className="w-9 h-9 text-primary" />
            Job Search
          </h1>
          <p className="text-muted-foreground text-lg">Find your next opportunity | full-time, freelance, or gig work</p>
        </div>

        <div className="glass-panel p-6 mb-6">
          <form onSubmit={(e) => { e.preventDefault(); searchJobs(true); }} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Job title, keywords, or company..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-border"
              />
            </div>
            <div className="relative flex-1 max-w-xs">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10 bg-muted/50 border-border"
              />
            </div>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="ml-2">Search</span>
            </Button>
          </form>
        </div>

        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="glass-panel p-6 hover:border-primary/30 transition-colors">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-foreground truncate">{job.title}</h3>
                    {job.isRemote && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 whitespace-nowrap">
                        Remote
                      </span>
                    )}
                  </div>
                  <p className="text-primary font-medium mb-2">{job.company}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                    <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{job.jobType}</span>
                    {job.salary && <span className="text-green-400 font-medium">{job.salary}</span>}
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDate(job.postedDate)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {job.applyUrl ? (
                    <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1">
                        Apply <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  ) : (
                    <Button size="sm" variant="outline" className="border-border text-muted-foreground" disabled>
                      Demo listing
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className={savedJobIds.has(job.id) ? "text-gold" : "text-muted-foreground hover:text-gold"}
                    onClick={() => saveJob(job)}
                    disabled={savedJobIds.has(job.id)}
                  >
                    {savedJobIds.has(job.id) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground/50">Source: {job.source}</div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {!loading && hasSearched && jobs.length === 0 && (
            <div className="text-center py-16 border border-border rounded-lg bg-muted/30">
              <Briefcase className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-[11px] font-mono text-muted-foreground/50">&gt; NO JOB LISTINGS IN FEED</p>
              <p className="text-[9px] font-mono text-muted-foreground/30 mt-2 max-w-md mx-auto">
                Search above to find positions matching your profile
              </p>
            </div>
          )}

          {!loading && hasMore && jobs.length > 0 && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                className="border-primary/30 text-primary"
                onClick={() => { setPage(p => p + 1); searchJobs(false); }}
              >
                Load More Jobs
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
