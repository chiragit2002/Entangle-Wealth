import { Shield } from "lucide-react";

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
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Dashboard</a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Options Flow</a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Pricing</a>
          </div>
          <div className="flex flex-col gap-3">
            <span className="font-semibold text-white">Company</span>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">About Us</a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Careers</a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 md:px-6 mt-12 pt-8 border-t border-white/10 flex flex-col gap-4">
        <p className="text-xs text-muted-foreground/70 leading-relaxed text-justify">
          Disclaimer: EntangleWealth is not a registered investment advisor or broker-dealer. The information provided on this platform is for educational and informational purposes only and should not be construed as financial advice, investment recommendations, or an offer to buy or sell any securities. Trading stocks and options involves significant risk and is not suitable for every investor. You could lose some or all of your initial investment. Past performance is not indicative of future results. Always consult with a qualified financial professional before making any investment decisions.
        </p>
        <p className="text-xs text-muted-foreground/70 text-center md:text-left">
          &copy; {new Date().getFullYear()} EntangleWealth LLC. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
