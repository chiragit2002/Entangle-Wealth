import { Link } from "wouter";
import logoImg from "@assets/Gemini_Generated_Image_nso2qnso2qnso2qn_1775900950533.png";

export function Footer() {
  return (
    <footer className="w-full border-t border-border/60 bg-background py-10 mt-auto">
      <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between gap-8">
        <div className="flex flex-col max-w-xs gap-3">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="EntangleWealth logo" className="w-6 h-6 rounded object-contain opacity-90" />
            <span className="font-semibold text-sm text-foreground">EntangleWealth</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Professional-grade alerts and analysis for the everyday investor. Trade smarter, live better.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground/70">Platform</span>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Dashboard</Link>
            <Link href="/stocks" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Stock Explorer</Link>
            <Link href="/options" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Options Flow</Link>
            <Link href="/earn" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Earn</Link>
            <Link href="/terminal" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Terminal</Link>
            <Link href="/help" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Help Center</Link>
            <Link href="/status" className="text-muted-foreground hover:text-foreground transition-colors duration-150">System Status</Link>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground/70">Learn</span>
            <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Financial Glossary</Link>
            <Link href="/technical" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Technical Indicators</Link>
            <Link href="/tax-strategy" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Trading Strategies</Link>
            <Link href="/charts" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Chart Patterns</Link>
            <Link href="/sector-flow" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Sector Analysis</Link>
            <Link href="/screener" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Stock Comparisons</Link>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground/70">Legal</span>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Terms of Use</Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Privacy Policy</Link>
            <Link href="/disclaimer" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Financial Disclaimer</Link>
            <Link href="/cookies" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Cookie Policy</Link>
            <Link href="/dmca" className="text-muted-foreground hover:text-foreground transition-colors duration-150">DMCA Policy</Link>
            <Link href="/accessibility" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Accessibility</Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 mt-8 pt-6 border-t border-border/40 flex flex-col gap-3">
        <p className="text-xs text-muted-foreground/60 leading-relaxed text-justify">
          Disclaimer: EntangleWealth is not a registered investment advisor or broker-dealer. The information provided on this platform is for educational and informational purposes only and should not be construed as financial advice, investment recommendations, or an offer to buy or sell any securities. Trading stocks and options involves significant risk and is not suitable for every investor. You could lose some or all of your initial investment. Past performance is not indicative of future results. Always consult with a qualified financial professional before making any investment decisions.
        </p>
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-2">
          <p className="text-xs text-muted-foreground/50">
            &copy; {new Date().getFullYear()} EntangleWealth LLC. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground/40">
            <Link href="/terms" className="hover:text-muted-foreground transition-colors duration-150">Terms</Link>
            <Link href="/privacy" className="hover:text-muted-foreground transition-colors duration-150">Privacy</Link>
            <Link href="/disclaimer" className="hover:text-muted-foreground transition-colors duration-150">Disclaimer</Link>
            <Link href="/cookies" className="hover:text-muted-foreground transition-colors duration-150">Cookies</Link>
            <Link href="/dmca" className="hover:text-muted-foreground transition-colors duration-150">DMCA</Link>
            <Link href="/accessibility" className="hover:text-muted-foreground transition-colors duration-150">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
