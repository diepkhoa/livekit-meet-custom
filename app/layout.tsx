import '../styles/globals.css';
import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';

import { Nunito } from 'next/font/google';

const nunito = Nunito({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Nice to meet you',
    template: '%s | Lời chào từ đội ngũ của chúng tôi',
  },
  description:
    'Không gian họp trực tuyến hiệu suất cao, bảo mật, ổn định.',
  twitter: {
    card: 'summary_large_image',
  },
  openGraph: {
    url: '/',
    siteName: 'Huong Sac online meeting',
  },
  icons: {
    icon: {
      rel: 'icon',
      url: '/favicon.ico',
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#090d16',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body data-lk-theme="default">
        <Toaster />
        {children}
      </body>
    </html>
  );
}

