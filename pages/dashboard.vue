<script setup lang="ts">
/**
 * Dashboard Page
 *
 * User's cohort dashboard showing study progress, sample status, and Pennsieve links.
 * Requires authentication.
 */
import { useCohortsStore } from '~/stores/cohorts'

const cohortsStore = useCohortsStore()

// Fetch cohorts on mount
onMounted(() => {
  cohortsStore.fetchCohorts()
})

const selectCohort = (cohortId: string) => {
  cohortsStore.selectCohort(cohortId)
}

const setAffiliationFilter = (filter: 'academic' | 'external') => {
  cohortsStore.setAffiliationFilter(filter)
}

const getStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
    processing: 'status-processing',
    complete: 'status-complete',
    intake: 'status-intake',
  }
  return classes[status] || 'status-intake'
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    processing: 'Processing',
    complete: 'Complete',
    intake: 'Intake',
  }
  return labels[status] || status
}

// Progress steps for selected cohort
const progressSteps = [
  { id: 'agreement', label: 'Agreement', status: 'done' },
  { id: 'received', label: 'Samples Received', status: 'done' },
  { id: 'staining', label: 'CyTOF Staining', status: 'done' },
  { id: 'acquisition', label: 'Acquisition', status: 'active' },
  { id: 'qc', label: 'QC & Gating', status: 'pending' },
  { id: 'analysis', label: 'Analysis', status: 'pending' },
  { id: 'delivered', label: 'Delivered', status: 'pending' },
]
</script>

<template>
  <div class="dashboard-page">
    <div class="dash-hero">
      <h1>My Cohorts</h1>
      <p>Track your studies in real time. Select a cohort to view processing status, sample progress, and access your data on Pennsieve.</p>
    </div>

    <div class="dash-grid">
      <!-- Sidebar: Cohort List -->
      <div class="dash-sidebar">
        <!-- Affiliation Toggle -->
        <div class="affiliation-toggle">
          <button
            class="toggle-btn"
            :class="{ active: cohortsStore.affiliationFilter === 'academic' }"
            @click="setAffiliationFilter('academic')"
          >
            Academic
          </button>
          <button
            class="toggle-btn"
            :class="{ active: cohortsStore.affiliationFilter === 'external' }"
            @click="setAffiliationFilter('external')"
          >
            External
          </button>
        </div>

        <!-- Cohort Cards -->
        <div
          v-for="cohort in cohortsStore.filteredCohorts"
          :key="cohort.id"
          class="dash-cohort-card"
          :class="{ selected: cohortsStore.selectedCohortId === cohort.id }"
          @click="selectCohort(cohort.id)"
        >
          <div class="cohort-name">
            {{ cohort.name }}
          </div>
          <div class="cohort-meta">
            {{ cohort.principalInvestigator }} · {{ cohort.subjectCount }} subjects · {{ cohort.totalSamples }} samples
          </div>
          <span class="cohort-status" :class="getStatusClass(cohort.status)">
            {{ getStatusLabel(cohort.status) }}
          </span>
          <span v-if="cohort.affiliation === 'industry'" class="cohort-affiliation">
            Industry
          </span>
        </div>

        <!-- Empty state for no cohorts -->
        <div v-if="cohortsStore.filteredCohorts.length === 0" class="empty-sidebar">
          <p>No {{ cohortsStore.affiliationFilter }} cohorts found.</p>
        </div>
      </div>

      <!-- Main Content -->
      <div class="dash-main">
        <template v-if="cohortsStore.selectedCohort">
          <!-- Progress Panel -->
          <div class="dash-panel">
            <h3>Study Progress</h3>
            <div class="panel-subtitle">
              {{ cohortsStore.selectedCohort.name }} – {{ cohortsStore.selectedCohort.objectives }}
            </div>

            <div class="progress-timeline">
              <div
                v-for="step in progressSteps"
                :key="step.id"
                class="prog-step"
                :class="step.status"
              >
                <div class="prog-dot" />
                <div class="prog-label">
                  {{ step.label }}
                </div>
              </div>
            </div>
          </div>

          <!-- Processing Tracker -->
          <div class="dash-panel">
            <h3>Processing Tracker</h3>
            <div class="panel-subtitle">
              {{ cohortsStore.selectedCohort.totalSamples }} total samples across {{ cohortsStore.selectedCohort.subjectCount }} subjects · {{ cohortsStore.selectedCohort.timepointCount }} timepoints each
            </div>

            <div class="tracker-grid">
              <div class="tracker-card">
                <span class="tracker-label">Received</span>
                <span class="tracker-value" style="color: var(--green)">32</span>
                <span class="tracker-context">of {{ cohortsStore.selectedCohort.totalSamples }} samples</span>
                <div class="qc-bar">
                  <div class="qc-bar-fill" style="width: 80%; background: var(--green-light)" />
                </div>
              </div>

              <div class="tracker-card">
                <span class="tracker-label">Processed (PBMCs)</span>
                <span class="tracker-value" style="color: var(--green)">32</span>
                <span class="tracker-context">of 32 received</span>
                <div class="qc-bar">
                  <div class="qc-bar-fill" style="width: 100%; background: var(--green-light)" />
                </div>
              </div>

              <div class="tracker-card">
                <span class="tracker-label">CyTOF Acquired</span>
                <span class="tracker-value" style="color: var(--gold)">18</span>
                <span class="tracker-context">of {{ cohortsStore.selectedCohort.totalSamples }} planned</span>
                <div class="qc-bar">
                  <div class="qc-bar-fill" style="width: 45%; background: var(--gold-light)" />
                </div>
              </div>

              <div class="tracker-card">
                <span class="tracker-label">QC Passed</span>
                <span class="tracker-value" style="color: var(--accent)">14</span>
                <span class="tracker-context">of 18 acquired</span>
                <div class="qc-bar">
                  <div class="qc-bar-fill" style="width: 78%; background: var(--accent-light)" />
                </div>
              </div>
            </div>

            <p class="tracker-note">
              8 samples awaiting collection · Next CyTOF batch scheduled Feb 10
            </p>
          </div>

          <!-- Sample Status Table -->
          <div class="dash-panel">
            <h3>Sample Status</h3>

            <div class="table-scroll">
              <table class="sample-table">
                <thead>
                  <tr>
                    <th>Sample ID</th>
                    <th>Subject</th>
                    <th>Timepoint</th>
                    <th>Viability</th>
                    <th>Events</th>
                    <th>QC</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="sample in cohortsStore.selectedCohortSamples" :key="sample.id">
                    <td class="mono">
                      {{ cohortsStore.selectedCohort.acronym }}-{{ sample.subjectId }}-{{ sample.timepoint === 'Baseline' ? 'T0' : 'T4' }}
                    </td>
                    <td>Subject {{ sample.subjectId }}</td>
                    <td>{{ sample.timepoint }}</td>
                    <td class="mono">
                      {{ sample.viability ? `${sample.viability}%` : '—' }}
                    </td>
                    <td class="mono">
                      {{ sample.eventCount ? sample.eventCount.toLocaleString() : '—' }}
                    </td>
                    <td>
                      <span v-if="sample.qcStatus === 'pass'" class="qc-pass">✓ PASS</span>
                      <span v-else class="qc-pending">⏳ Pending</span>
                    </td>
                    <td>
                      <span
                        class="badge"
                        :class="sample.processingStatus === 'complete' ? 'badge-active' : 'badge-coming'"
                      >
                        {{ sample.processingStatus === 'complete' ? 'Complete' : sample.processingStatus === 'acquired' ? 'Acquiring' : 'In Queue' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Quick Links -->
          <div class="dash-panel links-panel">
            <span class="pennsieve-link">
              📂 Open in Pennsieve – Data, Analysis & Results
            </span>
            <span class="pennsieve-link">
              📋 Download QC Report
            </span>
            <span class="pennsieve-link">
              📄 View User Agreement
            </span>
          </div>

          <!-- Billing Panel -->
          <div class="dash-panel">
            <h3>Billing & Budget</h3>
            <div class="panel-subtitle">
              Account: {{ cohortsStore.selectedCohort.budgetCode || 'Not specified' }} · Billed via iLabs
            </div>

            <div class="billing-summary">
              <div class="billing-card">
                <span class="billing-label">Budget Committed</span>
                <span class="billing-value">$27,250</span>
              </div>
              <div class="billing-card">
                <span class="billing-label">Invoiced to Date</span>
                <span class="billing-value" style="color: var(--warm)">$16,400</span>
              </div>
              <div class="billing-card">
                <span class="billing-label">Remaining</span>
                <span class="billing-value" style="color: var(--green)">$10,850</span>
              </div>
            </div>

            <div class="billing-bar">
              <div class="billing-bar-fill" style="width: 60%" />
            </div>

            <p class="billing-note">
              Last invoice: Jan 2026 · Billing contact: khas@pennmedicine.upenn.edu
            </p>
          </div>
        </template>

        <template v-else>
          <div class="dash-panel empty-state">
            <h3>Select a Cohort</h3>
            <p>Choose a cohort from the sidebar to view its details, or start a new project.</p>
            <NuxtLink to="/intake" class="btn btn-teal">
              Start New Project
            </NuxtLink>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dashboard-page {
  padding-bottom: 4rem;
}

.dash-hero {
  padding: 4rem 2rem 2rem;
  max-width: 1080px;
  margin: 0 auto;

  h1 {
    font-family: 'DM Serif Display', serif;
    font-size: 2rem;
    font-weight: 400;
    margin-bottom: 0.4rem;
  }

  p {
    color: var(--muted);
    font-weight: 300;
    font-size: 0.95rem;
  }
}

.dash-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.5rem;
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 2rem 4rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.dash-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.affiliation-toggle {
  display: flex;
  background: var(--paper);
  border-radius: 8px;
  padding: 4px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.toggle-btn {
  flex: 1;
  padding: 0.6rem 1rem;
  border: none;
  background: transparent;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover:not(.active) {
    color: var(--ink);
    background: rgba(0, 0, 0, 0.03);
  }

  &.active {
    background: var(--teal);
    color: white;
    box-shadow: 0 2px 4px rgba(13, 115, 119, 0.2);
  }
}

.empty-sidebar {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 300;
}

.dash-cohort-card {
  background: var(--card);
  border-radius: var(--radius);
  padding: 1.2rem 1.4rem;
  box-shadow: var(--card-shadow);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--teal);
  }

  &.selected {
    border-color: var(--teal);
    background: rgba(13, 115, 119, 0.03);
  }

  .cohort-name {
    font-weight: 600;
    font-size: 0.92rem;
    margin-bottom: 0.2rem;
  }

  .cohort-meta {
    font-size: 0.75rem;
    color: var(--muted);
    font-weight: 300;
  }

  .cohort-status {
    display: inline-block;
    font-size: 0.6rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.4rem;
  }

  .cohort-affiliation {
    display: inline-block;
    font-size: 0.58rem;
    font-weight: 500;
    padding: 0.12rem 0.4rem;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.4rem;
    margin-left: 0.4rem;
    background: rgba(139, 92, 246, 0.1);
    color: #8b5cf6;
  }
}

.status-processing {
  background: rgba(183, 149, 11, 0.1);
  color: var(--gold);
}

.status-complete {
  background: rgba(26, 122, 76, 0.1);
  color: var(--green);
}

.status-intake {
  background: rgba(26, 82, 118, 0.1);
  color: var(--accent);
}

.dash-main {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.dash-panel {
  background: var(--card);
  border-radius: var(--radius);
  padding: 1.8rem;
  box-shadow: var(--card-shadow);
  border: 1px solid rgba(0, 0, 0, 0.03);

  h3 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .panel-subtitle {
    font-size: 0.78rem;
    color: var(--muted);
    font-weight: 300;
    margin-top: -0.6rem;
    margin-bottom: 1rem;
  }
}

.progress-timeline {
  display: flex;
  gap: 0;
  align-items: stretch;
  flex-wrap: wrap;
}

.prog-step {
  flex: 1;
  text-align: center;
  position: relative;
  padding-top: 2.5rem;
  min-width: 80px;

  &::before {
    content: '';
    position: absolute;
    top: 10px;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--line);
  }

  &:first-child::before {
    left: 50%;
  }

  &:last-child::before {
    right: 50%;
  }

  &.done::before {
    background: var(--green);
  }

  .prog-dot {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2.5px solid var(--line);
    background: var(--card);
    position: absolute;
    top: 1px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    transition: all 0.3s;
  }

  &.done .prog-dot {
    background: var(--green);
    border-color: var(--green);
  }

  &.active .prog-dot {
    background: var(--teal);
    border-color: var(--teal);
    box-shadow: 0 0 0 4px rgba(13, 115, 119, 0.15);
  }

  .prog-label {
    font-size: 0.68rem;
    font-weight: 500;
    color: var(--muted);
    margin-top: 0.3rem;
  }

  &.done .prog-label {
    color: var(--green);
  }

  &.active .prog-label {
    color: var(--teal);
    font-weight: 600;
  }
}

.tracker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.2rem;
}

.tracker-card {
  background: var(--paper);
  border-radius: 8px;
  padding: 1rem 1.2rem;
  border: 1px solid rgba(0, 0, 0, 0.04);

  .tracker-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    font-weight: 600;
    display: block;
  }

  .tracker-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.6rem;
    font-weight: 500;
    line-height: 1.2;
  }

  .tracker-context {
    font-size: 0.75rem;
    color: var(--muted);
    font-weight: 300;
    display: block;
  }
}

.tracker-note {
  font-size: 0.78rem;
  color: var(--muted);
  font-weight: 300;
}

.table-scroll {
  overflow-x: auto;
}

.sample-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;

  th {
    text-align: left;
    padding: 0.6rem 0.8rem;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    color: var(--muted);
    border-bottom: 2px solid var(--line);
  }

  td {
    padding: 0.55rem 0.8rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    font-weight: 300;
  }
}

.qc-pass {
  color: var(--green);
  font-weight: 600;
  font-size: 0.75rem;
}

.qc-pending {
  color: var(--gold);
  font-weight: 500;
  font-size: 0.75rem;
}

.links-panel {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.pennsieve-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  background: rgba(13, 115, 119, 0.08);
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--teal);
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background: rgba(13, 115, 119, 0.15);
  }
}

.billing-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.2rem;
}

.billing-card {
  background: var(--paper);
  border-radius: 8px;
  padding: 1rem 1.2rem;
  border: 1px solid rgba(0, 0, 0, 0.04);
  text-align: center;

  .billing-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    font-weight: 600;
    display: block;
    margin-bottom: 0.3rem;
  }

  .billing-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.4rem;
    font-weight: 500;
    color: var(--ink);
  }
}

.billing-bar {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: var(--line);
  overflow: hidden;
  margin-bottom: 1.2rem;

  .billing-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--warm), var(--warm-light));
    border-radius: 4px;
  }
}

.billing-note {
  font-size: 0.78rem;
  color: var(--muted);
  font-weight: 300;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;

  h3 {
    margin-bottom: 0.5rem;
  }

  p {
    color: var(--muted);
    font-weight: 300;
    margin-bottom: 1.5rem;
  }
}
</style>
