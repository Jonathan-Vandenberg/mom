"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { logout } from "@/actions/auth";
import Image from "next/image";

interface NavUserMenuProps {
  initials: string;
  avatarUrl?: string;
  isAdmin: boolean;
  dark?: boolean;
}

export default function NavUserMenu({
  initials,
  avatarUrl,
  isAdmin,
  dark = false,
}: NavUserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center rounded-full transition-opacity hover:opacity-80 focus:outline-none ${
          dark ? "ring-2 ring-white/20 hover:ring-white/40" : "ring-2 ring-stone-200 dark:ring-stone-700 hover:ring-stone-300 dark:hover:ring-stone-600"
        }`}
        aria-label="User menu"
      >
        <div
          className="relative h-9 w-9 rounded-full overflow-hidden flex items-center justify-center"
          style={{ background: "var(--color-accent)" }}
        >
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Avatar" fill sizes="36px" className="object-cover" />
          ) : (
            <span className="text-white text-sm font-medium select-none">{initials}</span>
          )}
          {isAdmin && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-400 border-2 border-white dark:border-stone-900" />
          )}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-lg py-1 z-50">
          {isAdmin && (
            <>
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                <span className="text-amber-500">✦</span>
                Admin Panel
              </Link>
              <div className="border-t border-stone-100 dark:border-stone-800 my-1" />
            </>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="w-full text-left px-4 py-2 text-sm text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
