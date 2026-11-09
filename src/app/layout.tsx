import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Sagar & Dhrupti | Wedding Celebration", description: "With the blessings of our families, join Sagar and Dhrupti for their wedding celebration on 2 February 2027 in Mumbai." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }