<script setup lang="ts">
/* eslint-disable vue/no-mutating-props --
   This is a field-editor bound to the reactive `model` object its parent owns
   (the intake form's `form`, or a modal's `editForm.intakeDetails`). Editing the
   passed reactive slice in place is the intended contract, like v-model on an object. */
import type { IntakeField } from '~/utils/intakeFields'
import { detailApplies } from '~/utils/intakeFields'

const props = withDefaults(defineProps<{
  fields: IntakeField[]
  model: Record<string, unknown>
  // sibling values used for cross-field visibility (sampleType, affiliation)
  context?: Record<string, unknown>
  variant?: 'form' | 'modal'
  // modals edit every field regardless of the form's cross-field visibility rules
  showAll?: boolean
}>(), { variant: 'form', context: () => ({}), showAll: false })

// Earliest / latest selectable month for "month" fields (now … +10y)
const pad = (n: number) => String(n).padStart(2, '0')
const currentMonth = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
})
const maxMonth = computed(() => {
  const d = new Date()
  return `${d.getFullYear() + 10}-${pad(d.getMonth() + 1)}`
})

function isVisible(f: IntakeField): boolean {
  if (props.showAll || !f.showIfKey) return true
  return props.context?.[f.showIfKey] === f.showIfEquals
}

function asArray(key: string): string[] {
  const v = props.model[key]
  if (!Array.isArray(v)) {
    props.model[key] = []
    return props.model[key] as string[]
  }
  return v as string[]
}

function toggle(key: string, value: string) {
  const arr = asArray(key)
  const i = arr.indexOf(value)
  if (i === -1) arr.push(value)
  else arr.splice(i, 1)
}

function showOther(f: IntakeField): boolean {
  return !!f.otherValue && !!f.otherKey && asArray(f.key).includes(f.otherValue)
}
function showDetail(f: IntakeField): boolean {
  if (!f.detailKey) return false
  return detailApplies(f.detailShowIf, props.model[f.key])
}

// months: digits only, capped at 3
function onMonthsInput(key: string, e: Event) {
  const el = e.target as HTMLInputElement
  const digits = el.value.replace(/\D/g, '').slice(0, 3)
  el.value = digits
  props.model[key] = digits === '' ? '' : Number(digits)
}
// month picker: snap to the [current, +10y] window
function onMonthInput(key: string, e: Event) {
  const el = e.target as HTMLInputElement
  if (el.value && el.value < currentMonth.value) el.value = currentMonth.value
  else if (el.value && el.value > maxMonth.value) el.value = maxMonth.value
  props.model[key] = el.value
}
</script>

<template>
  <div class="if-fields">
    <template v-for="f in fields" :key="f.key">
      <div v-if="isVisible(f)" class="if-field" :class="variant === 'modal' ? 'if-modal' : 'if-form'">
        <label class="if-label">{{ f.label }}</label>
        <div v-if="f.hint" class="if-hint">{{ f.hint }}</div>

        <!-- text -->
        <input v-if="f.type === 'text'" v-model="model[f.key] as string" type="text" :placeholder="f.placeholder">

        <!-- textarea -->
        <textarea v-else-if="f.type === 'textarea'" v-model="model[f.key] as string" rows="2" :placeholder="f.placeholder" />

        <!-- months -->
        <div v-else-if="f.type === 'months'" class="if-num-suffix">
          <input :value="model[f.key]" type="text" inputmode="numeric" :placeholder="f.placeholder" @input="onMonthsInput(f.key, $event)">
          <span class="if-suffix">months</span>
        </div>

        <!-- month picker -->
        <input
          v-else-if="f.type === 'month'"
          :value="model[f.key]"
          type="month"
          :min="currentMonth"
          :max="maxMonth"
          @input="onMonthInput(f.key, $event)"
          @change="onMonthInput(f.key, $event)"
        >

        <!-- select -->
        <select v-else-if="f.type === 'select'" v-model="model[f.key] as string">
          <option value="">—</option>
          <option v-for="opt in f.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>

        <!-- yes / no segmented -->
        <div v-else-if="f.type === 'yesno'" class="if-seg">
          <button
            v-for="opt in f.options"
            :key="opt.value"
            type="button"
            :class="{ active: model[f.key] === opt.value }"
            @click="model[f.key] = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- multiselect chips -->
        <div v-else-if="f.type === 'multiselect'" class="if-chips">
          <label
            v-for="opt in f.options"
            :key="opt.value"
            class="if-chip"
            :class="{ active: asArray(f.key).includes(opt.value) }"
          >
            <input type="checkbox" :checked="asArray(f.key).includes(opt.value)" @change="toggle(f.key, opt.value)">
            {{ opt.label }}
          </label>
        </div>

        <!-- "other" free-text companion (multiselect) -->
        <input
          v-if="showOther(f)"
          v-model="model[f.otherKey!] as string"
          type="text"
          class="if-companion"
          :placeholder="f.otherPlaceholder"
        >

        <!-- conditional detail companion (select/yesno/always) -->
        <input
          v-if="showDetail(f)"
          v-model="model[f.detailKey!] as string"
          type="text"
          class="if-companion"
          :placeholder="f.detailPlaceholder"
        >
      </div>
    </template>
  </div>
</template>

<style scoped>
.if-fields { display: flex; flex-direction: column; }
.if-field { margin-bottom: 1.1rem; }
.if-field.if-modal { margin-bottom: 0.9rem; }

.if-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ink);
  margin-bottom: 0.3rem;
}
.if-field.if-modal .if-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  font-weight: 600;
}
.if-hint {
  font-size: 0.78rem;
  color: var(--muted);
  margin-bottom: 0.4rem;
}
.if-companion { margin-top: 0.6rem; }

/* Structured multi-select chips */
.if-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.4rem;
}
.if-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border: 1.5px solid var(--line);
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.15s;
  background: var(--card);
  color: var(--ink);
  user-select: none;
}
.if-chip input[type="checkbox"] { width: 14px; height: 14px; margin: 0; }
.if-chip:hover { border-color: var(--accent); }
.if-chip.active {
  background: rgba(26, 82, 118, 0.08);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 500;
}

/* Segmented yes/no toggle */
.if-seg {
  display: inline-flex;
  border: 1.5px solid var(--line);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.2rem;
}
.if-seg button {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  font-weight: 500;
  border: none;
  border-right: 1.5px solid var(--line);
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  color: var(--muted);
  transition: all 0.2s;
}
.if-seg button:last-child { border-right: none; }
.if-seg button.active { background: var(--accent); color: #fff; }

/* Numeric input with a "months" suffix */
.if-num-suffix { display: flex; align-items: stretch; width: 50%; }
.if-num-suffix input {
  flex: 1;
  min-width: 0;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: none;
}
.if-suffix {
  display: flex;
  align-items: center;
  padding: 0 0.8rem 0 0;
  border: 1.5px solid var(--line);
  border-left: none;
  border-radius: 0 4px 4px 0;
  background: var(--cream);
  color: var(--muted);
  font-size: 0.85rem;
  white-space: nowrap;
  transition: border 0.2s;
}
.if-num-suffix:focus-within .if-suffix { border-color: var(--penn-blue); }
</style>
