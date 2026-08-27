<script setup lang="ts">
// Renders a User Agreement field value, styling an unfilled ("TBD") field
// as a bold bracketed placeholder instead of plain text — used everywhere
// an AgreementFields value is displayed (see utils/agreementFields.ts).
import { TBD } from '~/utils/agreementFields'

defineProps<{ value: string }>()
</script>

<template>
  <strong v-if="value === TBD" class="tbd-placeholder">&lt;to be finalized with the I3H team&gt;</strong>
  <template v-else>{{ value }}</template>
</template>

<style scoped>
.tbd-placeholder {
  font-style: italic;
}
</style>
