import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";

export default function Cookies() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">
          Cookie <span className="electric-text">Policy</span>
        </h1>
        <p className="text-sm text-white/50 mb-10 font-mono">Last Updated: April 11, 2026</p>

        <div className="space-y-10 text-white/60 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. What Are Cookies</h2>
            <p>Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently, provide a better user experience, and give website owners usage information.</p>
            <p className="mt-3">This Cookie Policy explains how EntangleWealth ("we," "us," or "our") uses cookies and similar technologies on our platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. How We Use Cookies</h2>
            <p>We use the following types of cookies:</p>

            <h3 className="text-base font-semibold text-white/80 mt-5 mb-2">2.1 Essential Cookies</h3>
            <p>These cookies are necessary for the platform to function and cannot be switched off. They include:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li><strong className="text-white/80">Authentication cookies:</strong> Managed by Clerk to keep you signed in and secure your session</li>
              <li><strong className="text-white/80">CSRF protection cookies:</strong> Used to prevent cross-site request forgery attacks</li>
              <li><strong className="text-white/80">Cookie consent:</strong> Remembers your cookie preference choice</li>
            </ul>

            <h3 className="text-base font-semibold text-white/80 mt-5 mb-2">2.2 Functional Cookies</h3>
            <p>These cookies enable enhanced functionality and personalization:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li><strong className="text-white/80">Preferences:</strong> Theme settings, watchlist data, dismissed tooltips, and onboarding progress</li>
              <li><strong className="text-white/80">Local storage:</strong> We use browser local storage to save your chart preferences, analysis settings, and UI state</li>
            </ul>

            <h3 className="text-base font-semibold text-white/80 mt-5 mb-2">2.3 Analytics Cookies</h3>
            <p>These cookies help us understand how visitors interact with our platform:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li><strong className="text-white/80">Usage tracking:</strong> Page views, feature usage, and navigation patterns (collected via our analytics endpoint)</li>
              <li><strong className="text-white/80">Session identifiers:</strong> Anonymous session IDs to group usage events within a single visit</li>
            </ul>

            <h3 className="text-base font-semibold text-white/80 mt-5 mb-2">2.4 Third-Party Cookies</h3>
            <p>Our platform integrates with third-party services that may set their own cookies:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li><strong className="text-white/80">Clerk (Authentication):</strong> Session management and authentication state</li>
              <li><strong className="text-white/80">Stripe (Payments):</strong> Fraud prevention and payment processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Managing Cookies</h2>
            <p>You can control and manage cookies in several ways:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li><strong className="text-white/80">Browser settings:</strong> Most browsers allow you to refuse or delete cookies through their settings. Note that disabling essential cookies may prevent the platform from functioning properly.</li>
              <li><strong className="text-white/80">Cookie banner:</strong> When you first visit our platform, you can accept or decline non-essential cookies through our cookie consent banner.</li>
              <li><strong className="text-white/80">Local storage:</strong> You can clear local storage data through your browser's developer tools or settings.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Cookie Retention</h2>
            <p>Different cookies have different lifespans:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li><strong className="text-white/80">Session cookies:</strong> Deleted when you close your browser</li>
              <li><strong className="text-white/80">Persistent cookies:</strong> Remain until they expire or you delete them. Authentication cookies typically last up to 30 days.</li>
              <li><strong className="text-white/80">Local storage data:</strong> Persists until manually cleared by you or the application</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Updates to This Policy</h2>
            <p>We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will post the updated policy on this page with a revised "Last Updated" date.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Contact Us</h2>
            <p>If you have questions about our use of cookies, please contact us at:</p>
            <div className="mt-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <p className="font-bold text-white">EntangleWealth | Privacy</p>
              <p className="mt-1">Email: privacy@entanglewealth.com</p>
            </div>
          </section>

          <section>
            <p className="text-xs text-white/50">See also: <Link href="/privacy" className="text-[#00D4FF] hover:underline">Privacy Policy</Link> · <Link href="/terms" className="text-[#00D4FF] hover:underline">Terms of Use</Link></p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
