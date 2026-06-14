"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true);
      const storedTheme = localStorage.getItem("theme");
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (storedTheme === "dark" || (!storedTheme && systemDark)) {
        setTheme("dark");
      }
    });
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Prevent hydration mismatch layout shifts
  if (!mounted) {
    return <div className="w-14 h-7 rounded-full bg-slate-200 border border-slate-300/50" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className={`relative w-14 h-7 rounded-full p-1 cursor-pointer select-none transition-all duration-500 ease-in-out border hover:scale-105 active:scale-95 shadow-inner flex items-center overflow-hidden group ${
        isDark
          ? "bg-slate-900 border-slate-700/60 shadow-slate-950/80"
          : "bg-sky-200 border-sky-300 shadow-sky-300/30"
      }`}
    >
      {/* Background Track Elements */}
      
      {/* Clouds (Light Mode) */}
      <span
        className={`absolute right-2.5 top-1.5 w-3 h-1.5 bg-white/70 rounded-full transition-all duration-500 ease-out ${
          isDark ? "translate-y-6 opacity-0" : "translate-y-0 opacity-100"
        }`}
      />
      <span
        className={`absolute right-1 bottom-1 w-4 h-2 bg-white/80 rounded-full transition-all duration-500 ease-out delay-75 ${
          isDark ? "translate-y-6 opacity-0" : "translate-y-0 opacity-100"
        }`}
      />

      {/* Stars (Dark Mode) */}
      <span
        className={`absolute left-3.5 top-1.5 w-1 h-1 bg-white rounded-full transition-all duration-500 ease-out ${
          isDark ? "scale-100 opacity-100 animate-pulse" : "scale-0 opacity-0"
        }`}
      />
      <span
        className={`absolute left-1.5 bottom-1.5 w-0.5 h-0.5 bg-white rounded-full transition-all duration-500 ease-out delay-75 ${
          isDark ? "scale-100 opacity-100 animate-pulse" : "scale-0 opacity-0"
        }`}
      />
      <span
        className={`absolute left-4.5 bottom-1 w-1 h-1 bg-white/70 rounded-full transition-all duration-500 ease-out delay-150 ${
          isDark ? "scale-100 opacity-85 animate-pulse" : "scale-0 opacity-0"
        }`}
      />

      {/* Sliding Knob */}
      <div
        className={`w-5 h-5 rounded-full shadow-md flex items-center justify-center transition-all duration-500 ease-in-out transform relative z-10 ${
          isDark
            ? "translate-x-7 bg-slate-950 text-indigo-300"
            : "translate-x-0 bg-amber-400 text-amber-950"
        }`}
      >
        {/* Sun Icon (Light Mode) */}
        <svg
          className={`absolute w-3.5 h-3.5 transition-all duration-500 ease-in-out ${
            isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 2.22a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-2.22 4a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM11 17a1 1 0 11-2 0v-1a1 1 0 112 0v1zm-7.78-2.22a1 1 0 011.414-1.414l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM3 9a1 1 0 100 2h1a1 1 0 100-2H3zm2.22-4a1 1 0 010-1.414l.707-.707A1 1 0 017.35 4.3l-.707.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
          <circle cx="10" cy="10" r="3.5" />
        </svg>

        {/* Moon Icon (Dark Mode) */}
        <svg
          className={`absolute w-3.5 h-3.5 transition-all duration-500 ease-in-out ${
            isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </div>
    </button>
  );
}
