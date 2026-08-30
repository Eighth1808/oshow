import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f3eaff',
          100: '#e4d1ff',
          200: '#c9a3ff',
          300: '#ae75ff',
          400: '#9347ff',
          500: '#6C2BD9',
          600: '#5a22b8',
          700: '#481a96',
          800: '#361375',
          900: '#240c53',
        },
        accent: {
          50: '#fff0ec',
          100: '#ffddd4',
          200: '#ffbba9',
          300: '#ff997e',
          400: '#ff7753',
          500: '#FF5733',
          600: '#e64420',
          700: '#cc3110',
          800: '#992508',
          900: '#661804',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
