import Link from "next/link"
import { SignupForm } from "@/components/signup-form"
import { ModeToggle } from "@/components/theme/theme-toggle"

export default function SignupPage() {
  return (
    <div className="min-h-svh flex flex-col">
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-semibold tracking-tight text-primary-foreground">
            Patentbrief
          </Link>
          <ModeToggle />
        </div>
        <div className="h-px bg-accent/60" />
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-2xl font-semibold text-foreground mb-2">Konto erstellen</h1>
          <p className="text-sm text-muted-foreground mb-8">
            2 Briefings kostenlos. Keine Kreditkarte.{" "}
            <Link href="/login" className="text-accent hover:underline">
              Bereits registriert?
            </Link>
          </p>
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
