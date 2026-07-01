import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hirely - The CRM Built for Recruiters',
  description: 'Place more. Follow up smarter. One click from your inbox - contact saved, LinkedIn enriched, AI follow-ups ready.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
