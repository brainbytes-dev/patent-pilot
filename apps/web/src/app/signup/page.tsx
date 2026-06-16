import Link from "next/link"
import { FileSearch } from "lucide-react"
import { SignupForm } from "@/components/signup-form"
import { ModeToggle } from "@/components/theme/theme-toggle"

export default function SignupPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <FileSearch className="size-5 text-accent" />
            <span>Patent Pilot</span>
          </Link>
          <ModeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <SignupForm />
          </div>
        </div>
      </div>
      <div className="relative hidden lg:block bg-gradient-to-br from-accent/20 via-accent/5 to-background" />
    </div>
  )
}
