// src/app/layout.tsx
import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "yield.mullet — DeFi Mullet Hackathon",
  description: "Business in the front, yield in the back.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0a0a0f" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
