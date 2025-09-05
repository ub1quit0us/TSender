"use client"

import { useState, useMemo } from "react"
import InputField from "@/components/ui/inputFields"
import { chainsToTSender, tsenderAbi, erc20Abi } from "@/constants"
import { useChainId, useConfig, useAccount, useWriteContract } from "wagmi"
import { readContract, waitForTransactionReceipt } from "@wagmi/core"
import { getAddress } from "viem"
import { calculateTotal } from "@/utils"

export default function AirdropForm() {
  const [tokenAddress, setTokenAddress] = useState("")
  const [recipients, setRecipients] = useState("")
  const [amounts, setAmounts] = useState("")
  const [errors, setErrors] = useState({ tokenAddress: "", recipients: "", amounts: "" })
  const [isLoading, setIsLoading] = useState(false)

  const chainId = useChainId()
  const config = useConfig()
  const account = useAccount()
  const { writeContractAsync } = useWriteContract()

  const total = useMemo(() => calculateTotal(amounts), [amounts])

  // ----------------- Helpers -----------------

  const isValidEthereumAddress = (address: string) => /^0x[a-fA-F0-9]{40}$/.test(address)
  const isValidAmount = (amount: string) => /^\d+(\.\d+)?$/.test(amount) && parseFloat(amount) > 0

  const parseList = (raw: string) =>
    raw
      .split(/[\n,]+/)
      .map(item => item.trim())
      .filter(Boolean)

  // ----------------- Contract Reads -----------------

  async function getApprovedAmount(token: string, spender: string): Promise<bigint> {
    try {
      return (await readContract(config, {
        abi: erc20Abi,
        address: getAddress(token),
        functionName: "allowance",
        args: [account.address!, getAddress(spender)],
      })) as bigint
    } catch (error) {
      console.error("Error getting allowance:", error)
      return BigInt(0)
    }
  }

  async function getTokenDecimals(token: string): Promise<number> {
    try {
      return Number(
        await readContract(config, {
          abi: erc20Abi,
          address: getAddress(token),
          functionName: "decimals",
        })
      )
    } catch (error) {
      console.error("Error getting decimals:", error)
      return 18 // fallback
    }
  }

  // ----------------- Validation -----------------

  function validateForm(): boolean {
    const newErrors = { tokenAddress: "", recipients: "", amounts: "" }
    let isValid = true

    if (!tokenAddress) {
      newErrors.tokenAddress = "Token address is required"
      isValid = false
    } else if (!isValidEthereumAddress(tokenAddress)) {
      newErrors.tokenAddress = "Invalid ERC20 token address"
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

  // ----------------- Submission -----------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const tSenderAddress = chainsToTSender[chainId]?.tsender
      if (!tSenderAddress) throw new Error("Unsupported chain: no TSender contract")
      if (!account.address) throw new Error("Please connect your wallet")

      const decimals = await getTokenDecimals(tokenAddress)
      const totalInWei = BigInt(Math.floor(total * 10 ** decimals))

      console.log("Total in wei:", totalInWei.toString())
      console.log("Decimals:", decimals)

      const approvedAmount = await getApprovedAmount(tokenAddress, tSenderAddress)
      console.log("Approved:", approvedAmount.toString())
      console.log("Required:", totalInWei.toString())

      if (approvedAmount < totalInWei) {
        console.log("Approving...")
        const approvalHash = await writeContractAsync({
          abi: erc20Abi,
          address: getAddress(tokenAddress),
          functionName: "approve",
          args: [getAddress(tSenderAddress), totalInWei],
        })

        console.log("Approval hash:", approvalHash)
        await waitForTransactionReceipt(config, { hash: approvalHash })
        alert("Approval successful! You can now execute the airdrop.")
      } else {
        alert("Your token allowance is already sufficient.")
      }
    } catch (error: any) {
      console.error("Approval failed:", error)
      alert(`Approval failed: ${error?.message || "Unknown error"}`)
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
        <InputField
          label="Token Address"
          placeholder="e.g., 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"
          value={tokenAddress}
          onChange={setTokenAddress}
          error={errors.tokenAddress}
        />

        <InputField
          label="Recipients (separated by commas or new lines)"
          placeholder={`0x742d35Cc6634C0532925a3b844Bc454e4438f44e\n0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed`}
          value={recipients}
          onChange={setRecipients}
          error={errors.recipients}
          type="textarea"
        />

        <InputField
          label="Amounts (separated by commas or new lines)"
          placeholder={`10.5\n25.0\n3.75`}
          value={amounts}
          onChange={setAmounts}
          error={errors.amounts}
          type="textarea"
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isLoading ? "Processing..." : "Send Tokens"}
        </button>
      </form>
    </div>
  )
}
