import { redirect } from 'next/navigation'

// Preserve old bookmarks; the current Company Data API authorizes every request.
export default function AdminSeedPage() {
  redirect('/admin/companies')
}
