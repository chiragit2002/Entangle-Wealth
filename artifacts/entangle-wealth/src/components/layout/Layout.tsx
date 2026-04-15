import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { BottomNav } from "./BottomNav";
import { HelpWidget } from "@/components/HelpWidget";
import { SystemStatusBar } from "@/components/SystemStatusBar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-background text-foreground selection:bg-primary/20 selection:text-primary font-sans relative overflow-x-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#00B4D8] focus:text-black focus:text-sm focus:font-bold"
      >
        Skip to main content
      </a>
      <SystemStatusBar />
      <Navbar />
      <main id="main-content" role="main" className="flex-1 flex flex-col z-10 w-full relative main-content-mobile-pad">
        {children}
      </main>
      <Footer />
      <BottomNav />
      <HelpWidget />
    </div>
  );
}
