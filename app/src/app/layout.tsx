import type { Metadata, Viewport } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const caprasimo = Caprasimo({
  variable: "--font-caprasimo",
  subsets: ["latin"],
  weight: "400",
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ambag",
  description: "Group project task tracker — claim, prove, review, swap.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${caprasimo.variable} ${figtree.variable}`}>
      <body className="min-h-dvh bg-neutral-200 antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
