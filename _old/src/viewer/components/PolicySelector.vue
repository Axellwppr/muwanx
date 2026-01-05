<template>
  <div class="control-row">
    <div class="control-label">Policy</div>
    <div class="control-unit">
      <v-menu v-model="open" :close-on-content-click="true" transition="fade-transition" location="bottom start">
        <template #activator="{ props }">
          <v-btn v-bind="props" class="segment-button" size="small" variant="text" append-icon="mdi-chevron-down"
            role="combobox" aria-haspopup="listbox" :aria-expanded="String(open)" aria-controls="policy-listbox" block>
            <span class="segment-value">{{ selectedName || '—' }}</span>
          </v-btn>
        </template>
        <v-list id="policy-listbox" class="dropdown-list" density="compact"
          :style="{ minWidth: '192px', maxHeight: '280px', overflowY: 'auto' }">
          <v-list-item v-for="(item, i) in items" :key="item.id || i" :class="{ selected: item.id === selectedId }"
            role="option" :aria-selected="String(item.id === selectedId)" @click="select(item.id)">
            <v-list-item-title>{{ item.name }}</v-list-item-title>
            <template #append>
              <v-icon v-if="item.id === selectedId" icon="mdi-check" size="small" color="primary"></v-icon>
            </template>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
const props = defineProps({ items: { type: Array, default: () => [] }, selectedId: { type: [String, Number], default: null } })
const emit = defineEmits(['select'])
const open = ref(false)
const selectedName = computed(() => props.items.find(i => i.id === props.selectedId)?.name)
function select(id) {
  open.value = false
  requestAnimationFrame(() => emit('select', id))
}
</script>

<style scoped>
.segment-button.v-btn {
  background: color-mix(in srgb, var(--ui-surface) 70%, transparent) !important;
  box-shadow: none !important;
  height: 28px !important;
  min-height: 28px !important;
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
  padding: 0 10px !important;
  text-transform: none !important;
  width: 100% !important;
}

.segment-button.v-btn:hover {
  background: var(--ui-surface) !important;
}

.segment-button.v-btn :deep(.v-btn__content) {
  width: 100%;
  justify-content: flex-start;
}

.segment-button.v-btn :deep(.v-btn__append) {
  margin-left: auto !important;
}

.segment-value {
  font-size: 12px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
