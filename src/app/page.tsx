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
          <p>Connect your wallet to continue.</p>
        </div>
      )}
    </div>
  )
}
