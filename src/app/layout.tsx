import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Topbar } from "@/components/Topbar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mangateque",
  description: "Ma bibliothèque de mangas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="font-sans">
        <Topbar />
        <main className="mx-auto max-w-7xl px-4 pt-5 pb-10 sm:px-8 sm:pt-7 sm:pb-14 lg:px-12">{children}</main>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--cream)",
              border: "1px solid var(--border-2)",
            },
          }}
        />
      </body>
    </html>
  );
}
