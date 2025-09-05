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
      {/* Simple, neutral background and readable text */}
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="text-center py-6 text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} TSender. All rights reserved.
          </footer>
        </Providers>
      </body>
    </html>
  )
}
