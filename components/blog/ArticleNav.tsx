"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";

interface ArticleNavProps {
  siteName: string;
  logoUrl?: string | null;
  userSlot: ReactNode;
}

export default function ArticleNav({ siteName, logoUrl, userSlot }: ArticleNavProps) {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      // Show when scrolling up or near top; hide when scrolling down
      if (y < 60 || y < lastY.current) {
        setVisible(true);
      } else if (y > lastY.current + 6) {
        setVisible(false);
      }
      lastY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-20 h-[72px] border-b border-stone-200 dark:border-stone-800 bg-[#f5f0e8] dark:bg-stone-950 transition-transform duration-300"
      style={{ transform: visible ? "translateY(0)" : "translateY(-100%)" }}
    >
      <div className="mx-auto max-w-6xl px-6 h-full flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl tracking-widest uppercase font-light text-stone-900 dark:text-stone-100"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={siteName} className="h-10 w-auto object-contain" />
          )}
          {siteName}
        </Link>
        <Link
          href="/"
          className="text-sm tracking-wider uppercase text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
        >
          ← Articles
        </Link>
        {userSlot}
      </div>
    </header>
  );
}
