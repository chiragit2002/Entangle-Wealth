import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare } from "lucide-react";
import { ReferralSection } from "@/components/viral/ReferralSection";
import { TestimonialForm } from "@/components/viral/TestimonialForm";
import { trackEvent } from "@/lib/trackEvent";
import { useAuth } from "@clerk/react";

export default function Community() {
  const { isSignedIn } = useAuth();

  return (
    <Layout>
      <div className="container mx-auto px-4 md:px-6 py-12 max-w-3xl">
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Community</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Connect, share strategies, and grow together.
          </p>
        </div>

        <div className="border border-white/[0.06] rounded-lg bg-white/[0.02] p-8 text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-[#00FF41]/10 border border-[#00FF41]/20 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6 text-[#00FF41]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Launching Soon</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            Community groups, discussion feeds, events, and networking features are being built.
            Share your referral link below to help grow the community before launch.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00FF41]/20 bg-[#00FF41]/5 text-[#00FF41] text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" />
            In Development
          </div>
        </div>

        {isSignedIn && (
          <div className="space-y-8">
            <ReferralSection />
            <TestimonialForm />
          </div>
        )}

        {!isSignedIn && (
          <div className="text-center">
            <Button
              onClick={() => {
                trackEvent("community_signup_cta");
                window.location.href = "/sign-up";
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Sign up to get early access
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
