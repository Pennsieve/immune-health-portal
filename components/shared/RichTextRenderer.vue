<script setup>
import { documentToHtmlString } from '@contentful/rich-text-html-renderer'

const props = defineProps({
  content: String
})

const html = computed(() => {
  if (!props.content) return ''
  return documentToHtmlString(props.content)
})
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div v-html="html" />
</template>