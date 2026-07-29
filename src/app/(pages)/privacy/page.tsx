import { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Hentography",
  description: "Privacy policy for Hentography manga reading platform.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        <div className="prose prose-invert max-w-none space-y-6 text-slate-300">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
            <p>We collect information you provide directly to us, such as when you create an account, update your profile, or contact us.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
            <p>We use the information we collect to provide, maintain, and improve our services, communicate with you, and personalize your experience.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Data Security</h2>
            <p>We implement appropriate technical and organizational security measures to protect your personal information.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Cookies</h2>
            <p>We use cookies and similar tracking technologies to track activity on our service and hold certain information.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Third-Party Services</h2>
            <p>We may employ third-party companies and services to facilitate our service, provide the service on our behalf, or assist us in analyzing how our service is used.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at privacy@hentography.com</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
