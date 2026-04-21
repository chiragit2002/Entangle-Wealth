import { Layout } from "@/components/layout/Layout";

export default function Accessibility() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">
          Accessibility <span className="electric-text">Statement</span>
        </h1>
        <p className="text-sm text-muted-foreground mb-10 font-mono">Last Updated: April 11, 2026</p>

        <div className="space-y-10 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Our Commitment</h2>
            <p>EntangleWealth is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards to ensure we provide equal access to all users.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Conformance Goal</h2>
            <p>We aim to conform to the <strong className="text-foreground">Web Content Accessibility Guidelines (WCAG) 2.1, Level AA</strong>. These guidelines explain how to make web content more accessible to people with a wide range of disabilities, including:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>Visual impairments (blindness, low vision, color blindness)</li>
              <li>Hearing impairments</li>
              <li>Motor impairments</li>
              <li>Cognitive and learning disabilities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Measures We Take</h2>
            <p>To support accessibility, we:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>Use semantic HTML elements for proper document structure</li>
              <li>Provide text alternatives for non-text content where applicable</li>
              <li>Ensure sufficient color contrast ratios for text and interactive elements</li>
              <li>Support keyboard navigation throughout the platform</li>
              <li>Include ARIA labels and roles for interactive components</li>
              <li>Design responsive layouts that work across different screen sizes and zoom levels</li>
              <li>Maintain a logical heading hierarchy and reading order</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Known Limitations</h2>
            <p>While we strive for comprehensive accessibility, we acknowledge the following current limitations:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li><strong className="text-foreground/80">Interactive charts:</strong> Some financial charts and data visualizations may not be fully accessible to screen readers. We are working on providing alternative data representations.</li>
              <li><strong className="text-foreground/80">Real-time data updates:</strong> Live-updating content (market tickers, streaming data) may not always announce changes to assistive technologies.</li>
              <li><strong className="text-foreground/80">Third-party content:</strong> Some embedded third-party components (authentication forms, payment interfaces) may have their own accessibility limitations beyond our direct control.</li>
              <li><strong className="text-foreground/80">Complex data tables:</strong> Options chains, screener results, and indicator tables with many columns may be challenging to navigate with screen readers on smaller screens.</li>
            </ul>
            <p className="mt-3">We are actively working to address these limitations and improve accessibility across the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Feedback & Assistance</h2>
            <p>We welcome your feedback on the accessibility of EntangleWealth. If you encounter accessibility barriers or have suggestions for improvement, please contact us:</p>
            <div className="mt-3 bg-muted/30 border border-border rounded-xl p-5">
              <p className="font-bold text-foreground">EntangleWealth | Accessibility</p>
              <p className="mt-1">Email: accessibility@entanglewealth.com</p>
            </div>
            <p className="mt-3">We try to respond to accessibility feedback within 5 business days. If you need immediate assistance or encounter a barrier that prevents you from accessing critical functionality, please include details about the issue and we will work to provide alternative access.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Assessment & Updates</h2>
            <p>We periodically assess the accessibility of our platform and update this statement to reflect our current conformance status and ongoing efforts. This statement will be updated as we make improvements.</p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
