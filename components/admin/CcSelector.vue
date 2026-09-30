<script setup lang="ts">
// Checkbox list for the "who gets CC'd" section of an email-confirmation
// modal. Candidates are the study/inquiry's study_lead + key_personnel
// (see utils/emailRecipients.ts) — the primary recipient (the PI) is shown
// separately by the caller and isn't a toggle here.
import type { CcPerson } from '~/utils/emailRecipients'
import { ccCandidates } from '~/utils/emailRecipients'

const props = defineProps<{
  lead?: CcPerson | null
  keyPersonnel?: CcPerson[] | null
  modelValue: string[]
}>()

const emit = defineEmits<{ 'update:modelValue': [string[]] }>()

const recipients = computed(() => ccCandidates(props.lead, props.keyPersonnel))

function toggle(email: string) {
  const set = new Set(props.modelValue)
  if (set.has(email)) set.delete(email)
  else set.add(email)
  emit('update:modelValue', [...set])
}
</script>

<template>
  <div class="cc-list">
    <p v-if="recipients.length" class="cc-label">Select who else you'd like to CC on this email:</p>
    <label v-for="r in recipients" :key="r.email" class="cc-row">
      <input
        type="checkbox"
        :checked="modelValue.includes(r.email)"
        @change="toggle(r.email)"
      >
      <span class="cc-name">{{ r.name || r.email }}</span>
      <span v-if="r.role" class="cc-role">{{ r.role }}</span>
      <span class="cc-email">{{ r.email }}</span>
    </label>
    <p v-if="!recipients.length" class="cc-empty">No study lead or key personnel on file to CC.</p>
  </div>
</template>
