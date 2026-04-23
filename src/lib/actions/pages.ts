'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/assertAdmin'

export interface PageSummary {
  id: string
  slug: string
  title: string
  is_active: boolean
  visible_from: string | null
  visible_until: string | null
  sort_order: number
  created_at: string
}

export interface Page extends PageSummary {
  content: Record<string, unknown> | null
}

export interface PageFormData {
  slug: string
  title: string
  content: Record<string, unknown> | null
  is_active: boolean
  visible_from: string | null
  visible_until: string | null
}

export async function getPages(): Promise<PageSummary[]> {
  const { data, error } = await supabaseServer
    .from('pages')
    .select('id, slug, title, is_active, visible_from, visible_until, sort_order, created_at')
    .order('sort_order')
  if (error) throw new Error('Failed to load pages')
  return (data ?? []) as PageSummary[]
}

export async function getPage(id: string): Promise<Page | null> {
  const { data, error } = await supabaseServer
    .from('pages')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error('Failed to load page')
  return (data as Page | null) ?? null
}

export async function createPage(formData: PageFormData): Promise<void> {
  await assertAdmin()

  const { count, error: countError } = await supabaseServer
    .from('pages')
    .select('*', { count: 'exact', head: true })
  if (countError) throw new Error('Failed to create page')
  const sort_order = count ?? 0

  const { error } = await supabaseServer.from('pages').insert({
    slug: formData.slug,
    title: formData.title,
    content: formData.content,
    is_active: formData.is_active,
    visible_from: formData.visible_from,
    visible_until: formData.visible_until,
    sort_order,
  })
  if (error) throw new Error('Failed to create page')

  revalidatePath('/admin/sider')
}

export async function updatePage(id: string, formData: PageFormData): Promise<void> {
  await assertAdmin()

  const { error } = await supabaseServer
    .from('pages')
    .update({
      slug: formData.slug,
      title: formData.title,
      content: formData.content,
      is_active: formData.is_active,
      visible_from: formData.visible_from,
      visible_until: formData.visible_until,
    })
    .eq('id', id)
  if (error) throw new Error('Failed to update page')

  revalidatePath('/admin/sider')
}

export async function deletePage(id: string): Promise<void> {
  await assertAdmin()

  const { error } = await supabaseServer.from('pages').delete().eq('id', id)
  if (error) throw new Error('Failed to delete page')

  revalidatePath('/admin/sider')
}
