import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import "./brilliant-learning.css";

export const metadata: Metadata = {
  title: "AbleArc · Learning OS",
  description: "A local-first personal Learning OS powered by an evidence-driven learning runtime.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
