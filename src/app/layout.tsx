import { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "HentaiPlus - Read Manga Online Free | Latest Chapters & Updates",
  description:
    "Read thousands of manga chapters online for free on HentaiPlus. Discover new manga, track your reading progress, and join our community.",
  keywords: ["manga", "read manga online", "free manga", "manga reader", "latest chapters", "HentaiPlus"],
  authors: [{ name: "HentaiPlus" }],
  openGraph: {
    title: "HentaiPlus - Read Manga Online Free",
    description: "Read thousands of manga chapters online for free. Discover new manga, track your reading progress.",
    type: "website",
    locale: "en_US",
    siteName: "HentaiPlus",
  },
  twitter: {
    card: "summary_large_image",
    title: "HentaiPlus - Read Manga Online Free",
    description: "Read thousands of manga chapters online for free.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#7C5CFF",
          colorBackground: "#090B16",
          borderRadius: "0.75rem",
        },
        elements: {
          card: "shadow-2xl",
          headerTitle: "text-white font-bold",
          headerSubtitle: "text-slate-400",
          socialButtonsBlockButton: "border text-white",
          formButtonPrimary: "hover:opacity-90",
          footerActionLink: "hover:opacity-80",
        },
      }}
    >
      <html lang="en" className="dark">
        <body
          className="min-h-screen flex flex-col antialiased"
          style={{
            background: "var(--bg-base)",
            color: "var(--text)",
          }}
        >
          <Providers>
            <Navbar />
            <main className="flex-1 pt-16">{children}</main>
            <Footer />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
