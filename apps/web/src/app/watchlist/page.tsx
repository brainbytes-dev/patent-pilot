"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { IndustryStep } from "@/app/onboarding/_components/industry-step"
import { KeywordsStep } from "@/app/onboarding/_components/keywords-step"
import { Button } from "@/components/ui/button"
import { CheckCircle, Eye } from "lucide-react"

interface WatchlistData {
  industries: string[]
  keywords: string[]
  cpcCodes: string[]
}

export default function WatchlistPage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [industries, setIndustries] = useState<string[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!isPending && !session) router.push("/login")
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      fetch("/api/watchlist")
        .then((r) => r.json())
        .then((data: WatchlistData | null) => {
          if (data) {
            setIndustries(data.industries ?? [])
            setKeywords(data.keywords ?? [])
          }
        })
    }
  }, [session])

  async function save() {
    setSaving(true)
    try {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industries, keywords, cpcCodes: [] }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (isPending || !session) return null

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="p-6 max-w-2xl space-y-8">
          <div className="flex items-center gap-3">
            <Eye className="size-5 text-accent" />
            <h1 className="text-2xl font-semibold">Watchlist verwalten</h1>
          </div>

          <div>
            <h2 className="text-lg font-medium mb-4">Branchen</h2>
            <IndustryStep
              selected={industries}
              onChange={setIndustries}
              onNext={() => {}}
            />
          </div>

          <div>
            <h2 className="text-lg font-medium mb-4">Keywords</h2>
            <KeywordsStep
              keywords={keywords}
              industries={industries}
              onChange={setKeywords}
              onNext={() => {}}
              onBack={() => {}}
            />
          </div>

          <Button
            onClick={save}
            disabled={saving || industries.length === 0}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {saved ? (
              <>
                <CheckCircle className="mr-2 size-4" /> Gespeichert
              </>
            ) : saving ? (
              "Wird gespeichert..."
            ) : (
              "Watchlist speichern"
            )}
          </Button>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
