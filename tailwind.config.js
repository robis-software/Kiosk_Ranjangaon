const { transform } = require('typescript');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#DA2127',
        darkAsh: '#525252',
        lightGray: '#CECECE',
        lavender: '#7E6DB2',
        status: {
            green: '#28A745',
            yellow: '#FFBE31',
            red: '#FF0000'
        },
        racks: '#DEDEDE',
        rackSelect: '#EDEDED',
        keys: '#F4F4F4',
        dialogIcon: '#8E8E8E'
      },
      animation: {
        screenSaverIn: 'screenSaverIn 1s cubic-bezier(1, 0.01,.17,.52) forwards',
        screenSaverOut: 'screenSaverOut 1s cubic-bezier(1, 0.01,.17,.52) forwards',
        // screenSaverIn: 'screenSaverIn 0.4s ease-in-out forwards',
        // screenSaverOut: 'screenSaverOut 0.4s ease-in-out forwards',
        blink: 'blink 1s ease-in-out infinite',
        slideFromDown: 'popupEntry 0.5s cubic-bezier(0.4, 0, 0.6, 1) forwards',
        vibrate: 'vibrate 0.2s ease-in-out infinite'
      },
      keyframes: {
        screenSaverIn: {
          'from': { transform: 'translateY(-120%) scale(1.3)', opacity: '0.5' },
          'to': { transform: 'translateY(0) scale(1)', opacity: '1' }
        },
        screenSaverOut: {
          'from': { transform: 'translateY(0%) scale(1)', opacity: '1' },
          'to': { transform: 'translateY(-120%) scale(1.3)', opacity: '0.5' }
        },
        popupEntry: {
          'from': {opacity: '0', transform: 'translateY(35px) scale(1)'},
          'to': {opacity: '1', transform: 'translateY(0px) scale(1)'}
        },
        vibrate: {
            '0%': { transform: 'translateX(0px)' },
            '25%': { transform: 'translateX(3px)' },
            '50%': { transform: 'translateX(0px)' },
            '75%': { transform: 'translateX(-3px)' },
        }
      }
    },
  },
  plugins: [],
}
