import { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "DMCA | Hentography",
  description: "DMCA policy for Hentography manga reading platform.",
};

export default function DMCAPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-8">DMCA Notice</h1>
        <div className="prose prose-invert max-w-none space-y-6 text-slate-300">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">DMCA Takedown Policy</h2>
            <p>Hentography respects the intellectual property rights of others and expects its users to do the same. In accordance with the Digital Millennium Copyright Act (DMCA), we will respond to notices of alleged copyright infringement.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">How to Submit a DMCA Notice</h2>
            <p>If you believe that your copyrighted work has been copied in a way that constitutes copyright infringement, please provide our designated copyright agent with the following information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>A physical or electronic signature of a person authorized to act on behalf of the owner of the copyright interest</li>
              <li>A description of the copyrighted work that you claim has been infringed</li>
              <li>A description of where the material that you claim is infringing is located on the service</li>
              <li>Your address, telephone number, and email address</li>
              <li>A statement that you have a good faith belief that the disputed use is not authorized</li>
              <li>A statement that the information in the notification is accurate</li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Contact Information</h2>
            <p>DMCA notices should be sent to our designated copyright agent at: dmca@hentography.com</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
