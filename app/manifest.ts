import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SW Monthly Golf',
    short_name: 'SW Golf',
    description: 'Mobile-first golf tournament management PWA',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#16a34a',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    categories: ['sports', 'games'],
    lang: 'en',
    dir: 'ltr',
  };
}
