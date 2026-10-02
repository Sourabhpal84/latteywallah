import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lattey Walla',
    short_name: 'Lattey Walla',
    description: 'Everyday style. Delivered.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f5f4f1',
    theme_color: '#111111',
    icons: [
      { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
