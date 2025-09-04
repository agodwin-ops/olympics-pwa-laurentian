import './globals.css'
import 'highlight.js/styles/github-dark.css'
import { OlympicsAuthProvider } from '@/contexts/OlympicsAuthContext'
import { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'XV Winter Olympic Saga Game',
  description: 'A gamified classroom PWA where students experience the XV Winter Olympics through interactive gameplay',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'XV Winter Olympic Saga',
  },
  icons: {
    icon: '/favicon.png',
    apple: '/icon-192x192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#d32f2f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Unregister existing service workers
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister();
                    console.log('ServiceWorker unregistered');
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen font-inter">
        <OlympicsAuthProvider>
          <main>{children}</main>
        </OlympicsAuthProvider>
      </body>
    </html>
  );
}
