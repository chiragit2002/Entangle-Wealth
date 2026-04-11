import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BigWinOverlayProps {
  show: boolean;
  label?: string;
  onDone?: () => void;
}

export function BigWinOverlay({ show, label = "BIG WIN", onDone }: BigWinOverlayProps) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onDone?.(), 2800);
    return () => clearTimeout(t);
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="relative flex flex-col items-center gap-2 select-none"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1.15, 1], opacity: [0, 1, 1] }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <motion.div
              className="absolute inset-0 rounded-full blur-3xl"
              style={{ background: "radial-gradient(ellipse, rgba(255,215,0,0.45) 0%, rgba(255,100,0,0.2) 60%, transparent 100%)" }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.2, repeat: 2, ease: "easeInOut" }}
            />

            <motion.div
              className="text-5xl"
              animate={{ rotate: [-10, 10, -10, 10, 0] }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              🏆
            </motion.div>

            <motion.div
              className="px-8 py-3 rounded-xl text-center"
              style={{
                background: "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF6347 100%)",
                boxShadow: "0 0 40px rgba(255,215,0,0.7), 0 0 80px rgba(255,165,0,0.4)",
              }}
              animate={{
                boxShadow: [
                  "0 0 40px rgba(255,215,0,0.7), 0 0 80px rgba(255,165,0,0.4)",
                  "0 0 60px rgba(255,215,0,0.9), 0 0 120px rgba(255,165,0,0.6)",
                  "0 0 40px rgba(255,215,0,0.7), 0 0 80px rgba(255,165,0,0.4)",
                ],
              }}
              transition={{ duration: 0.8, repeat: 3, ease: "easeInOut" }}
            >
              <span
                className="text-3xl font-black tracking-widest uppercase"
                style={{ color: "#0a0a0f", textShadow: "0 1px 2px rgba(0,0,0,0.3)", fontFamily: "var(--font-mono, monospace)" }}
              >
                {label}
              </span>
            </motion.div>

            <motion.div
              className="flex gap-1 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {["⭐", "✨", "🌟", "✨", "⭐"].map((star, i) => (
                <motion.span
                  key={i}
                  className="text-xl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.07 }}
                >
                  {star}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
