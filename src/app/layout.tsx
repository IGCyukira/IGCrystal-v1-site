import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wenturc.com"),
  title: {
    default: "IGCrystal · ViaLonga Somniviva",
    template: "%s · IGCrystal",
  },
  description: "The wind swept across the vast wilderness, shimmering with silver light, as footprints were slowly swallowed by the stars.",
  applicationName: "IGCrystal",
  keywords: [
    "IGCrystal",
    "WentUrc"
  ],
  authors: [{ name: "IGCrystal" }],
  creator: "IGCrystal",
  publisher: "IGCrystal",
  openGraph: {
    type: "website",
    url: "/",
    title: "IGCrystal · ViaLonga Somniviva",
    description: "The wind swept across the vast wilderness, shimmering with silver light, as footprints were slowly swallowed by the stars.",
    siteName: "IGCrystal",
    images: [
      {
        url: "/logo.svg",
        width: 512,
        height: 512,
        alt: "IGCrystal Logo",
      },
    ],
    locale: "zh_CN",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/favicon.ico" }],
  },
  category: "website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
