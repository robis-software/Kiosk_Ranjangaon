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
        blink: 'blink 1s ease-in-out infinite',
        slideFromDown: 'popupEntry 0.5s cubic-bezier(0.4, 0, 0.6, 1) forwards',
        vibrate: 'vibrate 0.2s ease-in-out infinite',
        slideIn: 'slideIn 0.4s ease-in-out forwards',
        slideOut: 'slideOut 0.4s ease-in-out forwards',
        arrowAnimation: 'arrowMoving 1s ease-in-out forwards infinite',
        inPlaceRotation: 'rotating 3s linear forwards infinite',
        pulseCustom: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
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
            '100%': { transform: 'translateX(0px)' }
        },
        slideIn: {
            'from': { transform: 'translateX(10%)', opacity: 0},
            'to': { transform: 'translateX(0%)', opacity: 1},
        },
        arrowMoving: {
            '0%': { transform: 'translateX(0px)' },
            '50%': { transform: 'translateX(5px)' },
            '100%': { transform: 'translateX(0px)' },
        },
        rotating: {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)'},
        },
        pulseCustom: {
            '50%': {
                opacity: .7
            }
        }
      }
    },
  },
  plugins: [],
}
