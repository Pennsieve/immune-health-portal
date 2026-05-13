<script setup lang="ts">
import { useAdminStore } from '~/stores/admin'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const adminStore = useAdminStore()

const inquiry = computed(() => adminStore.inquiries.find(i => i.id === route.params.id))

if (!inquiry.value) {
  navigateTo('/admin/inquiries')
}

const affiliationClass = computed(() => {
  if (!inquiry.value) return ''
  if (inquiry.value.affiliation === 'Internal') return 'b-internal'
  if (inquiry.value.affiliation === 'External') return 'b-external'
  return 'b-industry'
})

const isApproving = ref(false)
const isDeclining = ref(false)

async function approveAndSend() {
  if (!inquiry.value) return
  isApproving.value = true
  try {
    const { studyId } = await $fetch('/api/admin/approve-inquiry', {
      method: 'POST',
      body: { inquiryId: inquiry.value.id },
    }) as { studyId: string }
    await adminStore.loadAll()
    navigateTo(`/admin/studies/${studyId}`)
  }
  catch {
    alert('Failed to approve inquiry. Please try again.')
  }
  finally {
    isApproving.value = false
  }
}

async function decline() {
  if (!inquiry.value) return
  if (!confirm(`Decline inquiry from ${inquiry.value.pi.name}? This cannot be undone.`)) return
  isDeclining.value = true
  try {
    await $fetch('/api/admin/decline-inquiry', {
      method: 'POST',
      body: { inquiryId: inquiry.value.id },
    })
    await adminStore.loadAll()
    navigateTo('/admin/inquiries')
  }
  catch {
    alert('Failed to decline inquiry. Please try again.')
  }
  finally {
    isDeclining.value = false
  }
}
</script>

<template>
  <div v-if="inquiry">
    <div class="crumbs">
      <NuxtLink to="/admin/inquiries" class="crumb-link">Inquiries</NuxtLink>
      <span class="sep">›</span>
      <span>{{ inquiry.studyName }} · {{ inquiry.pi.name }}</span>
    </div>

    <!-- Hero -->
    <div class="detail-hero">
      <div>
        <h2>
          {{ inquiry.studyName }}
          <span class="acronym">{{ inquiry.abbreviation }}</span>
          <span class="adm-badge" :class="affiliationClass">
            <span class="dot" /> {{ inquiry.affiliation }}
          </span>
          <span class="adm-badge b-review">
            <span class="dot" /> Awaiting feasibility
          </span>
        </h2>
        <div class="pi-line">
          <strong>{{ inquiry.pi.name }}</strong> · {{ inquiry.affiliationOrg }} ·
          <span class="mono">{{ inquiry.pi.email }}</span>
        </div>
        <div class="meta-strip">
          <div class="meta-item">
            <span class="meta-label">Submitted</span>
            <span class="meta-val">{{ inquiry.submittedDate }} · {{ inquiry.submittedRelative }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">IRB</span>
            <span class="meta-val">{{ inquiry.irb }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Cohort scope</span>
            <span class="meta-val">{{ inquiry.cohortSubjects }} subjects × {{ inquiry.cohortTimepoints }} timepoints = {{ inquiry.cohortSubjects * inquiry.cohortTimepoints }}</span>
          </div>
          <div v-if="inquiry.estimate" class="meta-item">
            <span class="meta-label">Estimate</span>
            <span class="meta-val">${{ inquiry.estimate.toLocaleString() }}</span>
          </div>
          <div v-if="inquiry.sampleType" class="meta-item">
            <span class="meta-label">Sample type</span>
            <span class="meta-val">{{ inquiry.sampleType }}</span>
          </div>
        </div>
      </div>
      <div class="hero-actions">
        <button
          class="btn btn-primary"
          :disabled="isApproving || isDeclining || inquiry.status === 'Approved' || inquiry.status === 'Declined'"
          @click="approveAndSend"
        >
          {{ isApproving ? 'Approving…' : 'Approve &amp; send agreement →' }}
        </button>
        <button class="btn btn-secondary btn-sm" :disabled="isApproving || isDeclining">Request more info</button>
        <button
          class="btn btn-ghost btn-sm"
          style="color:var(--warm)"
          :disabled="isApproving || isDeclining || inquiry.status === 'Approved' || inquiry.status === 'Declined'"
          @click="decline"
        >
          {{ isDeclining ? 'Declining…' : 'Decline' }}
        </button>
      </div>
    </div>

    <!-- Two-column -->
    <div class="dt-grid">
      <!-- Intake snapshot -->
      <div class="panel">
        <div class="panel-head">
          <h3>Intake submission</h3>
          <span class="ctx">Read-only · submitted via /intake</span>
        </div>
        <div class="study-info-grid">
          <div class="info-lbl">Study objectives</div>
          <div>{{ inquiry.objectives }}</div>

          <template v-if="inquiry.studyLead">
            <div class="info-lbl">Project lead</div>
            <div>{{ inquiry.studyLead.name }} · <span class="mono">{{ inquiry.studyLead.email }}</span></div>
          </template>

          <template v-if="inquiry.phlebotomy">
            <div class="info-lbl">Phlebotomy</div>
            <div>{{ inquiry.phlebotomy }}</div>
          </template>

          <template v-if="inquiry.metadata">
            <div class="info-lbl">Metadata plan</div>
            <div>{{ inquiry.metadata }}</div>
          </template>

          <div class="info-lbl">Services</div>
          <div>
            <div v-for="svc in inquiry.servicesDetail" :key="svc.name">
              {{ svc.name }} × {{ svc.qty }} — <span class="mono">{{ svc.rate }}</span>
            </div>
          </div>

          <div class="info-lbl">Affiliation</div>
          <div>
            {{ inquiry.affiliation }} — {{ inquiry.affiliationOrg }}
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div style="display:flex; flex-direction:column; gap:1.2rem;">
        <div class="panel">
          <div class="panel-head"><h3>Feasibility checklist</h3></div>
          <div style="padding:0.4rem 1.4rem 1.2rem; font-size:0.86rem;">
            <label
              v-for="item in inquiry.feasibility"
              :key="item.label"
              style="display:flex; align-items:center; gap:0.6rem; padding:0.45rem 0;"
            >
              <input type="checkbox" :checked="item.checked">
              {{ item.label }}
            </label>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><h3>Reviewer notes</h3></div>
          <div v-if="inquiry.notes.length" class="activity-timeline">
            <div v-for="note in inquiry.notes" :key="note.date" class="t-item">
              <div class="t-dot m" />
              <div class="t-body">
                <div class="t-title">{{ note.author }}</div>
                <div class="t-meta">{{ note.date }}</div>
                <div class="t-note">{{ note.text }}</div>
              </div>
            </div>
          </div>
          <div v-else style="padding:0.8rem 1.4rem; font-size:0.84rem; color:var(--muted)">
            No notes yet.
          </div>
          <div class="note-composer">
            <textarea placeholder="Add an internal note (visible only to I3H staff)…" />
            <div class="composer-actions">
              <button class="btn btn-secondary btn-sm">Cancel</button>
              <button class="btn btn-primary btn-sm">Post note</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
