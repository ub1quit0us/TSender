"use client"

import { useAccount } from "wagmi"
import HomeContent from "@components/HomeContent"

export default function Page() {
  const { isConnected } = useAccount()

  return (
    <div className="max-w-4xl mx-auto p-6">
      {isConnected ? (
        <HomeContent />
      ) : (
        <div className="text-center text-gray-600 mt-20">
          <h1 className="text-2xl font-bold text-gray-800">🔌 Connect Your Wallet</h1>
          <p className="mt-2 text-gray-500">
            Please connect your wallet to start using <span className="font-semibold">TSender</span>.
          </p>
        </div>
      )}
    </div>
  )
}
