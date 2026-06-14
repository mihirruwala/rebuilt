import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'REBUILT',
  description: 'A 30-day recovery companion.',
  manifest: '/manifest.json',
  themeColor: '#080808',
  appleWebApp: { capable: true, statusBarStyle: "black", title: 'REBUILT' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
