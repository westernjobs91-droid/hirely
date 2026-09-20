export const PLANS = {
  free: { name: 'Free', monthlyUsd: 0, contacts: 50, email: 5, meet: 0, drafts: 0 },
  solo: { name: 'Solo', monthlyUsd: 29, contacts: 1000, email: 50, meet: 25, drafts: 50 },
  pro: { name: 'Pro', monthlyUsd: 59, contacts: null, email: 200, meet: 75, drafts: 200 },
} as const
export type Plan = keyof typeof PLANS
export type Entitlements = {
  plan: Plan; source: string; status: string; contact_limit: number | null;
  email_limit: number; meet_limit: number; draft_limit: number;
  email_used: number; meet_used: number; draft_used: number;
  outlook: boolean; csv: boolean; advanced_analytics: boolean; billing_managed: boolean;
}
export async function getEntitlements(db: any): Promise<Entitlements> {
  const { data, error } = await db.rpc('get_hirely_entitlements')
  if (error || !data || !Object.prototype.hasOwnProperty.call(PLANS, data.plan)) {
    throw new Error('Plan limits are temporarily unavailable. Please try again.')
  }
  return data
}
