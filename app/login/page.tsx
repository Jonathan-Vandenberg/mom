"use client";

import { useActionState } from "react";
import { login, signup } from "@/actions/auth";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const inputClass =
  "block w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-2.5 text-stone-900 dark:text-stone-100 text-sm placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-colors";

function LoginForm() {
  const searchParams = useSearchParams();
  const unauthorizedError = searchParams.get("error") === "unauthorized";

  const [loginState, loginAction, loginPending] = useActionState(login, null);
  const [signupState, signupAction, signupPending] = useActionState(signup, null);

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1
            className="text-2xl sm:text-3xl font-light text-stone-900 dark:text-stone-100"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Sign in
          </h1>
          <p className="mt-2 text-sm text-stone-400 dark:text-stone-500 tracking-wide">
            Access the admin panel
          </p>
        </div>

        {unauthorizedError && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-100 dark:border-rose-900 p-3 text-sm text-rose-600 dark:text-rose-400">
            You don&apos;t have admin access. Contact an administrator.
          </div>
        )}

        <form action={loginAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs tracking-widest uppercase text-stone-400 dark:text-stone-500 mb-2">
              Email
            </label>
            <input id="email" name="email" type="email" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs tracking-widest uppercase text-stone-400 dark:text-stone-500 mb-2">
              Password
            </label>
            <input id="password" name="password" type="password" required className={inputClass} />
          </div>

          {loginState?.error && (
            <p className="text-sm text-rose-500">{loginState.error}</p>
          )}

          <button
            type="submit"
            disabled={loginPending}
            className="w-full rounded-full py-2.5 text-xs tracking-widest uppercase text-white transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: "var(--color-accent)" }}
          >
            {loginPending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200 dark:border-stone-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 text-stone-400 dark:text-stone-500 tracking-widest uppercase" style={{ background: "var(--background)" }}>
              or create account
            </span>
          </div>
        </div>

        <form action={signupAction} className="space-y-4">
          <input name="email" type="email" required placeholder="Email" className={inputClass} />
          <input name="password" type="password" required placeholder="Password" className={inputClass} />

          {signupState?.error && (
            <p className="text-sm text-rose-500">{signupState.error}</p>
          )}
          {signupState?.success && (
            <p className="text-sm text-emerald-600">{signupState.success}</p>
          )}

          <button
            type="submit"
            disabled={signupPending}
            className="w-full rounded-full border border-stone-200 dark:border-stone-700 py-2.5 text-xs tracking-widest uppercase text-stone-500 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 transition-colors disabled:opacity-50"
          >
            {signupPending ? "Creating…" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
