import Link from "next/link"
import { LoginForm } from "@/components/login-form"
import { ModeToggle } from "@/components/theme/theme-toggle"

export default function LoginPage() {
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
          <h1 className="font-serif text-2xl font-semibold text-foreground mb-2">Anmelden</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Noch kein Konto?{" "}
            <Link href="/signup" className="text-accent hover:underline">
              Kostenlos registrieren
            </Link>
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
