import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Users,
  BarChart3,
  Zap,
  Shield,
  Globe,
  Check,
  ArrowRight,
  Sparkles,
  Send,
  TrendingUp,
  Moon,
  Sun,
  MousePointerClick,
  Eye,
  Inbox,
  PenLine,
  Rocket
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { PLAN_LIMITS } from "@shared/schema";

/** Typing effect for the hero mockup subject line */
function useTypewriter(text: string, speed = 55) {
  const [out, setOut] = useState("");
  useEffect(() => {
    let i = 0;
    setOut("");
    const id = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return out;
}

/** Animated counter that counts up when mounted */
function useCounter(target: number, duration = 1600, decimals = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(parseFloat((target * eased).toFixed(decimals)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, decimals]);
  return val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function HeroMockup() {
  const subject = useTypewriter("Your October update is here");
  const sent = useCounter(4821);
  const opened = useCounter(68.4, 1600, 1);
  const clicked = useCounter(24.9, 1800, 1);

  return (
    <div className="relative mx-auto mt-16 sm:mt-20 max-w-3xl">
      {/* Floating badges */}
      <div className="absolute -top-6 -right-4 sm:-right-10 z-10 animate-[float_6s_ease-in-out_infinite]">
        <Card className="px-4 py-3 shadow-xl flex items-center gap-3 bg-card/90 backdrop-blur">
          <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <Check className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <div className="text-sm font-semibold">98.2% delivered</div>
            <div className="text-xs text-muted-foreground">Last campaign</div>
          </div>
        </Card>
      </div>
      <div className="absolute -bottom-6 -left-4 sm:-left-10 z-10 animate-[float_7s_ease-in-out_infinite_reverse]">
        <Card className="px-4 py-3 shadow-xl flex items-center gap-3 bg-card/90 backdrop-blur">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
            <Eye className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold">+312 opens today</div>
            <div className="text-xs text-muted-foreground">Real-time tracking</div>
          </div>
        </Card>
      </div>

      {/* Main mockup window */}
      <div className="rounded-2xl border shadow-2xl overflow-hidden bg-card">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/40">
          <div className="w-3 h-3 rounded-full bg-red-400/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
          <div className="w-3 h-3 rounded-full bg-green-400/80" />
          <span className="ml-3 text-xs text-muted-foreground">New campaign — October Newsletter</span>
          <Badge className="ml-auto gap-1 text-xs">
            <Send className="w-3 h-3" /> Sending…
          </Badge>
        </div>

        <div className="p-5 sm:p-6 text-left">
          <div className="text-xs text-muted-foreground mb-1">Subject</div>
          <div className="font-semibold text-lg mb-4 min-h-[1.75rem]">
            {subject}
            <span className="inline-block w-[2px] h-5 bg-primary ml-0.5 animate-pulse align-middle" />
          </div>

          <div className="space-y-2 mb-5" aria-hidden>
            <div className="h-2.5 rounded bg-muted w-full" />
            <div className="h-2.5 rounded bg-muted w-11/12" />
            <div className="h-2.5 rounded bg-muted w-4/5" />
          </div>

          <div className="mb-2 flex justify-between text-xs text-muted-foreground">
            <span>Sending to 4,821 contacts</span>
            <span>86%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-6">
            <div className="h-full w-[86%] rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 animate-[sendbar_3s_ease-in-out_infinite]" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <div className="text-xl font-bold text-primary">{sent}</div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                <Inbox className="w-3 h-3" /> Sent
              </div>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <div className="text-xl font-bold text-emerald-500">{opened}%</div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                <Eye className="w-3 h-3" /> Opened
              </div>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <div className="text-xl font-bold text-fuchsia-500">{clicked}%</div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                <MousePointerClick className="w-3 h-3" /> Clicked
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  const features = [
    {
      icon: Users,
      title: "Contact Management",
      description: "Upload, organize, and segment your contacts with powerful tagging and filtering."
    },
    {
      icon: PenLine,
      title: "Campaign Builder",
      description: "Create stunning email campaigns with an intuitive editor and ready-made templates."
    },
    {
      icon: BarChart3,
      title: "Real Analytics",
      description: "Track opens, clicks, bounces, and complaints per send with live reporting."
    },
    {
      icon: Zap,
      title: "Fast Delivery",
      description: "Queued sending on enterprise-grade infrastructure that lands in inboxes."
    },
    {
      icon: Shield,
      title: "Compliance Built-in",
      description: "Automatic unsubscribe handling, bounce suppression, and GDPR-friendly practices."
    },
    {
      icon: Globe,
      title: "Scales With You",
      description: "From your first 1,000 free emails to 50,000 a month — grow without switching tools."
    }
  ];

  const steps = [
    {
      icon: Users,
      step: "01",
      title: "Import your audience",
      description: "Upload a CSV or add contacts manually. Tag and segment them your way."
    },
    {
      icon: PenLine,
      step: "02",
      title: "Create your campaign",
      description: "Write it in the editor or start from a template. Preview on any device."
    },
    {
      icon: Rocket,
      step: "03",
      title: "Send & track",
      description: "Hit send and watch opens, clicks, and deliveries roll in live."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes sendbar { 0% { transform: translateX(-8%); } 50% { transform: translateX(4%); } 100% { transform: translateX(-8%); } }
        @keyframes drift { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-30px) scale(1.1); } }
      `}</style>

      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-xl">MailFlow</span>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how" className="text-muted-foreground hover:text-foreground transition-colors">How it works</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            </nav>

            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleTheme}
                data-testid="button-theme-toggle"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Link href="/login">
                <Button variant="ghost" data-testid="link-login">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button data-testid="link-signup">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden pt-20 sm:pt-28 pb-16">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.07] via-transparent to-transparent" />
            <div className="absolute -top-32 left-1/4 w-[36rem] h-[36rem] bg-indigo-500/15 rounded-full blur-3xl animate-[drift_14s_ease-in-out_infinite]" />
            <div className="absolute top-40 right-1/4 w-[28rem] h-[28rem] bg-fuchsia-500/15 rounded-full blur-3xl animate-[drift_18s_ease-in-out_infinite_reverse]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              <Badge variant="secondary" className="mb-6 gap-1 px-3 py-1">
                <Sparkles className="w-3 h-3" />
                Open & click tracking built in
              </Badge>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
                Send emails people{" "}
                <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                  actually open
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                MailFlow gives you the whole loop — contacts, campaigns, delivery, and
                analytics that show exactly what your audience does next.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup">
                  <Button size="lg" className="gap-2 w-full sm:w-auto text-base px-8 py-6 shadow-lg shadow-primary/25" data-testid="button-get-started">
                    Start for free <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 w-full sm:w-auto text-base px-8 py-6"
                  data-testid="button-watch-demo"
                  onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  How it works
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                No credit card required · 1,000 free emails/month
              </p>
            </div>

            <HeroMockup />

            {/* Trust strip */}
            <div className="mt-20 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-500" /> One-click unsubscribe</span>
              <span className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Automatic bounce suppression</span>
              <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-500" /> Built on AWS SES infrastructure</span>
              <span className="flex items-center gap-2"><Globe className="w-4 h-4 text-emerald-500" /> GDPR-friendly practices</span>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="py-20 sm:py-28 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4">Features</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Everything you need to succeed
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful features to help you create, send, and analyze your email campaigns.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="p-6 hover-elevate group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4">How it works</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Live in three steps
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From signup to your first campaign in minutes — no deliverability degree required.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {steps.map((s, i) => (
                <div key={i} className="relative">
                  {i < 2 && (
                    <div className="hidden md:block absolute top-10 left-[calc(50%+3rem)] w-[calc(100%-6rem)] border-t-2 border-dashed border-muted-foreground/20" />
                  )}
                  <Card className="p-6 text-center h-full">
                    <div className="text-5xl font-black text-primary/15 mb-2">{s.step}</div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <s.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                    <p className="text-muted-foreground text-sm">{s.description}</p>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ANALYTICS */}
        <section className="py-20 sm:py-28 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge variant="outline" className="mb-4">Analytics</Badge>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                  Know exactly what happens after you hit send
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Every email is tracked individually. See who opened, who clicked, what bounced —
                  and stop guessing what your audience wants.
                </p>

                <div className="space-y-4">
                  {[
                    { icon: Send, text: "Per-recipient delivery tracking" },
                    { icon: Eye, text: "Open tracking with live counts" },
                    { icon: MousePointerClick, text: "Click tracking on every link" },
                    { icon: TrendingUp, text: "Bounce & complaint monitoring" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-muted-foreground">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Card className="p-6 bg-gradient-to-br from-card to-muted/50 shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">October Newsletter</span>
                    <Badge variant="secondary">Live</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-background">
                      <div className="text-2xl font-bold">4,821</div>
                      <div className="text-sm text-muted-foreground">Emails sent</div>
                    </div>
                    <div className="p-4 rounded-lg bg-background">
                      <div className="text-2xl font-bold text-emerald-500">68.4%</div>
                      <div className="text-sm text-muted-foreground">Open rate</div>
                    </div>
                    <div className="p-4 rounded-lg bg-background">
                      <div className="text-2xl font-bold text-fuchsia-500">24.9%</div>
                      <div className="text-sm text-muted-foreground">Click rate</div>
                    </div>
                    <div className="p-4 rounded-lg bg-background">
                      <div className="text-2xl font-bold">0.3%</div>
                      <div className="text-sm text-muted-foreground">Bounce rate</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Illustrated preview — your dashboard shows your real numbers.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4">Pricing</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Start free. Pay only when your audience outgrows the free tier.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
              {Object.entries(PLAN_LIMITS).map(([key, plan], index) => (
                <Card
                  key={key}
                  className={`p-6 relative flex flex-col ${index === 1 ? "border-primary ring-2 ring-primary shadow-xl shadow-primary/10 md:-my-3 md:py-9" : ""}`}
                >
                  {index === 1 && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-fuchsia-500 border-0">
                      Most Popular
                    </Badge>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {plan.emailsPerMonth.toLocaleString()} emails/month
                    </p>
                  </div>

                  <ul className="space-y-3 mb-6 flex-1">
                    {[
                      "Unlimited contacts",
                      "Email templates",
                      "Open & click analytics",
                      "CSV import/export",
                      index > 0 && "Priority support",
                      index > 1 && "Custom branding",
                      index > 1 && "API access"
                    ].filter(Boolean).map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/signup">
                    <Button
                      className="w-full"
                      variant={index === 1 ? "default" : "outline"}
                      data-testid={`button-plan-${key}`}
                    >
                      Get started
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* WHY */}
        <section id="why" className="py-20 sm:py-28 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Built for senders who want control
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                No bloated enterprise contracts. Just the email tools you need, priced to scale with you.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Zap,
                  title: "Start free, scale naturally",
                  description: "1,000 emails a month on us. Upgrade only when your list outgrows the free tier."
                },
                {
                  icon: Users,
                  title: "Your data stays yours",
                  description: "Import and export your contacts anytime. No lock-in, no hostage lists."
                },
                {
                  icon: Shield,
                  title: "Compliance by default",
                  description: "Automatic unsubscribe handling, bounce management, and suppression lists built in."
                }
              ].map((item, index) => (
                <Card key={index} className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="font-medium mb-2">{item.title}</div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="relative py-20 sm:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600" />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
            <h2 className="text-3xl sm:text-5xl font-bold mb-6 tracking-tight">
              Your first 1,000 emails are free.
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
              Import your list, send your first campaign, and see your real open rates today.
            </p>
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="gap-2 text-base px-8 py-6 shadow-2xl" data-testid="button-cta-signup">
                Start sending free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="text-sm opacity-75 mt-4">No credit card required</p>
          </div>
        </section>
      </main>

      <footer className="bg-muted/50 py-12 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-xl">MailFlow</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Professional email marketing for growing businesses.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#how" className="hover:text-foreground transition-colors">How it works</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="mailto:hello@mailflow.io" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} MailFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
