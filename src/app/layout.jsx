import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "next-auth/react";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata = {
    title: "Yukthi",
    description: "Ultimate platform to master any concept",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <SessionProvider>
                <body
                    className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                >
                    <Navbar></Navbar>
                    <main className="pt-16">{children}</main>
                    <Toaster richColors />
                </body>
            </SessionProvider>
        </html>
    );
}
