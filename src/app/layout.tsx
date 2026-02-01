import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { getApiKeysByUser } from "@/db/queries";
import { getSession } from "@/lib/auth";
import { AdminApiKeyGuard } from "@/components/admin-api-key-guard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Treebot",
  description: "Branching AI chat interface",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const needsApiKeys = Boolean(
    session?.isAdmin && getApiKeysByUser(session.sub).length === 0
  );

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AdminApiKeyGuard active={needsApiKeys} />
        {children}
      </body>
    </html>
  );
}
