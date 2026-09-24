import Link from "next/link";
import {
  ArrowRight,
  Sliders,
  CheckCircle2,
  Scan,
  Compass,
  Lock,
  Eye,
} from "lucide-react";
import { Mark } from "@/components/brand/mark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col selection:bg-slate-200">
      {/* Public Header */}
      <header className="sticky top-0 z-30 border-b border-line bg-panel/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-ink">
            <Mark className="h-6 w-6 text-accent" />
            <span className="text-lg">MogLabs</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted">
            <a href="#how-it-works" className="hover:text-ink transition-colors">How it works</a>
            <a href="#preview" className="hover:text-ink transition-colors">Analysis preview</a>
            <a href="#methodology" className="hover:text-ink transition-colors">Methodology</a>
            <a href="#privacy" className="hover:text-ink transition-colors">Privacy</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-muted hover:text-ink transition-colors px-2 py-1">
              Sign in
            </Link>
            <Link href="/analysis/new">
              <Button size="sm" className="shadow-xs">
                Analyze face
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-line bg-panel pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              {/* Left Column: Headline & Value Proposition */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-line bg-panel-muted px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span className="font-mono text-xs uppercase tracking-wider text-muted font-medium">
                    FACIAL GEOMETRY LAB · TRANSPARENT REFERENCE SYSTEM
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-ink">
                  Your facial proportions, <span className="text-accent underline decoration-line decoration-2 underline-offset-4">measured</span>.
                </h1>

                <p className="max-w-2xl text-lg sm:text-xl text-muted leading-relaxed">
                  MogLabs measures facial geometry from front and profile photographs using anatomical landmarks, exact angles, and ratios. Our Harmony score provides an objective reference without generative AI guessing or subjective attractiveness claims.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link href="/analysis/new">
                    <Button size="lg" className="gap-2 shadow-sm text-base">
                      <span>Analyze face</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <a href="#how-it-works">
                    <Button variant="secondary" size="lg" className="text-base">
                      See how it works
                    </Button>
                  </a>
                </div>

                <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-line/70">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <CheckCircle2 className="h-4 w-4 text-good shrink-0" />
                    <span>In-browser local detection</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <CheckCircle2 className="h-4 w-4 text-good shrink-0" />
                    <span>User-editable landmarks</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <CheckCircle2 className="h-4 w-4 text-good shrink-0" />
                    <span>Private & encrypted photos</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive/Lab Hero Graphic */}
              <div className="lg:col-span-5">
                <HeroMeasurementPlate />
              </div>
            </div>
          </div>
        </section>

        {/* Section C: Product Proof / How It Works */}
        <section id="how-it-works" className="py-20 border-b border-line bg-paper">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent font-semibold">Step-by-step pipeline</p>
              <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Scientific precision, end to end
              </h2>
              <p className="text-sm text-muted leading-relaxed">
                Every metric is grounded in verifiable geometry. You retain complete visibility and control over every landmark proposal.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  step: "01",
                  title: "Capture",
                  icon: Scan,
                  desc: "Take or upload a front photograph and a profile. Built-in camera guides ensure proper head leveling, distance, and pose.",
                },
                {
                  step: "02",
                  title: "Verify",
                  icon: Sliders,
                  desc: "Computer vision proposes landmark coordinates. You can pan, zoom, and drag points that miss your actual anatomy.",
                },
                {
                  step: "03",
                  title: "Measure",
                  icon: Compass,
                  desc: "Distances, ratios, angles, and facial thirds are calculated directly from verified 2D coordinates without approximation.",
                },
                {
                  step: "04",
                  title: "Understand",
                  icon: Eye,
                  desc: "The Harmony score maps each measurement against transparent clinical and anthropological reference bands with full formulas exposed.",
                },
              ].map((item) => (
                <article
                  key={item.step}
                  className="relative rounded-xl border border-line bg-panel p-6 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded">
                        {item.step}
                      </span>
                      <item.icon className="h-5 w-5 text-muted" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted">{item.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Section D: Analysis Preview */}
        <section id="preview" className="py-20 border-b border-line bg-panel">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
              <div>
                <Badge variant="accent" className="mb-2">REPRESENTATIVE SAMPLE REPORT</Badge>
                <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                  Clear, actionable insights
                </h2>
                <p className="mt-2 text-sm text-muted max-w-xl">
                  See how results are presented: hierarchical scoring, category breakdowns, and transparent metric deviations.
                </p>
              </div>
              <Link href="/analysis/new">
                <Button variant="secondary" className="gap-2">
                  <span>Start your own analysis</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Representative Sample Card */}
            <div className="rounded-xl border border-line bg-slate-50/50 p-6 sm:p-8 shadow-xs">
              <div className="grid gap-8 lg:grid-cols-12">
                {/* Score Hero Column */}
                <div className="lg:col-span-4 rounded-lg border border-line bg-panel p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted uppercase">Harmony Score</span>
                      <span className="text-xs text-good font-medium bg-good/10 px-2 py-0.5 rounded">Reference alignment: High</span>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="font-mono text-5xl font-bold tracking-tight text-ink">8.42</span>
                      <span className="font-mono text-sm text-muted">/ 10</span>
                    </div>
                    <p className="mt-2 text-xs text-muted leading-relaxed">
                      Research-informed facial proportional score. Front and profile stay visible separately. Stronger evidence receives greater influence.
                    </p>
                  </div>

                  <div className="mt-6 pt-6 border-t border-line grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-mono text-xs text-muted uppercase block">Front score</span>
                      <span className="font-mono text-2xl font-semibold text-ink">8.65</span>
                    </div>
                    <div>
                      <span className="font-mono text-xs text-muted uppercase block">Profile score</span>
                      <span className="font-mono text-2xl font-semibold text-ink">8.05</span>
                    </div>
                  </div>
                </div>

                {/* Category Progress Column */}
                <div className="lg:col-span-4 rounded-lg border border-line bg-panel p-6">
                  <h3 className="text-sm font-semibold text-ink mb-4">Category Proportions</h3>
                  <div className="space-y-3.5">
                    {[
                      { label: "Facial structure", score: 8.8 },
                      { label: "Eyes & Orbit", score: 8.6 },
                      { label: "Nose & Projection", score: 8.1 },
                      { label: "Lips & Oral", score: 8.4 },
                      { label: "Jaw & Chin", score: 8.2 },
                      { label: "Symmetry", score: 8.9 },
                      { label: "Profile convexity", score: 7.9 },
                    ].map((cat) => (
                      <div key={cat.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-ink font-medium">{cat.label}</span>
                          <span className="font-mono text-muted">{cat.score.toFixed(1)} / 10</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${cat.score * 10}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Insight Callouts */}
                <div className="lg:col-span-4 rounded-lg border border-line bg-panel p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-ink mb-4">Key Insights</h3>
                    <div className="space-y-4 text-xs">
                      <div className="rounded-md border border-good/20 bg-good/5 p-3">
                        <span className="font-medium text-good block mb-1">Closest to reference</span>
                        <p className="text-ink font-semibold">Midface ratio: 1.02</p>
                        <p className="text-muted mt-0.5">Shown against its aesthetic target and harmony range, with the evidence tier beside the number.</p>
                      </div>

                      <div className="rounded-md border border-line bg-slate-50 p-3">
                        <span className="font-medium text-muted block mb-1">Furthest from reference</span>
                        <p className="text-ink font-semibold">Nasofacial angle: 31.2°</p>
                        <p className="text-muted mt-0.5">Slightly below the typical 34°–38° reference range.</p>
                      </div>

                      <div className="rounded-md border border-accent/20 bg-accent/5 p-3">
                        <span className="font-medium text-accent block mb-1">Highest score influence</span>
                        <p className="text-ink font-semibold">Gonial angle alignment</p>
                        <p className="text-muted mt-0.5">Accounts for +0.24 potential points on the profile harmony score.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section E: Methodology & Architectural Foundation */}
        <section id="methodology" className="py-20 border-b border-line bg-paper">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent font-semibold">Scientific foundation</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Built on geometry, not generative black boxes
              </h2>
              <p className="mt-3 text-sm text-muted leading-relaxed">
                Most facial apps apply arbitrary AI filters or black-box neural ratings. MogLabs executes an open, deterministic mathematical pipeline.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "MediaPipe Vision Mesh",
                  desc: "Landmarks are localized client-side with a pinned MediaPipe Face Landmarker (float16, task version 1). Coordinates stay on the photograph. Face photos are not sent to a language model.",
                },
                {
                  title: "Frankfort Horizontal Leveling",
                  desc: "Side-profile photos are automatically leveled along the Frankfort horizontal plane (porion to orbitale) to compensate for minor head tilts.",
                },
                {
                  title: "Literature Reference Bands",
                  desc: "Ratios, proportions, and angles are scored against documented plastic surgery and anthropological reference intervals using Gaussian decay curves.",
                },
                {
                  title: "Transparent Weighting",
                  desc: "Harmony is an evidence-weighted comparison of facial geometry. Front and profile stay visible separately. Every measurement shows its evidence tier and contribution.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-lg border border-line bg-panel p-5">
                  <h3 className="text-base font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section F: Privacy Guarantee */}
        <section id="privacy" className="py-20 bg-panel">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-line bg-slate-900 text-white p-8 sm:p-12">
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-mono text-slate-300">
                  <Lock className="h-3.5 w-3.5 text-accent-ink" />
                  <span>DATA PRIVACY PLEDGE</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Your photographs belong to you alone.
                </h2>
                <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                  <p>
                    Facial photography is sensitive biometric data. MogLabs never uses your images to train machine learning models.
                  </p>
                  <p>
                    Landmark detection runs locally in your browser session. Stored images are encrypted, authenticated, and never served via public unauthenticated links.
                  </p>
                  <p>
                    You can delete any analysis and its associated photographs at any time from your dashboard or settings.
                  </p>
                </div>
                <div className="pt-4 flex flex-wrap gap-4 items-center">
                  <Link href="/analysis/new">
                    <Button variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100 border-none font-semibold">
                      Start private analysis
                    </Button>
                  </Link>
                  <span className="text-xs text-slate-400">Free to start · No account required until results</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-panel-muted py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-2">
            <Mark className="h-4 w-4 text-accent" />
            <span className="font-semibold text-ink">MogLabs</span>
            <span>· Facial Proportions & Geometry</span>
          </div>
          <p className="text-center sm:text-right">
            Harmony is a proportional reference score for this application. It is not a clinical diagnosis and not an objective measure of attractiveness.
          </p>
        </div>
      </footer>
    </div>
  );
}

function HeroMeasurementPlate() {
  return (
    <div className="relative rounded-xl border border-line bg-panel p-6 shadow-sm overflow-hidden">
      {/* Corner calibration accents */}
      <div className="absolute left-3 top-3 h-3 w-3 border-l-2 border-t-2 border-accent" />
      <div className="absolute right-3 top-3 h-3 w-3 border-r-2 border-t-2 border-accent" />
      <div className="absolute bottom-3 left-3 h-3 w-3 border-b-2 border-l-2 border-accent" />
      <div className="absolute bottom-3 right-3 h-3 w-3 border-b-2 border-r-2 border-accent" />

      {/* Lab Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-line/60">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-good animate-pulse" />
          <span className="font-mono text-xs text-muted font-medium">PLATE 01 · CANONICAL FRONT</span>
        </div>
        <span className="font-mono text-[11px] text-accent font-semibold bg-accent/10 px-2 py-0.5 rounded">
          HARMONY 8.42
        </span>
      </div>

      {/* Technical Facial Geometry Diagram */}
      <div className="relative my-4 flex items-center justify-center">
        <svg
          viewBox="0 0 340 400"
          className="h-auto w-full max-w-[300px] text-ink"
          role="img"
          aria-label="Technical diagram of anatomical facial measurements and reference planes"
        >
          {/* Subtle grid background */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="340" height="400" fill="url(#grid)" opacity="0.6" />

          {/* Facial Oval Contour */}
          <ellipse
            cx="170"
            cy="200"
            rx="96"
            ry="128"
            fill="none"
            stroke="#0f172a"
            strokeWidth="1.5"
          />

          {/* Central Midline */}
          <line
            x1="170"
            y1="60"
            x2="170"
            y2="340"
            stroke="#0284c7"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />

          {/* Horizontal Thirds Lines */}
          {/* Trichion / Upper third */}
          <line x1="84" y1="105" x2="256" y2="105" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
          <text x="262" y="109" className="fill-muted" fontSize="9" fontFamily="ui-monospace, monospace">
            1/3 TR
          </text>

          {/* Nasion / Mid third top */}
          <line x1="74" y1="165" x2="266" y2="165" stroke="#0284c7" strokeWidth="1.2" />
          <text x="268" y="169" className="fill-accent" fontSize="9" fontFamily="ui-monospace, monospace" fontWeight="600">
            N
          </text>

          {/* Subnasale / Lower third top */}
          <line x1="76" y1="240" x2="264" y2="240" stroke="#0284c7" strokeWidth="1.2" />
          <text x="268" y="244" className="fill-accent" fontSize="9" fontFamily="ui-monospace, monospace" fontWeight="600">
            SN
          </text>

          {/* Menton / Bottom third */}
          <line x1="120" y1="328" x2="220" y2="328" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
          <text x="226" y="332" className="fill-muted" fontSize="9" fontFamily="ui-monospace, monospace">
            ME
          </text>

          {/* Eye Axis & Pupil landmarks */}
          <circle cx="132" cy="172" r="3.5" fill="#0284c7" />
          <circle cx="208" cy="172" r="3.5" fill="#0284c7" />
          <line x1="112" y1="172" x2="228" y2="172" stroke="#0284c7" strokeWidth="1" />

          {/* Canthal Width indicator */}
          <path d="M 148 172 H 192" stroke="#166534" strokeWidth="1.8" />
          <circle cx="148" cy="172" r="2" fill="#166534" />
          <circle cx="192" cy="172" r="2" fill="#166534" />

          {/* Pronasale (Nose tip) & Subnasale */}
          <circle cx="170" cy="225" r="3" fill="#0284c7" />
          <circle cx="170" cy="240" r="3" fill="#0284c7" />

          {/* Lip Vermilion points */}
          <circle cx="170" cy="265" r="2.5" fill="#0284c7" />
          <circle cx="170" cy="285" r="2.5" fill="#0284c7" />
          <line x1="145" y1="274" x2="195" y2="274" stroke="#0284c7" strokeWidth="1" />

          {/* Pogonion / Chin */}
          <circle cx="170" cy="316" r="3" fill="#0284c7" />

          {/* Cheekbone / Zygion width arrows */}
          <line x1="74" y1="195" x2="266" y2="195" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="74" cy="195" r="2" fill="#64748b" />
          <circle cx="266" cy="195" r="2" fill="#64748b" />
        </svg>
      </div>

      {/* Floating Lab Metadata Chips */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-line/60">
        <div className="rounded bg-panel-muted px-2.5 py-1.5 font-mono text-[11px]">
          <span className="text-muted block">FACIAL THIRDS</span>
          <span className="font-semibold text-ink">1.00 : 1.02 : 0.98</span>
        </div>
        <div className="rounded bg-panel-muted px-2.5 py-1.5 font-mono text-[11px]">
          <span className="text-muted block">CANTHAL TILT</span>
          <span className="font-semibold text-good">+3.2° (NEUTRAL-POS)</span>
        </div>
      </div>
    </div>
  );
}
