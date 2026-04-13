import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare } from "lucide-react";
import { ReferralSection } from "@/components/viral/ReferralSection";
import { TestimonialForm } from "@/components/viral/TestimonialForm";
import { trackEvent } from "@/lib/trackEvent";
import { useAuth } from "@clerk/react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { authFetch } from "@/lib/authFetch";
import { Calendar, Briefcase, CreditCard, Plus, ThumbsUp, MessageCircle, Share2, MapPin, Video, Clock, DollarSign, ExternalLink } from "lucide-react";

type Tab = "communities" | "feed" | "events" | "jobs" | "pricing";

interface Community {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  iconBg: string;
  members: number;
  posts: number;
  joined: boolean;
}

interface Post {
  id: string;
  author: string;
  avatar: string;
  avatarBg: string;
  time: string;
  body: string;
  likes: number;
  comments: number;
  liked: boolean;
}

interface Event {
  id: string;
  date: string;
  title: string;
  meta: string;
  type: "upcoming" | "virtual" | "inperson";
  rsvped: boolean;
}

interface Job {
  id: string;
  title: string;
  company: string;
  meta: string;
  salary: string;
  category: string;
}

const INITIAL_COMMUNITIES: Community[] = [
  { id: "1", name: "Options Flow Traders", category: "trading", description: "Discussion on unusual options activity, Greeks analysis, and flow signals. Share setups and learn from experienced traders.", icon: "📈", iconBg: "rgba(255,140,0,0.15)", members: 2847, posts: 342, joined: false },
  { id: "2", name: "Real Estate Investors", category: "realestate", description: "Buy, sell, flip, and hold strategies. Market analysis, deal reviews, and networking for real estate investors.", icon: "🏠", iconBg: "rgba(255,215,0,0.15)", members: 1523, posts: 189, joined: false },
  { id: "3", name: "Tax Strategy Hub", category: "tax", description: "Tax optimization, deduction strategies, IRS updates, and CPA recommendations for small business owners.", icon: "📊", iconBg: "rgba(255,140,0,0.15)", members: 3201, posts: 567, joined: false },
  { id: "4", name: "Tech Builders", category: "tech", description: "Software developers, startup founders, and tech professionals sharing opportunities and knowledge.", icon: "💻", iconBg: "rgba(255,140,0,0.15)", members: 4102, posts: 891, joined: false },
  { id: "5", name: "Gig Economy Workers", category: "gig", description: "DoorDash, Uber, TaskRabbit, and freelance workers sharing tips, tax strategies, and gig opportunities.", icon: "🛠️", iconBg: "rgba(255,215,0,0.15)", members: 1876, posts: 234, joined: false },
  { id: "6", name: "Crypto & DeFi", category: "trading", description: "Cryptocurrency analysis, DeFi protocols, and digital asset strategies for serious investors.", icon: "⚡", iconBg: "rgba(255,51,102,0.15)", members: 5234, posts: 1203, joined: false },
];

const INITIAL_POSTS: Post[] = [
  { id: "1", author: "Marcus T.", avatar: "MT", avatarBg: "#00d4ff", time: "2 hours ago", body: "Just found $3,200 in missed deductions using the TaxFlow receipt scanner. If you're a gig worker, you NEED to be tracking every mile and every meal. The IRS won't remind you | but EntangleWealth will.", likes: 47, comments: 12, liked: false },
  { id: "2", author: "Sarah K.", avatar: "SK", avatarBg: "#FFB800", time: "5 hours ago", body: "The options flow signals have been incredible this week. Caught that NVDA unusual activity alert before the 8% move. Who else was in on that trade?", likes: 83, comments: 24, liked: false },
  { id: "3", author: "David L.", avatar: "DL", avatarBg: "#FF8C00", time: "8 hours ago", body: "Pro tip for gig workers: keep a separate business bank account. Makes tax time 10x easier and the IRS loves clear documentation. My CPA thanked me.", likes: 31, comments: 8, liked: false },
  { id: "4", author: "Jessica M.", avatar: "JM", avatarBg: "#ff3366", time: "1 day ago", body: "Used the travel planner for my CES trip and it automatically separated my business vs personal expenses. Saved me hours of manual categorization. Game changer for anyone who travels for work.", likes: 56, comments: 15, liked: false },
];

const INITIAL_EVENTS: Event[] = [
  { id: "1", date: "JAN 15, 2025", title: "Tax Strategy for Gig Workers", meta: "Virtual · 7:00 PM EST · Free for Pro members", type: "virtual", rsvped: false },
  { id: "2", date: "FEB 3, 2025", title: "Options Flow Trading Workshop", meta: "Virtual · 6:00 PM EST · All members welcome", type: "virtual", rsvped: false },
  { id: "3", date: "MAR 12, 2025", title: "Real Estate Investment Summit", meta: "Miami, FL · 3 days · Early bird pricing", type: "inperson", rsvped: false },
  { id: "4", date: "APR 8, 2025", title: "Small Business Tax Prep Live", meta: "Virtual · 12:00 PM EST · Bring your questions", type: "virtual", rsvped: false },
  { id: "5", date: "MAY 20, 2025", title: "FinTech Innovation Conference", meta: "Austin, TX · 2 days · Networking + panels", type: "inperson", rsvped: false },
];

const INITIAL_JOBS: Job[] = [
  { id: "1", title: "Financial Analyst | Remote", company: "QuantEdge Capital", meta: "Remote · Full-time · Posted 2 days ago", salary: "$95K | $130K", category: "remote" },
  { id: "2", title: "Tax Preparer | Seasonal", company: "H&R Block", meta: "Multiple locations · Part-time · Posted 1 week ago", salary: "$22 | $35/hr", category: "parttime" },
  { id: "3", title: "DoorDash Driver", company: "DoorDash", meta: "Your area · Gig · Start today", salary: "$18 | $28/hr avg", category: "gig" },
  { id: "4", title: "Freelance Bookkeeper", company: "Various Clients", meta: "Remote · Freelance · Ongoing", salary: "$40 | $65/hr", category: "freelance" },
  { id: "5", title: "Investment Research Associate", company: "Goldman Sachs", meta: "New York, NY · Full-time · Posted 3 days ago", salary: "$120K | $180K", category: "fulltime" },
  { id: "6", title: "Real Estate Agent", company: "Keller Williams", meta: "Your area · Full-time · Commission", salary: "$60K | $150K+", category: "fulltime" },
];

const COMM_CATEGORIES = [
  { key: "all", label: "All" },
  { key: "trading", label: "Trading" },
  { key: "realestate", label: "Real Estate" },
  { key: "tax", label: "Tax & Accounting" },
  { key: "tech", label: "Tech" },
  { key: "gig", label: "Gig Workers" },
];

const JOB_CATEGORIES = [
  { key: "all", label: "All" },
  { key: "remote", label: "Remote" },
  { key: "fulltime", label: "Full-time" },
  { key: "parttime", label: "Part-time" },
  { key: "gig", label: "Gig" },
  { key: "freelance", label: "Freelance" },
];

const EVENT_TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "virtual", label: "Virtual" },
  { key: "inperson", label: "In Person" },
];

function sanitize(str: string): string {
  return str.replace(/[<>"'&]/g, (c) => {
    const map: Record<string, string> = { "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "&": "&amp;" };
    return map[c] || c;
  });
}

export default function Community() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { getToken, isSignedIn } = useAuth();
  const [referralCode, setReferralCode] = useState("");
  const [isAmbassador, setIsAmbassador] = useState(false);
  const [tab, setTab] = useState<Tab>("communities");

  useEffect(() => {
    if (!isSignedIn) return;
    authFetch("/viral/referral/code", getToken)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.code) setReferralCode(data.code); })
      .catch((err) => { console.error("[Community] Failed to load referral code:", err); toast({ title: "Could not load referral info", description: "Please refresh to try again.", variant: "destructive" }); });
    authFetch("/viral/referral/milestones", getToken)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.milestones) { const amb = data.milestones.find((m: { key: string; unlocked: boolean }) => m.key === "ambassador"); if (amb?.unlocked) setIsAmbassador(true); } })
      .catch((err) => { console.error("[Community] Failed to load referral milestones:", err); toast({ title: "Could not load milestone data", description: "Please refresh to try again.", variant: "destructive" }); });
  }, [isSignedIn, getToken, toast]);
  const [commFilter, setCommFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [jobSearch, setJobSearch] = useState("");
  const [eventTab, setEventTab] = useState("upcoming");
  const [communities, setCommunities] = useState(INITIAL_COMMUNITIES);
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [postText, setPostText] = useState("");
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showPostJob, setShowPostJob] = useState(false);
  const [newComm, setNewComm] = useState({ name: "", category: "trading", description: "", privacy: "public" });
  const [newEvent, setNewEvent] = useState({ title: "", date: "", type: "virtual" as "virtual" | "inperson", description: "" });
  const [newJob, setNewJob] = useState({ title: "", company: "", salary: "", category: "remote", meta: "" });

  const filteredCommunities = commFilter === "all" ? communities : communities.filter(c => c.category === commFilter);

  const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);

  const filteredJobs = jobs.filter(j => {
    const matchCat = jobFilter === "all" || j.category === jobFilter;
    const matchSearch = !jobSearch || j.title.toLowerCase().includes(jobSearch.toLowerCase()) || j.company.toLowerCase().includes(jobSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredEvents = eventTab === "upcoming" ? events : events.filter(e => e.type === eventTab);

  const joinCommunity = useCallback((id: string) => {
    setCommunities(prev => prev.map(c => c.id === id ? { ...c, joined: !c.joined, members: c.joined ? c.members - 1 : c.members + 1 } : c));
  }, []);

  const createPost = () => {
    const text = postText.trim();
    if (!text) { toast({ title: "Empty post", description: "Write something to share.", variant: "destructive" }); return; }
    if (text.length > 1000) { toast({ title: "Too long", description: "Posts are limited to 1000 characters.", variant: "destructive" }); return; }
    const newPost: Post = {
      id: crypto.randomUUID(),
      author: "You",
      avatar: "ME",
      avatarBg: "#00d4ff",
      time: "Just now",
      body: text,
      likes: 0,
      comments: 0,
      liked: false,
    };
    setPosts(prev => [newPost, ...prev]);
    setPostText("");
    trackEvent("community_post");
    toast({ title: "Posted", description: "Your post is live in the community feed." });
  };

  const likePost = (id: string) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
  };

  const rsvpEvent = (id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, rsvped: !e.rsvped } : e));
    const ev = events.find(e => e.id === id);
    toast({ title: ev?.rsvped ? "RSVP cancelled" : "RSVP confirmed", description: ev?.title || "" });
  };

  const createCommunity = () => {
    if (!newComm.name.trim() || !newComm.description.trim()) {
      toast({ title: "Missing fields", description: "Name and description are required.", variant: "destructive" });
      return;
    }
    const icons: Record<string, string> = { trading: "📈", realestate: "🏠", tax: "📊", tech: "💻", gig: "🛠️", other: "🌐" };
    const comm: Community = {
      id: crypto.randomUUID(),
      name: newComm.name.trim().slice(0, 100),
      category: newComm.category,
      description: newComm.description.trim().slice(0, 500),
      icon: icons[newComm.category] || "🌐",
      iconBg: "rgba(255,140,0,0.15)",
      members: 1,
      posts: 0,
      joined: true,
    };
    setCommunities(prev => [comm, ...prev]);
    setNewComm({ name: "", category: "trading", description: "", privacy: "public" });
    setShowCreateCommunity(false);
    toast({ title: "Community created", description: `${comm.name} is live.` });
  };

  const createEvent = () => {
    if (!newEvent.title.trim() || !newEvent.date) {
      toast({ title: "Missing fields", description: "Title and date are required.", variant: "destructive" });
      return;
    }
    const ev: Event = {
      id: crypto.randomUUID(),
      date: new Date(newEvent.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase(),
      title: newEvent.title.trim().slice(0, 200),
      meta: `${newEvent.type === "virtual" ? "Virtual" : "In Person"} · Created by you`,
      type: newEvent.type,
      rsvped: false,
    };
    setEvents(prev => [ev, ...prev]);
    setNewEvent({ title: "", date: "", type: "virtual", description: "" });
    setShowCreateEvent(false);
    toast({ title: "Event created", description: `${ev.title} has been scheduled.` });
  };

  const postJob = () => {
    if (!newJob.title.trim() || !newJob.company.trim()) {
      toast({ title: "Missing fields", description: "Title and company are required.", variant: "destructive" });
      return;
    }
    const job: Job = {
      id: crypto.randomUUID(),
      title: newJob.title.trim().slice(0, 200),
      company: newJob.company.trim().slice(0, 200),
      salary: newJob.salary.trim().slice(0, 50) || "Competitive",
      category: newJob.category,
      meta: (newJob.meta.trim() || "Just posted").slice(0, 200),
    };
    setJobs(prev => [job, ...prev]);
    setNewJob({ title: "", company: "", salary: "", category: "remote", meta: "" });
    setShowPostJob(false);
    toast({ title: "Job posted", description: `${job.title} listing is now live.` });
  };

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: "communities", label: "Groups", icon: Users },
    { key: "feed", label: "Feed", icon: MessageSquare },
    { key: "events", label: "Events", icon: Calendar },
    { key: "jobs", label: "Jobs", icon: Briefcase },
    { key: "pricing", label: "Pricing", icon: CreditCard },
  ];

  if (!isSignedIn) {
    return (
      <Layout>
        <div className="container mx-auto px-4 md:px-6 py-12 max-w-3xl">
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Community</h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Connect, share strategies, and grow together.
            </p>
          </div>
          <div className="border border-white/[0.06] rounded-lg bg-white/[0.02] p-8 text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Join the Community</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
              Sign up to access community groups, discussion feeds, events, and networking features.
            </p>
            <Button
              onClick={() => {
                trackEvent("community_signup_cta");
                window.location.href = "/sign-up";
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Sign up for full access
            </Button>
          </div>
          <div className="space-y-8">
            <ReferralSection />
            <TestimonialForm />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="mb-7">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Community</h1>
          <p className="text-white/50 text-sm">Connect, learn, and grow with fellow traders & investors</p>
        </div>
        <div className="flex overflow-x-auto gap-1 mb-6 bg-[#0d0d1a] border border-[rgba(255,140,0,0.15)] rounded-xl p-1">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === t.key ? "bg-[rgba(255,140,0,0.1)] text-primary" : "text-[#555] hover:text-white/70"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {tab === "communities" && (
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-4">
              <h2 className="text-lg font-bold">Communities</h2>
              <button onClick={() => setShowCreateCommunity(true)} className="text-xs text-primary font-semibold flex items-center gap-1 min-h-[44px] px-3">
                <Plus className="w-3.5 h-3.5" /> Create
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {COMM_CATEGORIES.map(c => (
                <button key={c.key}
                  onClick={() => setCommFilter(c.key)}
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors min-h-[36px] ${
                    commFilter === c.key
                      ? "bg-[rgba(255,140,0,0.1)] border-primary/50 text-primary"
                      : "bg-[#0d0d1a] border-[rgba(255,140,0,0.15)] text-[#777] hover:text-white/70"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {filteredCommunities.map(c => (
                <div key={c.id} className="glass-panel rounded-xl p-4">
                  <div className="flex gap-3 items-center mb-3">
                    <div className="w-[50px] h-[50px] rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: c.iconBg }}>
                      {c.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-[15px]">{c.name}</p>
                      <p className="text-xs text-[#555] mt-0.5">{c.members.toLocaleString()} members · {c.posts} posts this week</p>
                    </div>
                  </div>
                  <p className="text-[13px] text-muted-foreground mb-3 leading-relaxed">{c.description}</p>
                  <div className="flex gap-4 pt-3 border-t border-white/5 items-center">
                    <div className="flex-1">
                      <p className="text-xs text-[#555]">Members</p>
                      <p className="text-[15px] font-bold mt-0.5">{c.members.toLocaleString()}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-[#555]">Posts/wk</p>
                      <p className="text-[15px] font-bold mt-0.5">{c.posts}</p>
                    </div>
                    <Button
                      onClick={() => joinCommunity(c.id)}
                      className={`min-h-[44px] px-6 font-bold text-sm ${
                        c.joined
                          ? "bg-transparent border border-primary/30 text-primary hover:bg-primary/10"
                          : "bg-gradient-to-r from-primary to-[#FF6600] text-black"
                      }`}
                      variant={c.joined ? "outline" : "default"}
                    >
                      {c.joined ? "Joined" : "Join"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "feed" && (
          <div>
            <div className="mb-4">
              <ReferralSection />
            </div>
            <div className="flex items-center pb-2 border-b border-white/10 mb-4">
              <h2 className="text-lg font-bold">Community Feed</h2>
            </div>
            <div className="glass-panel rounded-xl p-4 mb-4">
              <textarea
                value={postText}
                onChange={e => setPostText(e.target.value.slice(0, 1000))}
                placeholder="Share something with your community..."
                rows={3}
                maxLength={1000}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-primary/50 placeholder:text-[#444]"
              />
              <p className="text-[10px] text-[#444] text-right mb-2">{postText.length}/1000</p>
              <div className="flex gap-2">
                <Button className="bg-gradient-to-r from-primary to-[#FF6600] text-black font-bold min-h-[44px]" onClick={createPost}>
                  Post
                </Button>
                <Button variant="outline" className="border-white/10 text-muted-foreground/50 min-h-[44px] cursor-not-allowed opacity-60" disabled title="Photo uploads not available">
                  Photo
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {posts.map(p => (
                <div key={p.id} className="glass-panel rounded-xl p-4">
                  <div className="flex gap-3 items-center mb-3">
                    <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-sm font-bold text-black flex-shrink-0" style={{ background: p.avatarBg }}>
                      {p.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-bold flex items-center gap-1.5">
                        {p.author}
                        {p.author === "You" && isAmbassador && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[rgba(255,215,0,0.15)] text-[#FFB800] border border-[rgba(255,215,0,0.3)]">
                            🏆 Ambassador
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-[#555]">{p.time}</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#ccc] leading-relaxed mb-3">{p.body}</p>
                  <div className="flex gap-4 pt-3 border-t border-white/5">
                    <button
                      onClick={() => likePost(p.id)}
                      aria-label={p.liked ? "Unlike post" : "Like post"}
                      aria-pressed={p.liked}
                      className={`flex items-center gap-1.5 text-xs min-h-[36px] px-2 transition-colors ${p.liked ? "text-primary" : "text-[#555] hover:text-primary"}`}
                    >
                      <ThumbsUp className="w-4 h-4" /> {p.likes}
                    </button>
                    <button aria-label={`${p.comments} comments`} className="flex items-center gap-1.5 text-xs text-[#555] hover:text-primary min-h-[36px] px-2 transition-colors">
                      <MessageCircle className="w-4 h-4" /> {p.comments}
                    </button>
                    <button
                      onClick={async () => {
                        const postUrl = referralCode
                          ? `${window.location.origin}/community?post=${p.id}&ref=${referralCode}`
                          : `${window.location.origin}/community?post=${p.id}`;
                        const shareText = `Check out this post on EntangleWealth: "${p.body.slice(0, 80)}${p.body.length > 80 ? "..." : ""}" | ${postUrl}`;
                        if (navigator.share) {
                          try {
                            await navigator.share({ title: "EntangleWealth Community", text: shareText, url: postUrl });
                            return;
                          } catch {}
                        }
                        try {
                          await navigator.clipboard.writeText(shareText);
                          toast({ title: "Link copied", description: "Post link with your referral code copied to clipboard." });
                        } catch {
                          toast({ title: "Could not copy link", description: "Please copy manually: " + postUrl, variant: "destructive" });
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs text-[#555] hover:text-primary min-h-[36px] px-2 transition-colors"
                    >
                      <Share2 className="w-4 h-4" /> Share
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <TestimonialForm />
            </div>
          </div>
        )}

        {tab === "events" && (
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-4">
              <h2 className="text-lg font-bold">Events & Trade Shows</h2>
              <button onClick={() => setShowCreateEvent(true)} className="text-xs text-primary font-semibold flex items-center gap-1 min-h-[44px] px-3">
                <Plus className="w-3.5 h-3.5" /> Create
              </button>
            </div>
            <div className="flex bg-[#0d0d1a] border border-[rgba(255,140,0,0.15)] rounded-xl overflow-hidden mb-4">
              {EVENT_TABS.map(t => (
                <button key={t.key}
                  onClick={() => setEventTab(t.key)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors min-h-[44px] ${
                    eventTab === t.key ? "bg-[rgba(255,140,0,0.1)] text-primary" : "text-[#555] hover:text-white/70"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {filteredEvents.map(e => (
                <div key={e.id} className="glass-panel rounded-xl p-4 relative overflow-hidden border-l-[3px] border-l-primary">
                  <p className="text-[11px] text-primary font-bold uppercase tracking-wider mb-1">{e.date}</p>
                  <p className="text-base font-extrabold mb-1">{e.title}</p>
                  <p className="text-xs text-[#555] mb-3">{e.meta}</p>
                  <Button
                    onClick={() => rsvpEvent(e.id)}
                    className={`min-h-[44px] font-bold text-sm ${
                      e.rsvped
                        ? "bg-transparent border border-[rgba(255,140,0,0.3)] text-[#FF8C00] hover:bg-[rgba(255,140,0,0.1)]"
                        : "bg-gradient-to-r from-primary to-[#FF6600] text-black"
                    }`}
                    variant={e.rsvped ? "outline" : "default"}
                  >
                    {e.rsvped ? "RSVP'd ✓" : "RSVP Now"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "jobs" && (
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-4">
              <h2 className="text-lg font-bold">Job Board</h2>
              <button onClick={() => setShowPostJob(true)} className="text-xs text-primary font-semibold flex items-center gap-1 min-h-[44px] px-3">
                <Plus className="w-3.5 h-3.5" /> Post Job
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
              <Input
                placeholder="Search jobs..."
                value={jobSearch}
                onChange={e => setJobSearch(e.target.value.slice(0, 200))}
                maxLength={200}
                className="bg-white/5 border-white/10 pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {JOB_CATEGORIES.map(c => (
                <button key={c.key}
                  onClick={() => setJobFilter(c.key)}
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors min-h-[36px] ${
                    jobFilter === c.key
                      ? "bg-[rgba(255,140,0,0.1)] border-primary/50 text-primary"
                      : "bg-[#0d0d1a] border-[rgba(255,140,0,0.15)] text-[#777] hover:text-white/70"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="space-y-2.5">
              {filteredJobs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-semibold text-white/40 mb-1">No jobs match your filters</p>
                  <p className="text-sm text-white/50">Try a broader category or check back later for new listings.</p>
                </div>
              ) : (
                filteredJobs.map(j => (
                  <div key={j.id} className="glass-panel rounded-xl p-4">
                    <p className="font-bold text-[15px] mb-1">{j.title}</p>
                    <p className="text-[13px] text-primary mb-1">{j.company}</p>
                    <p className="text-[11px] text-[#555] mb-2">{j.meta}</p>
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold text-[#FF8C00]">{j.salary}</p>
                      <Button className="bg-gradient-to-r from-primary to-[#FF6600] text-black font-bold text-xs min-h-[36px] px-4">
                        Apply
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "pricing" && (
          <div>
            <div className="text-center py-5 pb-6">
              <h2 className="text-[28px] font-black mb-2 bg-gradient-to-r from-white via-primary to-secondary bg-clip-text text-transparent">Simple Pricing</h2>
              <p className="text-sm text-[#666]">Try everything free for 30 days. No card required.</p>
              <div className="mt-3">
                <span className="px-4 py-1.5 rounded-full text-[13px] font-bold bg-[rgba(255,140,0,0.2)] text-[#FF8C00]">30 DAY FREE TRIAL | NO CARD NEEDED</span>
              </div>
            </div>

            <div className="glass-panel rounded-sm p-6 text-center mb-4">
              <p className="text-sm font-bold text-[#555] uppercase tracking-wider mb-2">Starter</p>
              <p className="text-[42px] font-black text-[#FF8C00] mb-1">Free</p>
              <p className="text-[13px] text-[#555] mb-5">Forever free tier</p>
              <div className="text-left space-y-0">
                {["3 stock signals per day", "Basic options flow", "Community access", "5 receipt scans per month"].map((f, i) => (
                  <p key={i} className="text-[13px] text-[#aaa] py-2 border-b border-white/5 last:border-0">✅ {f}</p>
                ))}
                {["TaxGPT", "Travel itinerary builder", "Resume builder"].map((f, i) => (
                  <p key={i} className="text-[13px] text-[#555] py-2 border-b border-white/5 last:border-0">❌ {f}</p>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4 border-white/10 text-muted-foreground min-h-[44px]" onClick={() => toast({ title: "Current plan", description: "You are on the free plan." })}>
                Current Plan
              </Button>
            </div>

            <div className="glass-panel rounded-sm p-6 text-center mb-4 border-secondary/50 relative bg-gradient-to-br from-[rgba(255,215,0,0.05)] to-[rgba(255,140,0,0.05)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-[rgba(255,215,0,0.15)] text-secondary">MOST POPULAR</span>
              </div>
              <p className="text-sm font-bold text-secondary uppercase tracking-wider mb-2 mt-2">Pro</p>
              <p className="text-[42px] font-black text-secondary mb-1">$29<span className="text-lg">/mo</span></p>
              <p className="text-[13px] text-[#555] mb-5">After 30-day free trial</p>
              <div className="text-left space-y-0">
                {["Unlimited stock signals", "Full options flow with Greeks", "TaxGPT unlimited", "Unlimited receipt scanning", "Travel itinerary builder", "Resume builder & job finder", "Community + events access", "Compliance score dashboard", "CPA-ready expense exports"].map((f, i) => (
                  <p key={i} className="text-[13px] text-[#aaa] py-2 border-b border-white/5 last:border-0">✅ {f}</p>
                ))}
              </div>
              <Button className="w-full mt-4 bg-gradient-to-r from-secondary to-[#cc9900] text-black font-bold min-h-[44px]" onClick={() => setLocation("/pricing")}>
                Start Free 30-Day Trial →
              </Button>
            </div>

            <div className="glass-panel rounded-sm p-6 text-center mb-4">
              <p className="text-sm font-bold text-[#555] uppercase tracking-wider mb-2">Business</p>
              <p className="text-[42px] font-black text-primary mb-1">$79<span className="text-lg">/mo</span></p>
              <p className="text-[13px] text-[#555] mb-5">For teams and power users</p>
              <div className="text-left space-y-0">
                {["Everything in Pro", "Up to 5 team members", "Priority signal alerts", "White-label reports for CPA", "Trade show event creation", "Job board posting (5/mo)", "Dedicated support"].map((f, i) => (
                  <p key={i} className="text-[13px] text-[#aaa] py-2 border-b border-white/5 last:border-0">✅ {f}</p>
                ))}
              </div>
              <Button className="w-full mt-4 bg-gradient-to-r from-primary to-[#FF6600] text-black font-bold min-h-[44px]" onClick={() => setLocation("/pricing")}>
                Start Free 30-Day Trial →
              </Button>
            </div>

            <div className="glass-panel rounded-xl p-5 text-center mb-4">
              <p className="text-sm font-bold text-primary mb-2">Why EntangleWealth Pays For Itself</p>
              <p className="text-[13px] text-[#666] leading-relaxed">
                Average user finds <strong className="text-[#FF8C00]">$4,280</strong> in missed deductions.<br />
                Average signal win rate: <strong className="text-primary">87% confidence</strong>.<br />
                One good trade or one found deduction covers a full year.<br /><br />
                <strong className="text-secondary">$29/month = $348/year. Find one missed deduction and you're ahead.</strong>
              </p>
            </div>

            <div className="glass-panel rounded-xl p-5 mb-4">
              <p className="text-sm font-bold text-secondary mb-3">Revenue Share Program</p>
              <p className="text-[13px] text-[#777] leading-relaxed mb-3">Refer friends and earn 20% of their subscription every month for life. Build your own income stream by sharing what already helps you.</p>
              <Button className="w-full bg-gradient-to-r from-secondary to-[#cc9900] text-black font-bold min-h-[44px]" onClick={async () => {
                if (!isSignedIn) {
                  toast({ title: "Sign in required", description: "Please sign in to get your referral link." });
                  return;
                }
                if (!referralCode) {
                  toast({ title: "Loading...", description: "Your referral code is being generated. Please try again." });
                  return;
                }
                const link = `${window.location.origin}?ref=${referralCode}`;
                try {
                  await navigator.clipboard.writeText(link);
                  toast({ title: "Link copied", description: "Your referral link has been copied to clipboard." });
                } catch {
                  toast({ title: "Could not copy link", description: "Please copy manually: " + link, variant: "destructive" });
                }
              }}>
                Get Your Referral Link
              </Button>
            </div>
          </div>
        )}

        {showCreateCommunity && (
          <div className="fixed inset-0 z-[9998] bg-black/80 flex items-start justify-center pt-20 px-4 overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) setShowCreateCommunity(false); }}>
            <div className="bg-[#0d0d1a] border border-[rgba(255,140,0,0.15)] rounded-sm p-5 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-extrabold text-primary">Create Community</h3>
                <button onClick={() => setShowCreateCommunity(false)} className="text-[#555] hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"><X className="w-5 h-5" /></button>
              </div>
              <Input placeholder="Community name" value={newComm.name} onChange={e => setNewComm(p => ({ ...p, name: e.target.value.slice(0, 100) }))} maxLength={100} className="bg-white/5 border-white/10 mb-2" />
              <select value={newComm.category} onChange={e => setNewComm(p => ({ ...p, category: e.target.value }))} className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-primary/50 mb-2 [&>option]:bg-[#0d0d1a] [&>option]:text-white">
                <option value="trading">Trading & Investing</option>
                <option value="realestate">Real Estate</option>
                <option value="tax">Tax & Accounting</option>
                <option value="tech">Technology</option>
                <option value="gig">Gig Workers</option>
                <option value="other">Other</option>
              </select>
              <textarea
                placeholder="What is this community about?"
                value={newComm.description}
                onChange={e => setNewComm(p => ({ ...p, description: e.target.value.slice(0, 500) }))}
                maxLength={500}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-primary/50 placeholder:text-[#444] mb-2"
              />
              <select value={newComm.privacy} onChange={e => setNewComm(p => ({ ...p, privacy: e.target.value }))} className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-primary/50 mb-3 [&>option]:bg-[#0d0d1a] [&>option]:text-white">
                <option value="public">Public | Anyone can join</option>
                <option value="private">Private | Request to join</option>
              </select>
              <Button className="w-full bg-gradient-to-r from-primary to-[#FF6600] text-black font-bold min-h-[44px]" onClick={createCommunity}>
                Create Community
              </Button>
            </div>
          </div>
        )}

        {showCreateEvent && (
          <div className="fixed inset-0 z-[9998] bg-black/80 flex items-start justify-center pt-20 px-4 overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) setShowCreateEvent(false); }}>
            <div className="bg-[#0d0d1a] border border-[rgba(255,140,0,0.15)] rounded-sm p-5 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-extrabold text-primary">Create Event</h3>
                <button onClick={() => setShowCreateEvent(false)} className="text-[#555] hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"><X className="w-5 h-5" /></button>
              </div>
              <Input placeholder="Event title" value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value.slice(0, 200) }))} maxLength={200} className="bg-white/5 border-white/10 mb-2" />
              <Input type="date" value={newEvent.date} onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))} className="bg-white/5 border-white/10 mb-2" />
              <select value={newEvent.type} onChange={e => setNewEvent(p => ({ ...p, type: e.target.value as "virtual" | "inperson" }))} className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-primary/50 mb-2 [&>option]:bg-[#0d0d1a] [&>option]:text-white">
                <option value="virtual">Virtual</option>
                <option value="inperson">In Person</option>
              </select>
              <textarea
                placeholder="Event description (optional)"
                value={newEvent.description}
                onChange={e => setNewEvent(p => ({ ...p, description: e.target.value.slice(0, 500) }))}
                maxLength={500}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-primary/50 placeholder:text-[#444] mb-3"
              />
              <Button className="w-full bg-gradient-to-r from-primary to-[#FF6600] text-black font-bold min-h-[44px]" onClick={createEvent}>
                Create Event
              </Button>
            </div>
          </div>
        )}

        {showPostJob && (
          <div className="fixed inset-0 z-[9998] bg-black/80 flex items-start justify-center pt-20 px-4 overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) setShowPostJob(false); }}>
            <div className="bg-[#0d0d1a] border border-[rgba(255,140,0,0.15)] rounded-sm p-5 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-extrabold text-primary">Post a Job</h3>
                <button onClick={() => setShowPostJob(false)} className="text-[#555] hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"><X className="w-5 h-5" /></button>
              </div>
              <Input placeholder="Job title" value={newJob.title} onChange={e => setNewJob(p => ({ ...p, title: e.target.value.slice(0, 200) }))} maxLength={200} className="bg-white/5 border-white/10 mb-2" />
              <Input placeholder="Company name" value={newJob.company} onChange={e => setNewJob(p => ({ ...p, company: e.target.value.slice(0, 100) }))} maxLength={100} className="bg-white/5 border-white/10 mb-2" />
              <Input placeholder="Salary range (e.g. $50K-$80K)" value={newJob.salary} onChange={e => setNewJob(p => ({ ...p, salary: e.target.value.slice(0, 50) }))} maxLength={50} className="bg-white/5 border-white/10 mb-2" />
              <select value={newJob.category} onChange={e => setNewJob(p => ({ ...p, category: e.target.value }))} className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-primary/50 mb-3 [&>option]:bg-[#0d0d1a] [&>option]:text-white">
                <option value="remote">Remote</option>
                <option value="fulltime">Full-time</option>
                <option value="parttime">Part-time</option>
                <option value="gig">Gig</option>
                <option value="freelance">Freelance</option>
              </select>
              <Button className="w-full bg-gradient-to-r from-primary to-[#FF6600] text-black font-bold min-h-[44px]" onClick={postJob}>
                Post Job
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
