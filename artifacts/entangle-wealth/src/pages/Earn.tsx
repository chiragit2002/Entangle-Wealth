import { Layout } from "@/components/layout/Layout";
import { FlashCouncil } from "@/components/FlashCouncil";
import { incomeOpportunities, optionsIncomeData } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, MapPin, Clock, Briefcase, TrendingUp, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Earn() {
  const weeklyTotal = optionsIncomeData.reduce((a, b) => a + b.income, 0);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "Gig": return "text-green-400 border-green-400/30 bg-green-400/10";
      case "Freelance": return "text-blue-400 border-blue-400/30 bg-blue-400/10";
      case "Options": return "text-secondary border-secondary/30 bg-secondary/10";
      default: return "text-muted-foreground border-white/10";
    }
  };

  return (
    <Layout>
      <FlashCouncil />

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Income Opportunities</h1>
            <p className="text-muted-foreground mt-1">Gig work, freelance, and options income strategies. Demo data shown.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Card className="bg-black/40 border-white/10">
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
          <Card className="bg-black/40 border-white/10">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-400/10 flex items-center justify-center shrink-0">
                <Briefcase className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Gig Opportunities Found</p>
                <p className="text-2xl font-bold font-mono text-green-400">{incomeOpportunities.filter(o => o.type === "Gig").length} active</p>
                <p className="text-xs text-muted-foreground">In your area (demo)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 mb-8">
          {incomeOpportunities.map((opp) => (
            <Card key={opp.id} className="bg-black/40 border-white/10 hover:border-white/20 transition-colors">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg">{opp.title}</h3>
                      <Badge variant="outline" className={`text-[10px] px-2 ${getTypeBadge(opp.type)}`}>{opp.type}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{opp.location}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{opp.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{opp.note}</p>
                  </div>
                  <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                    <span className="font-mono font-bold text-xl text-green-400">{opp.payout}</span>
                    <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/5 text-xs gap-1">
                      Details <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-primary/5 border-primary/20 mb-8">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
            <DollarSign className="w-10 h-10 text-primary shrink-0" />
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-bold mb-1">Want trading signals too?</h3>
              <p className="text-sm text-muted-foreground">See live stock and options signals from our multi-model analysis system.</p>
            </div>
            <Link href="/dashboard">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">View Dashboard</Button>
            </Link>
          </CardContent>
        </Card>

        <div className="p-4 rounded-lg border border-white/5 bg-white/[0.01]">
          <p className="text-xs text-muted-foreground/60 text-center">Income opportunities shown are examples and not guaranteed. Actual earnings depend on availability, location, effort, and market conditions. Options strategies involve risk of loss. This is demo data.</p>
        </div>
      </div>
    </Layout>
  );
}
