"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface BriefingDetail {
  htmlContent: string | null
  weekOf: string
  status: string
}

export default function BriefingDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { data: session, isPending } = useSession()
  const [briefing, setBriefing] = useState<BriefingDetail | null>(null)

  useEffect(() => {
    if (!isPending && !session) router.push("/login")
  }, [session, isPending, router])

  useEffect(() => {
    if (session && id) {
      fetch(`/api/briefings/${id}`)
        .then((r) => r.json())
        .then((d: BriefingDetail) => setBriefing(d))
    }
  }, [session, id])

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
          <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
            <Link href="/briefings">
              <ArrowLeft className="mr-2 size-4" /> Zurück zum Archiv
            </Link>
          </Button>

          {briefing && (
            <>
              <h1 className="text-2xl font-semibold mb-6">
                Briefing vom{" "}
                {new Date(briefing.weekOf).toLocaleDateString("de-DE", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h1>
              <Card className="p-8">
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{
                    __html: briefing.htmlContent ?? "<p>Kein Inhalt verfügbar.</p>",
                  }}
                />
              </Card>
            </>
          )}

          {!briefing && (
            <p className="text-muted-foreground text-sm">Wird geladen...</p>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
