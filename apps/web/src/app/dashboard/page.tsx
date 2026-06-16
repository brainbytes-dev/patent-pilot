"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useSession } from "@/lib/auth-client"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { StatsBar } from "./_components/stats-bar"
import { LatestBriefing } from "./_components/latest-briefing"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface DashboardStats {
  briefingsSent: number
  onboardingComplete: boolean
  patentsInDb: number
  latestBriefingId: string | null
  latestBriefingWeek: string | null
  industries: string[]
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    if (!isPending && !session) router.push("/login")
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      fetch("/api/dashboard/stats")
        .then((r) => r.json())
        .then((d: DashboardStats) => setStats(d))
    }
  }, [session])

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Wird geladen...</p>
      </div>
    )
  }

  if (!session) return null

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
        <div className="flex flex-1 flex-col p-6 gap-6">
          {/* Onboarding nudge */}
          {stats && !stats.onboardingComplete && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 flex items-center justify-between">
              <p className="text-sm font-medium">
                Richten Sie Ihre Watchlist ein, um wöchentliche Patent-Briefings zu erhalten.
              </p>
              <Button
                size="sm"
                className="bg-accent hover:bg-accent/90 text-accent-foreground ml-4 flex-shrink-0"
                onClick={() => router.push("/onboarding")}
              >
                Jetzt einrichten <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          )}

          {/* Stats */}
          {stats && <StatsBar stats={stats} />}

          {/* Latest briefing */}
          {stats?.latestBriefingId && (
            <LatestBriefing
              briefingId={stats.latestBriefingId}
              weekOf={stats.latestBriefingWeek}
            />
          )}

          {/* Empty state after onboarding */}
          {stats && stats.briefingsSent === 0 && stats.onboardingComplete && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">
                Ihr erstes Briefing kommt am Montag um 8 Uhr.
              </p>
              <p className="text-sm mt-1">
                Wir durchsuchen gerade die Patentdatenbank nach relevanten Einträgen.
              </p>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
