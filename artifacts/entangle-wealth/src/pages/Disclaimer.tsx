import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";

// ATTORNEY REVIEW: This entire Financial Disclaimer page requires review by legal counsel before production use.
export default function Disclaimer() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">
          Financial <span className="electric-text">Disclaimer</span>
        </h1>
        <p className="text-sm text-white/20 mb-10 font-mono">Last Updated: April 11, 2026</p>

        <div className="space-y-10 text-white/60 leading-relaxed">
          {/* ATTORNEY REVIEW: Verify this disclaimer is sufficient for your regulatory jurisdiction(s) */}
          <section>
            <div className="bg-[#ff3366]/5 border border-[#ff3366]/20 rounded-xl p-6">
              <h2 className="text-xl font-bold text-[#ff3366] mb-3">IMPORTANT | PLEASE READ CAREFULLY</h2>
              <p className="text-white/80">The information provided by EntangleWealth is for <strong className="text-white">educational and informational purposes only</strong>. Nothing on this platform constitutes financial advice, investment advice, trading advice, or any other form of professional advice. You should not make any financial decisions based solely on the information provided here.</p>
            </div>
          </section>

          {/* ATTORNEY REVIEW: Confirm this adequately disclaims investment advisor status */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Not a Registered Investment Advisor</h2>
            <p>EntangleWealth is <strong className="text-white">not</strong> a registered investment advisor (RIA), broker-dealer, financial planner, certified financial planner (CFP), or licensed financial professional. We do not provide personalized investment recommendations or manage investment portfolios on behalf of users.</p>
            <p className="mt-3">The signals, analysis, and tools provided on this platform are automated computational outputs and should not be treated as professional financial guidance.</p>
          </section>

          {/* ATTORNEY REVIEW: Ensure risk disclosure is compliant with SEC/FINRA guidance */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Trading and Investment Risks</h2>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <p className="text-white/80 font-semibold mb-3">You should be aware of the following risks:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-white/80">Loss of capital:</strong> Trading securities, including stocks and options, involves substantial risk. You may lose some or all of your invested capital.</li>
                <li><strong className="text-white/80">Options risk:</strong> Options trading carries additional risks, including the potential for total loss of premium paid. Options are complex instruments and are not suitable for all investors.</li>
                <li><strong className="text-white/80">Leverage risk:</strong> Leveraged positions amplify both gains and losses and can result in losses exceeding your initial investment.</li>
                <li><strong className="text-white/80">Market risk:</strong> Market conditions can change rapidly and without warning. Past trends may not continue.</li>
                <li><strong className="text-white/80">Liquidity risk:</strong> Some securities may have limited liquidity, making it difficult to enter or exit positions at desired prices.</li>
                <li><strong className="text-white/80">Technology risk:</strong> Platform outages, data delays, or errors may impact your ability to make timely decisions.</li>
              </ul>
            </div>
          </section>

          {/* ATTORNEY REVIEW: Verify past performance disclaimer language */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Past Performance</h2>
            <div className="bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-xl p-5">
              <p className="text-white/80"><strong className="text-white">Past performance is not indicative of future results.</strong> Any performance data, backtesting results, or historical analysis shown on this platform does not guarantee future returns. Market conditions change constantly, and strategies that worked in the past may not work in the future.</p>
              <p className="mt-3 text-white/80">Hypothetical or simulated performance results have inherent limitations. Unlike actual trading records, simulated results do not represent actual trading. Simulated trading programs are generally designed with the benefit of hindsight.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Educational Purpose Only</h2>
            <p>All content on EntangleWealth, including but not limited to:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>AI-generated buy/sell/hold signals and confidence scores</li>
              <li>Technical indicator analysis (RSI, MACD, Bollinger Bands, etc.)</li>
              <li>Options flow data and unusual activity detection</li>
              <li>Tax strategy information and deduction tracking tools</li>
              <li>Market commentary and analysis reports</li>
              <li>Agent reviews and consensus analysis</li>
            </ul>
            <p className="mt-3">...is provided solely for educational purposes. This content does not constitute a recommendation to buy, sell, or hold any security.</p>
          </section>

          {/* ATTORNEY REVIEW: Confirm this adequately addresses data accuracy liability */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. No Guarantee of Accuracy</h2>
            <p>While we strive to provide accurate and timely information, we make no representations or warranties regarding the accuracy, completeness, timeliness, or reliability of any information displayed on this platform. Market data is sourced from third-party providers and may be delayed, inaccurate, or incomplete.</p>
            <p className="mt-3">AI-generated analysis is based on mathematical models and algorithms that have inherent limitations. These models may produce inaccurate or misleading results and should never be used as the sole basis for investment decisions.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Consult a Professional</h2>
            <p>Before making any investment decisions, you should consult with a qualified and licensed financial advisor, tax professional, or other appropriate professionals who can assess your specific financial situation, goals, and risk tolerance.</p>
            <p className="mt-3">Tax-related tools and information on this platform are for educational purposes only and do not substitute for advice from a licensed CPA, enrolled agent, or tax attorney.</p>
          </section>

          {/* ATTORNEY REVIEW: Review limitation of liability language for enforceability */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Limitation of Liability</h2>
            <p>EntangleWealth, its officers, directors, employees, affiliates, and agents shall not be liable for any losses, damages, or costs arising from your use of this platform or reliance on any information provided herein. This includes, but is not limited to, direct, indirect, incidental, consequential, or punitive damages.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. User Responsibility</h2>
            <p>By using this platform, you acknowledge that:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>All investment decisions are your own responsibility</li>
              <li>You have read and understood the risks involved in trading</li>
              <li>You will only trade with capital you can afford to lose</li>
              <li>You will seek professional advice when needed</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Contact</h2>
            <p>For questions about this disclaimer, contact:</p>
            <div className="mt-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <p className="font-bold text-white">EntangleWealth | Legal</p>
              <p className="mt-1">Email: legal@entanglewealth.com</p>
            </div>
          </section>

          <section>
            <p className="text-xs text-white/20">See also: <Link href="/terms" className="text-[#00D4FF] hover:underline">Terms of Use</Link> · <Link href="/privacy" className="text-[#00D4FF] hover:underline">Privacy Policy</Link></p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
