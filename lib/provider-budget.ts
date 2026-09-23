import { companyService } from './company-data'

function monthlyLimit(provider: 'hunter' | 'exa'): number {
  const name = provider === 'hunter' ? 'HUNTER_MONTHLY_CREDIT_LIMIT' : 'EXA_MONTHLY_REQUEST_LIMIT'
  const fallback = provider === 'hunter' ? 50 : 0
  const value = Number(process.env[name] ?? fallback)
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback
}

function billingCycleDay(provider: 'hunter' | 'exa'): number {
  const name = provider === 'hunter' ? 'HUNTER_BILLING_CYCLE_DAY' : 'EXA_BILLING_CYCLE_DAY'
  const value = Number(process.env[name] ?? 1)
  return Number.isFinite(value) ? Math.min(28, Math.max(1, Math.floor(value))) : 1
}

export async function reserveProviderCredit(provider: 'hunter' | 'exa'): Promise<'reserved' | 'exhausted' | 'unavailable'> {
  const db = companyService()
  if (!db) return 'unavailable'
  const { data, error } = await db.rpc('reserve_provider_credit', {
    p_provider: provider,
    p_monthly_limit: monthlyLimit(provider),
    p_cycle_day: billingCycleDay(provider),
  })
  if (error) return 'unavailable'
  return data === true ? 'reserved' : 'exhausted'
}

export async function releaseProviderCredit(provider: 'hunter' | 'exa'): Promise<void> {
  const db = companyService()
  if (!db) return
  await db.rpc('release_provider_credit', {
    p_provider: provider,
    p_cycle_day: billingCycleDay(provider),
  })
}
