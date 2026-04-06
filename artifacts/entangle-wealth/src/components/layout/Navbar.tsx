import { Link, useLocation } from "wouter";
import { Menu, X, Activity, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useUser, useClerk, Show } from "@clerk/react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/earn", label: "Earn" },
    { href: "/options", label: "Options Flow" },
    { href: "/stocks", label: "Stocks" },
    { href: "/jobs", label: "Jobs" },
    { href: "/gigs", label: "Gigs" },
    { href: "/community", label: "Community" },
    { href: "/tax", label: "TaxFlow" },
    { href: "/terminal", label: "Terminal" },
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

        <div className="hidden lg:flex items-center gap-6">
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

          <Show when="signed-in">
            <div className="flex items-center gap-3 ml-2">
              <Link href="/resume">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                  Résumé
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-1">
                  <User className="w-4 h-4" />
                  {user?.firstName || "Profile"}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-red-400"
                onClick={() => signOut(() => setLocation("/"))}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </Show>

          <Show when="signed-out">
            <Link href="/sign-in">
              <Button
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
              >
                Sign In
              </Button>
            </Link>
          </Show>
        </div>

        <button
          className="lg:hidden text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-16 left-0 w-full bg-black/95 border-b border-white/10 backdrop-blur-xl flex flex-col p-4 gap-4 animate-in slide-in-from-top-2">
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

          <Show when="signed-in">
            <Link href="/resume" onClick={() => setIsMobileMenuOpen(false)}>
              <span className="text-lg font-medium p-2 rounded-md text-muted-foreground hover:bg-white/5 block">Résumé Builder</span>
            </Link>
            <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
              <span className="text-lg font-medium p-2 rounded-md text-muted-foreground hover:bg-white/5 block">Profile</span>
            </Link>
            <Button
              className="w-full mt-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
              onClick={() => { setIsMobileMenuOpen(false); signOut(() => setLocation("/")); }}
            >
              Sign Out
            </Button>
          </Show>

          <Show when="signed-out">
            <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)}>
              <Button className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90">
                Sign In
              </Button>
            </Link>
          </Show>
        </div>
      )}
    </nav>
  );
}
