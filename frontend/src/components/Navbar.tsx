"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isLoading, signOut } = useAuth();

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Products", href: "/products" },
    { name: "Diagnostics", href: "/diagnostics" },
  ];

  if (user) {
    navLinks.push({ name: "Dashboard", href: "/dashboard" });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm transition-colors duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <svg
              className="h-8 w-8 text-mantis-green"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M50 15C55 25 75 35 75 55C75 75 60 85 50 85C40 85 25 75 25 55C25 35 45 25 50 15Z"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M50 15V85"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray="4 4"
              />
              <circle cx="50" cy="30" r="7" fill="currentColor" />
              <path
                d="M45 25C40 20 38 12 38 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M55 25C60 20 62 12 62 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <span className="font-display text-xl font-bold tracking-wider text-slate-900 dark:text-slate-50">
              MANTIS
            </span>
          </Link>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex h-full items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative flex h-full items-center text-sm font-medium transition-colors ${
                  isActive
                    ? "text-mantis-green font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {link.name}
                {isActive && (
                  <span className="absolute bottom-0 left-0 h-[3px] w-full rounded-t-full bg-mantis-green" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Search, Notification, Profile */}
        <div className="flex items-center gap-4">
          {/* Search Box */}
          <div className="relative hidden sm:block w-60 md:w-80">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-4 w-4 text-slate-400 dark:text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="search"
              placeholder="Search products, manuals, or issues..."
              className="w-full rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 py-1.5 pl-9 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-mantis-green dark:focus:border-mantis-green focus:bg-white dark:focus:bg-slate-950 dark:text-white focus:ring-1 focus:ring-mantis-green"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <button className="relative rounded-full p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* Profile / Auth */}
          {isLoading ? (
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="hidden sm:block text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                {user.email}
              </Link>
              <button
                onClick={signOut}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Logout
              </button>
              <div className="h-8 w-8 rounded-full bg-mantis-green flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {user.email?.charAt(0).toUpperCase() || "U"}
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-mantis-green px-4 py-1.5 text-xs font-semibold text-white hover:bg-mantis-green-dark transition-colors shadow-sm"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
