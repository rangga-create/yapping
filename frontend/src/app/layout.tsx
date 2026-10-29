import type { Metadata } from "next";
import "./globals.css";
import { ApiProvider } from "@/components/api-provider";

export const metadata: Metadata = {
  title: "Yap — Just Chat.",
  description: "The fastest way to yap with your squad. Groups, DMs, reactions — zero friction.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ApiProvider>{children}</ApiProvider>
      </body>
    </html>
  );
}