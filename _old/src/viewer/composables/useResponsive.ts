import { ref, onMounted, onBeforeUnmount, onUnmounted } from 'vue';
import { MOBILE_BREAKPOINT, SMALL_SCREEN_BREAKPOINT } from '@/viewer/utils/constants';

export function useResponsive() {
  const isMobile = ref(false);
  const isSmallScreen = ref(false);
  const isPanelCollapsed = ref(false);

  function check() {
    isMobile.value = window.innerWidth <= MOBILE_BREAKPOINT;
    isSmallScreen.value = window.innerWidth <= SMALL_SCREEN_BREAKPOINT;
    if (isMobile.value && !isPanelCollapsed.value) {
      isPanelCollapsed.value = true;
    }
  }

  function togglePanel() {
    isPanelCollapsed.value = !isPanelCollapsed.value;
  }

  function onResize() {
    check();
  }

  onMounted(() => {
    check();
    window.addEventListener('resize', onResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', onResize);
  });

  return { isMobile, isSmallScreen, isPanelCollapsed, togglePanel };
}
