import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/settings";
import { redirect } from "next/navigation";
import { logout } from "@/actions/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "admin") {
    redirect("/login");
  }

  const settings = await getSiteSettings();
  const initials = (user.email ?? "?")[0].toUpperCase();
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Top nav */}
      <nav className="border-b border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-6 flex h-14 items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-base tracking-widest uppercase font-light text-stone-900 dark:text-stone-100"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {settings.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logo_url} alt={settings.site_name} className="h-8 w-auto object-contain" />
              )}
              {settings.site_name}
            </Link>
            {/* Divider */}
            <span className="text-stone-300 dark:text-stone-700">|</span>
            <span className="text-xs tracking-[0.2em] uppercase text-stone-400 dark:text-stone-500">
              Admin
            </span>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="text-xs tracking-widest uppercase text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              Posts
            </Link>
            <Link
              href="/admin/posts/new"
              className="text-xs tracking-widest uppercase text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              New Post
            </Link>
            <Link
              href="/admin/settings"
              className="text-xs tracking-widest uppercase text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              Settings
            </Link>
            <Link
              href="/"
              className="text-xs tracking-widest uppercase transition-colors"
              style={{ color: "var(--color-accent)" }}
            >
              View Site →
            </Link>

            {/* Avatar */}
            <div className="flex items-center gap-3 pl-4 border-l border-stone-200 dark:border-stone-700">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-medium overflow-hidden flex-shrink-0"
                style={{ background: "var(--color-accent)" }}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <span className="text-xs text-stone-400 dark:text-stone-500 hidden sm:block max-w-32 truncate">
                {user.email}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-xs tracking-widest uppercase text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                >
                  Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
