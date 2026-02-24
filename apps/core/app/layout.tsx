import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrueStack - Digital Identity & KYC Solutions",
  description: "TrueStack provides secure digital identity verification and KYC solutions for businesses in Malaysia.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
