import { Link, useLocation } from "wouter";
import { Menu, X, Activity } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function Navbar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/earn", label: "Earn" },
    { href: "/options", label: "Options Flow" },
    { href: "/about", label: "About Us" },
  ];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setIsLoading(false);
    setIsSignInOpen(false);
    setEmail("");
    setPassword("");
    setName("");
    toast({
      title: isSignUp ? "Account created" : "Welcome back",
      description: isSignUp
        ? "Your account has been created. Check your email to verify."
        : "You've been signed in successfully.",
    });
  };

  return (
    <>
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
            <Button
              variant="outline"
              className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => { setIsSignUp(false); setIsSignInOpen(true); }}
            >
              Sign In
            </Button>
          </div>

          <button
            className="md:hidden text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

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
            <Button
              className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => { setIsMobileMenuOpen(false); setIsSignUp(false); setIsSignInOpen(true); }}
            >
              Sign In
            </Button>
          </div>
        )}
      </nav>

      <Dialog open={isSignInOpen} onOpenChange={setIsSignInOpen}>
        <DialogContent className="bg-black border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl">{isSignUp ? "Create Account" : "Welcome Back"}</DialogTitle>
            <DialogDescription>
              {isSignUp ? "Join the waitlist and create your account." : "Sign in to access your dashboard."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAuth} className="flex flex-col gap-4 mt-2">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10"
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2" disabled={isLoading}>
              {isLoading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
              {" "}
              <button type="button" className="text-primary hover:underline" onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? "Sign in" : "Create one"}
              </button>
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
