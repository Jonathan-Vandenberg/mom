import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: {
      default: settings.site_name,
      template: `%s — ${settings.site_name}`,
    },
    description: settings.site_tagline,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  const headingSlug = settings.font_heading.replace(/ /g, "+");
  const bodySlug = settings.font_body.replace(/ /g, "+");
  const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${headingSlug}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=${bodySlug}:wght@300;400;500;600&display=swap`;

  const isDark = settings.color_mode === "dark";

  return (
    <html lang="en" className={`h-full${isDark ? " dark" : ""}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link href={googleFontsUrl} rel="stylesheet" />
        <style>{`
          :root {
            --font-heading: '${settings.font_heading}', Georgia, serif;
            --font-body: '${settings.font_body}', system-ui, sans-serif;
            --color-accent: ${settings.accent_color};
            --background: ${settings.background_color};
          }
        `}</style>
      </head>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
