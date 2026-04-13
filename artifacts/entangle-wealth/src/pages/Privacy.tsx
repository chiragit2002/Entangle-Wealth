import { Layout } from "@/components/layout/Layout";

// ATTORNEY REVIEW: This entire Privacy Policy page requires review by legal counsel before production use.
export default function Privacy() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">
          Privacy <span className="electric-text">Policy</span>
        </h1>
        <p className="text-sm text-white/50 mb-10 font-mono">Last Updated: April 6, 2026</p>

        <div className="space-y-10 text-white/60 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Introduction</h2>
            <p>EntangleWealth ("Company," "we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our financial analysis platform, website, and related services (collectively, the "Service").</p>
            <p className="mt-3">By accessing or using the Service, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with this policy, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Information We Collect</h2>

            <h3 className="text-base font-semibold text-white/80 mt-5 mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-white/80">Account Information:</strong> Name, email address, and authentication credentials when you create an account through our authentication provider (Clerk)</li>
              <li><strong className="text-white/80">Profile Information:</strong> Any additional information you choose to add to your profile</li>
              <li><strong className="text-white/80">Payment Information:</strong> Billing details processed securely through Stripe; we do not store full credit card numbers</li>
              <li><strong className="text-white/80">Watchlist & Preferences:</strong> Stock watchlists, analysis preferences, and platform settings stored locally and/or in your account</li>
              <li><strong className="text-white/80">Communications:</strong> Any messages, feedback, or support requests you send to us</li>
            </ul>

            <h3 className="text-base font-semibold text-white/80 mt-5 mb-2">2.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-white/80">Usage Data:</strong> Pages visited, features used, analysis requests, stocks analyzed, and interaction patterns</li>
              <li><strong className="text-white/80">Device Information:</strong> Browser type, operating system, device identifiers, and screen resolution</li>
              <li><strong className="text-white/80">Log Data:</strong> IP addresses, access times, referring URLs, and server logs</li>
              <li><strong className="text-white/80">Cookies & Local Storage:</strong> We use cookies and browser local storage to maintain session state, store preferences (such as watchlists), and improve your experience</li>
            </ul>

            <h3 className="text-base font-semibold text-white/80 mt-5 mb-2">2.3 Information from Third Parties</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-white/80">Authentication Provider (Clerk):</strong> Basic profile information from your authentication provider</li>
              <li><strong className="text-white/80">Payment Processor (Stripe):</strong> Transaction status and subscription details</li>
              <li><strong className="text-white/80">Market Data Providers (Alpaca):</strong> We receive market data on your behalf; we do not share your personal information with data providers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process transactions and manage your subscription</li>
              <li>Personalize your experience, including stock watchlists and analysis preferences</li>
              <li>Send you service-related notifications and updates</li>
              <li>Respond to your inquiries, comments, and support requests</li>
              <li>Monitor and analyze usage trends to improve our platform</li>
              <li>Detect, prevent, and address technical issues, fraud, and security concerns</li>
              <li>Comply with legal obligations and enforce our Terms of Use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. How We Share Your Information</h2>
            <p>We do not sell your personal information. We may share your information only in the following circumstances:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li><strong className="text-white/80">Service Providers:</strong> With third-party providers who perform services on our behalf (authentication, payment processing, hosting, analytics), subject to confidentiality obligations</li>
              <li><strong className="text-white/80">Legal Requirements:</strong> When required by law, regulation, legal process, or governmental request</li>
              <li><strong className="text-white/80">Protection of Rights:</strong> To protect the rights, property, or safety of EntangleWealth, our users, or the public</li>
              <li><strong className="text-white/80">Business Transfers:</strong> In connection with a merger, acquisition, or sale of all or a portion of our assets</li>
              <li><strong className="text-white/80">With Your Consent:</strong> When you explicitly consent to the sharing of your information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Data Security</h2>
            <p>We implement appropriate technical and organizational security measures to protect your personal information, including:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>Encryption of data in transit using TLS/SSL</li>
              <li>Secure authentication through Clerk with session management</li>
              <li>Payment data handled exclusively by PCI-DSS compliant processor (Stripe)</li>
              <li>Regular security reviews and access controls</li>
              <li>Environment variable protection for API keys and sensitive credentials</li>
            </ul>
            <p className="mt-3">While we strive to protect your information, no method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Data Retention</h2>
            <p>We retain your personal information only for as long as necessary to fulfill the purposes described in this Privacy Policy, unless a longer retention period is required or permitted by law. When your information is no longer needed, we will securely delete or anonymize it.</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>Account data is retained while your account is active and for a reasonable period after deletion</li>
              <li>Transaction records are retained as required by applicable financial regulations</li>
              <li>Usage analytics may be retained in aggregated, anonymized form indefinitely</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Your Rights & Choices</h2>
            <p>Depending on your jurisdiction, you may have the following rights:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li><strong className="text-white/80">Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong className="text-white/80">Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong className="text-white/80">Deletion:</strong> Request deletion of your personal information, subject to legal obligations</li>
              <li><strong className="text-white/80">Portability:</strong> Request a portable copy of your data in a structured format</li>
              <li><strong className="text-white/80">Opt-Out:</strong> Opt out of marketing communications at any time</li>
              <li><strong className="text-white/80">Cookie Preferences:</strong> Manage cookie settings through your browser</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, please contact us at privacy@entanglewealth.com.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. California Privacy Rights (CCPA)</h2>
            <p>If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information is collected, request deletion, and opt out of the sale of personal information. We do not sell personal information.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. International Data Transfers</h2>
            <p>If you access the Service from outside the United States, your information may be transferred to and processed in the United States. By using the Service, you consent to the transfer of your information to the United States, which may have different data protection laws than your country of residence.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Children's Privacy</h2>
            <p>The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have collected information from a child under 18, we will take steps to delete such information promptly.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">11. Third-Party Links & Services</h2>
            <p>The Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of any third-party sites you visit.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">12. Changes to This Privacy Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on the Service with a new "Last Updated" date. Your continued use of the Service after any changes constitutes acceptance of the revised policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">13. Contact Us</h2>
            <p>If you have any questions or concerns about this Privacy Policy, please contact us at:</p>
            <div className="mt-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <p className="font-bold text-white">EntangleWealth | Privacy</p>
              <p className="mt-1">Email: privacy@entanglewealth.com</p>
              <p>Website: entanglewealth.com</p>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
