import Link from "next/link";
import { Mail, Globe } from "lucide-react";

function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-[#7C5CFF] to-[#9376FF] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-[#7C5CFF] to-[#9376FF] bg-clip-text text-transparent">
                HentaiPlus
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              Your ultimate manga reading platform. Read thousands of manga chapters online for free. 
              Discover new stories, track your progress, and join our community of manga enthusiasts.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <Globe className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Browse</h4>
            <ul className="space-y-3">
              <li><Link href="/search?status=ongoing" className="text-slate-400 hover:text-white text-sm transition-colors">Trending</Link></li>
              <li><Link href="/search?type=manga" className="text-slate-400 hover:text-white text-sm transition-colors">Manga</Link></li>
              <li><Link href="/search?status=completed" className="text-slate-400 hover:text-white text-sm transition-colors">Completed</Link></li>
              <li><Link href="/search" className="text-slate-400 hover:text-white text-sm transition-colors">New Releases</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Support</h4>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-slate-400 hover:text-white text-sm transition-colors">About Us</Link></li>
              <li><Link href="/terms" className="text-slate-400 hover:text-white text-sm transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-slate-400 hover:text-white text-sm transition-colors">Privacy Policy</Link></li>
              <li><Link href="/dmca" className="text-slate-400 hover:text-white text-sm transition-colors">DMCA</Link></li>
              <li><Link href="/contact" className="text-slate-400 hover:text-white text-sm transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            © {new Date().getFullYear()} HentaiPlus. All rights reserved.
          <p className="text-slate-600 text-xs">
            This site does not store any files on our server. We only index links to publicly available content.
          </p>
        </div>
      </div>
    </footer>
  );
}

export { Footer };
