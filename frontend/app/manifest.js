// WEB APP MANIFEST: lets phones "Add to home screen" with the brand colours.
export default function manifest() {
  return {
    name: 'Pulse Trips', short_name: 'Pulse Trips', start_url: '/', display: 'standalone',
    background_color: '#151A24', theme_color: '#151A24',
    icons: [{ src: '/logo-256.jpg', sizes: '256x256', type: 'image/jpeg' }],
  };
}
