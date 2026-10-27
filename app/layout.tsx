import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Linkly",
  description: "A tiny link shortener with click analytics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
