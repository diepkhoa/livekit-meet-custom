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
    default: 'Lớp Học Cô Tuyền',
    template: '%s | Lớp Học Cô Tuyền',
  },
  description:
    'Không gian học tập & chia sẻ bài giảng trực tuyến thời gian thực - Lớp Học Cô Tuyền.',
  twitter: {
    creator: '@lophocotuyen',
    site: '@lophocotuyen',
    card: 'summary_large_image',
  },
  openGraph: {
    url: '/',
    siteName: 'Lớp Học Cô Tuyền',
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

