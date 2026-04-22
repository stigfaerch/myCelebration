'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'

export async function getAppSettings() {
  const { data, error } = await supabaseServer
    .from('app_settings')
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as { id: string; sms_template: string }
}

export async function updateSmsTemplate(template: string) {
  const { data: existing } = await supabaseServer
    .from('app_settings')
    .select('id')
    .single()
  if (!existing) throw new Error('App settings not found')
  const { error } = await supabaseServer
    .from('app_settings')
    .update({ sms_template: template })
    .eq('id', existing.id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/indstillinger')
}
