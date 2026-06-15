import type { Metadata, Viewport } from 'next'
import './globals.css'
import { QueryProvider } from '@/components/ui/QueryProvider'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'NovaStream - Premium Streaming',
  description: 'Your premium self-hosted streaming platform',
  icons: {
    icon: '/novastream-icon.png',
    shortcut: '/novastream-icon.png',
    apple: '/novastream-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#030712',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#030712] text-white antialiased">
        <QueryProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'rgba(15,15,20,0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#f9fafb',
                borderRadius: '12px',
                fontSize: '14px',
                fontFamily: 'Space Grotesk, sans-serif',
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  )
}
