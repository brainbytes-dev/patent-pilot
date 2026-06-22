"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Plus, Pencil, Trash2 } from "lucide-react"
import { WatchlistModal } from "@/components/watchlist-modal"

interface WatchlistRow {
  id: string
  name: string | null
  industries: string[]
  keywords: string[]
  cpcCodes: string[]
  active: boolean
}

export default function WatchlistPage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [rows, setRows] = useState<WatchlistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<WatchlistRow | undefined>(undefined)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (!isPending && !session) router.push("/login")
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      fetch("/api/watchlist")
        .then((r) => r.json())
        .then((data: WatchlistRow[]) => setRows(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false))
    }
  }, [session])

  function openNew() {
    setEditing(undefined)
    setModalOpen(true)
  }

  function openEdit(row: WatchlistRow) {
    setEditing(row)
    setModalOpen(true)
  }

  function handleSuccess(row: WatchlistRow) {
    setRows((prev) => {
      const exists = prev.find((r) => r.id === row.id)
      return exists ? prev.map((r) => r.id === row.id ? row : r) : [...prev, row]
    })
  }

  async function deleteWatch(id: string) {
    await fetch(`/api/watchlist/${id}`, { method: "DELETE" })
    setRows((prev) => prev.filter((r) => r.id !== id))
    setConfirmDeleteId(null)
  }

  if (isPending || !session) return null

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="p-6 max-w-2xl w-full mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="size-5 text-accent" />
              <h1 className="text-2xl font-semibold">Watchlists</h1>
            </div>
            <Button size="sm" onClick={openNew} className="gap-1.5">
              <Plus className="size-4" /> Neue Watchlist
            </Button>
          </div>

          {!loading && rows.length === 0 && (
            <div className="border border-dashed border-border rounded-none p-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Noch keine Watchlist. Erstelle deine erste, um personalisierte Briefings zu erhalten.
              </p>
              <Button size="sm" onClick={openNew} variant="outline">
                Watchlist erstellen
              </Button>
            </div>
          )}

          {rows.map((row) => (
            <div key={row.id} className="border rounded-none p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{row.name ?? row.industries.join(", ")}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {row.industries.map((i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>
                    ))}
                    {row.keywords.slice(0, 4).map((k) => (
                      <Badge key={k} variant="outline" className="text-xs">{k}</Badge>
                    ))}
                    {row.keywords.length > 4 && (
                      <Badge variant="outline" className="text-xs">+{row.keywords.length - 4}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 items-center">
                  {confirmDeleteId === row.id ? (
                    <>
                      <span className="text-xs text-muted-foreground mr-1">Wirklich löschen?</span>
                      <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => deleteWatch(row.id)}>
                        Löschen
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmDeleteId(null)}>
                        Abbrechen
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(row)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-8 text-destructive hover:text-destructive" onClick={() => setConfirmDeleteId(row.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SidebarInset>

      <WatchlistModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
        existing={editing}
      />
    </SidebarProvider>
  )
}
