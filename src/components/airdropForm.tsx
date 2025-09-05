"use client"

import { useState, useMemo, useEffect } from "react"
import InputField from "@/components/ui/inputFields"
import { chainsToTSender, tsenderAbi, erc20Abi } from "@/constants"
import { useChainId, useConfig, useAccount, useWriteContract } from "wagmi"
import { readContract } from "@wagmi/core"
import { getAddress } from "viem"
import { calculateTotal } from "@/utils"

export default function AirdropForm() {
  // ----------------- Form State -----------------
  const [tokenAddress, setTokenAddress] = useState("")
  const [recipients, setRecipients] = useState("")
  const [amounts, setAmounts] = useState("")
  const [errors, setErrors] = useState({ tokenAddress: "", recipients: "", amounts: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [tokenDetails, setTokenDetails] = useState<{ symbol?: string; decimals?: number; balance?: bigint }>({})

  const chainId = useChainId()
  const config = useConfig()
  const account = useAccount()
  const { writeContractAsync } = useWriteContract()
  const total = useMemo(() => calculateTotal(amounts), [amounts])

  const isValidEthereumAddress = (address: string) => /^0x[a-fA-F0-9]{40}$/.test(address)
  const isValidAmount = (amount: string) => /^\d+(\.\d+)?$/.test(amount) && parseFloat(amount) > 0
  const parseList = (raw: string) => raw.split(/[\n,]+/).map(i => i.trim()).filter(Boolean)

  // ----------------- LocalStorage -----------------
  useEffect(() => {
    const saved = localStorage.getItem("airdropForm")
    if (saved) {
      const data = JSON.parse(saved)
      setTokenAddress(data.tokenAddress || "")
      setRecipients(data.recipients || "")
      setAmounts(data.amounts || "")
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      "airdropForm",
      JSON.stringify({ tokenAddress, recipients, amounts })
    )
  }, [tokenAddress, recipients, amounts])

  // ----------------- ERC20 Validation -----------------
  async function isERC20(address: string) {
    if (!isValidEthereumAddress(address)) return false
    try {
      const [decimals, symbol] = await Promise.all([
        readContract(config, { abi: erc20Abi, address: address as `0x${string}`, functionName: "decimals" }),
        readContract(config, { abi: erc20Abi, address: address as `0x${string}`, functionName: "symbol" }),
      ])
      return typeof decimals === "number" && typeof symbol === "string"
    } catch {
      return false
    }
  }

  // ----------------- Live Validation -----------------
  useEffect(() => {
    if (!tokenAddress) return setErrors(prev => ({ ...prev, tokenAddress: "" }))
    const timer = setTimeout(async () => {
      if (!isValidEthereumAddress(tokenAddress)) {
        setErrors(prev => ({ ...prev, tokenAddress: "Invalid address format" }))
        setTokenDetails({})
        return
      }
      const validERC20 = await isERC20(tokenAddress)
      setErrors(prev => ({ ...prev, tokenAddress: validERC20 ? "" : "Address is not a valid ERC20 token" }))

      if (validERC20 && account.address) {
        try {
          const normalizedAddress = getAddress(tokenAddress) as `0x${string}`
          const [decimals, symbol, balance] = await Promise.all([
            readContract(config, { abi: erc20Abi, address: normalizedAddress, functionName: "decimals" }),
            readContract(config, { abi: erc20Abi, address: normalizedAddress, functionName: "symbol" }),
            readContract(config, { abi: erc20Abi, address: normalizedAddress, functionName: "balanceOf", args: [getAddress(account.address) as `0x${string}`] })
          ])
          setTokenDetails({ decimals: Number(decimals), symbol: String(symbol), balance: balance as bigint })
        } catch (err) {
          console.error(err)
          setTokenDetails({})
        }
      } else setTokenDetails({})
    }, 400)
    return () => clearTimeout(timer)
  }, [tokenAddress, account.address])

  useEffect(() => {
    if (!recipients) return setErrors(prev => ({ ...prev, recipients: "" }))
    const timer = setTimeout(() => {
      const list = parseList(recipients)
      if (!list.length) return setErrors(prev => ({ ...prev, recipients: "At least one recipient is required" }))
      const invalid = list.filter(r => !isValidEthereumAddress(r))
      setErrors(prev => ({ ...prev, recipients: invalid.length ? `Invalid address(es): ${invalid.join(", ")}` : "" }))
    }, 400)
    return () => clearTimeout(timer)
  }, [recipients])

  useEffect(() => {
    if (!amounts) return setErrors(prev => ({ ...prev, amounts: "" }))
    const timer = setTimeout(() => {
      const list = parseList(amounts)
      if (!list.length) return setErrors(prev => ({ ...prev, amounts: "At least one amount is required" }))
      const invalid = list.filter(a => !isValidAmount(a))
      if (invalid.length) return setErrors(prev => ({ ...prev, amounts: `Invalid amount(s): ${invalid.join(", ")}` }))

      if (tokenDetails.balance != null && tokenDetails.decimals != null) {
        const decimals = tokenDetails.decimals
        const total = list.map(a => BigInt(Math.floor(parseFloat(a) * 10 ** decimals))).reduce((acc, n) => acc + n, BigInt(0))
        if (tokenDetails.balance < total) {
          setErrors(prev => ({
            ...prev,
            amounts: `Insufficient balance. You have ${(Number(tokenDetails.balance) / 10 ** decimals).toFixed(4)} ${tokenDetails.symbol}, total airdrop ${(Number(total) / 10 ** decimals).toFixed(4)}`
          }))
          return
        }
      }
      setErrors(prev => ({ ...prev, amounts: "" }))
    }, 400)
    return () => clearTimeout(timer)
  }, [amounts, tokenDetails])

  // ----------------- Submit -----------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitDisabled) return

    setIsLoading(true) // ✅ must be first

    try {
      if (!account.address) throw new Error("Connect wallet first")
      const tSenderAddress = chainsToTSender[chainId]?.tsender
      if (!tSenderAddress) throw new Error("No TSender for this chain")

      const recipientList = parseList(recipients).map(addr => getAddress(addr))
      const decimals = tokenDetails.decimals || 18
      const amountList = parseList(amounts).map(amt => BigInt(Math.floor(parseFloat(amt) * 10 ** decimals)))
      const totalInWei = amountList.reduce((acc, n) => acc + n, BigInt(0))

      // Check allowance
      const allowance = await readContract(config, {
        abi: erc20Abi,
        address: getAddress(tokenAddress),
        functionName: "allowance",
        args: [account.address!, tSenderAddress]
      }) as bigint

      if (allowance < totalInWei) {
        // Approve first
        await writeContractAsync({
          abi: erc20Abi,
          address: getAddress(tokenAddress),
          functionName: "approve",
          args: [tSenderAddress, totalInWei]
        })
      }

      // Execute airdrop
      await writeContractAsync({
        abi: tsenderAbi,
        address: getAddress(tSenderAddress),
        functionName: "airdropERC20",
        args: [getAddress(tokenAddress), recipientList, amountList, totalInWei]
      })

      alert("🎉 Airdrop successful!")
    } catch (err: any) {
      console.error(err)
      alert(`Transaction failed: ${err?.message || "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }


  const hasErrors = Object.values(errors).some(e => e)
  const isSubmitDisabled = isLoading || hasErrors || !tokenAddress || !recipients || !amounts || (tokenDetails.balance ?? 0n) === 0n

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 md:p-10 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">ERC20 Token Airdrop</h2>
      <p className="text-gray-600 text-center mb-6">Send tokens to multiple addresses in one transaction</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <InputField
          label="Token Address"
          placeholder="0x..."
          value={tokenAddress}
          onChange={setTokenAddress}
          error={errors.tokenAddress}
        />

        <InputField
          label="Recipients"
          placeholder={`0x742d35Cc6634C0532925a3b844Bc454e4438f44e
0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed`}
          value={recipients}
          onChange={setRecipients}
          error={errors.recipients}
          type="textarea"
        />

        <InputField
          label="Amounts"
          placeholder={`10.5
25.0
3.75`}
          value={amounts}
          onChange={setAmounts}
          error={errors.amounts}
          type="textarea"
        />

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {isLoading && (
            <svg
              className="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" fill="none" />
              <path className="opacity-90" fill="white" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
            </svg>
          )}
          <span>{isLoading ? "Processing..." : "Send Tokens"}</span>
        </button>


      </form>

      {tokenAddress && tokenDetails.symbol && (
        <div className="mt-6 p-4 border rounded-md bg-gray-50 text-gray-700 text-sm">
          <p><strong>Token:</strong> {tokenDetails.symbol}</p>
          <p><strong>Decimals:</strong> {tokenDetails.decimals}</p>
          <p><strong>Your Balance:</strong> {tokenDetails.balance ? (Number(tokenDetails.balance) / 10 ** (tokenDetails.decimals || 18)).toFixed(4) : 0}</p>
        </div>
      )}

      <style jsx>{`
        .loader {
          border: 2px solid #f3f3f3;
          border-top: 2px solid #fff;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
      `}</style>
    </div>
  )
}
