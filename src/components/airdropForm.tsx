"use client"

import { useState, useMemo, useEffect } from "react"
import InputField from "@/components/ui/inputFields"
import { chainsToTSender, tsenderAbi, erc20Abi } from "@/constants"
import { useChainId, useConfig, useAccount, useWriteContract } from "wagmi"
import { readContract, waitForTransactionReceipt } from "@wagmi/core"
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

  // ----------------- Hooks -----------------
  const chainId = useChainId()
  const config = useConfig()
  const account = useAccount()
  const { writeContractAsync } = useWriteContract()
  const total = useMemo(() => calculateTotal(amounts), [amounts])

  // ----------------- Helpers -----------------
  const isValidEthereumAddress = (address: string) => /^0x[a-fA-F0-9]{40}$/.test(address)
  const isValidAmount = (amount: string) => /^\d+(\.\d+)?$/.test(amount) && parseFloat(amount) > 0
  const parseList = (raw: string) => raw.split(/[\n,]+/).map(i => i.trim()).filter(Boolean)

  // ----------------- LocalStorage Persistence -----------------
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

  // ----------------- Contract Reads -----------------
  const getTokenDetails = async () => {
    if (!isValidEthereumAddress(tokenAddress)) return

    try {
      const normalizedAddress = getAddress(tokenAddress) as `0x${string}`

      const [decimals, symbol, balance] = await Promise.all([
        readContract(config, { abi: erc20Abi, address: normalizedAddress, functionName: "decimals" }),
        readContract(config, { abi: erc20Abi, address: normalizedAddress, functionName: "symbol" }),
        account.address
          ? readContract(config, { abi: erc20Abi, address: normalizedAddress, functionName: "balanceOf", args: [getAddress(account.address) as `0x${string}`] })
          : Promise.resolve(BigInt(0))
      ])

      setTokenDetails({
        decimals: Number(decimals),
        symbol: String(symbol),
        balance: balance as bigint
      })
    } catch (err) {
      console.error("Error fetching token details:", err)
    }
  }

  useEffect(() => {
    if (tokenAddress) getTokenDetails()
  }, [tokenAddress, account.address])

  async function getApprovedAmount(spender: string | null): Promise<bigint> {
    if (!spender) return BigInt(0)
    try {
      const allowance = await readContract(config, {
        abi: erc20Abi,
        address: tokenAddress as `0x${string}`,
        functionName: "allowance",
        args: [account.address!, spender],
      })
      return allowance as bigint
    } catch (err) {
      console.error("Error getting allowance:", err)
      return BigInt(0)
    }
  }

  async function getTokenDecimals(): Promise<number> {
    try {
      const dec = await readContract(config, { abi: erc20Abi, address: tokenAddress as `0x${string}`, functionName: "decimals" })
      return Number(dec)
    } catch (err) {
      console.error("Error reading decimals:", err)
      return 18
    }
  }

  async function isERC20(address: string) {
    try {
      const dec = await readContract(config, { abi: erc20Abi, address: address as `0x${string}`, functionName: "decimals" })
      const sym = await readContract(config, { abi: erc20Abi, address: address as `0x${string}`, functionName: "symbol" })
      return typeof dec === "number" && typeof sym === "string"
    } catch {
      return false
    }
  }


  // ----------------- Validation -----------------
  async function validateForm(): Promise<boolean> {
    const newErrors = { tokenAddress: "", recipients: "", amounts: "" }
    let isValid = true

    if (!tokenAddress) {
      newErrors.tokenAddress = "Token address is required"
      isValid = false
    } else if (!isValidEthereumAddress(tokenAddress)) {
      newErrors.tokenAddress = "Invalid ERC20 token address"
      isValid = false
    }

    const erc20Valid = await isERC20(tokenAddress)
    if (!erc20Valid) {
      newErrors.tokenAddress = "Address is not a valid ERC20 token"
      isValid = false
    }


    const recipientList = parseList(recipients)
    if (!recipientList.length) {
      newErrors.recipients = "At least one recipient is required"
      isValid = false
    } else {
      const invalidRecipients = recipientList.filter(r => !isValidEthereumAddress(r))
      if (invalidRecipients.length) {
        newErrors.recipients = `Invalid address(es): ${invalidRecipients.join(", ")}`
        isValid = false
      }
    }

    const amountList = parseList(amounts)
    if (!amountList.length) {
      newErrors.amounts = "At least one amount is required"
      isValid = false
    } else {
      const invalidAmounts = amountList.filter(a => !isValidAmount(a))
      if (invalidAmounts.length) {
        newErrors.amounts = `Invalid amount(s): ${invalidAmounts.join(", ")}`
        isValid = false
      }
    }

    if (recipientList.length && amountList.length && recipientList.length !== amountList.length) {
      newErrors.amounts = `Recipients (${recipientList.length}) must match amounts (${amountList.length})`
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  // ----------------- Submit -----------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const isValid = await validateForm()
    if (!isValid) return

    setIsLoading(true)

    try {
      const tSenderAddress = chainsToTSender[chainId]?.tsender
      if (!tSenderAddress) throw new Error("No TSender address found for this chain.")
      if (!account.address) throw new Error("Please connect your wallet first.")

      const recipientList = parseList(recipients).map(addr => getAddress(addr))
      const decimals = await getTokenDecimals()
      const amountList = parseList(amounts).map(amt => BigInt(Math.floor(parseFloat(amt) * 10 ** decimals)))
      const totalInWei = amountList.reduce((acc, n) => acc + n, BigInt(0))

      const approvedAmount = await getApprovedAmount(tSenderAddress)

      // Approve if needed
      if (approvedAmount < totalInWei) {
        await writeContractAsync({ abi: erc20Abi, address: getAddress(tokenAddress), functionName: "approve", args: [getAddress(tSenderAddress), totalInWei] })
      }

      // Execute airdrop
      await writeContractAsync({
        abi: tsenderAbi,
        address: getAddress(tSenderAddress),
        functionName: "airdropERC20",
        args: [getAddress(tokenAddress), recipientList, amountList, totalInWei],
      })

      alert("🎉 Airdrop successful!")
    } catch (err: any) {
      console.error(err)
      alert(`Transaction failed: ${err?.message || "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  // ----------------- UI -----------------
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">ERC20 Token Airdrop</h2>
        <p className="text-gray-600">Send tokens to multiple addresses in one transaction</p>
      </div>

      <form onSubmit={handleSubmit}>
        <InputField label="Token Address" placeholder="0x..." value={tokenAddress} onChange={setTokenAddress} error={errors.tokenAddress} />

        <InputField
          label="Recipients (separated by commas or new lines)"
          placeholder={`0x742d35Cc6634C0532925a3b844Bc454e4438f44e
0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed`}
          value={recipients}
          onChange={setRecipients}
          error={errors.recipients}
          type="textarea"
        />

        <InputField
          label="Amounts (separated by commas or new lines)"
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
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
        >
          {isLoading && <span className="loader mr-2"></span>}
          {isLoading ? "Processing..." : "Send Tokens"}
        </button>
      </form>

      {tokenAddress && tokenDetails.symbol && (
        <div className="mt-6 p-4 border rounded-md bg-gray-50 text-gray-700">
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
