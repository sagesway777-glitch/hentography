import { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Terms of Service | HentaiPlus",
  description: "Terms of service for HentaiPlus manga reading platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
        <div className="prose prose-invert max-w-none space-y-6 text-slate-300">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p>By accessing and using HentaiPlus, you accept and agree to be bound by the terms and provision of this agreement.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Use License</h2>
            <p>Permission is granted to temporarily use HentaiPlus for personal, non-commercial use only. This is the grant of a license, not a transfer of title.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. User Accounts</h2>
            <p>You are responsible for safeguarding the password that you use to access the service. You agree not to disclose your password to any third party.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Content</h2>
            <p>HentaiPlus does not host any content on our servers. We only index links to publicly available content hosted on third-party servers.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Disclaimer</h2>
            <p>The materials on HentaiPlus are provided on an &apos;as is&apos; basis. HentaiPlus makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Limitations</h2>
            <p>In no event shall HentaiPlus or its suppliers be liable for any damages arising out of the use or inability to use the materials on HentaiPlus.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Contact Information</h2>
            <p>If you have any questions about these Terms, please contact us at terms@hentaiplus.com</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
