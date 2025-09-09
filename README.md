# TSender UI

**TSender UI** is a decentralized application (dApp) built during the [Cyphrin Updraft Full-Stack Development Course](https://cyphrin.io/).  
It provides a clean interface to **airdrop ERC-20 tokens** to a list of recipients with **specific amounts**, interacting with the deployed **TSender smart contract** on [Anvil](https://github.com/cyfrin/TSender).

👉 Live Demo: [ui-tsender.netlify.app](https://ui-tsender.netlify.app)  
👉 Backend contract: [TSender](https://github.com/ub1quit0us/TSender-UI)

---

## ⚠️ Important

This app only works **locally**.  
You must run [Anvil](https://book.getfoundry.sh/anvil/) with a **predetermined state** defined in `tsender-deployed.json`.  
That state includes the deployed **TSender contract** and preloaded ERC-20 balances for testing.  
Without it, the UI cannot interact with the contract.

---

## ✨ What It Does

1. **Input Form**  
   - Enter the ERC-20 token contract address  
   - Paste multiple recipient addresses (one per line or separated by a comma)

2. **Allowance & Approval**  
   - Checks the ERC-20 allowance for the TSender contract  
   - If allowance is insufficient, prompts the user to approve the required amount

3. **Airdrop Execution**  
   - Calls `airdropERC20(token, recipients[], amounts[])` on the TSender contract  
   - Distributes equal token amounts to all recipients  
   - Displays transaction confirmation status

---

## 🛠 Tech Stack

- **Framework:** Next.js 15, React 19, TypeScript  
- **Styling:** TailwindCSS, lucide-react  
- **Wallet & Blockchain:** RainbowKit, wagmi, viem  
- **Smart Contract Interactions:** ERC20 approve/allowance + TSender airdrop  
- **Testing:** Vitest (unit), Synpress + Playwright (E2E)  
- **Deployment:** Netlify

---

## 📚 Project Philosophy

- **Repetition is skill** → rebuild, redeploy often  
- **Deployment matters** → even if live UI is deployed, contract logic requires local chain  
- **Testing is non-negotiable** → unit + E2E coverage for wallet flows  
- **AI is a tool, not a crutch** → always review AI-generated code when handling funds

---
