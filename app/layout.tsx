// Import MongoDB complete reset system early to ensure real MongoDB is available
import '@/lib/mongodb-complete-reset'

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '../contexts/AuthContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SIBI - Should I Buy It | Lot Analyzer',
  description: 'AI-powered lot analyzer for eBay resellers. Upload images, get AI recognition, and analyze eBay pricing data.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            <div className="min-h-screen bg-gray-50">
              <Navigation />
              <main>
                {children}
              </main>
            </div>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}

