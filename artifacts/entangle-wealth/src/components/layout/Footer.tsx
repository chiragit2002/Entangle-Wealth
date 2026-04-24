import { memo, useCallback } from "react";
import { Link } from "wouter";
import logoImg from "@assets/Gemini_Generated_Image_nso2qnso2qnso2qn_1775900950533.png";

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  return (
    <Link href={href} onClick={scrollToTop} className="text-muted-foreground hover:text-foreground transition-colors duration-150">
      {children}
    </Link>
  );
}

function FooterComponent() {
  return (
    <footer className="w-full mt-auto pb-20 lg:pb-0 bg-background border-t border-border">
      <div className="bloomberg-header" style={{ borderBottom: "1px solid rgba(0,180,216,0.08)" }}>
        ENTANGLEWEALTH TERMINAL · INSTITUTIONAL INTELLIGENCE · BUILT FOR REAL PEOPLE
      </div>
      <div className="container mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row justify-between gap-6">
        <div className="flex flex-col max-w-xs gap-2">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="EntangleWealth logo" className="w-5 h-5 object-contain opacity-70" />
            <span className="font-mono font-bold text-xs tracking-widest" style={{ color: "#00B4D8" }}>ENTANGLEWEALTH</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
            The edge they kept to themselves. Now yours.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-[11px] font-mono">
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: "rgba(0,180,216,0.5)" }}>PLATFORM</span>
            <FooterLink href="/dashboard">Dashboard</FooterLink>
            <FooterLink href="/stocks">Stock Explorer</FooterLink>
            <FooterLink href="/options">Options Flow</FooterLink>
            <FooterLink href="/terminal">Terminal</FooterLink>
            <FooterLink href="/help">Help Center</FooterLink>
            <FooterLink href="/status">System Status</FooterLink>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: "rgba(0,180,216,0.5)" }}>LEARN</span>
            <FooterLink href="/technical">Technical Indicators</FooterLink>
            <FooterLink href="/tax-strategy">Trading Strategies</FooterLink>
            <FooterLink href="/charts">Chart Patterns</FooterLink>
            <FooterLink href="/screener">Stock Comparisons</FooterLink>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: "rgba(0,180,216,0.5)" }}>LEGAL</span>
            <FooterLink href="/terms">Terms of Use</FooterLink>
            <FooterLink href="/privacy">Privacy Policy</FooterLink>
            <FooterLink href="/disclaimer">Financial Disclaimer</FooterLink>
            <FooterLink href="/cookies">Cookie Policy</FooterLink>
            <FooterLink href="/dmca">DMCA Policy</FooterLink>
            <FooterLink href="/accessibility">Accessibility</FooterLink>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 mt-8 pt-6 border-t border-[rgba(0,180,216,0.06)] flex flex-col gap-3">
        <p className="text-[10px] text-muted-foreground/50 font-mono leading-relaxed text-justify">
          Disclaimer: EntangleWealth is not a registered investment advisor. Nothing here is financial advice. Trading involves risk — you could lose your entire investment. Past performance does not predict future results.
        </p>
        <p className="text-[10px] font-mono" style={{ color: "rgba(0,180,216,0.25)" }}>
          &copy; {new Date().getFullYear()} ENTANGLEWEALTH LLC · ALL RIGHTS RESERVED
        </p>
      </div>
    </footer>
  );
}

export const Footer = memo(FooterComponent);
