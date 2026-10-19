import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JS Practice Live",
  description: "Kahoot-style live JavaScript practice for the classroom.",
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
