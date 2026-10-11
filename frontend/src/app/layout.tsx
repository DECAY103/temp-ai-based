import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-based Resume Screening",
  description: "Cloud-native AI-based resume screening and ranking system",
};

import { SiteHeader } from "@/components/SiteHeader";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
