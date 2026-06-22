import Link from "next/link"
import { CheckCircle, Mail } from "lucide-react"

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="size-16 bg-accent/10 border border-accent/20 flex items-center justify-center">
            <CheckCircle className="size-8 text-accent" />
          </div>
        </div>

        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            Zahlung erfolgreich.
          </h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Ihr Abonnement ist aktiv. Wir haben Ihnen eine E-Mail geschickt —
            klicken Sie auf den Link darin, um Ihr Passwort zu setzen und Ihr
            Dashboard zu öffnen.
          </p>
        </div>

        <div className="border border-border bg-muted/30 p-5 text-left space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="size-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-foreground font-medium">E-Mail checken</p>
          </div>
          <p className="text-sm text-muted-foreground pl-7">
            Betreff: <span className="text-foreground italic">Patentbrief: Passwort setzen</span>
          </p>
          <p className="text-sm text-muted-foreground pl-7">
            Kein E-Mail? Prüfen Sie Ihren Spam-Ordner oder kontaktieren Sie uns
            unter{" "}
            <a
              href="mailto:support@patentbrief.eu"
              className="text-foreground underline underline-offset-2"
            >
              support@patentbrief.eu
            </a>
            .
          </p>
        </div>

        <Link
          href="/login"
          className="inline-block text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        >
          Schon ein Passwort? Direkt einloggen
        </Link>
      </div>
    </div>
  )
}
