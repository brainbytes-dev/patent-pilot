import Link from "next/link"
import { LoginForm } from "@/components/login-form"
import { LandingHeader } from "@/components/landing-header"

export default function LoginPage() {
  return (
    <div className="min-h-svh flex flex-col">
      <LandingHeader minimal />

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
