import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, Home } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found | HentaiPlus",
  description: "The page you are looking for could not be found.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="text-center space-y-8 relative z-10 max-w-2xl">
        <h1 className="text-[150px] font-black leading-none bg-gradient-to-br from-indigo-400 via-purple-400 to-rose-400 text-transparent bg-clip-text animate-pulse">
          404
        </h1>
        
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white">Oops! Page not found.</h2>
          <p className="text-slate-400 text-lg">
            It seems the page you&apos;re looking for has vanished into the void, or maybe it was never here to begin with.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link href="/">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
              <Home className="w-5 h-5 mr-2" />
              Return Home
            </Button>
          </Link>
          <Link href="/search">
            <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 w-full sm:w-auto">
              <Search className="w-5 h-5 mr-2" />
              Browse Manga
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
