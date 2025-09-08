
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, optimism, arbitrum, base, anvil, sonic } from 'wagmi/chains';

export default getDefaultConfig({
  appName: 'TSender',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [mainnet, anvil],
  ssr: false
});