import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-5 py-20">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">404</p>
      <h1 className="mt-3 text-3xl tracking-tight">This page is not in FaceLab.</h1>
      <Link href="/" className="mt-6 inline-flex h-10 items-center bg-accent px-4 text-sm text-accent-ink">
        Back to the start
      </Link>
    </main>
  );
}
