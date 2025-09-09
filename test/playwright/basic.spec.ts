import basicSetup from '../wallet-setup/basic.setup'
import { testWithSynpress } from '@synthetixio/synpress'
import { MetaMask, metaMaskFixtures } from "@synthetixio/synpress/playwright"

const test = testWithSynpress(metaMaskFixtures(basicSetup))
const { expect } = test

test('has title', async ({ page }) => {
  await page.goto('http://localhost:3000/')
  await expect(page).toHaveTitle(/TSender/)
});


test('should show the airdrop form when connected, otherwise not', async ({ page, context, metamaskPage, extensionId }) => {
  await page.goto('http://localhost:3000/')
  await expect(page.getByText('Connect Wallet')).toBeVisible()

  const metamask = new MetaMask(context, metamaskPage, basicSetup.walletPassword, extensionId)
  await page.getByTestId('rk-connect-button').click()
  await page.getByTestId('rk-wallet-option-metaMask').waitFor({
    state: 'visible',
    timeout: 30000
  })
  await page.getByTestId('rk-wallet-option-metaMask').click()
  await metamask.connectToDapp()

  await expect(page.getByText("Token Address")).toBeVisible()
  await expect(page.getByText("Recipients")).toBeVisible()
  await expect(page.getByText("Amounts")).toBeVisible()
});