"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useUser, SignOutButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bookmark, Search, Menu, X, Flame, Home, Library } from "lucide-react";
import { NotificationsMenu } from "@/components/notifications-menu";
import { useRouter } from "next/navigation";

function Navbar() {
  const { isSignedIn } = useUser();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 shadow-lg shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="relative w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Hentography
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all"
              >
                <Home className="w-4 h-4" />
                Home
              </Link>
              <Link
                href="/search"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all"
              >
                <Library className="w-4 h-4" />
                Browse
              </Link>
              <Link
                href="/search?sortBy=trending"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all"
              >
                <Flame className="w-4 h-4" />
                Trending
              </Link>
            </nav>
          </div>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="w-full relative">
              <Input
                type="text"
                placeholder="Search manga..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 pr-10"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* User Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isSignedIn ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    <Bookmark className="w-4 h-4 mr-1.5" />
                    Dashboard
                  </Button>
                </Link>
                <NotificationsMenu />
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8",
                      userButtonPopoverCard: "bg-slate-900 border border-slate-800 shadow-2xl",
                      userButtonPopoverActionButton: "text-slate-300 hover:bg-slate-800 hover:text-white",
                      userButtonPopoverActionButtonText: "text-slate-300",
                      userButtonPopoverFooter: "hidden",
                    },
                  }}
                />
              </>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800 space-y-4">
            <form onSubmit={handleSearch}>
              <Input
                type="text"
                placeholder="Search manga..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/50 border-slate-700 text-slate-100"
              />
            </form>
            <nav className="flex flex-col gap-1">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50">Home</Link>
              <Link href="/search" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50">Browse</Link>
              <Link href="/search?sortBy=trending" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50">Trending</Link>
              {isSignedIn ? (
                <>
                  <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50">Dashboard</Link>
                  <SignOutButton redirectUrl="/">
                    <button className="px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-slate-800/50 text-left">
                      Sign Out
                    </button>
                  </SignOutButton>
                </>
              ) : (
                <>
                  <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50">Sign In</Link>
                  <Link href="/sign-up" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:bg-slate-800/50">Get Started</Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

export { Navbar };
