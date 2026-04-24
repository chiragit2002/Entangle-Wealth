import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { FlashCouncil } from "@/components/FlashCouncil";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, MapPin, Clock, Briefcase, TrendingUp, ChevronDown, ChevronUp, Bookmark, BookmarkCheck, CheckCircle, Info, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ReferralSection } from "@/components/viral/ReferralSection";
import { AnniversaryGiveawayBanner } from "@/components/viral/AnniversaryGiveawayBanner";

const categories = ["All", "Gig", "Freelance", "Options"] as const;

export default function Earn() {
  const { toast } = useToast();
  const weeklyTotal = 0;
  const [activeCategory, setActiveCategory] = useState<typeof categories[number]>("All");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savedOpps, setSavedOpps] = useState<number[]>([]);
  const [claimedOpps, setClaimedOpps] = useState<number[]>([]);

  const filtered: never[] = [];

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "Gig": return "text-green-400 border-green-400/30 bg-green-400/10";
      case "Freelance": return "text-blue-400 border-blue-400/30 bg-blue-400/10";
      case "Options": return "text-secondary border-secondary/30 bg-secondary/10";
      default: return "text-muted-foreground border-border";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Gig": return "🚗";
      case "Freelance": return "💻";
      case "Options": return "📈";
      default: return "💼";
    }
  };

  const toggleSave = (id: number, title: string) => {
    const isSaved = savedOpps.includes(id);
    setSavedOpps(prev => isSaved ? prev.filter(x => x !== id) : [...prev, id]);
    toast({
      title: isSaved ? "Removed from saved" : "Opportunity saved",
      description: isSaved ? `${title} removed.` : `${title} saved for later.`,
    });
  };

  const handleClaim = (id: number, title: string) => {
    if (claimedOpps.includes(id)) return;
    setClaimedOpps(prev => [...prev, id]);
    toast({
      title: "Opportunity claimed!",
      description: `${title} | check the platform for next steps.`,
    });
  };

  return (
    <Layout>
      <FlashCouncil />

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Earn More</h1>
          <p className="text-muted-foreground mt-1">Gig, freelance, and options income — find what fits your schedule.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Card className="bg-muted/40 border-border hover:border-border transition-colors">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Options Income This Week</p>
                <p className="text-2xl font-bold font-mono text-secondary">${weeklyTotal.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">From theta strategies (demo)</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/40 border-border hover:border-border transition-colors">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-400/10 flex items-center justify-center shrink-0">
                <Briefcase className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Opportunities Available</p>
                <p className="text-2xl font-bold font-mono text-green-400">{filtered.length} active</p>
                <p className="text-xs text-muted-foreground">{activeCategory === "All" ? "All categories" : `${activeCategory} category`}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {categories.map(cat => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              className={activeCategory === cat ? "bg-primary text-primary-foreground" : "border-border hover:bg-muted/50"}
              onClick={() => { setActiveCategory(cat); setExpandedId(null); }}
            >
              {cat === "All" ? "All" : `${getTypeIcon(cat)} ${cat}`}
              {cat !== "All" && (
                <span className="ml-1 text-xs opacity-70">(0)</span>
              )}
            </Button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Target className="w-10 h-10 text-muted-foreground/20 mb-3" />
            <p className="text-base font-semibold text-muted-foreground/70">Nothing here yet</p>
            <p className="text-sm text-muted-foreground/40 mt-1">Try a different category to see what's available.</p>
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {filtered.map((opp) => {
              const isExpanded = expandedId === opp.id;
              const isSaved = savedOpps.includes(opp.id);
              const isClaimed = claimedOpps.includes(opp.id);
              return (
                <div key={opp.id}>
                  <Card
                    className={`border-border hover:border-border transition-all cursor-pointer ${isExpanded ? 'bg-muted/50 border-primary/30' : 'bg-muted/40'}`}
                    onClick={() => setExpandedId(isExpanded ? null : opp.id)}
                  >
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getTypeIcon(opp.type)}</span>
                            <h3 className="font-bold text-lg">{opp.title}</h3>
                            <Badge variant="outline" className={`text-[10px] px-2 ${getTypeBadge(opp.type)}`}>{opp.type}</Badge>
                            <button className="text-muted-foreground ml-auto sm:hidden" onClick={() => setExpandedId(isExpanded ? null : opp.id)} aria-label={isExpanded ? "Collapse" : "Expand"}>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{opp.location}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{opp.time}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-xl text-green-400">{opp.payout}</span>
                          <button className="hidden sm:block text-muted-foreground" onClick={() => setExpandedId(isExpanded ? null : opp.id)} aria-label={isExpanded ? "Collapse" : "Expand"}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {isExpanded && (
                    <div className="bg-muted/30 border border-border border-t-0 rounded-b-lg px-5 py-5 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground">{opp.note}</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="glass-panel rounded-lg p-3 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase">Category</p>
                            <p className="text-sm font-bold">{opp.type}</p>
                          </div>
                          <div className="glass-panel rounded-lg p-3 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase">Location</p>
                            <p className="text-sm font-bold">{opp.location}</p>
                          </div>
                          <div className="glass-panel rounded-lg p-3 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase">Availability</p>
                            <p className="text-sm font-bold">{opp.time}</p>
                          </div>
                          <div className="glass-panel rounded-lg p-3 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase">Est. Payout</p>
                            <p className="text-sm font-bold text-green-400">{opp.payout}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          {isClaimed ? (
                            <Button disabled className="bg-green-500/20 text-green-400 border-green-500/30 gap-2">
                              <CheckCircle className="w-4 h-4" /> Claimed
                            </Button>
                          ) : (
                            <Button
                              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                              onClick={(e) => { e.stopPropagation(); handleClaim(opp.id, opp.title); }}
                            >
                              <DollarSign className="w-4 h-4" /> Claim Opportunity
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className={`border-border gap-2 ${isSaved ? 'text-secondary border-secondary/30' : ''}`}
                            onClick={(e) => { e.stopPropagation(); toggleSave(opp.id, opp.title); }}
                          >
                            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                            {isSaved ? "Saved" : "Save for Later"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Card className="bg-primary/5 border-primary/20 mb-8">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
            <TrendingUp className="w-8 h-8 text-primary shrink-0" />
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-bold mb-1">See trading signals too</h3>
              <p className="text-sm text-muted-foreground">Stock and options signals from our multi-model analysis — all in the dashboard.</p>
            </div>
            <Link href="/dashboard">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center pb-4">Demo data — opportunities and earnings shown are examples, not guarantees.</p>

        <AnniversaryGiveawayBanner />
        <ReferralSection />
      </div>
    </Layout>
  );
}
