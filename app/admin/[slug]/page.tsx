import { notFound } from "next/navigation"
import AdminPanel from "@/components/admin/admin-panel"

/**
 * Secret admin panel — reachable ONLY at /admin/<ADMIN_SLUG> where
 * ADMIN_SLUG is a long random hash stored in the server environment.
 * Any other slug (or /admin itself) returns 404.
 */
export default async function SecretAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const expected = process.env.ADMIN_SLUG

  if (!expected || slug !== expected) {
    notFound()
  }

  return <AdminPanel />
}
