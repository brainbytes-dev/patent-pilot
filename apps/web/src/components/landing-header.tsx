"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ModeToggle } from "@/components/theme/theme-toggle";
import { useSession } from "@/lib/auth-client";
import { LogoIcon } from "@/components/logo";

export function LandingHeader({ minimal = false }: { minimal?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`w-full top-0 sticky z-50 bg-background border-b border-border transition-shadow duration-200 ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <nav className="flex justify-between items-center h-20 px-8 md:px-16 max-w-[1280px] mx-auto">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <LogoIcon size={32} className="text-brand-navy dark:text-white" />
            <span className="font-serif text-2xl font-bold text-brand-navy dark:text-white">Patentbrief</span>
          </Link>
          {!minimal && (
            <div className="hidden md:flex gap-4 items-center ml-8">
              <Link href="/briefings" className="text-muted-foreground hover:text-accent transition-colors duration-200 text-base">
                Archiv
              </Link>
              <Link href="/pricing" className="text-muted-foreground hover:text-accent transition-colors duration-200 text-base">
                Preise
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-accent transition-colors duration-200 text-base">
                Über Uns
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-accent transition-colors duration-200 text-base">
                Kontakt
              </Link>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <ModeToggle />
          {!minimal && (
            session ? (
              <Link
                href="/dashboard"
                className="bg-accent text-accent-foreground font-semibold text-sm px-4 py-2 border-2 border-accent hover:opacity-90 transition-all duration-200 active:scale-95"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden md:block text-foreground font-semibold text-sm uppercase tracking-wider border-2 border-foreground px-4 py-2 hover:bg-foreground hover:text-background transition-all duration-200 active:scale-95"
                >
                  Anmelden
                </Link>
                <Link
                  href="/signup"
                  className="bg-accent text-accent-foreground font-semibold text-sm px-4 py-2 border-2 border-accent hover:opacity-90 transition-all duration-200 active:scale-95"
                >
                  Jetzt starten
                </Link>
              </>
            )
          )}
        </div>
      </nav>
    </header>
  );
}
