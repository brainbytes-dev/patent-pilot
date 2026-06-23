"use client"

import { useState } from "react"
import Link from "next/link"
import { LogoIcon } from "@/components/logo"
import { requestPasswordReset } from "@/lib/auth-client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setError("")

    const res = await requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (res.error) {
      setError("Fehler beim Senden. Bitte prüfen Sie die E-Mail-Adresse.")
      setStatus("error")
    } else {
      setStatus("sent")
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <LogoIcon size={28} className="text-brand-navy dark:text-white" />
        <span className="font-serif text-xl font-bold text-brand-navy dark:text-white">Patentbrief</span>
      </Link>

      <div className="w-full max-w-sm border border-border p-8">
        <h1 className="font-serif text-2xl font-semibold mb-1">Passwort vergessen</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Wir senden Ihnen einen Reset-Link.
        </p>

        {status === "sent" ? (
          <div className="text-sm text-muted-foreground space-y-4">
            <p>E-Mail gesendet an <strong>{email}</strong>.</p>
            <p>Prüfen Sie Ihren Posteingang und klicken Sie auf den Link.</p>
            <Link href="/login" className="text-foreground underline underline-offset-4 text-sm">
              Zurück zur Anmeldung
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@firma.de"
                className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-foreground text-background py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {status === "loading" ? "Sende..." : "Reset-Link senden"}
            </button>

            <div className="text-center">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Zurück zur Anmeldung
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
