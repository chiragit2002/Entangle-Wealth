import { useState, useEffect, useCallback } from "react";
import { useUser, useAuth } from "@clerk/react";
import { Wrench, Search, Star, MapPin, Plus, X, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/authFetch";

interface Gig {
  id: string;
  title: string;
  description: string;
  price: string;
  category: string;
  contactName: string | null;
  rating: string;
  completedJobs: number;
  createdAt: string;
}

const CATEGORIES = [
  { id: "all", label: "All", emoji: "🔥" },
  { id: "cleaning", label: "Cleaning", emoji: "🧹" },
  { id: "outdoor", label: "Outdoor", emoji: "🌿" },
  { id: "auto", label: "Auto", emoji: "🚗" },
  { id: "moving", label: "Moving", emoji: "📦" },
];

const CATEGORY_EMOJIS: Record<string, string> = {
  cleaning: "🧹",
  outdoor: "🌿",
  auto: "🚗",
  moving: "📦",
  other: "💼",
};

export default function Gigs() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [posting, setPosting] = useState(false);
  const [form, setForm] = useState({ title: "", price: "", category: "cleaning", description: "" });

  const fetchGigs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (searchQuery) params.set("q", searchQuery);
      const res = await fetch(`/api/gigs?${params.toString()}`);
      if (res.ok) {
        setGigs(await res.json());
      } else {
        toast({ title: "Error", description: "Failed to load gigs. Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", description: "Could not connect to server.", variant: "destructive" });
    }
    setLoading(false);
  }, [category, searchQuery]);

  useEffect(() => { fetchGigs(); }, [fetchGigs]);

  const postGig = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to post gigs." });
      return;
    }
    if (!form.title || !form.price || !form.description) {
      toast({ title: "Missing fields", description: "Please fill all fields.", variant: "destructive" });
      return;
    }
    setPosting(true);
    try {
      const res = await authFetch("/gigs", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, contactName: user.fullName }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Gig posted!", description: "Your gig is now live." });
      setShowForm(false);
      setForm({ title: "", price: "", category: "cleaning", description: "" });
      fetchGigs();
    } catch {
      toast({ title: "Error", description: "Failed to post gig.", variant: "destructive" });
    }
    setPosting(false);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20 lg:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 md:px-6 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
            <Wrench className="w-8 h-8 text-primary" />
            Gig Marketplace
          </h1>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "Post Gig"}
          </Button>
        </div>
        <p className="text-muted-foreground mb-6">Find local services or offer your skills to earn extra income.</p>

        {showForm && (
          <div className="glass-panel p-6 mb-6 border border-primary/20">
            <h3 className="text-lg font-semibold text-primary mb-4">Post Your Gig</h3>
            <div className="space-y-3">
              <Input
                placeholder="Service title (e.g. Pressure Wash Driveway)"
                value={form.title}
                onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                className="bg-white/5 border-white/10"
              />
              <Input
                placeholder="Your price (e.g. $75)"
                value={form.price}
                onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))}
                className="bg-white/5 border-white/10"
              />
              <select
                value={form.category}
                onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary/50"
              >
                <option value="cleaning">🧹 Cleaning</option>
                <option value="outdoor">🌿 Outdoor</option>
                <option value="auto">🚗 Auto</option>
                <option value="moving">📦 Moving</option>
                <option value="other">💼 Other</option>
              </select>
              <textarea
                placeholder="Describe your service..."
                value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-primary/50"
              />
              <Button className="w-full bg-gradient-to-r from-primary to-[#0099cc] text-black font-bold" onClick={postGig} disabled={posting}>
                {posting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Post Gig
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
                category === cat.id
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/20"
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search gigs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : gigs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Wrench className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No gigs found. Try a different category or be the first to post!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gigs.map((gig) => (
              <div key={gig.id} className="glass-panel p-5 hover:border-primary/30 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-[#FFD700] flex items-center justify-center text-lg flex-shrink-0">
                      {CATEGORY_EMOJIS[gig.category] || "💼"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-[15px] leading-tight">{gig.title}</h3>
                      {gig.contactName && (
                        <p className="text-sm text-primary mt-0.5">{gig.contactName}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-lg font-extrabold text-[#00ff88] flex-shrink-0 ml-2">{gig.price}</div>
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{gig.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-[#FFD700] fill-[#FFD700]" />
                      {gig.rating}
                    </span>
                    <span>{gig.completedJobs} jobs</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                    {CATEGORY_EMOJIS[gig.category]} {gig.category}
                  </span>
                </div>
                <Button className="w-full mt-3 bg-gradient-to-r from-primary to-[#0099cc] text-black font-bold text-sm h-9">
                  Contact for Service
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
