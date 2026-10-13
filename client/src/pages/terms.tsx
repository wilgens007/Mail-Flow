import { Link } from "wouter";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Terms of Service — TEMPLATE. Have an attorney review before public launch.
 */
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl">MailFlow</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 prose prose-sm dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <h2>1. The service</h2>
        <p>
          MailFlow provides email marketing tools: contact management, campaign creation, email
          delivery, and analytics. Plans include monthly email quotas as described on the pricing
          page. Unused quota does not roll over.
        </p>

        <h2>2. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Send unsolicited bulk email (spam). You must have consent from every recipient.</li>
          <li>Send content that is unlawful, deceptive, or infringes others' rights.</li>
          <li>Attempt to bypass suppression lists, rate limits, or plan quotas.</li>
          <li>Share your account or resell access without an Agency agreement.</li>
        </ul>
        <p>
          We may suspend accounts that generate excessive bounces, complaints, or spam reports,
          as these damage shared sending infrastructure.
        </p>

        <h2>3. Your responsibilities</h2>
        <p>
          You are responsible for the content of your emails, the lawfulness of your mailing lists,
          and including accurate sender identification and a working unsubscribe mechanism in every
          campaign (we provide these automatically — do not remove them).
        </p>

        <h2>4. Billing</h2>
        <p>
          Subscriptions bill monthly in advance via Stripe. You may cancel anytime; service continues
          until the end of the billing period. Refunds are handled case by case.
        </p>

        <h2>5. Termination</h2>
        <p>
          Either party may terminate with notice. We may terminate immediately for violations of
          these terms. On termination you may export your contacts within 30 days.
        </p>

        <h2>6. Limitation of liability</h2>
        <p>
          The service is provided "as is." To the maximum extent permitted by law, MailFlow is not
          liable for indirect or consequential damages. Total liability is limited to the fees paid
          in the 12 months preceding the claim.
        </p>

        <h2>7. Changes</h2>
        <p>
          We may update these terms; material changes will be announced by email or in-app notice.
          Continued use after changes take effect constitutes acceptance.
        </p>

        <h2>8. Contact</h2>
        <p>
          Questions: <a href="mailto:hello@mailflow.io">hello@mailflow.io</a>.
        </p>

        <p className="text-xs text-muted-foreground border-t pt-4 mt-8">
          Note: these are template terms. Have them reviewed by an attorney before relying on them.
        </p>
      </main>
    </div>
  );
}
