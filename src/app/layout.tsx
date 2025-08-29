import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "./providers"
import Header from "@/components/header"
import AirdropForm from "@/components/airdropForm"
import TokenTransferForm from "@/components/ui/inputFields"


export const metadata: Metadata = {
  title: "TSender",
  description: "Your optimized airdrop platform"
};

export default function RootLayout(props: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          <AirdropForm />
          {props.children}
        </Providers>
      </body>
    </html>
  );
}
