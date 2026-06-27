import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { PostHogClientProvider } from '@/components/providers/PostHogProvider'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { WebSiteJsonLd } from '@/components/seo/JsonLd'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'VitalFix — Core Web Vitals for Developers',
  description: 'Production-ready code snippets, interactive audit checklists, and developer tools to fix LCP, INP, and CLS. Ship faster websites today.',
  keywords: 'Core Web Vitals, LCP, INP, CLS, performance, web optimization, developer tools',
  openGraph: {
    title: 'VitalFix — Fix Your Core Web Vitals',
    description: 'Free code snippets, audit checklists, and interactive tools for developers.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('vitalfix-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <PostHogClientProvider>
            <ThemeProvider>
              <Navbar />
              <main>{children}</main>
              <Footer />
              <WebSiteJsonLd />
            </ThemeProvider>
          </PostHogClientProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
