// The caller's authenticated Supabase client enforces RLS. Keep explicit owner
// and current-state filters for races, stale tabs, and clear not-found results.
export async function setContactTrashed(db: any, userId: string, id: string | number, trashed: boolean) {
  let query = db.from('contacts').update({ deleted_at: trashed ? new Date().toISOString() : null })
    .eq('id', id).eq('user_id', userId)
  query = trashed ? query.is('deleted_at', null) : query.not('deleted_at', 'is', null)
  const { data, error } = await query.select('id').maybeSingle()
  if (error) throw new Error('Could not change this contact. Try again or contact support.')
  if (!data) throw new Error('Contact changed or is no longer available. Refresh and try again.')
  return data
}
