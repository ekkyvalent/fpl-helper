import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FPL Helper',
  description: 'Smart Fantasy Premier League assistant — squad insights, fixtures & transfer tips',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
