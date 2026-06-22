"use client"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signIn } from "@/lib/auth-client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import * as Sentry from "@sentry/nextjs"
import { DEMO_MODE } from "@/lib/demo-mode"

const loginSchema = z.object({
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
  password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const handleDemoLogin = async () => {
    await signIn.email(
      { email: "demo@example.com", password: "demo" },
      {
        onSuccess: () => {
          router.push("/dashboard")
        },
      }
    )
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      await signIn.email(
        {
          email: data.email,
          password: data.password,
        },
        {
          onSuccess: () => {
            router.push("/dashboard")
          },
          onError: (ctx) => {
            setError("email", {
              message: ctx.error.message || "Anmeldung fehlgeschlagen.",
            })
            Sentry.captureException(ctx.error, {
              tags: { form: "login" },
            })
          },
        }
      )
    } catch (err) {
      Sentry.captureException(err, { tags: { form: "login" } })
      setError("email", {
        message: err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        {errors.email && !errors.password && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {errors.email.message}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="email">E-Mail-Adresse</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="name@firma.de"
            {...register("email")}
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Passwort</FieldLabel>
            <a
              href="/forgot-password"
              className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition-colors"
            >
              Passwort vergessen?
            </a>
          </div>
          <Input
            id="password"
            type="password"
            {...register("password")}
            disabled={isSubmitting}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </Field>
        <Field>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isSubmitting ? "Wird angemeldet ..." : "Anmelden"}
          </Button>
        </Field>
        {DEMO_MODE && (
          <Field>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">oder</span>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={handleDemoLogin} className="w-full">
              Demo ausprobieren
            </Button>
          </Field>
        )}
      </FieldGroup>
    </form>
  )
}
