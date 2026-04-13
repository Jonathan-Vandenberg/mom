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
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: settings.site_name,
    },
    formatDetection: {
      telephone: false,
    },
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
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-W7JCMVS3');`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link href={googleFontsUrl} rel="stylesheet" />

        {/* PWA — iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={settings.site_name} />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

        {/* PWA — Android/general */}
        <meta name="theme-color" content={settings.accent_color} />
        <meta name="mobile-web-app-capable" content="yes" />
        <style>{`
          :root {
            --font-heading: '${settings.font_heading}', Georgia, serif;
            --font-body: '${settings.font_body}', system-ui, sans-serif;
            --color-accent: ${settings.accent_color};
            --background: ${settings.background_color};
          }
        `}</style>
      </head>
      <body className="min-h-full flex flex-col antialiased">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-W7JCMVS3"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
