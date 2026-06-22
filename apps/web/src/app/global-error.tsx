"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="de">
      <body className="bg-background text-foreground">
        <div className="flex flex-col items-center justify-center min-h-svh gap-4 px-6 font-sans">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Systemfehler</p>
          <h2 className="text-2xl font-semibold text-foreground">
            Etwas ist schiefgelaufen.
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
          </p>
          <button
            onClick={reset}
            className="mt-2 px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
