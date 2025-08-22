import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SIBI - Should I Buy It | Lot Analyzer',
  description: 'AI-powered lot analyzer for eBay resellers.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900">
                    SIBI - Should I Buy It
                  </h1>
                  <span className="ml-2 text-sm text-gray-500">Lot Analyzer</span>
                </div>
                <nav className="hidden md:flex space-x-8">
                  <a href="/" className="text-gray-900 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                    Home
                  </a>
                  <a href="/analyze" className="text-gray-900 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                    Analyze
                  </a>
                  <a href="/history" className="text-gray-900 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                    History
                  </a>
                </nav>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
