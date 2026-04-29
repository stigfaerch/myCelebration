import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { resolveGuest } from '@/lib/auth/resolveGuest'
import { supabaseServer } from '@/lib/supabase/server'
import { RichTextDisplay } from '@/components/admin/RichTextDisplay'
import { isPageVisibleNow } from '@/lib/guest/navItems'

interface Props {
  params: Promise<{ uuid: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data } = await supabaseServer
    .from('pages')
    .select('title')
    .eq('slug', slug)
    .maybeSingle()
  const title = (data as { title?: string } | null)?.title
  return { title: title ?? '' }
}

interface PageRow {
  id: string
  slug: string
  title: string
  content: Record<string, unknown> | null
  is_active: boolean
  visible_from: string | null
  visible_until: string | null
}

export default async function GuestDynamicPage({ params }: Props) {
  const { slug } = await params

  // Authenticate the guest like every other page in this segment.
  await resolveGuest()

  const { data, error } = await supabaseServer
    .from('pages')
    .select('id, slug, title, content, is_active, visible_from, visible_until')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw new Error(error.message)

  const page = (data as PageRow | null) ?? null
  if (!page) notFound()
  if (!isPageVisibleNow(page)) notFound()

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">{page.title}</h1>
      <RichTextDisplay content={page.content} />
    </div>
  )
}
