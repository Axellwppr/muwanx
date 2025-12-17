/**
 * plugins/index.js
 *
 * Automatically included in `./src/main.js`
 */

// Plugins
import vuetify from './vuetify'

export function registerPlugins (app, router) {
  app
    .use(vuetify)

  if (router) {
    app.use(router)
  }
}
