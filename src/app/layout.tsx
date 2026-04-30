import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'
import { getFontSizes } from '@/lib/actions/settings'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Konfirmationsfest',
  description: 'Konfirmationsfest webapp',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [locale, messages, fontSizes] = await Promise.all([
    getLocale(),
    getMessages(),
    getFontSizes(),
  ])

  // Override @tailwindcss/typography defaults so admin-controlled sizes
  // win. !important is needed because the prose plugin emits its own
  // size + line-height rules. Applies to every RichTextDisplay output
  // (guest pages, screens, admin previews).
  const proseStyle = `
    .prose p, .prose li { font-size: ${fontSizes.p}px !important; }
    .prose h1 { font-size: ${fontSizes.h1}px !important; }
    .prose h2 { font-size: ${fontSizes.h2}px !important; }
  `

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: proseStyle }} />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
