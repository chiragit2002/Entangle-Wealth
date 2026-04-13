import { memo } from "react";
import { Link } from "wouter";
import logoImg from "@assets/Gemini_Generated_Image_nso2qnso2qnso2qn_1775900950533.png";

function FooterComponent() {
  return (
    <footer className="w-full mt-auto" style={{ background: "#080C18", borderTop: "1px solid rgba(255,140,0,0.12)" }}>
      <div className="bloomberg-header" style={{ borderBottom: "1px solid rgba(255,140,0,0.08)" }}>
        ENTANGLEWEALTH TERMINAL · INSTITUTIONAL INTELLIGENCE · BUILT FOR REAL PEOPLE
      </div>
      <div className="container mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row justify-between gap-6">
        <div className="flex flex-col max-w-xs gap-2">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="EntangleWealth logo" className="w-5 h-5 object-contain opacity-70" />
            <span className="font-mono font-bold text-xs tracking-widest" style={{ color: "#FF8C00" }}>ENTANGLEWEALTH</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
            The edge they kept to themselves. Now yours.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-[11px] font-mono">
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: "rgba(255,140,0,0.5)" }}>PLATFORM</span>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Dashboard</Link>
            <Link href="/stocks" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Stock Explorer</Link>
            <Link href="/options" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Options Flow</Link>
            <Link href="/terminal" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Terminal</Link>
            <Link href="/help" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Help Center</Link>
            <Link href="/status" className="text-muted-foreground hover:text-foreground transition-colors duration-150">System Status</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: "rgba(255,140,0,0.5)" }}>LEARN</span>
            <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Financial Glossary</Link>
            <Link href="/technical" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Technical Indicators</Link>
            <Link href="/tax-strategy" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Trading Strategies</Link>
            <Link href="/charts" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Chart Patterns</Link>
            <Link href="/sector-flow" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Sector Analysis</Link>
            <Link href="/screener" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Stock Comparisons</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: "rgba(255,140,0,0.5)" }}>LEGAL</span>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Terms of Use</Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Privacy Policy</Link>
            <Link href="/disclaimer" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Financial Disclaimer</Link>
            <Link href="/cookies" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Cookie Policy</Link>
            <Link href="/dmca" className="text-muted-foreground hover:text-foreground transition-colors duration-150">DMCA Policy</Link>
            <Link href="/accessibility" className="text-muted-foreground hover:text-foreground transition-colors duration-150">Accessibility</Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 mt-8 pt-6 border-t border-[rgba(255,140,0,0.06)] flex flex-col gap-3">
        <p className="text-[10px] text-muted-foreground/50 font-mono leading-relaxed text-justify">
          Disclaimer: EntangleWealth is not a registered investment advisor. Nothing here is financial advice. Trading involves risk — you could lose your entire investment. Past performance does not predict future results.
        </p>
        <p className="text-[10px] font-mono" style={{ color: "rgba(255,140,0,0.25)" }}>
          &copy; {new Date().getFullYear()} ENTANGLEWEALTH LLC · ALL RIGHTS RESERVED
        </p>
      </div>
    </footer>
  );
}

export const Footer = memo(FooterComponent);
