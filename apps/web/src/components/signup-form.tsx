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
import { signUp } from "@/lib/auth-client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import * as Sentry from "@sentry/nextjs"
import { sendWelcomeEmail } from "@/lib/email"

const signupSchema = z
  .object({
    name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein."),
    email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
    password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Die Passwörter stimmen nicht überein.",
    path: ["confirmPassword"],
  })

type SignupFormData = z.infer<typeof signupSchema>

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    try {
      await signUp.email(
        {
          email: data.email,
          password: data.password,
          name: data.name,
        },
        {
          onSuccess: async () => {
            try {
              await sendWelcomeEmail(data.name, data.email)
            } catch (err) {
              console.error("Failed to send welcome email:", err)
              Sentry.captureException(err, { tags: { form: "signup" } })
            }
            router.push("/dashboard")
          },
          onError: (ctx) => {
            setError("email", {
              message: ctx.error.message || "Registrierung fehlgeschlagen.",
            })
            Sentry.captureException(ctx.error, {
              tags: { form: "signup" },
            })
          },
        }
      )
    } catch (err) {
      Sentry.captureException(err, { tags: { form: "signup" } })
      setError("email", {
        message: err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        {errors.email && !errors.name && !errors.password && !errors.confirmPassword && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {errors.email.message}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="name">Vollständiger Name</FieldLabel>
          <Input
            id="name"
            type="text"
            placeholder="Max Mustermann"
            {...register("name")}
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="email">E-Mail-Adresse</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="name@firma.de"
            {...register("email")}
            disabled={isSubmitting}
          />
          <FieldDescription className="text-muted-foreground">
            Hierüber erhalten Sie Ihr wöchentliches Briefing.
          </FieldDescription>
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Passwort</FieldLabel>
          <Input
            id="password"
            type="password"
            {...register("password")}
            disabled={isSubmitting}
          />
          <FieldDescription className="text-muted-foreground">
            Mindestens 8 Zeichen.
          </FieldDescription>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">Passwort bestätigen</FieldLabel>
          <Input
            id="confirm-password"
            type="password"
            {...register("confirmPassword")}
            disabled={isSubmitting}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </Field>
        <Field>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isSubmitting ? "Konto wird erstellt ..." : "Kostenlos starten"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
