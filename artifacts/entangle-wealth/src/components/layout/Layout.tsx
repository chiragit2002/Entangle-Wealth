import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { BottomNav } from "./BottomNav";
import { HelpWidget } from "@/components/HelpWidget";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-background text-foreground selection:bg-primary/20 selection:text-primary font-sans relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-[0.025]"
          style={{
            top: "-20%",
            left: "-15%",
            background: "radial-gradient(circle, hsl(195 100% 50%) 0%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-[0.015]"
          style={{
            bottom: "-10%",
            right: "-8%",
            background: "radial-gradient(circle, hsl(195 100% 50%) 0%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
      </div>

      <Navbar />
      <main className="flex-1 flex flex-col z-10 w-full relative pb-20 lg:pb-0">
        {children}
      </main>
      <Footer />
      <BottomNav />
      <HelpWidget />
    </div>
  );
}
