"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { GitCompare, History, LayoutDashboard, Plus, Settings } from "lucide-react";
import { Mark } from "@/components/brand/mark";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/analysis/new", label: "New analysis", icon: Plus },
  { href: "/dashboard#history", label: "History", icon: History },
  { href: "/compare", label: "Compare", icon: GitCompare },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="flex items-center justify-between border-b border-line bg-panel px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 font-medium">
          <Mark className="h-5 w-5 text-accent" />
          FaceLab
        </Link>
        <button type="button" className="text-sm" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          {open ? "Close" : "Menu"}
        </button>
      </header>
      <aside className={cn("border-line bg-panel md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-r", open ? "block border-b" : "hidden md:flex")}>
        <div className="hidden items-center gap-2 px-5 py-6 md:flex">
          <Mark className="h-6 w-6 text-accent" />
          <span className="text-lg tracking-tight">FaceLab</span>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-3 md:px-3">
          {links.map((link) => {
            const active = link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-[2px] px-3 py-2 text-sm",
                  active ? "bg-white text-accent" : "text-ink hover:bg-white/80",
                )}
              >
                <link.icon className="h-4 w-4" aria-hidden />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-1 px-3 py-4">
          <Link href="/settings" className="flex items-center gap-2 rounded-[2px] px-3 py-2 text-sm hover:bg-white/80" onClick={() => setOpen(false)}>
            <Settings className="h-4 w-4" aria-hidden />
            Settings
          </Link>
          <button type="button" onClick={signOut} className="rounded-[2px] px-3 py-2 text-left text-sm text-muted hover:bg-white/80">
            Sign out
          </button>
        </div>
      </aside>
      <main id="content" className="min-w-0 pb-[env(safe-area-inset-bottom)]">
        {children}
      </main>
    </div>
  );
}
