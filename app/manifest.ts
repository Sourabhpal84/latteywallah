import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LATTEY WALA',
    short_name: 'LATTEY WALA',
    description: 'Everyday style. Delivered.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f5f4f1',
    theme_color: '#111111',
    icons: [
      { src: '/icons/lattey-wala-pwa.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/lattey-wala-pwa.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
