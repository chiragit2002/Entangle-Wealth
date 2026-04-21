import { Layout } from "@/components/layout/Layout";

// ATTORNEY REVIEW: This entire Terms of Use page requires review by legal counsel before production use.
export default function Terms() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">
          Terms of <span className="electric-text">Use</span>
        </h1>
        <p className="text-sm text-muted-foreground mb-10 font-mono">Last Updated: April 6, 2026</p>

        <div className="space-y-10 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using the EntangleWealth platform ("Service"), website, mobile applications, APIs, or any related services provided by EntangleWealth ("Company," "we," "us," or "our"), you agree to be bound by these Terms of Use ("Terms"). If you do not agree to all of these Terms, you may not access or use the Service.</p>
            <p className="mt-3">These Terms constitute a legally binding agreement between you and EntangleWealth. We may update these Terms from time to time, and your continued use of the Service after any changes constitutes acceptance of those changes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Description of Service</h2>
            <p>EntangleWealth provides a financial analysis and information platform that offers:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>Technical analysis tools utilizing 55+ indicators across trend, momentum, volatility, and volume categories</li>
              <li>Multi-agent AI-powered stock analysis and signal generation</li>
              <li>Real-time and historical market data display sourced from third-party data providers including Alpaca Markets</li>
              <li>Stock screener, options chain analysis, and market overview dashboards</li>
              <li>Candlestick charting with SMA overlays and OHLCV data visualization</li>
              <li>Economic calendar and market indicator tracking</li>
              <li>Educational resources related to trading and investing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Not Financial Advice</h2>
            <div className="bg-[#ff3366]/5 border border-[#ff3366]/20 rounded-xl p-5">
              <p className="text-foreground/80 font-semibold mb-3">IMPORTANT DISCLAIMER</p>
              <p>The information provided through EntangleWealth is for <strong className="text-foreground">informational and educational purposes only</strong> and does not constitute financial advice, investment advice, trading advice, or any other type of advice. You should not treat any of the platform's content as such.</p>
              <p className="mt-3">EntangleWealth does not recommend that any security, portfolio of securities, transaction, or investment strategy is suitable for any specific person. All trading and investment decisions are made solely by the user. You acknowledge and agree that you bear sole responsibility for your own investment research and decisions.</p>
              <p className="mt-3">Past performance is not indicative of future results. Trading securities involves substantial risk of loss and is not appropriate for every investor. You should carefully consider your investment objectives, level of experience, and risk appetite before making any investment decisions.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Market Data & Third-Party Services</h2>
            <p>Market data displayed on the platform is sourced from third-party providers, including but not limited to Alpaca Markets, Inc. ("Alpaca"). This data is provided on an "as-is" basis, and we do not guarantee its accuracy, completeness, or timeliness.</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>Real-time data may be delayed depending on your subscription level and data feed availability</li>
              <li>Historical data is provided for analysis purposes and may contain gaps or inaccuracies</li>
              <li>Options data, including Greeks calculations, are computed estimates and should not be relied upon as the sole basis for trading decisions</li>
              <li>We are not responsible for any errors, omissions, or interruptions in data feeds from third-party providers</li>
            </ul>
            <p className="mt-3">By using our Service, you also agree to comply with the terms and conditions of our third-party data providers, including Alpaca's Market Data Agreement and API Agreement as applicable.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. User Accounts & Registration</h2>
            <p>To access certain features of the Service, you must create an account. When creating your account, you agree to:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>Provide accurate, current, and complete registration information</li>
              <li>Maintain the security and confidentiality of your login credentials</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Not create multiple accounts or share your account credentials with others</li>
            </ul>
            <p className="mt-3">We reserve the right to suspend or terminate your account at our sole discretion if we believe you have violated these Terms or engaged in any fraudulent, abusive, or harmful conduct.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Subscription & Payments</h2>
            <p>Certain features of EntangleWealth may require a paid subscription. Payment processing is handled securely through Stripe, Inc. By subscribing, you agree to:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>Pay all fees associated with your chosen subscription plan</li>
              <li>Provide valid and current payment information</li>
              <li>Accept automatic recurring billing unless you cancel your subscription</li>
              <li>Cancellation terms as specified at the time of purchase</li>
            </ul>
            <p className="mt-3">We reserve the right to change pricing with reasonable notice. Free trial periods, if offered, will be clearly communicated along with conversion terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. AI-Generated Analysis</h2>
            <p>EntangleWealth utilizes artificial intelligence and machine learning models to generate analysis, signals, and insights. You acknowledge that:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>AI-generated signals (BUY, SELL, NEUTRAL, STRONG BUY, STRONG SELL) are computational outputs based on technical indicator analysis and do not constitute recommendations</li>
              <li>Confidence scores represent mathematical agreement among indicators, not probability of profit</li>
              <li>AI models may produce inaccurate or misleading results and should be used in conjunction with your own research and judgment</li>
              <li>Agent reviews (Trend Analyst, Momentum Surgeon, Risk Manager, Volume Profiler, Devil's Advocate, Consensus Engine) are automated analyses, not human expert opinions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Prohibited Uses</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws or regulations</li>
              <li>Attempt to gain unauthorized access to any part of the Service, other accounts, or any systems or networks connected to the Service</li>
              <li>Reproduce, redistribute, sell, or commercially exploit any data, content, or analysis obtained through the Service without prior written consent</li>
              <li>Use automated systems (bots, scrapers, crawlers) to access the Service in a manner that exceeds reasonable request volumes</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Redistribute market data received through our platform in violation of data provider agreements</li>
              <li>Use the platform to engage in market manipulation, insider trading, or any other form of securities fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">9. Intellectual Property</h2>
            <p>All content, features, and functionality of the Service | including but not limited to software, algorithms, analysis methodologies, text, graphics, logos, and user interface design | are owned by EntangleWealth and are protected by copyright, trademark, and other intellectual property laws.</p>
            <p className="mt-3">You are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your personal, non-commercial use, subject to these Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">10. Limitation of Liability</h2>
            <div className="bg-muted/30 border border-border rounded-xl p-5">
              <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, ENTANGLEWEALTH AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:</p>
              <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
                <li>YOUR USE OF OR INABILITY TO USE THE SERVICE</li>
                <li>ANY TRADING OR INVESTMENT DECISIONS MADE BASED ON INFORMATION OBTAINED THROUGH THE SERVICE</li>
                <li>UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR DATA OR TRANSMISSIONS</li>
                <li>ANY ERRORS, INACCURACIES, OR OMISSIONS IN THE CONTENT OR DATA PROVIDED</li>
                <li>ANY INTERRUPTION OR CESSATION OF THE SERVICE</li>
              </ul>
              <p className="mt-3">IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU HAVE PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">11. Risk Disclosure</h2>
            <p>Trading and investing in securities, including stocks, options, and other financial instruments, involves substantial risk of loss and is not suitable for all investors. You should be aware that:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>You may lose all or a portion of your invested capital</li>
              <li>Past performance of any trading system, methodology, or analysis does not guarantee future results</li>
              <li>Options trading involves unique risks, including the potential for total loss of premium paid</li>
              <li>Market conditions can change rapidly and without warning</li>
              <li>Leverage amplifies both gains and losses</li>
            </ul>
            <p className="mt-3">You should consult with a qualified financial advisor before making any investment decisions. EntangleWealth is not a registered investment advisor, broker-dealer, or financial planner.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">12. Indemnification</h2>
            <p>You agree to indemnify, defend, and hold harmless EntangleWealth, its affiliates, officers, directors, employees, agents, and licensors from and against any and all claims, damages, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to your use of the Service, your violation of these Terms, or your violation of any rights of another party.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">13. Governing Law & Dispute Resolution</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of the United States and the State of Delaware, without regard to its conflict of law principles. Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, except where prohibited by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">14. Termination</h2>
            <p>We may terminate or suspend your access to the Service at any time, with or without cause, and with or without notice. Upon termination, your right to use the Service will immediately cease. All provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnification, and limitations of liability.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">15. Modifications to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on the platform with a new "Last Updated" date. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">16. Contact Information</h2>
            <p>If you have any questions about these Terms of Use, please contact us at:</p>
            <div className="mt-3 bg-muted/30 border border-border rounded-xl p-5">
              <p className="font-bold text-foreground">EntangleWealth</p>
              <p className="mt-1">Email: legal@entanglewealth.com</p>
              <p>Website: entanglewealth.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">17. Severability</h2>
            <p>If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary so that the remaining provisions of the Terms shall remain in full force and effect.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">18. Entire Agreement</h2>
            <p>These Terms, together with our Privacy Policy and any other agreements referenced herein, constitute the entire agreement between you and EntangleWealth regarding the use of the Service, superseding any prior agreements or understandings.</p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
