import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import localFont from "next/font/local";
import { ConvexClientProvider } from "./convex-client-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Pellas RAG Dashboard",
  description: "Dashboard autenticado con agente RAG y gestión documental.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="es" className={geistSans.variable}>
        <body className={`${geistMono.variable} font-sans antialiased`}>
          <ConvexClientProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster richColors />
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
