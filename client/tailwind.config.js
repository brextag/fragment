/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          sidebar: '#1e1f22',
          channels: '#2b2d31',
          chat: '#313338',
          userpanel: '#232428',
          input: '#383a40',
          hover: '#35373c',
          active: '#404249',
          blurple: '#5865f2',
          blurpleHover: '#4752c4',
          green: '#23a55a',
          yellow: '#f0b232',
          red: '#f23f43',
          textHeader: '#f2f3f5',
          textNormal: '#dbdee1',
          textMuted: '#949ba4',
          interactive: '#b5bac1',
          separator: '#35363c',
          border: '#3f4147',
        }
      },
      fontFamily: {
        sans: ['"gg sans"', '"Noto Sans"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
