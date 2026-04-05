import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center py-32 px-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-8">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-2">Page not found</p>
        <p className="text-sm text-muted-foreground/60 mb-8 max-w-md">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex gap-3">
          <Link href="/">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
              <Home className="w-4 h-4" /> Go Home
            </Button>
          </Link>
          <Button variant="outline" className="border-white/10 gap-2" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Button>
        </div>
      </div>
    </Layout>
  );
}
