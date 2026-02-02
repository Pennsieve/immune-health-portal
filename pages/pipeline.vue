<script setup lang="ts">
/**
 * Pipeline Page
 *
 * Detailed view of the I3H processing pipeline with expandable steps.
 */
import type { PipelineStep } from '~/types'

const openSteps = ref<string[]>([])

const toggleStep = (stepId: string) => {
  const index = openSteps.value.indexOf(stepId)
  if (index === -1) {
    openSteps.value.push(stepId)
  }
  else {
    openSteps.value.splice(index, 1)
  }
}

const isStepOpen = (stepId: string): boolean => {
  return openSteps.value.includes(stepId)
}

// Pipeline steps data - could be fetched from Contentful
const pipelineSteps: PipelineStep[] = [
  {
    id: 'step-1',
    number: '01',
    title: 'Peripheral Blood Draw & PBMC Isolation',
    description: 'Whole blood collected via standard phlebotomy, PBMCs isolated through density gradient centrifugation within the processing window.',
    timeTag: 'T + 0 min · Collection',
    theme: 'blue',
    icon: '🩸',
    qcMetrics: [
      { label: 'Processing Window', value: '≤ 4 hrs', context: 'Draw to isolation start' },
      { label: 'Typical Yield', value: '1–3 × 10⁶', context: 'PBMCs per mL whole blood' },
      { label: 'Collection Tubes', value: 'CPT / EDTA', context: 'Standardized across cohorts' },
    ],
    details: 'Standardized collection protocols ensure consistency across all patient cohorts. Samples are processed at I3H\'s dedicated facility with tracked chain-of-custody from draw to cryopreservation. Temperature controlled at room temp during transit – no cold-chain artifacts that would alter cell surface marker expression.',
    checklistItems: [
      'Ficoll-Paque density gradient centrifugation',
      'Automated cell counting via hemocytometer / Countess',
      'Red blood cell lysis QC (visual + scatter verification)',
      'Sample metadata captured at point of collection',
    ],
  },
  {
    id: 'step-2',
    number: '02',
    title: 'Sample Viability & Cell Quality Assessment',
    description: 'Rigorous viability gating ensures only high-quality, representative samples enter the profiling pipeline.',
    timeTag: 'T + 4 hrs · Viability QC',
    theme: 'green',
    icon: '🔬',
    qcMetrics: [
      { label: 'Viability Threshold', value: '≥ 85%', context: 'Minimum for pipeline entry', barPercentage: 85 },
      { label: 'Typical Viability', value: '92–96%', context: 'Fresh PBMC average', barPercentage: 94 },
      { label: 'Post-Thaw Viability', value: '88–93%', context: 'Cryopreserved samples', barPercentage: 90 },
    ],
    details: 'Viability is the single most critical QC checkpoint. Dead cells bind antibodies non-specifically, corrupting downstream data. I3H maintains viability well above the 85% minimum threshold through rapid processing, controlled thawing, and cisplatin-based dead cell exclusion during CyTOF staining.',
    checklistItems: [
      'Cisplatin (195Pt) live/dead discrimination on CyTOF',
      'Trypan blue exclusion for pre-stain counting',
      'Controlled thaw protocol for cryopreserved samples',
      'Viability gate applied before all downstream analysis',
      'Samples below threshold flagged and excluded with documentation',
    ],
  },
  {
    id: 'step-3',
    number: '03',
    title: 'Maxpar Direct Immune Profiling Assay (MDIPA)',
    description: 'Standardized lyophilized antibody cocktail – 30+ metal-conjugated markers measuring surface and intracellular proteins at single-cell resolution.',
    timeTag: 'T + 5 hrs · MDIPA Staining',
    theme: 'gold',
    icon: '🧪',
    qcMetrics: [
      { label: 'Panel Size', value: '30+', context: 'Metal-conjugated markers' },
      { label: 'Populations Resolved', value: '50', context: 'Immune cell subsets' },
      { label: 'Vendor', value: 'Standard BioTools', context: 'Sole source – lyophilized cocktail' },
    ],
    details: 'The MDIPA kit is the backbone of I3H\'s standardized profiling. As a pre-validated, lyophilized antibody cocktail, it eliminates lot-to-lot variability – critical for comparing results across thousands of patient visits spanning years.',
    checklistItems: [
      'No spectral overlap – mass cytometry uses metal isotope tags',
      'Batch-matched reagents across all cohorts',
      'Lineage, activation, and functional markers in single tube',
      'Intercalator (iridium) DNA stain for singlet discrimination',
      'EQ Four Element Calibration Beads for signal normalization',
    ],
    tags: ['CD3', 'CD4', 'CD8', 'CD19', 'CD56', 'CD14', 'CD16', 'CD45RA', 'CCR7', 'CD127', 'CD25', 'HLA-DR', 'CD38', 'CD27', 'IgD', '+ more'],
  },
  {
    id: 'step-4',
    number: '04',
    title: 'Mass Cytometry Data Acquisition',
    description: 'Cells are nebulized, ionized, and analyzed by time-of-flight mass spectrometry – 30+ parameters per cell at thousands of events per second.',
    timeTag: 'T + 8 hrs · CyTOF Acquisition',
    theme: 'red',
    icon: '⚡',
    qcMetrics: [
      { label: 'Events Target', value: '≥ 200K', context: 'Live singlet events per sample' },
      { label: 'Acquisition Rate', value: '300–500', context: 'Events / second' },
      { label: 'Output Format', value: 'FCS 3.1', context: 'Flow Cytometry Standard' },
    ],
    details: 'CyTOF acquisition is destructive – each cell is vaporized into heavy-metal ions and analyzed by mass spectrometry. This eliminates spectral overlap entirely. EQ beads run continuously for real-time calibration.',
    checklistItems: [
      'EQ bead normalization across acquisition runs',
      'Gaussian discrimination parameters for doublet removal',
      'Instrument tuning verified before each batch',
      'Signal stability monitored throughout acquisition',
    ],
  },
  {
    id: 'step-5',
    number: '05',
    title: 'Bead Normalization, Gating & QC',
    description: 'Raw FCS files undergo bead normalization, debris removal, and standardized gating before entering the analysis pipeline.',
    timeTag: 'T + 12 hrs · Data Processing',
    theme: 'teal',
    icon: '🧹',
    qcMetrics: [
      { label: 'FCS Files Processed', value: '4,000+', context: 'Annotated and QC\'d' },
      { label: 'Gating Strategy', value: 'Automated', context: 'Validated against manual expert' },
      { label: 'Correlation', value: 'High', context: 'Auto vs. immunologist gating' },
    ],
    details: 'I3H has developed a computational analysis approach that aligns with how immunologists think about the data. Validated against manual expert gating with strong correlation – scalable without sacrificing immunological rigor.',
    checklistItems: [
      'EQ bead removal and signal normalization',
      'Live/dead gating (cisplatin-negative)',
      'Singlet gating (DNA intercalator)',
      'CD45+ immune cell gating',
      'Automated population identification across 50 subsets',
      'Batch effect monitoring across acquisition runs',
    ],
  },
  {
    id: 'step-6',
    number: '06',
    title: 'Pennsieve Platform – Structured Data Management',
    description: 'Processed FCS files, annotations, and patient metadata organized in Pennsieve for discoverable, FAIR-compliant data management.',
    timeTag: 'T + 24 hrs · Data Integration',
    theme: 'purple',
    icon: '🗄️',
    qcMetrics: [
      { label: 'Data Objects', value: '4,000+', context: 'Annotated FCS files' },
      { label: 'Metadata Layers', value: 'Clinical + Lab', context: 'Linked to patient records' },
      { label: 'Access Control', value: 'Role-Based', context: 'HIPAA-aligned permissions' },
    ],
    details: 'Pennsieve provides the data management backbone – each FCS file is linked to its clinical metadata, processing provenance, and QC annotations, creating a queryable, cohort-spanning dataset.',
    checklistItems: [
      'FAIR data principles (Findable, Accessible, Interoperable, Reusable)',
      'Provenance tracking from blood draw through analysis',
      'Cross-cohort data discovery and comparison',
      'Integration with Penn EMR systems',
      'API access for computational workflows',
    ],
  },
  {
    id: 'step-7',
    number: '07',
    title: 'Immune Fingerprinting & Informatics',
    description: 'Comprehensive immune fingerprints – quantifying 50 populations to establish baselines, detect perturbations, and track longitudinal trajectories.',
    timeTag: 'T + 48 hrs · Analytics',
    theme: 'navy',
    icon: '📊',
    qcMetrics: [
      { label: 'Analysis Output', value: 'Immune Fingerprint', context: '50-population quantification' },
      { label: 'Cohort Comparison', value: 'Cross-Study', context: 'Standardized by MDIPA protocol' },
      { label: 'Integration', value: 'Multi-Modal', context: 'CyTOF + EMR + Clinical' },
    ],
    details: 'The final layer transforms population frequencies into actionable immune health profiles. Standardized upstream means fingerprints are directly comparable across patients, time points, and disease contexts.',
    checklistItems: [
      'Population frequency quantification across 50 immune subsets',
      'Activation state profiling (HLA-DR, CD38, Ki-67)',
      'Longitudinal trajectory tracking per patient',
      'Cohort-level distribution analysis',
      'Integration with clinical outcomes data',
      'Dashboard visualization for investigators',
    ],
  },
]

// Intersection observer for step animations
onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  )

  document.querySelectorAll('.timeline-step').forEach((step) => {
    observer.observe(step)
  })
})
</script>

<template>
  <div class="pipeline-page">
    <section class="section-header" style="padding-top: 6rem;">
      <span class="overline">The I3H Pipeline</span>
      <h2>Every Step Documented, Every Metric Tracked</h2>
      <p>Click any stage to expand its QC parameters, processing details, and quality benchmarks.</p>
    </section>

    <div class="timeline-container">
      <div
        v-for="step in pipelineSteps"
        :key="step.id"
        class="timeline-step"
        :class="`theme-${step.theme}`"
      >
        <div class="timeline-node">
          {{ step.number }}
        </div>

        <div class="step-card" :class="{ open: isStepOpen(step.id) }">
          <div class="step-header" @click="toggleStep(step.id)">
            <div class="step-icon">
              {{ step.icon }}
            </div>
            <div class="step-info">
              <span class="time-tag">{{ step.timeTag }}</span>
              <h3>{{ step.title }}</h3>
              <p class="step-desc">
                {{ step.description }}
              </p>
            </div>
            <div class="step-toggle">
              <svg viewBox="0 0 12 12">
                <polyline points="2,4 6,8 10,4" />
              </svg>
            </div>
          </div>

          <div class="step-detail">
            <div class="step-detail-inner">
              <div v-if="step.qcMetrics" class="qc-grid">
                <div v-for="metric in step.qcMetrics" :key="metric.label" class="qc-card">
                  <span class="qc-label">{{ metric.label }}</span>
                  <span class="qc-value">{{ metric.value }}</span>
                  <span v-if="metric.context" class="qc-context">{{ metric.context }}</span>
                  <div v-if="metric.barPercentage" class="qc-bar">
                    <div
                      class="qc-bar-fill"
                      :style="{ width: `${metric.barPercentage}%`, background: 'var(--theme-color, var(--green-light))' }"
                    />
                  </div>
                </div>
              </div>

              <p class="detail-text">
                {{ step.details }}
              </p>

              <ul v-if="step.checklistItems" class="detail-list">
                <li v-for="item in step.checklistItems" :key="item">
                  <span class="check">✓</span>
                  {{ item }}
                </li>
              </ul>

              <div v-if="step.tags" class="tag-row">
                <span v-for="tag in step.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Strip -->
    <div class="summary-strip">
      <div class="summary-inner">
        <span class="overline">Why This Matters</span>
        <h2>One Pipeline. One Panel. Thousands of Comparable Profiles.</h2>

        <div class="end-metrics">
          <div class="end-metric">
            <span class="num">4,000+</span>
            <span class="label">Visits profiled with identical protocol</span>
          </div>
          <div class="end-metric">
            <span class="num">50</span>
            <span class="label">Immune populations per fingerprint</span>
          </div>
          <div class="end-metric">
            <span class="num">&lt; 48h</span>
            <span class="label">Blood draw to analyzed fingerprint</span>
          </div>
          <div class="end-metric">
            <span class="num">0%</span>
            <span class="label">Spectral overlap (mass cytometry)</span>
          </div>
          <div class="end-metric">
            <span class="num">≥ 85%</span>
            <span class="label">Viability threshold for pipeline entry</span>
          </div>
          <div class="end-metric">
            <span class="num">FAIR</span>
            <span class="label">Data managed on Pennsieve platform</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.timeline-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 2rem 6rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 40px;
    top: 0;
    bottom: 0;
    width: var(--timeline-width);
    background: linear-gradient(
      to bottom,
      var(--accent-light),
      var(--green-light),
      var(--gold-light),
      var(--warm-light)
    );
    border-radius: 2px;
  }

  @media (max-width: 700px) {
    &::before {
      left: 20px;
    }
  }
}

.timeline-step {
  position: relative;
  padding-left: 90px;
  margin-bottom: 2rem;
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s ease, transform 0.6s ease;

  &.visible {
    opacity: 1;
    transform: translateY(0);
  }

  @media (max-width: 700px) {
    padding-left: 60px;
  }
}

.timeline-node {
  position: absolute;
  left: 24px;
  top: 1.6rem;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  font-weight: 500;
  color: #fff;
  z-index: 2;
  box-shadow: 0 0 0 5px var(--paper);
  background: var(--theme-color, var(--accent));

  @media (max-width: 700px) {
    left: 4px;
    width: 30px;
    height: 30px;
    font-size: 0.6rem;
  }
}

.step-card {
  background: var(--card);
  border-radius: 12px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.step-header {
  padding: 1.5rem 2rem;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  gap: 1.2rem;
  transition: background 0.2s;
  user-select: none;

  &:hover {
    background: rgba(0, 0, 0, 0.015);
  }

  @media (max-width: 700px) {
    padding: 1.2rem;
    flex-wrap: wrap;
  }
}

.step-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  flex-shrink: 0;
  margin-top: 2px;
  background: var(--theme-bg, rgba(26, 82, 118, 0.08));
}

.step-info {
  flex: 1;
  min-width: 0;

  h3 {
    font-size: 1.15rem;
    font-weight: 600;
    margin-bottom: 0.3rem;
    line-height: 1.3;
  }
}

.time-tag {
  display: inline-block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  font-weight: 500;
  padding: 0.15rem 0.6rem;
  border-radius: 4px;
  margin-bottom: 0.4rem;
  background: var(--theme-bg, rgba(26, 82, 118, 0.08));
  color: var(--theme-color, var(--accent));
}

.step-desc {
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.5;
  font-weight: 300;
}

.step-toggle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 8px;
  transition: all 0.3s;

  svg {
    width: 12px;
    height: 12px;
    stroke: var(--muted);
    stroke-width: 2.5;
    fill: none;
    transition: transform 0.3s;
  }
}

.step-card.open .step-toggle {
  border-color: var(--accent-light);
  background: var(--accent-light);

  svg {
    stroke: #fff;
    transform: rotate(180deg);
  }
}

.step-detail {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-card.open .step-detail {
  max-height: 2000px;
}

.step-detail-inner {
  padding: 0 2rem 2rem 2rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding-top: 1.5rem;

  @media (max-width: 700px) {
    padding: 0 1.2rem 1.5rem;
    padding-top: 1.2rem;
  }
}

.qc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
}

.qc-card {
  background: var(--paper);
  border-radius: 8px;
  padding: 1rem 1.2rem;
  border: 1px solid rgba(0, 0, 0, 0.04);

  .qc-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
    font-weight: 600;
    margin-bottom: 0.3rem;
    display: block;
  }

  .qc-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.5rem;
    font-weight: 500;
    line-height: 1.2;
    display: block;
    color: var(--theme-color, var(--accent));
  }

  .qc-context {
    font-size: 0.78rem;
    color: var(--muted);
    margin-top: 0.2rem;
    font-weight: 300;
    display: block;
  }
}

.detail-text {
  font-size: 0.9rem;
  color: #555;
  line-height: 1.7;
  font-weight: 300;

  strong {
    font-weight: 600;
    color: var(--ink);
  }
}

.detail-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0;

  li {
    font-size: 0.88rem;
    color: #555;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    font-weight: 300;

    &:last-child {
      border-bottom: none;
    }

    .check {
      color: var(--green);
      font-weight: 700;
      font-size: 0.85rem;
      flex-shrink: 0;
    }
  }
}

// Theme colors
.theme-blue {
  --theme-color: var(--accent);
  --theme-bg: rgba(26, 82, 118, 0.08);
}

.theme-green {
  --theme-color: var(--green);
  --theme-bg: rgba(26, 122, 76, 0.08);
}

.theme-gold {
  --theme-color: var(--gold);
  --theme-bg: rgba(183, 149, 11, 0.08);
}

.theme-red {
  --theme-color: var(--warm);
  --theme-bg: rgba(192, 57, 43, 0.08);
}

.theme-teal {
  --theme-color: #117a65;
  --theme-bg: rgba(17, 122, 101, 0.08);
}

.theme-purple {
  --theme-color: #6c3483;
  --theme-bg: rgba(108, 52, 131, 0.08);
}

.theme-navy {
  --theme-color: #1b2631;
  --theme-bg: rgba(27, 38, 49, 0.08);
}

// Summary strip
.summary-strip {
  background: var(--ink);
  color: #fff;
  padding: 5rem 2rem;
}

.summary-inner {
  max-width: 900px;
  margin: 0 auto;
  text-align: center;

  .overline {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: rgba(255, 255, 255, 0.35);
    font-weight: 600;
    display: block;
    margin-bottom: 1rem;
  }

  h2 {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    font-weight: 400;
    margin-bottom: 2.5rem;
    line-height: 1.3;
    color: rgba(255, 255, 255, 0.9);
  }
}

.end-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1.5rem;
}

.end-metric {
  padding: 1.5rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);

  .num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.6rem;
    font-weight: 500;
    display: block;
    margin-bottom: 0.3rem;
  }

  .label {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.45);
    font-weight: 300;
  }
}
</style>
