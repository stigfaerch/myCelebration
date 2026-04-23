import { createHmac, timingSafeEqual } from 'crypto'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? ''

export function createAdminToken(): string {
  if (!ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD not configured')
  return createHmac('sha256', ADMIN_PASSWORD)
    .update('admin-authenticated')
    .digest('hex')
}

export function verifyAdminToken(token: string): boolean {
  const expected = createAdminToken()
  if (token.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
}
