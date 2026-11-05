/** @type {import('tailwindcss').Config} */
export default {
  // Only scan the admin code, so the public website is never affected.
  content: ['./app/admin/**/*.{js,jsx}', './components/admin/**/*.{js,jsx}'],
  // `important` scopes every utility under .glass-root, and `preflight: false` skips Tailwind's global
  // reset: together they guarantee nothing here can restyle the public pages.
  important: '.glass-root',
  corePlugins: { preflight: false },
  theme: {
    extend: {
      fontFamily: { sans: ['var(--f-body)', 'Inter', 'system-ui', 'sans-serif'] },
      boxShadow: { glass: '0 8px 32px rgb(2 20 35 / .28), inset 0 1px 0 rgb(255 255 255 / .12)' },
      keyframes: { shimmer: { '100%': { transform: 'translateX(100%)' } } },
    },
  },
  plugins: [],
};
