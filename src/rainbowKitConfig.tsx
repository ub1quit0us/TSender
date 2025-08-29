"use client"

import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
// EDIT CHAINS BELOW
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  anvil,
  sonic
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";

export default getDefaultConfig({
  // EDIT NAME OF THE APP BELOW
  appName: 'TSender',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  // EDIT CHAINS BELOW
  // chains: [mainnet, polygon, optimism, arbitrum, base, anvil, sonic],
  chains: [mainnet, anvil],
  ssr: false, // If your dApp uses server side rendering (SSR)
});