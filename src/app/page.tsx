import Link from "next/link";
import { Mark } from "@/components/brand/mark";

const steps = [
  { title: "Capture", copy: "A front view and a side view. Line up with the camera guide, or choose photos you already have." },
  { title: "Review landmarks", copy: "Computer vision proposes points. You drag the ones that miss the anatomy." },
  { title: "Measure", copy: "Distances, angles, and ratios are calculated from those points. Nothing is guessed by a language model." },
  { title: "Understand", copy: "A Harmony score shows distance from configurable reference ranges, with the formula left visible." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2">
          <Mark className="h-6 w-6 text-accent" />
          <span className="text-lg tracking-tight">FaceLab</span>
        </Link>
        <Link href="/auth/login" className="text-sm text-accent">
          Sign in
        </Link>
      </header>
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-8 md:grid-cols-[1.1fr_0.9fr] md:pt-16">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Facial measurement</p>
            <h1 className="mt-4 max-w-xl text-5xl leading-[1.05] tracking-tight md:text-6xl">
              Measure facial geometry.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
              FaceLab places landmarks on a front view and a profile, then calculates proportions from those points. The Harmony score compares the results with the application&apos;s reference ranges. It is not a rating of attractiveness.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/auth/login?next=/analysis/new" className="inline-flex h-11 items-center rounded-[2px] bg-accent px-5 text-sm text-accent-ink">
                Analyze face
              </Link>
              <a href="#method" className="inline-flex h-11 items-center rounded-[2px] border border-line bg-panel px-5 text-sm">
                How it works
              </a>
            </div>
          </div>
          <Plate />
        </section>
        <section className="border-y border-line bg-panel">
          <div className="mx-auto grid max-w-6xl gap-px bg-line md:grid-cols-4">
            {steps.map((step, index) => (
              <article key={step.title} className="bg-panel px-5 py-8">
                <p className="font-mono text-xs text-accent">0{index + 1}</p>
                <h2 className="mt-3 text-xl tracking-tight">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{step.copy}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="method" className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl tracking-tight">What actually runs</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[
              ["Computer vision detects landmarks", "MediaPipe Face Landmarker runs in the browser. Raw mesh indexes stay inside one mapping file."],
              ["You verify the points", "Important anatomical points can be dragged. Derived points are labeled as estimates."],
              ["Geometry calculates measurements", "Ratios and angles use normalized coordinates, so image size does not become a measurement."],
              ["Scoring uses defined ranges", "Each metric has a reference band and a smooth falloff. The bands are experimental and editable."],
            ].map(([title, copy]) => (
              <article key={title} className="border border-line bg-panel p-5">
                <h3 className="text-lg">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="privacy" className="border-t border-line">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="text-3xl tracking-tight">Photographs stay private</h2>
            <div className="mt-6 max-w-2xl space-y-3 text-sm leading-6 text-muted">
              <p>Facial images are sensitive personal data. In FaceLab they are stored privately for the signed-in account.</p>
              <p>Uploaded images are not used to train models. Landmark detection for the measurement pipeline runs locally in the browser.</p>
              <p>You can delete an analysis, including its photographs, from the report. Account deletion removes the analyses stored for that login.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Plate() {
  return (
    <div className="relative border border-line bg-panel p-6">
      <div className="absolute left-3 top-3 h-3 w-3 border-l border-t border-accent" />
      <div className="absolute right-3 top-3 h-3 w-3 border-r border-t border-accent" />
      <div className="absolute bottom-3 left-3 h-3 w-3 border-b border-l border-accent" />
      <div className="absolute bottom-3 right-3 h-3 w-3 border-b border-r border-accent" />
      <svg viewBox="0 0 320 400" className="mx-auto h-auto w-full max-w-sm text-ink" role="img" aria-label="Diagram of facial measurement lines">
        <ellipse cx="160" cy="210" rx="92" ry="120" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M160 90 V330 M90 190 H230 M118 168 H148 M172 168 H202 M130 250 H190" fill="none" stroke="#1c4e6e" strokeWidth="1.2" />
        <circle cx="133" cy="168" r="3" fill="#1c4e6e" />
        <circle cx="187" cy="168" r="3" fill="#1c4e6e" />
        <circle cx="160" cy="210" r="3" fill="#1c4e6e" />
        <text x="20" y="28" className="fill-muted" fontSize="11" fontFamily="ui-monospace, monospace">
          front plate
        </text>
      </svg>
      <p className="mt-4 font-mono text-xs text-muted">Landmarks in. Ratios out. No attractiveness claim.</p>
    </div>
  );
}
