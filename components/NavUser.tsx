import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import NavUserMenu from "./NavUserMenu";

export default async function NavUser({ dark = false }: { dark?: boolean }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className={`text-sm tracking-wider uppercase transition-colors ${
          dark
            ? "text-white/70 hover:text-white"
            : "text-stone-500 hover:text-stone-900"
        }`}
      >
        Sign In
      </Link>
    );
  }

  const isAdmin = user.app_metadata?.role === "admin";
  const initials = (user.email ?? "?")[0].toUpperCase();
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

  return (
    <NavUserMenu
      initials={initials}
      avatarUrl={avatarUrl}
      isAdmin={isAdmin}
      dark={dark}
    />
  );
}
