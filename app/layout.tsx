import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { ThemeProvider } from "@/components/ThemeProvider";

const geist = Geist({ subsets: ["latin"] });
export const metadata: Metadata = {
  title: "홈 오퍼레이션",
  description: "맞벌이 부부를 위한 홈 오퍼레이션",
  icons: {
    apple: "/icon-180.png",
    icon: "/icon-180.png",
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={geist.className}>
      <body className="bg-amber-50 min-h-screen">
        <ThemeProvider>
          <Navigation />
          <main className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
