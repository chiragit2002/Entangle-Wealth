import { Shield } from "lucide-react";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-black py-12 mt-auto">
      <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between gap-8">
        <div className="flex flex-col max-w-sm gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-secondary" />
            <span className="font-bold text-lg text-white">EntangleWealth</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Trade Smarter. Live Better. Feed Your Family. Professional-grade alerts and analysis for the everyday investor.
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
          <div className="flex flex-col gap-3">
            <span className="font-semibold text-white">Platform</span>
            <Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
            <Link href="/stocks" className="text-muted-foreground hover:text-primary transition-colors">Stock Explorer</Link>
            <Link href="/options" className="text-muted-foreground hover:text-primary transition-colors">Options Flow</Link>
            <Link href="/earn" className="text-muted-foreground hover:text-primary transition-colors">Earn</Link>
            <Link href="/terminal" className="text-muted-foreground hover:text-primary transition-colors">Terminal</Link>
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-semibold text-white">Learn</span>
            <a href="/learn" className="text-muted-foreground hover:text-primary transition-colors">Financial Glossary</a>
            <a href="/indicators" className="text-muted-foreground hover:text-primary transition-colors">Technical Indicators</a>
            <a href="/strategies" className="text-muted-foreground hover:text-primary transition-colors">Trading Strategies</a>
            <a href="/patterns" className="text-muted-foreground hover:text-primary transition-colors">Chart Patterns</a>
            <a href="/sectors" className="text-muted-foreground hover:text-primary transition-colors">Sector Analysis</a>
            <a href="/compare" className="text-muted-foreground hover:text-primary transition-colors">Stock Comparisons</a>
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-semibold text-white">Legal</span>
            <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms of Use</Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">Risk Disclosure</Link>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 md:px-6 mt-12 pt-8 border-t border-white/10 flex flex-col gap-4">
        <p className="text-xs text-muted-foreground/70 leading-relaxed text-justify">
          Disclaimer: EntangleWealth is not a registered investment advisor or broker-dealer. The information provided on this platform is for educational and informational purposes only and should not be construed as financial advice, investment recommendations, or an offer to buy or sell any securities. Trading stocks and options involves significant risk and is not suitable for every investor. You could lose some or all of your initial investment. Past performance is not indicative of future results. Always consult with a qualified financial professional before making any investment decisions.
        </p>
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-2">
          <p className="text-xs text-muted-foreground/70">
            &copy; {new Date().getFullYear()} EntangleWealth LLC. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground/50">
            <Link href="/terms" className="hover:text-primary transition-colors">Terms of Use</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
