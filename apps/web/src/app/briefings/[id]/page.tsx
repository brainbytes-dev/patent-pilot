import { redirect } from "next/navigation"

export default async function BriefingDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/dashboard/briefings/${id}`)
}
