import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";
import { AppProvider }    from "@/contexts/AppContext";
import { Toaster }        from "react-hot-toast";

const inter = Inter({
  subsets:  ["latin"],
  variable: "--font-inter",
  display:  "swap",
});

export const metadata: Metadata = {
  title:       "Eden Pods",
  description: "Throw a seed pod. Grow a food forest. On Algorand.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,maximum-scale=1"
        />
      </head>
      <body>
        <WalletProvider>
          <AppProvider>
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background:   "#14532d",
                  color:        "#f0fdf4",
                  borderRadius: "14px",
                  fontSize:     "15px",
                },
              }}
            />
          </AppProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
