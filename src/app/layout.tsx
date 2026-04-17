import type { Metadata } from "next";
import { Cabin_Condensed, Geist_Mono } from "next/font/google";
import "./globals.css";

const cabinCondensed = Cabin_Condensed({
  variable: "--font-cabin-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lablr",
  description: "Drop label photos for quick ingredient insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${cabinCondensed.variable} ${geistMono.variable} antialiased`}>
        <div className="min-h-dvh bg-slate-950 text-slate-100">
          <header className="sticky top-0 z-50 border-b border-emerald-900/50 bg-slate-950/95 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:py-4">
              <a href="/" className="group flex items-center gap-2">
                <span className="rounded-full border border-emerald-700/70 bg-emerald-950/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  LABLR
                </span>
                <span className="hidden text-sm text-slate-300 sm:inline">Ingredient Decoder</span>
              </a>

              <nav className="hidden items-center gap-1 rounded-full border border-slate-700 bg-slate-900 p-1 sm:flex">
                <a href="#upload" className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-300 transition hover:bg-emerald-950/60 hover:text-emerald-200">
                  Upload
                </a>
                <a href="#progress" className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-300 transition hover:bg-emerald-950/60 hover:text-emerald-200">
                  Progress
                </a>
                <a href="#results" className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-300 transition hover:bg-emerald-950/60 hover:text-emerald-200">
                  Results
                </a>
              </nav>
            </div>
          </header>

          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] [background-size:28px_28px]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-emerald-900/25 to-transparent" />
            {children}
          </div>

          <footer className="mt-8 border-t border-slate-800 bg-slate-950">
            <div className="mx-auto w-full max-w-5xl space-y-1 px-4 py-5 text-center text-sm text-slate-500">
              <p>© {new Date().getFullYear()} Lablr</p>
              <p className="text-xs text-slate-600">
                AI is used as an explanation layer, not a decision layer.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
