import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
const poppins = localFont({ src: [{ path: "./fonts/Poppins-Regular.ttf", weight: "400" }, { path: "./fonts/Poppins-Bold.ttf", weight: "700" }], variable: "--font-poppins", display: "swap" });
export const metadata: Metadata = { title: { default: "KlinikPanel", template: "%s · KlinikPanel" }, description: "Çok şubeli klinik yönetim sistemi: randevu, hasta, kasa, raporlar.", robots: { index: false } };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="tr" className={poppins.variable}><body className="font-sans antialiased">{children}</body></html>;
}
