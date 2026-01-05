/**
 * plugins/vuetify.js
 *
 * Framework documentation: https://vuetifyjs.com`
 */

import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#596fa2ff',
          secondary: '#b5bbc4ff',
        },
      },
    },
  },
  defaults: {
    VSlider: {
      color: 'primary',
    },
    VCheckbox: {
      color: 'primary',
    },
    VRadio: {
      color: 'primary',
    },
    VSwitch: {
      color: 'primary',
    },
    VBtn: {
      color: 'primary',
    },
    VProgressLinear: {
      color: 'primary',
    },
    VProgressCircular: {
      color: 'primary',
    },
    VImg: {
      eager: true,
    },
  }
})
