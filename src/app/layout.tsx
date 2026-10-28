import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "KonekTap Platform | Smart NFC Business Cards",
  description: "One Unified Link • Instant Contact Save • Zero Apps Required",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} font-sans antialiased selection:bg-brand-500 selection:text-white bg-grid-pattern relative`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          
          {/* 2. ADD THIS FLOATING CONTAINER */}
          <div className="fixed bottom-6 right-6 z-[9999] shadow-2xl rounded-full bg-white/80 dark:bg-dark-900/80 backdrop-blur-md border border-slate-200 dark:border-white/10">
            <ThemeToggle />
          </div>

        </ThemeProvider>
      </body>
    </html>
  );
}