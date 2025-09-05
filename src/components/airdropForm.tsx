"use client"

import { useState, useMemo } from 'react'
import InputField from "@/components/ui/inputFields"
import { chainsToTSender, tsenderAbi, erc20Abi } from '@/constants'
import { useChainId, useConfig, useAccount, useWriteContract } from 'wagmi'
import { readContract, waitForTransactionReceipt } from '@wagmi/core'
import { ChainDisconnectedError, getAddress } from 'viem'
import { calculateTotal } from '@/utils'

export default function AirdropForm() {
  const [tokenAddress, setTokenAddress] = useState('')
  const [recipients, setRecipients] = useState('')
  const [amounts, setAmounts] = useState('')
  const [errors, setErrors] = useState({
    tokenAddress: '',
    recipients: '',
    amounts: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const chainId = useChainId()
  const config = useConfig()
  const account = useAccount()
  const total: number = useMemo(() => calculateTotal(amounts), [amounts])
  const { data: hash, isPending, writeContractAsync } = useWriteContract()

  // Get approved amount for TSender to spend user's tokens
  async function getApprovedAmount(tSenderAddress: string | null): Promise<bigint> {
    if (!tSenderAddress) {
      alert("No address found, please use a supported chain.")
      return BigInt(0)
    }

    if (!isValidEthereumAddress(tokenAddress)) {
      throw new Error("Invalid token address.");
    }

    try {
      const normalizedTSender = getAddress(tSenderAddress);
      const normalizedToken = getAddress(tokenAddress);

      const response = await readContract(config, {
        abi: erc20Abi,
        address: normalizedToken,
        functionName: 'allowance',
        args: [account.address!, normalizedTSender]
      });
      return response as bigint;
    } catch (error) {
      console.error('Error getting allowance:', error);
      return BigInt(0);
    }
  }

  ////////////////////////////// FORMAT VALIDATIONS //////////

  // Get token decimals, default to 18 decimals if unable to read

  async function getTokenDecimals(): Promise<number> {
    if (!isValidEthereumAddress(tokenAddress)) {
      throw new Error("Invalid token address");
    }

    try {
      const response = await readContract(config, {
        abi: erc20Abi,
        address: tokenAddress as `0x${string}`,
        functionName: 'decimals',
      });
      return Number(response);
    } catch (error) {
      console.error('Error getting decimals:', error);
      return 18;
    }
  }

  // Validate Ethereum address format
  const isValidEthereumAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Validate amount format (positive numbers)
  const isValidAmount = (amount: string) => {
    return /^\d+(\.\d+)?$/.test(amount) && parseFloat(amount) > 0;
  };

  const validateForm = () => {
    const newErrors = {
      tokenAddress: '',
      recipients: '',
      amounts: ''
    };

    let isValid = true;

    // Validate token address
    if (!tokenAddress) {
      newErrors.tokenAddress = 'Token address is required';
      isValid = false;
    } else if (!isValidEthereumAddress(tokenAddress)) {
      newErrors.tokenAddress = 'Invalid ERC20 token address';
      isValid = false;
    }

    // Process and validate recipients
    const recipientList = recipients
      .split(/[\n,]+/)
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);

    if (recipientList.length === 0) {
      newErrors.recipients = 'At least one recipient is required';
      isValid = false;
    } else {
      const invalidRecipients = recipientList.filter(addr => !isValidEthereumAddress(addr));
      if (invalidRecipients.length > 0) {
        newErrors.recipients = `Invalid Ethereum address(es): ${invalidRecipients.join(', ')}`;
        isValid = false;
      }
    }

    // Process and validate amounts
    const amountList = amounts
      .split(/[\n,]+/)
      .map(amount => amount.trim())
      .filter(amount => amount.length > 0);

    if (amountList.length === 0) {
      newErrors.amounts = 'At least one amount is required';
      isValid = false;
    } else {
      const invalidAmounts = amountList.filter(amount => !isValidAmount(amount));
      if (invalidAmounts.length > 0) {
        newErrors.amounts = `Invalid amount(s): ${invalidAmounts.join(', ')}`;
        isValid = false;
      }
    }

    // Check if recipients and amounts counts match
    if (recipientList.length !== amountList.length && recipientList.length > 0 && amountList.length > 0) {
      newErrors.amounts = `Number of recipients (${recipientList.length}) must match number of amounts (${amountList.length})`;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  ///////////////////////////////////////////////////////////////////////////////////

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (validateForm()) {
      try {
        const tSenderAddress = chainsToTSender[chainId]?.tsender;
        if (!tSenderAddress) {
          alert("No TSender address found for this chain. Please use a supported chain.");
          setIsLoading(false);
          return;
        }

        if (!account.address) {
          alert("Please connect your wallet first.");
          setIsLoading(false);
          return;
        }

        // Get token decimals and convert total to wei
        const decimals = await getTokenDecimals();
        const totalInWei = BigInt(Math.floor(total * 10 ** decimals));

        console.log("Total in wei:", totalInWei.toString());
        console.log("Decimals:", decimals);

        const approvedAmount = await getApprovedAmount(tSenderAddress);
        console.log("Approved amount:", approvedAmount.toString());
        console.log("Total needed:", totalInWei.toString());


        const normalizedTokenAddress = getAddress(tokenAddress)
        const normalizedTSenderAddress = getAddress(tSenderAddress)

        if (approvedAmount < totalInWei) {
          console.log("Approving...");
          const approvalHash = await writeContractAsync({
            abi: erc20Abi,
            address: getAddress(tokenAddress),
            functionName: 'approve',
            args: [getAddress(tSenderAddress), totalInWei]
          });

          console.log("Approval hash:", approvalHash);

          const approvalReceipt = await waitForTransactionReceipt(config, {
            hash: approvalHash
          });
          console.log("Approval confirmed:", approvalReceipt);
          alert("Approval successful! You can now execute the airdrop.");
        } else {
          console.log("Already approved sufficient amount");
          alert("Your token allowance is already sufficient for this airdrop.");
        }

      } catch (error: any) {
        console.error('Approval failed:', error);
        alert(`Approval failed: ${error?.message || error?.toString() || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

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
          placeholder="0x742d35Cc6634C0532925a3b844Bc454e4438f44e&#10;0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"
          value={recipients}
          onChange={setRecipients}
          error={errors.recipients}
          type="textarea"
        />

        <InputField
          label="Amounts (separated by commas or new lines)"
          placeholder="10.5&#10;25.0&#10;3.75"
          value={amounts}
          onChange={setAmounts}
          error={errors.amounts}
          type="textarea"
        />

        <button
          onClick={handleSubmit}
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isLoading ? 'Processing...' : 'Send Tokens'}
        </button>
      </form>
    </div>
  );
}