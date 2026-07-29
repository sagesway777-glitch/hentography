import { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "Hentography - Read Manga Online Free | Latest Chapters & Updates",
  description: "Read thousands of manga chapters online for free. Discover new manga, track your reading progress, and join our community of manga enthusiasts.",
  keywords: ["manga", "read manga online", "free manga", "manga reader", "latest chapters", "manga updates"],
  authors: [{ name: "Hentography" }],
  openGraph: {
    title: "Hentography - Read Manga Online Free",
    description: "Read thousands of manga chapters online for free. Discover new manga, track your reading progress.",
    type: "website",
    locale: "en_US",
    siteName: "Hentography",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hentography - Read Manga Online Free",
    description: "Read thousands of manga chapters online for free.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
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
          colorPrimary: "#6366f1",
          colorBackground: "#0f172a",
          borderRadius: "0.75rem",
        },
        elements: {
          card: "bg-slate-900 border border-slate-800 shadow-2xl",
          headerTitle: "text-white font-bold",
          headerSubtitle: "text-slate-400",
          socialButtonsBlockButton: "bg-slate-800 border-slate-700 text-white hover:bg-slate-700",
          formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700",
          footerActionLink: "text-indigo-400 hover:text-indigo-300",
        },
      }}
    >
      <html lang="en" className="dark">
        <body className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30">
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
