import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { BottomNav } from "./BottomNav";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-black text-white selection:bg-primary/30 selection:text-primary font-sans relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute w-[700px] h-[700px] rounded-full opacity-[0.04]"
          style={{
            top: "-15%",
            left: "-10%",
            background: "radial-gradient(circle, #00D4FF 0%, transparent 70%)",
            filter: "blur(80px)",
            animation: "orb-drift-1 25s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{
            bottom: "-10%",
            right: "-5%",
            background: "radial-gradient(circle, #FFD700 0%, transparent 70%)",
            filter: "blur(80px)",
            animation: "orb-drift-2 30s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-[0.025]"
          style={{
            top: "40%",
            right: "20%",
            background: "radial-gradient(circle, #9c27b0 0%, transparent 70%)",
            filter: "blur(100px)",
            animation: "orb-drift-3 35s ease-in-out infinite",
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>
      
      <Navbar />
      <main className="flex-1 flex flex-col z-10 w-full relative pb-20 lg:pb-0">
        {children}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
