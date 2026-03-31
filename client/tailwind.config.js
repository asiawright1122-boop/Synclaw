/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // AutoClaw Ember Light Skin
        accent1: '#fc5d1e',
        accent2: '#e55318',
        accent: '#fc5d1e',
        success: '#2f9e5b',
        danger: '#df5353',

        // Backgrounds
        'bg-base': '#f5f5f5',
        'bg-container': '#ffffff',
        'bg-elevated': '#ffffff',
        'bg-subtle': '#f7f7f7',
        'bg-surface': '#ffffff',
        'bg-nav': '#f5f5f5',

        // Borders
        'border-base': '#e5e5e5',
        'border-secondary': '#f0f0f0',

        // Text
        'text-primary': '#292929',
        'text-sec': '#7a7a7a',
        'text-ter': '#9e9e9e',
      },
      fontFamily: {
        display: ['Inter', 'PingFang SC', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['Inter', 'PingFang SC', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'pill': '20px',
      },
      boxShadow: {
        'autoclaw': '0 10px 28px rgba(0, 0, 0, 0.06)',
        'autoclaw-sm': '0 1px 2px rgba(0, 0, 0, 0.03), 0 6px 14px rgba(0, 0, 0, 0.03)',
      },
      spacing: {
        'space-xs': '4px',
        'space-sm': '8px',
        'space-md': '12px',
        'space-lg': '16px',
        'space-xl': '24px',
      },
      height: {
        'header': '44px',
        'sidebar': '260px',
      },
    },
  },
  plugins: [],
}
