"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowRight, Mail } from "lucide-react"

interface BriefingRow {
  id: string
  weekOf: string
  status: string
  sentAt: string | null
}

export default function BriefingsPage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [briefingList, setBriefingList] = useState<BriefingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isPending && !session) router.push("/login")
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      fetch("/api/briefings")
        .then((r) => r.json())
        .then((d: BriefingRow[]) => {
          setBriefingList(d)
          setLoading(false)
        })
    }
  }, [session])

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
        <div className="p-6 max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="size-5 text-accent" />
            <h1 className="text-2xl font-semibold">Briefing-Archiv</h1>
          </div>

          {loading && (
            <p className="text-muted-foreground text-sm">Wird geladen...</p>
          )}

          {!loading && briefingList.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">Noch keine Briefings vorhanden.</p>
              <p className="text-sm mt-1">Das erste Briefing kommt am Montag um 8 Uhr.</p>
            </div>
          )}

          <div className="space-y-3">
            {briefingList.map((b) => {
              const date = new Date(b.weekOf).toLocaleDateString("de-DE", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
              return (
                <Link key={b.id} href={`/briefings/${b.id}`}>
                  <Card className="p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer">
                    <div>
                      <p className="font-medium">Briefing vom {date}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        KW {getWeekNumber(new Date(b.weekOf))}/{new Date(b.weekOf).getFullYear()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={b.status === "sent" ? "default" : "outline"}
                        className={b.status === "sent" ? "bg-accent text-accent-foreground" : ""}
                      >
                        {b.status === "sent"
                          ? "Gesendet"
                          : b.status === "generated"
                          ? "Generiert"
                          : b.status}
                      </Badge>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function getWeekNumber(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  )
}
