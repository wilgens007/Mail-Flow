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
  Target,
  TrendingUp,
  Moon,
  Sun
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { PLAN_LIMITS } from "@shared/schema";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  const features = [
    {
      icon: Users,
      title: "Contact Management",
      description: "Upload, organize, and segment your contacts with powerful tagging and filtering."
    },
    {
      icon: Mail,
      title: "Campaign Builder",
      description: "Create stunning email campaigns with our intuitive drag-and-drop editor."
    },
    {
      icon: BarChart3,
      title: "Detailed Analytics",
      description: "Track opens, clicks, bounces, and conversions with real-time reporting."
    },
    {
      icon: Zap,
      title: "Fast Delivery",
      description: "Enterprise-grade infrastructure ensures your emails land in inboxes."
    },
    {
      icon: Shield,
      title: "Compliance Built-in",
      description: "Automatic unsubscribe handling, bounce management, and GDPR compliance."
    },
    {
      icon: Globe,
      title: "Scalable",
      description: "From startups to enterprises, grow without limits on our platform."
    }
  ];

  const stats = [
    { value: "99.9%", label: "Delivery Rate" },
    { value: "50M+", label: "Emails Sent" },
    { value: "10K+", label: "Happy Users" },
    { value: "24/7", label: "Support" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-xl">MailFlow</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
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
        <section className="relative overflow-hidden py-20 sm:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-chart-2/5" />
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-chart-2/10 rounded-full blur-3xl" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              <Badge variant="secondary" className="mb-6 gap-1">
                <Sparkles className="w-3 h-3" />
                Now with AI-powered subject lines
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Email marketing that{" "}
                <span className="text-primary">drives results</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Create beautiful email campaigns, grow your audience, and convert subscribers into customers. 
                All with one powerful platform.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup">
                  <Button size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-get-started">
                    Start for free <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="gap-2 w-full sm:w-auto" 
                  data-testid="button-watch-demo"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  See features
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground mt-4">
                No credit card required. 1,000 free emails/month.
              </p>
            </div>
            
            <div className="mt-16 sm:mt-24 grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="py-20 sm:py-32 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Everything you need to succeed
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful features to help you create, send, and analyze your email campaigns.
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="p-6 hover-elevate">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                  Powerful campaign analytics at your fingertips
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Track every metric that matters. From open rates to click-through rates, 
                  get insights that help you improve your campaigns.
                </p>
                
                <div className="space-y-4">
                  {[
                    { icon: Send, text: "Real-time delivery tracking" },
                    { icon: Target, text: "Audience segmentation insights" },
                    { icon: TrendingUp, text: "Performance trends over time" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-chart-3/10 flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-chart-3" />
                      </div>
                      <span className="text-muted-foreground">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <Card className="p-6 bg-gradient-to-br from-card to-muted/50">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last 7 days</span>
                    <Badge variant="secondary">+12.5%</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-background">
                      <div className="text-2xl font-bold text-chart-1">12,847</div>
                      <div className="text-sm text-muted-foreground">Emails sent</div>
                    </div>
                    <div className="p-4 rounded-lg bg-background">
                      <div className="text-2xl font-bold text-chart-3">68.2%</div>
                      <div className="text-sm text-muted-foreground">Open rate</div>
                    </div>
                    <div className="p-4 rounded-lg bg-background">
                      <div className="text-2xl font-bold text-chart-2">24.1%</div>
                      <div className="text-sm text-muted-foreground">Click rate</div>
                    </div>
                    <div className="p-4 rounded-lg bg-background">
                      <div className="text-2xl font-bold text-chart-4">0.3%</div>
                      <div className="text-sm text-muted-foreground">Bounce rate</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 sm:py-32 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Choose the plan that's right for your business. All plans include core features.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {Object.entries(PLAN_LIMITS).map(([key, plan], index) => (
                <Card 
                  key={key} 
                  className={`p-6 relative ${index === 1 ? "border-primary ring-2 ring-primary" : ""}`}
                >
                  {index === 1 && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
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
                  
                  <ul className="space-y-3 mb-6">
                    {[
                      "Unlimited contacts",
                      "Email templates",
                      "Analytics dashboard",
                      "CSV import/export",
                      index > 0 && "Priority support",
                      index > 1 && "Custom branding",
                      index > 1 && "API access"
                    ].filter(Boolean).map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-chart-3 shrink-0" />
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

        <section id="testimonials" className="py-20 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Loved by marketers everywhere
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                See what our customers have to say about MailFlow.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  quote: "MailFlow has transformed how we communicate with our customers. The analytics alone have helped us increase conversions by 40%.",
                  author: "Sarah Chen",
                  role: "Marketing Director",
                  company: "TechStart Inc"
                },
                {
                  quote: "Finally, an email platform that's both powerful and easy to use. Our team was up and running in minutes.",
                  author: "Michael Brooks",
                  role: "CEO",
                  company: "Growth Labs"
                },
                {
                  quote: "The deliverability is outstanding. We've seen our open rates increase by 25% since switching to MailFlow.",
                  author: "Emily Rodriguez",
                  role: "Head of Growth",
                  company: "Spark Digital"
                }
              ].map((testimonial, index) => (
                <Card key={index} className="p-6">
                  <p className="text-muted-foreground mb-6">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {testimonial.author.split(" ").map(n => n[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">{testimonial.author}</div>
                      <div className="text-xs text-muted-foreground">
                        {testimonial.role}, {testimonial.company}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-32 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Ready to grow your business?
            </h2>
            <p className="text-lg opacity-90 mb-8">
              Join thousands of businesses using MailFlow to connect with their audience.
            </p>
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="gap-2" data-testid="button-cta-signup">
                Start your free trial <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-muted/50 py-12 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary-foreground" />
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
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
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
