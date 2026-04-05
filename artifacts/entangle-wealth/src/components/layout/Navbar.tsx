import { Link, useLocation } from "wouter";
import { Menu, X, Activity, BarChart2, Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/earn", label: "Earn" },
    { href: "/options", label: "Options Flow" },
    { href: "/about", label: "About Us" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center border border-primary/50 group-hover:bg-primary/30 transition-colors">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white group-hover:electric-text transition-all duration-300">
            EntangleWealth
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location === link.href ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary">
            Sign In
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-black/95 border-b border-white/10 backdrop-blur-xl flex flex-col p-4 gap-4 animate-in slide-in-from-top-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-lg font-medium p-2 rounded-md ${
                location === link.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Button className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90">
            Sign In
          </Button>
        </div>
      )}
    </nav>
  );
}
