import { useState, useEffect } from "react";
import { councilMessages } from "@/lib/mock-data";

export function FlashCouncil() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % councilMessages.length);
        setFading(false);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-gradient-to-r from-primary/20 to-secondary/20 border-b border-white/5 py-1.5 px-4 relative z-20">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <span className="shrink-0 text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">AI INSIGHTS</span>
        <p className={`text-xs font-mono text-muted-foreground truncate transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}>
          {councilMessages[currentIndex]}
        </p>
      </div>
    </div>
  );
}
