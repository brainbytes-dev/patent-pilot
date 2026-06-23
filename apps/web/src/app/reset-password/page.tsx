"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { LogoIcon } from "@/components/logo"
import { resetPassword } from "@/lib/auth-client"

function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [error, setError] = useState("")

  if (!token) {
    return (
      <p className="text-sm text-destructive">
        Ungültiger oder abgelaufener Link. Bitte fordern Sie einen neuen an.{" "}
        <Link href="/forgot-password" className="underline underline-offset-4">
          Passwort vergessen
        </Link>
      </p>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password !== confirm) {
      setError("Passwörter stimmen nicht überein.")
      return
    }
    if (password.length < 8) {
      setError("Mindestens 8 Zeichen erforderlich.")
      return
    }
    setStatus("loading")

    const res = await resetPassword({ newPassword: password, token })

    if (res.error) {
      setError("Link ungültig oder abgelaufen. Bitte neuen Link anfordern.")
      setStatus("error")
    } else {
      setStatus("done")
      setTimeout(() => router.push("/login"), 2000)
    }
  }

  if (status === "done") {
    return (
      <p className="text-sm text-muted-foreground">
        Passwort erfolgreich geändert. Sie werden weitergeleitet...
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium block mb-1.5">Neues Passwort</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          placeholder="Mindestens 8 Zeichen"
          className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1.5">Passwort bestätigen</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          placeholder="Wiederholen"
          className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full bg-foreground text-background py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {status === "loading" ? "Speichern..." : "Passwort setzen"}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <LogoIcon size={28} className="text-brand-navy dark:text-white" />
        <span className="font-serif text-xl font-bold text-brand-navy dark:text-white">Patentbrief</span>
      </Link>

      <div className="w-full max-w-sm border border-border p-8">
        <h1 className="font-serif text-2xl font-semibold mb-1">Neues Passwort</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Wählen Sie ein neues Passwort für Ihr Konto.
        </p>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Lädt...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
