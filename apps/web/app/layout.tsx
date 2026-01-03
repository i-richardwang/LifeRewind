import type { Metadata } from "next"
import { JetBrains_Mono } from "next/font/google"

import "@workspace/ui/globals.css"
import { Providers } from "@/components/providers"
import { MainLayout } from "@/components/layout"

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: {
    default: "LifeRewind",
    template: "%s | LifeRewind",
  },
  description: "AI-powered personal life review tool based on your digital footprints",
  keywords: ["life review", "digital footprints", "AI summary", "personal analytics"],
  authors: [{ name: "LifeRewind" }],
  openGraph: {
    title: "LifeRewind",
    description: "AI-powered personal life review tool based on your digital footprints",
    type: "website",
    locale: "en_US",
    siteName: "LifeRewind",
  },
  twitter: {
    card: "summary_large_image",
    title: "LifeRewind",
    description: "AI-powered personal life review tool based on your digital footprints",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full overflow-hidden">
      <body
        className={`${fontMono.variable} style-nova h-full overflow-hidden font-sans antialiased`}
      >
        <Providers>
          <MainLayout>{children}</MainLayout>
        </Providers>
      </body>
    </html>
  )
}
