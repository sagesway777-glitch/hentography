import { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "About | HentaiPlus",
  description: "About HentaiPlus manga reading platform.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-8">About HentaiPlus</h1>
        <div className="prose prose-invert max-w-none space-y-6 text-slate-300">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
            <p>HentaiPlus was created with a simple mission: to provide manga enthusiasts with the best reading experience possible. We believe that everyone should have access to their favorite manga titles, and we strive to make reading manga as enjoyable and accessible as possible.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Features</h2>
            <p>Our platform offers a wide range of features designed to enhance your reading experience:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Thousands of manga titles available</li>
              <li>Multiple reading modes (vertical, horizontal, webtoon)</li>
              <li>Personalized reading lists and bookmarks</li>
              <li>Community features including comments and ratings</li>
              <li>Mobile-friendly design</li>
              <li>Fast loading and optimized images</li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Contact</h2>
            <p>We&apos;d love to hear from you! If you have any questions, suggestions, or feedback, please reach out to us at:</p>
            <p>Email: contact@hentaiplus.com</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
