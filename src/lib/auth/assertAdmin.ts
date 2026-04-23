import { cookies } from 'next/headers'
import { verifyAdminToken } from './adminToken'

export async function assertAdmin(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token || !verifyAdminToken(token)) {
    throw new Error('Unauthorized')
  }
}
