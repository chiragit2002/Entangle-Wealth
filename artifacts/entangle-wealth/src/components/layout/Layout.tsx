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
