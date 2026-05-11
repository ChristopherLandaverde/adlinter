import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://adlint.dev"),
  title: {
    default: "AdLint — Free Ad-Tech Auditor",
    template: "%s | AdLint",
  },
  description:
    "Free, privacy-first audit suite for ad-tech tracking. Analyze GTM, Google Ads, Meta Pixel, and TikTok Pixel in 60 seconds. Runs entirely in your browser.",
  keywords: [
    "Google Tag Manager audit",
    "Google Ads audit",
    "Meta Pixel audit",
    "TikTok Pixel audit",
    "GTM linter",
    "conversion tracking audit",
    "ad tech audit",
  ],
  authors: [{ name: "AdLint" }],
  openGraph: {
    type: "website",
    url: "https://adlint.dev",
    siteName: "AdLint",
    title: "AdLint — Free Ad-Tech Auditor",
    description:
      "Audit GTM, Google Ads, Meta Pixel, and TikTok Pixel in 60 seconds. Runs entirely in your browser.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "AdLint — Free Ad-Tech Auditor",
    description:
      "Audit GTM, Google Ads, Meta Pixel, and TikTok Pixel in 60 seconds.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@500,600,700&f[]=instrument-sans@400,500,600&display=swap"
        />
      </head>
      <body className="bg-bg font-body text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
