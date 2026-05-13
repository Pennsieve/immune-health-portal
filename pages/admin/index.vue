<script setup lang="ts">
import { useAdminStore } from '~/stores/admin'

definePageMeta({ layout: 'admin' })

const adminStore = useAdminStore()
</script>

<template>
  <div>
    <div class="page-hd">
      <div>
        <h1>Good afternoon, Lori.</h1>
        <div class="sub">Wednesday, May 12, 2026 · {{ adminStore.studies.length }} active studies across the platform</div>
      </div>
      <div class="hd-actions">
        <button class="btn btn-secondary btn-sm">↻ Refresh</button>
        <NuxtLink to="/admin/inquiries" class="btn btn-primary btn-sm">
          Review {{ adminStore.newInquiriesCount }} inquiries →
        </NuxtLink>
      </div>
    </div>

    <div class="assume-banner">
      <strong>Design note — mockup data</strong>
      All numbers are illustrative. The Dashboard reads from
      <span class="mono">studies</span>, <span class="mono">agreements</span>,
      <span class="mono">samples</span>, and <span class="mono">processing_events</span>.
      KPIs update on intake submission and every processing event log.
    </div>

    <!-- KPI tiles -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-lbl">Active studies</div>
        <div class="kpi-val">14</div>
        <div class="kpi-ctx"><span class="delta-up">+2</span> this month</div>
      </div>
      <div class="kpi-card warn">
        <div class="kpi-lbl">Pending review</div>
        <div class="kpi-val">4</div>
        <div class="kpi-ctx">Oldest: 6 days ·
          <NuxtLink to="/admin/inquiries" class="alert-act" style="font-size:0.74rem; color:var(--penn-blue); font-weight:600; text-decoration:none; &:hover{text-decoration:underline}">Review queue</NuxtLink>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Awaiting signature</div>
        <div class="kpi-val">7</div>
        <div class="kpi-ctx">across 3 studies · 1 overdue</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Samples processed (YTD)</div>
        <div class="kpi-val">412</div>
        <div class="kpi-ctx"><span class="delta-up">+38</span> last 30 days</div>
      </div>
    </div>

    <!-- Alerts -->
    <div class="alerts-strip">
      <div class="alert-row error">
        <span class="adm-badge b-warn"><span class="dot" /> Overdue</span>
        <span><strong>BHB ColCan</strong> — User Agreement sent 11 days ago, no signature.</span>
        <span class="alert-meta">May 01</span>
        <NuxtLink to="/admin/studies/bhb-colcan" class="alert-act">Open study →</NuxtLink>
      </div>
      <div class="alert-row">
        <span class="adm-badge b-review"><span class="dot" /> Needs Action</span>
        <span>4 new intake submissions are awaiting feasibility review.</span>
        <span class="alert-meta">today</span>
        <NuxtLink to="/admin/inquiries" class="alert-act">Open queue →</NuxtLink>
      </div>
      <div class="alert-row info">
        <span class="adm-badge b-internal"><span class="dot" /> FYI</span>
        <span>PRINCE-Val processing run scheduled tomorrow. 12 samples in batch.</span>
        <span class="alert-meta">May 13</span>
        <NuxtLink to="/admin/studies/prince-val" class="alert-act">View schedule →</NuxtLink>
      </div>
    </div>

    <!-- Two-column -->
    <div class="dash-cols">
      <!-- Recent activity -->
      <div class="panel">
        <div class="panel-head">
          <h3>Recent activity</h3>
          <span class="ctx">Last 7 days</span>
        </div>
        <div class="panel-body">
          <div class="panel-row">
            <div>
              <div class="row-pri">Agreement signed — Rate Schedule</div>
              <div class="row-sec">SURGE-Christie · Dr. Christie countersigned</div>
            </div>
            <div class="row-right">
              <span class="adm-badge b-complete"><span class="dot" /> Signed</span>
              <span class="row-when">2h ago</span>
            </div>
          </div>
          <div class="panel-row">
            <div>
              <div class="row-pri">New intake submitted</div>
              <div class="row-sec">APEX-Merck · Dr. Wilson · industry</div>
            </div>
            <div class="row-right">
              <span class="adm-badge b-review"><span class="dot" /> Review</span>
              <span class="row-when">4h ago</span>
            </div>
          </div>
          <div class="panel-row">
            <div>
              <div class="row-pri">14 processing events logged</div>
              <div class="row-sec">TITAN-Harvard · CyTOF acquisition batch #B-2026-018</div>
            </div>
            <div class="row-right">
              <span class="adm-badge b-processing"><span class="dot" /> Processing</span>
              <span class="row-when">yesterday</span>
            </div>
          </div>
          <div class="panel-row">
            <div>
              <div class="row-pri">Samples received</div>
              <div class="row-sec">PRINCE-Val · 12 PBMC vials, drop-off 9:15 AM</div>
            </div>
            <div class="row-right">
              <span class="adm-badge b-internal"><span class="dot" /> Drop-off</span>
              <span class="row-when">2d ago</span>
            </div>
          </div>
          <div class="panel-row">
            <div>
              <div class="row-pri">Pennsieve dataset linked</div>
              <div class="row-sec">TITAN-Harvard · N:dataset:0a83…cc11</div>
            </div>
            <div class="row-right">
              <span class="adm-badge b-complete"><span class="dot" /> Linked</span>
              <span class="row-when">3d ago</span>
            </div>
          </div>
          <div class="panel-row">
            <div>
              <div class="row-pri">Agreement countersigned</div>
              <div class="row-sec">PRINCE-Val · LabVantage Form · PI notified</div>
            </div>
            <div class="row-right">
              <span class="adm-badge b-complete"><span class="dot" /> Signed</span>
              <span class="row-when">4d ago</span>
            </div>
          </div>
        </div>
        <div class="panel-foot">
          <span class="ctx">Showing 6 of 47 events</span>
          <button class="link-btn">View activity log →</button>
        </div>
      </div>

      <!-- Right column -->
      <div style="display:flex; flex-direction:column; gap:1.2rem;">
        <div class="panel">
          <div class="panel-head"><h3>Studies by stage</h3></div>
          <div class="panel-body">
            <div class="panel-row">
              <div><div class="row-pri">Intake review</div><div class="row-sec">awaiting feasibility</div></div>
              <div class="row-right">
                <span class="mono" style="font-size:1.1rem; font-weight:500; color:var(--gold)">4</span>
              </div>
            </div>
            <div class="panel-row">
              <div><div class="row-pri">Agreements out</div><div class="row-sec">awaiting PI signature</div></div>
              <div class="row-right">
                <span class="mono" style="font-size:1.1rem; font-weight:500; color:var(--teal)">3</span>
              </div>
            </div>
            <div class="panel-row">
              <div><div class="row-pri">Active processing</div><div class="row-sec">samples being run</div></div>
              <div class="row-right">
                <span class="mono" style="font-size:1.1rem; font-weight:500; color:var(--accent)">7</span>
              </div>
            </div>
            <div class="panel-row">
              <div><div class="row-pri">Data delivery</div><div class="row-sec">on Pennsieve, complete</div></div>
              <div class="row-right">
                <span class="mono" style="font-size:1.1rem; font-weight:500; color:var(--green)">4</span>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3>Processing throughput</h3>
            <span class="ctx">Samples / week</span>
          </div>
          <div class="panel-body" style="padding:1rem 1.4rem 1.4rem">
            <svg viewBox="0 0 320 110" style="width:100%; height:130px;">
              <defs>
                <linearGradient id="bgrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stop-color="#011f5b" stop-opacity="0.85" />
                  <stop offset="100%" stop-color="#011f5b" stop-opacity="0.4" />
                </linearGradient>
              </defs>
              <line x1="0" y1="30" x2="320" y2="30" stroke="#000" stroke-opacity="0.05" />
              <line x1="0" y1="60" x2="320" y2="60" stroke="#000" stroke-opacity="0.05" />
              <line x1="0" y1="90" x2="320" y2="90" stroke="#000" stroke-opacity="0.05" />
              <rect x="10"  y="55" width="22" height="40" rx="2" fill="url(#bgrad)" />
              <rect x="44"  y="38" width="22" height="57" rx="2" fill="url(#bgrad)" />
              <rect x="78"  y="62" width="22" height="33" rx="2" fill="url(#bgrad)" />
              <rect x="112" y="22" width="22" height="73" rx="2" fill="url(#bgrad)" />
              <rect x="146" y="48" width="22" height="47" rx="2" fill="url(#bgrad)" />
              <rect x="180" y="10" width="22" height="85" rx="2" fill="url(#bgrad)" />
              <rect x="214" y="28" width="22" height="67" rx="2" fill="url(#bgrad)" />
              <rect x="248" y="18" width="22" height="77" rx="2" fill="#0d7377" />
              <rect x="282" y="40" width="22" height="55" rx="2" fill="#0d7377" fill-opacity="0.5" />
              <line x1="0" y1="95" x2="320" y2="95" stroke="#000" stroke-opacity="0.15" />
            </svg>
            <div style="display:flex; justify-content:space-between; font-size:0.65rem; color:var(--muted); font-family:'JetBrains Mono',monospace; margin-top:0.3rem;">
              <span>W11</span><span>W12</span><span>W13</span><span>W14</span><span>W15</span><span>W16</span><span>W17</span><span>W18</span><span>this</span>
            </div>
            <div style="margin-top:0.7rem; font-size:0.78rem; color:var(--muted);">
              Avg <strong style="color:var(--ink)">38/wk</strong> · Peak <strong style="color:var(--ink)">62</strong> (W16)
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
