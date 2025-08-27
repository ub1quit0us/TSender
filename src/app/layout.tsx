import type { Metadata } from "next";
import {ReactNode} from "react";
import "./globals.css";
import { Providers } from "./providers";


export const metadata: Metadata = {
  title: "Tsender"
};

export default function RootLayout(props: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <Providers>{props.children}</Providers>
      </body>
    </html>
  );
}
