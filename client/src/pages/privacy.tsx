import { Link } from "wouter";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Privacy Policy — TEMPLATE. Have an attorney review before public launch.
 */
export default function PrivacyPage() {
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
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <h2>1. Information we collect</h2>
        <p>
          <strong>Account information:</strong> when you sign up we collect your name, email address,
          and company name. <strong>Billing information</strong> is processed by our payment provider
          (Stripe); we do not store full credit card numbers. <strong>Contact data:</strong> email
          addresses and related fields you upload or enter to send campaigns to. <strong>Usage data:</strong>
          email opens, clicks, bounces, and complaints for campaigns you send, plus basic analytics
          about how you use the platform.
        </p>

        <h2>2. How we use information</h2>
        <p>
          We use your information to operate the service: sending your campaigns, tracking their
          performance, managing your subscription, preventing abuse, and communicating with you
          about the service. We never sell your data or your contacts' data.
        </p>

        <h2>3. Email tracking</h2>
        <p>
          Campaign emails include a small tracking pixel and rewritten links so senders can see
          open and click rates. Recipients can opt out of tracking only by unsubscribing, as
          pixel-based tracking cannot be disabled per-recipient.
        </p>

        <h2>4. Data sharing</h2>
        <p>
          We share data only with infrastructure providers needed to run the service (hosting,
          email delivery via Amazon SES, payments via Stripe), bound by contractual confidentiality.
          We disclose data when required by law.
        </p>

        <h2>5. Your rights</h2>
        <p>
          You may request access, correction, export, or deletion of your personal data at any time
          by contacting <a href="mailto:hello@mailflow.io">hello@mailflow.io</a>. If you are in the
          EU/UK, you have additional rights under GDPR, including the right to lodge a complaint
          with your supervisory authority.
        </p>

        <h2>6. Data retention</h2>
        <p>
          We retain account and campaign data while your account is active. Deleted accounts have
          their personal data removed within 30 days, except where retention is required by law.
        </p>

        <h2>7. Security</h2>
        <p>
          We use industry-standard measures including encrypted connections (TLS), hashed passwords
          (bcrypt), and tenant-isolated data access. No method of transmission over the internet is
          100% secure, and we cannot guarantee absolute security.
        </p>

        <h2>8. Changes</h2>
        <p>
          We may update this policy; material changes will be announced by email or in-app notice.
        </p>

        <h2>9. Contact</h2>
        <p>
          Privacy questions: <a href="mailto:hello@mailflow.io">hello@mailflow.io</a>.
        </p>

        <p className="text-xs text-muted-foreground border-t pt-4 mt-8">
          Note: this is a template policy. Have it reviewed by an attorney before relying on it.
        </p>
      </main>
    </div>
  );
}
