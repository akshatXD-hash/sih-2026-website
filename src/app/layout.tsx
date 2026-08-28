import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIH Scheme Matching Platform",
  description: "Discover loan schemes matched to an applicant's needs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
