import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">🔍</span>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Page Not Found
        </h1>
        
        <p className="text-gray-600 mb-6">
          Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you entered the wrong URL.
        </p>
        
        <div className="space-y-3">
          <Link
            href="/"
            className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Go to Home
          </Link>
          
          <Link
            href="/analyze"
            className="inline-block w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Start Analyzing
          </Link>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>Common pages:</p>
          <div className="mt-2 space-y-1">
            <Link href="/" className="block text-blue-600 hover:text-blue-700">Home</Link>
            <Link href="/analyze" className="block text-blue-600 hover:text-blue-700">Analyze</Link>
            <Link href="/history" className="block text-blue-600 hover:text-blue-700">History</Link>
            <Link href="/auth" className="block text-blue-600 hover:text-blue-700">Login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
