"use client"

import { useState, useEffect } from "react"
import { useSession } from "@/lib/auth-client"
import { updateProfile, changePassword } from "@/lib/auth-client"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

export default function SettingsPage() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    if (session?.user?.name) setFormData((f) => ({ ...f, name: session.user.name ?? "" }))
  }, [session])

  function flash() {
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2500)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      if (!formData.name.trim()) { setError("Name darf nicht leer sein"); return }
      const result = await updateProfile({ name: formData.name })
      if (result.error) setError(String(result.error))
      else flash()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      if (!formData.currentPassword || !formData.newPassword) { setError("Alle Felder ausfüllen"); return }
      if (formData.newPassword !== formData.confirmPassword) { setError("Passwörter stimmen nicht überein"); return }
      if (formData.newPassword.length < 8) { setError("Mindestens 8 Zeichen"); return }
      const result = await changePassword({ currentPassword: formData.currentPassword, newPassword: formData.newPassword })
      if (result.error) setError(String(result.error))
      else {
        setFormData((f) => ({ ...f, currentPassword: "", newPassword: "", confirmPassword: "" }))
        flash()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Ändern")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-col gap-8 p-6 lg:p-10 max-w-4xl w-full">

          <div>
            <h1 className="text-2xl font-semibold">Einstellungen</h1>
            <p className="text-sm text-muted-foreground mt-1">Profil, Passwort und Benachrichtigungen verwalten</p>
          </div>

          {error && (
            <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {isSaved && (
            <div className="rounded border border-status-free/40 bg-status-free/10 px-4 py-3 text-sm text-status-free">
              Änderungen gespeichert.
            </div>
          )}

          <Tabs defaultValue="profil" className="w-full">
            <TabsList className="mb-8">
              <TabsTrigger value="profil">Profil</TabsTrigger>
              <TabsTrigger value="sicherheit">Sicherheit</TabsTrigger>
              <TabsTrigger value="benachrichtigungen">Benachrichtigungen</TabsTrigger>
            </TabsList>

            {/* Profil Tab */}
            <TabsContent value="profil">
              <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
                <div>
                  <h2 className="font-medium">Persönliche Angaben</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Name und E-Mail-Adresse, die in deinem Konto hinterlegt sind.
                  </p>
                </div>
                <form onSubmit={handleSaveProfile} className="space-y-5 bg-card border p-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={isLoading}
                      placeholder="Max Mustermann"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-Mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={session?.user?.email ?? ""}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">E-Mail-Adresse kann nicht geändert werden.</p>
                  </div>
                  <div className="pt-2">
                    <Button type="submit" size="sm" disabled={isLoading}>
                      {isLoading ? "Wird gespeichert..." : "Speichern"}
                    </Button>
                  </div>
                </form>
              </div>
            </TabsContent>

            {/* Sicherheit Tab */}
            <TabsContent value="sicherheit">
              <div className="space-y-10">
                {/* Passwort */}
                <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
                  <div>
                    <h2 className="font-medium">Passwort</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Wähle ein starkes Passwort mit mindestens 8 Zeichen.
                    </p>
                  </div>
                  <form onSubmit={handleChangePassword} className="space-y-5 bg-card border p-6">
                    <div className="space-y-1.5">
                      <Label htmlFor="current-password">Aktuelles Passwort</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-password">Neues Passwort</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="pt-2">
                      <Button type="submit" size="sm" disabled={isLoading}>
                        {isLoading ? "Wird geändert..." : "Passwort ändern"}
                      </Button>
                    </div>
                  </form>
                </div>

                <Separator />

                {/* Konto löschen */}
                <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
                  <div>
                    <h2 className="font-medium text-destructive">Konto löschen</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Alle Daten werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                    </p>
                  </div>
                  <div className="bg-card border border-destructive/30 p-6">
                    <p className="text-sm text-muted-foreground mb-4">
                      Das Konto und alle zugehörigen Watchlists, Briefings und Einstellungen werden unwiderruflich entfernt.
                    </p>
                    <Button variant="destructive" size="sm" disabled>
                      Konto löschen
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Benachrichtigungen Tab */}
            <TabsContent value="benachrichtigungen">
              <div className="space-y-10">
                <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
                  <div>
                    <h2 className="font-medium">E-Mail-Briefings</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Wann und wie du Patent-Briefings per E-Mail erhältst.
                    </p>
                  </div>
                  <div className="bg-card border divide-y">
                    <div className="flex items-center justify-between px-6 py-4">
                      <div>
                        <p className="text-sm font-medium">General Brief</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Wöchentlich, jeden Sonntag: die 5-7 wichtigsten neuen Patentstatus</p>
                      </div>
                      <input type="checkbox" defaultChecked className="h-4 w-4 accent-accent" aria-label="General Brief aktivieren" />
                    </div>
                    <div className="flex items-center justify-between px-6 py-4">
                      <div>
                        <p className="text-sm font-medium">Personalisierter Brief</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Basierend auf deinen Watchlists, Starter &amp; Pro</p>
                      </div>
                      <input type="checkbox" defaultChecked className="h-4 w-4 accent-accent" aria-label="Personalisierter Brief aktivieren" />
                    </div>
                    <div className="flex items-center justify-between px-6 py-4">
                      <div>
                        <p className="text-sm font-medium">Lookahead-Alerts</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Ablaufende Patente 30/60/90 Tage im Voraus, nur Pro</p>
                      </div>
                      <input type="checkbox" className="h-4 w-4 accent-accent" aria-label="Lookahead-Alerts aktivieren" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
                  <div>
                    <h2 className="font-medium">System-Meldungen</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Kontoereignisse wie Zahlungen oder Passwortänderungen.
                    </p>
                  </div>
                  <div className="bg-card border divide-y">
                    <div className="flex items-center justify-between px-6 py-4">
                      <div>
                        <p className="text-sm font-medium">Zahlungsbestätigungen</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Automatisch bei jedem Rechnungseingang</p>
                      </div>
                      <input type="checkbox" defaultChecked disabled className="h-4 w-4 opacity-50" aria-label="Zahlungsbestätigungen (immer aktiv)" />
                    </div>
                    <div className="flex items-center justify-between px-6 py-4">
                      <div>
                        <p className="text-sm font-medium">Sicherheitshinweise</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Login von neuem Gerät, Passwortänderung</p>
                      </div>
                      <input type="checkbox" defaultChecked disabled className="h-4 w-4 opacity-50" aria-label="Sicherheitshinweise (immer aktiv)" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button size="sm">Einstellungen speichern</Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
