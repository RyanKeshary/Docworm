/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3975B7',   // Accent Blue — buttons, active controls
          dark: '#2F639B',      // Hover Blue — hovered/pressed states
          link: '#2866A5',      // Link Blue — clickable links, active nav
          light: '#E0EDFA',     // Soft Blue — selected items, active tabs
          pale: '#F0F6FC',      // Light Blue — secondary highlights
          border: '#DFE6EE',    // Border — cards, dividers, inputs
        },
        page: '#F4F8FC',        // Page Background
        surface: '#FFFFFF',     // Cards, sidebars, modals
        ink: {
          DEFAULT: '#263445',   // Primary Text
          muted: '#64748B',     // Secondary Text
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
};
