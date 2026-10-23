import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CarTogether — Better deals happen together",
  description: "Bring local car buyers together, collect dealer quotes and compare every cost before you decide.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
