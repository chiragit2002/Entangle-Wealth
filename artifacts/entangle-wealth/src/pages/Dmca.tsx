import { Layout } from "@/components/layout/Layout";

// ATTORNEY REVIEW: This entire DMCA Policy page requires review by legal counsel before production use.
export default function Dmca() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">
          DMCA <span className="electric-text">Policy</span>
        </h1>
        <p className="text-sm text-white/20 mb-10 font-mono">Last Updated: April 11, 2026</p>

        <div className="space-y-10 text-white/60 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Overview</h2>
            <p>EntangleWealth respects the intellectual property rights of others and expects its users to do the same. In accordance with the Digital Millennium Copyright Act of 1998 ("DMCA"), we will respond to claims of copyright infringement committed using our platform.</p>
          </section>

          {/* ATTORNEY REVIEW: Verify DMCA notice requirements are current and complete */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Filing a DMCA Takedown Notice</h2>
            <p>If you believe that content on our platform infringes your copyright, please submit a written notice to our designated DMCA agent containing the following information:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>A physical or electronic signature of the copyright owner or a person authorized to act on their behalf</li>
              <li>Identification of the copyrighted work claimed to have been infringed</li>
              <li>Identification of the material that is claimed to be infringing and where it is located on our platform</li>
              <li>Your contact information, including address, telephone number, and email address</li>
              <li>A statement that you have a good faith belief that use of the material is not authorized by the copyright owner, its agent, or the law</li>
              <li>A statement, under penalty of perjury, that the information in the notification is accurate and that you are the copyright owner or are authorized to act on behalf of the owner</li>
            </ul>
          </section>

          {/* ATTORNEY REVIEW: Verify designated agent information is properly registered with the U.S. Copyright Office */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Designated DMCA Agent</h2>
            <p>All DMCA takedown notices should be sent to our designated agent:</p>
            <div className="mt-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <p className="font-bold text-white">DMCA Agent | EntangleWealth</p>
              <p className="mt-1">Email: dmca@entanglewealth.com</p>
              <p>Subject line: DMCA Takedown Notice</p>
            </div>
            <p className="mt-3 text-sm text-white/40">Please note that under Section 512(f) of the DMCA, any person who knowingly materially misrepresents that material is infringing may be subject to liability.</p>
          </section>

          {/* ATTORNEY REVIEW: Confirm counter-notification procedure meets 17 U.S.C. § 512(g) requirements */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Counter-Notification</h2>
            <p>If you believe that your content was wrongly removed due to a DMCA takedown notice, you may submit a counter-notification to our DMCA agent containing:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>Your physical or electronic signature</li>
              <li>Identification of the material that was removed and the location where it appeared before removal</li>
              <li>A statement under penalty of perjury that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification</li>
              <li>Your name, address, and telephone number, and a statement that you consent to the jurisdiction of the federal court in your district and that you will accept service of process from the person who provided the original DMCA notification</li>
            </ul>
            <p className="mt-3">Upon receipt of a valid counter-notification, we will forward it to the complaining party. If the complaining party does not file a court action within 10 business days, we may restore the removed content.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Repeat Infringers</h2>
            <p>In accordance with the DMCA, EntangleWealth will terminate the accounts of users who are found to be repeat copyright infringers, in appropriate circumstances.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Modifications</h2>
            <p>We reserve the right to modify this DMCA Policy at any time. Changes will be posted on this page with an updated "Last Updated" date.</p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
