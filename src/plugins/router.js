// plugins/router.js
import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import Demo from '@/views/Demo.vue'

const routes = [
  {
    path: '/',
    name: 'Demo',
    component: Demo,
    props: () => ({ configPath: './config.json' })
  },
  {
    path: '/mujoco_menagerie',
    name: 'MujocoMenagerie',
    component: Demo,
    props: () => ({ configPath: './config_mujoco_menagerie.json' })
  },
  {
    path: '/myosuite',
    name: 'MyoSuite',
    component: Demo,
    props: () => ({ configPath: './config_myosuite.json' })
  },
]

const router = createRouter({
  history: createWebHashHistory('/'),
  routes,
})

// Reinitialize the app on route/params change
router.beforeEach((to, from, next) => {
  if (from.name && to.fullPath !== from.fullPath) {
    window.location.hash = '#' + to.fullPath
    window.location.reload()
  } else {
    next();
  }
});

export default router
