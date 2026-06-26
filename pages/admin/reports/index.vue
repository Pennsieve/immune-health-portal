<script setup lang="ts">
definePageMeta({ layout: 'admin' })

interface QcRecord {
  study: string
  collectionTime: string
  yield: number | null
  viability: number | null
}

interface QcData {
  configured: boolean
  records: QcRecord[]
}

const { data, pending, error } = await useFetch<QcData>('/api/admin/redcap-qc')

const yieldScatterEl = ref<HTMLCanvasElement | null>(null)
const yieldBoxEl = ref<HTMLCanvasElement | null>(null)
const viabilityScatterEl = ref<HTMLCanvasElement | null>(null)
const viabilityBoxEl = ref<HTMLCanvasElement | null>(null)

const COLORS = [
  '#011F5B', '#0d7377', '#B7960B', '#c0392b', '#8e44ad',
  '#16a085', '#d35400', '#2980b9', '#27ae60', '#e74c3c',
  '#f39c12', '#1abc9c', '#e91e63', '#607d8b',
]

function parseRcDate(s: string): number {
  if (!s) return NaN
  const [date, time = '00:00'] = s.split(' ')
  const [hh, min] = time.split(':')
  if (date.includes('-')) {
    // YYYY-MM-DD (REDCap internal storage format)
    const [yyyy, mm, dd] = date.split('-')
    return new Date(+yyyy, +mm - 1, +dd, +(hh || 0), +(min || 0)).getTime()
  }
  // MM/DD/YYYY
  const [mm, dd, yyyy] = date.split('/')
  return new Date(+yyyy, +mm - 1, +dd, +(hh || 0), +(min || 0)).getTime()
}

function formatTs(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTsLong(ms: number): string {
  return new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const chartInstances: { destroy(): void }[] = []

onMounted(async () => {
  if (!data.value?.configured || !data.value.records.length) return

  const { Chart, registerables } = await import('chart.js')
  const { BoxPlotController, BoxAndWiskers } = await import('@sgratzl/chartjs-chart-boxplot')
  Chart.register(...registerables, BoxPlotController, BoxAndWiskers)

  const records = data.value.records
  const studies = [...new Set(records.map(r => r.study))]

  const baseScatterOpts = (yLabel: string, beginAtZero = true) => ({
    animation: false as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { boxWidth: 8, padding: 10, font: { size: 10 } },
      },
      tooltip: {
        callbacks: {
          title: (items: { parsed: { x: number } }[]) => formatTsLong(items[0].parsed.x),
          label: (ctx: { dataset: { label: string }; parsed: { y: number } }) =>
            `${ctx.dataset.label}: ${ctx.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        title: { display: true, text: 'Collection date', font: { size: 11 } },
        ticks: {
          maxTicksLimit: 5,
          callback: (v: unknown) => formatTs(v as number),
        },
      },
      y: {
        title: { display: true, text: yLabel, font: { size: 11 } },
        beginAtZero,
      },
    },
  })

  const externalTooltip = ({ chart, tooltip }: {
    chart: { canvas: HTMLCanvasElement }
    tooltip: { opacity: number; title?: string[]; body?: { lines: string[] }[]; caretX: number; caretY: number }
  }) => {
    let el = document.getElementById('qc-chart-tooltip')
    if (!el) {
      el = document.createElement('div')
      el.id = 'qc-chart-tooltip'
      Object.assign(el.style, {
        position: 'fixed',
        background: 'rgba(0,0,0,0.78)',
        color: '#fff',
        padding: '6px 10px',
        borderRadius: '5px',
        fontSize: '12px',
        lineHeight: '1.6',
        pointerEvents: 'none',
        zIndex: '9999',
        whiteSpace: 'nowrap',
        transition: 'opacity 0.1s',
      })
      document.body.appendChild(el)
    }

    if (tooltip.opacity === 0) {
      el.style.opacity = '0'
      return
    }

    const lines: string[] = []
    if (tooltip.title?.length) lines.push(`<strong>${tooltip.title[0]}</strong>`)
    tooltip.body?.forEach(b => b.lines.forEach(l => lines.push(l)))
    el.innerHTML = lines.join('<br>')

    const rect = chart.canvas.getBoundingClientRect()
    const x = rect.left + tooltip.caretX + 12
    const y = rect.top + tooltip.caretY - el.offsetHeight / 2
    el.style.opacity = '1'
    el.style.left = `${x}px`
    el.style.top = `${y}px`
  }

  const baseBoxOpts = (yLabel: string, beginAtZero = true) => ({
    animation: false as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false, external: externalTooltip as never },
    },
    scales: {
      x: { ticks: { font: { size: 10 }, maxRotation: 40 } },
      y: {
        title: { display: true, text: yLabel, font: { size: 11 } },
        beginAtZero,
      },
    },
  })

  // Yield — scatter over time
  if (yieldScatterEl.value) {
    const datasets = studies.map((study, i) => ({
      label: study,
      data: records
        .filter(r => r.study === study && r.yield !== null)
        .map(r => ({ x: parseRcDate(r.collectionTime), y: r.yield! }))
        .filter(p => !isNaN(p.x)),
      backgroundColor: COLORS[i % COLORS.length] + 'bb',
      borderColor: 'transparent',
      pointRadius: 5,
      pointHoverRadius: 7,
    }))
    chartInstances.push(new Chart(yieldScatterEl.value, {
      type: 'scatter',
      data: { datasets },
      options: baseScatterOpts('10⁶ cells / mL blood'),
    }))
  }

  // Yield — box plot by study
  if (yieldBoxEl.value) {
    const studiesY = studies.filter(s => records.some(r => r.study === s && r.yield !== null))
    chartInstances.push(new Chart(yieldBoxEl.value as never, {
      type: 'boxplot' as never,
      data: {
        labels: studiesY,
        datasets: [{
          label: 'Yield',
          data: studiesY.map(s =>
            records.filter(r => r.study === s && r.yield !== null).map(r => r.yield!),
          ),
          backgroundColor: COLORS.map(c => c + '44'),
          borderColor: COLORS,
          borderWidth: 1.5,
          outlierRadius: 3,
        }],
      },
      options: baseBoxOpts('10⁶ cells / mL blood'),
    } as never))
  }

  // Viability — scatter over time
  if (viabilityScatterEl.value) {
    const datasets = studies.map((study, i) => ({
      label: study,
      data: records
        .filter(r => r.study === study && r.viability !== null)
        .map(r => ({ x: parseRcDate(r.collectionTime), y: r.viability! }))
        .filter(p => !isNaN(p.x)),
      backgroundColor: COLORS[i % COLORS.length] + 'bb',
      borderColor: 'transparent',
      pointRadius: 5,
      pointHoverRadius: 7,
    }))
    chartInstances.push(new Chart(viabilityScatterEl.value, {
      type: 'scatter',
      data: { datasets },
      options: baseScatterOpts('Viability (%)', false),
    }))
  }

  // Viability — box plot by study
  if (viabilityBoxEl.value) {
    const studiesV = studies.filter(s => records.some(r => r.study === s && r.viability !== null))
    chartInstances.push(new Chart(viabilityBoxEl.value as never, {
      type: 'boxplot' as never,
      data: {
        labels: studiesV,
        datasets: [{
          label: 'Viability',
          data: studiesV.map(s =>
            records.filter(r => r.study === s && r.viability !== null).map(r => r.viability!),
          ),
          backgroundColor: COLORS.map(c => c + '44'),
          borderColor: COLORS,
          borderWidth: 1.5,
          outlierRadius: 3,
        }],
      },
      options: baseBoxOpts('Viability (%)', false),
    } as never))
  }
})

onUnmounted(() => {
  chartInstances.forEach(c => c.destroy())
  document.getElementById('qc-chart-tooltip')?.remove()
})
</script>

<template>
  <div>
    <div class="page-hd">
      <div>
        <h1>Reports</h1>
        <div class="sub">PBMC QC · cross-study metrics from REDCap</div>
      </div>
      <div style="display:flex; align-items:center; gap:0.6rem;">
        <span v-if="data?.configured" class="adm-badge b-complete">
          <span class="dot" /> REDCap connected
        </span>
        <span v-else-if="!pending" class="adm-badge b-muted">
          <span class="dot" /> REDCap not configured
        </span>
      </div>
    </div>

    <!-- Not configured -->
    <div v-if="!pending && !error && !data?.configured" class="panel qc-empty-panel">
      <p>
        REDCap integration is not configured. Add <code>REDCAP_API_URL</code> and
        <code>REDCAP_API_TOKEN</code> to your environment to enable QC charts.
      </p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="panel qc-empty-panel" style="color: var(--warm);">
      <p>Failed to load REDCap data. Check server logs for details.</p>
    </div>

    <!-- Loading -->
    <div v-else-if="pending" class="qc-loading">
      Loading QC data…
    </div>

    <!-- No records -->
    <div v-else-if="!data?.records.length" class="panel qc-empty-panel">
      <p style="color: var(--muted);">No QC records found in REDCap.</p>
    </div>

    <!-- Charts -->
    <template v-else>
      <div class="qc-section-label">PBMC Yield</div>
      <div class="qc-chart-row">
        <div class="panel">
          <div class="panel-head">
            <h3>PBMCs recovered per mL whole blood <span class="ctx">over time</span></h3>
          </div>
          <div class="qc-chart-wrap">
            <canvas ref="yieldScatterEl" />
          </div>
        </div>
        <div class="panel">
          <div class="panel-head">
            <h3>PBMCs recovered per mL whole blood <span class="ctx">by study</span></h3>
          </div>
          <div class="qc-chart-wrap">
            <canvas ref="yieldBoxEl" />
          </div>
        </div>
      </div>

      <div class="qc-section-label">Viability</div>
      <div class="qc-chart-row">
        <div class="panel">
          <div class="panel-head">
            <h3>Viability prior to cryopreservation <span class="ctx">over time</span></h3>
          </div>
          <div class="qc-chart-wrap">
            <canvas ref="viabilityScatterEl" />
          </div>
        </div>
        <div class="panel">
          <div class="panel-head">
            <h3>Viability prior to cryopreservation <span class="ctx">by study</span></h3>
          </div>
          <div class="qc-chart-wrap">
            <canvas ref="viabilityBoxEl" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
