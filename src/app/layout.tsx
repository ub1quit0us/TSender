import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "./providers"
import Header from "@/components/header"
import AirdropForm from "@/components/airdropForm"

export const metadata: Metadata = {
  title: "TSender",
  description: "Your optimized airdrop platform"
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen flex flex-col">
        <Providers>
          {/* Header */}
          <Header />

          {/* Main Content */}
          <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Airdrop Form */}
            <section>
              <AirdropForm />
            </section>

            {/* Any additional children/components */}
            <section>
              {props.children}
            </section>
          </main>

          {/* Footer placeholder (optional) */}
          <footer className="text-center py-6 text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} TSender. All rights reserved.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
