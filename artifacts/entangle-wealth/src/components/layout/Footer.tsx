import { Link } from "wouter";
import logoImg from "@assets/Gemini_Generated_Image_nso2qnso2qnso2qn_1775900950533.png";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-black py-12 mt-auto">
      <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between gap-8">
        <div className="flex flex-col max-w-sm gap-4">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="EntangleWealth logo" className="w-6 h-6 rounded object-contain" />
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
            <Link href="/help" className="text-muted-foreground hover:text-primary transition-colors">Help Center</Link>
            <Link href="/status" className="text-muted-foreground hover:text-primary transition-colors">System Status</Link>
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-semibold text-white">Learn</span>
            <Link href="/blog" className="text-muted-foreground hover:text-primary transition-colors">Financial Glossary</Link>
            <Link href="/technical" className="text-muted-foreground hover:text-primary transition-colors">Technical Indicators</Link>
            <Link href="/tax-strategy" className="text-muted-foreground hover:text-primary transition-colors">Trading Strategies</Link>
            <Link href="/charts" className="text-muted-foreground hover:text-primary transition-colors">Chart Patterns</Link>
            <Link href="/sector-flow" className="text-muted-foreground hover:text-primary transition-colors">Sector Analysis</Link>
            <Link href="/screener" className="text-muted-foreground hover:text-primary transition-colors">Stock Comparisons</Link>
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-semibold text-white">Legal</span>
            <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms of Use</Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/disclaimer" className="text-muted-foreground hover:text-primary transition-colors">Financial Disclaimer</Link>
            <Link href="/cookies" className="text-muted-foreground hover:text-primary transition-colors">Cookie Policy</Link>
            <Link href="/dmca" className="text-muted-foreground hover:text-primary transition-colors">DMCA Policy</Link>
            <Link href="/accessibility" className="text-muted-foreground hover:text-primary transition-colors">Accessibility</Link>
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
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="/disclaimer" className="hover:text-primary transition-colors">Disclaimer</Link>
            <Link href="/cookies" className="hover:text-primary transition-colors">Cookies</Link>
            <Link href="/dmca" className="hover:text-primary transition-colors">DMCA</Link>
            <Link href="/accessibility" className="hover:text-primary transition-colors">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
