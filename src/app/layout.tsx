import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "./providers"
import Header from "@/components/header"

export const metadata: Metadata = {
  title: "TSender",
  description: "Your optimized airdrop platform",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900">
        <Providers>
          {/* Header */}
          <Header />

          {/* Main content area */}
          <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="text-center py-6 text-gray-500 text-sm border-t border-gray-200">
            &copy; {new Date().getFullYear()} TSender. All rights reserved.
          </footer>
        </Providers>
      </body>
    </html>
  )
}
