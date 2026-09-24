"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitCompare,
  LayoutDashboard,
  Plus,
  Settings,
  LogOut,
  LogIn,
  Menu,
  X,
  ScanFace,
} from "lucide-react";
import { Mark } from "@/components/brand/mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: { id: string; email: string } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isGuest = user === null;
  const navItems = [
    ...(isGuest ? [] : [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }]),
    { href: "/analysis/new", label: "Analyze", icon: ScanFace },
    { href: "/compare", label: "Compare", icon: GitCompare },
  ];

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-line focus:bg-panel focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        Skip to content
      </a>

      {/* Top Application Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-panel/95 backdrop-blur-sm">
        <div className="mx-auto flex h-15 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand + Desktop Nav */}
          <div className="flex items-center gap-8">
            <Link
              href={isGuest ? "/" : "/dashboard"}
              className="flex items-center gap-2.5 font-semibold tracking-tight text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Mark className="h-6 w-6 text-accent" />
              <span className="text-base font-bold tracking-tight">MogLabs</span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent",
                      isActive
                        ? "bg-slate-100/90 text-accent font-semibold"
                        : "text-muted hover:bg-slate-50 hover:text-ink",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/analysis/new">
              <Button size="sm" className="gap-1.5 shadow-xs">
                <Plus className="h-4 w-4" />
                <span>New analysis</span>
              </Button>
            </Link>

            <div className="h-4 w-px bg-line mx-1" aria-hidden="true" />

            {isGuest ? (
              <Link href="/auth/login">
                <Button variant="secondary" size="sm">
                  Sign in
                </Button>
              </Link>
            ) : (
              <>
                <Link
                  href="/settings"
                  title="Settings"
                  aria-label="Settings"
                  className={cn(
                    "rounded-md p-2 text-muted transition-colors hover:bg-slate-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent",
                    pathname === "/settings" ? "bg-slate-100 text-accent font-semibold" : "",
                  )}
                >
                  <Settings className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  onClick={signOut}
                  title="Sign out"
                  aria-label="Sign out"
                  className="rounded-md p-2 text-muted transition-colors hover:bg-slate-100 hover:text-signal focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Right Controls */}
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/analysis/new">
              <Button size="sm" variant="primary" className="h-8 px-2.5 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" />
                <span>New</span>
              </Button>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="rounded-md p-1.5 text-ink hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-accent"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-line bg-panel md:hidden"
            >
              <nav className="flex flex-col gap-1 p-3">
                {navItems.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-slate-100 text-accent font-semibold"
                          : "text-muted hover:bg-slate-50 hover:text-ink",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                <div className="my-1.5 border-t border-line/60" />

                {isGuest ? (
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-slate-50 hover:text-ink transition-colors"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign in</span>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        pathname === "/settings"
                          ? "bg-slate-100 text-accent font-semibold"
                          : "text-muted hover:bg-slate-50 hover:text-ink",
                      )}
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>

                    <button
                      type="button"
                      onClick={signOut}
                      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-muted hover:bg-slate-50 hover:text-signal transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  </>
                )}
              </nav>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      {/* Main Content Area */}
      <main id="content" className="flex-1 min-w-0 pb-16">
        {children}
      </main>
    </div>
  );
}
