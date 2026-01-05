<template>
  <div class="notice-container">
    <div class="notice-content">
      Powered by
      <a href="https://github.com/ttktjmt/muwanx" target="_blank" class="notice-link">Muwanx</a>
    </div>
  </div>
</template>

<script setup>
// purely presentational
</script>

<style scoped>
.notice-container {
  position: fixed;
  bottom: 12px;
  left: 12px;
  z-index: 999;
}

@media (max-width: 768px) {
  .notice-container {
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    bottom: auto;
  }
}

.notice-content {
  color: rgba(255, 255, 255, 0.7);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(2px);
}

.notice-link {
  color: #8DDFFB;
  text-decoration: none;
}

.notice-link:hover {
  text-decoration: underline;
}
</style>

<style>
body.interactive-mode .notice-container {
  display: block !important;
}
</style>
