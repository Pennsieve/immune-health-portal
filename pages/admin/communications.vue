<script setup lang="ts">
definePageMeta({ layout: 'admin' })
</script>

<template>
  <div>
    <div class="page-hd">
      <div>
        <h1>Communications</h1>
        <div class="sub">Transactional emails triggered by the platform. Phase 1: two confirmation emails on intake submission.</div>
      </div>
      <div class="hd-actions">
        <button class="btn btn-secondary btn-sm">View MailerSend log</button>
      </div>
    </div>

    <div class="assume-banner">
      <strong>Phase 1 scope</strong>
      When a PI submits the intake form, two MailerSend emails fire automatically — one to the PI confirming receipt,
      one to I3H staff with a summary + a deep link into the inquiry queue. Both render below.
    </div>

    <div class="email-grid">
      <!-- PI confirmation -->
      <div class="email-card">
        <div class="email-head">
          <h4>PI confirmation</h4>
          <span class="etag">Auto · on intake submit</span>
        </div>
        <div class="email-meta">
          <div><span class="l">From: </span><span class="v">Immune Health &lt;noreply@immunehealth.science&gt;</span></div>
          <div><span class="l">To: </span><span class="v">&#123;&#123; pi.email &#125;&#125;</span></div>
          <div><span class="l">Cc: </span><span class="v">&#123;&#123; studyLead.email &#125;&#125;</span></div>
          <div><span class="l">Subject: </span><span class="v">We've received your I3H study inquiry — &#123;&#123; study.name &#125;&#125;</span></div>
        </div>
        <div class="email-body">
          <div class="em-brand-row">
            <div class="mark">I3H</div>
            <div class="name">Immune Health</div>
          </div>

          <h3>Thanks, Dr. Katona — we've received your inquiry.</h3>

          <p>Your study request for <strong>BHB ColCan</strong> has been submitted to the Institute for Immunology &amp; Immune Health. A member of our team will review feasibility and reach out within <strong>3 business days</strong> with next steps.</p>

          <div class="em-summary">
            <div class="r"><span class="l">Study</span><span class="v">BHB ColCan (BHB)</span></div>
            <div class="r"><span class="l">Principal Investigator</span><span class="v">Dr. Katona</span></div>
            <div class="r"><span class="l">Cohort scope</span><span class="v">20 subjects × 2 timepoints = 40 samples</span></div>
            <div class="r"><span class="l">Services requested</span><span class="v">PBMC, CyTOF MDIPA, Tier 1</span></div>
            <div class="r"><span class="l">Estimated total</span><span class="v">$27,250 (Penn internal rates)</span></div>
          </div>

          <p><strong>What happens next:</strong></p>
          <p style="margin:0.6rem 0 1rem 0;">
            1. I3H staff review feasibility and capacity.<br>
            2. If approved, you'll receive an agreement package (User Agreement, Rate Schedule, LabVantage form, Pennsieve agreement).<br>
            3. Once countersigned, your study is activated and we begin scheduling.
          </p>

          <span class="em-cta">View your inquiry status</span>

          <p class="em-signoff">
            Questions in the meantime? Reply to this email or reach out to<br>
            <strong>Lori Guercio</strong> · <span class="mono">lguercio@pennmedicine.upenn.edu</span>
          </p>

          <div class="em-legal">
            Institute for Immunology &amp; Immune Health · Perelman School of Medicine, University of Pennsylvania · 421 Curie Boulevard, Philadelphia, PA 19104.
            This message contains research operations information and is intended for the named recipient.
          </div>
        </div>
      </div>

      <!-- Staff alert -->
      <div class="email-card">
        <div class="email-head">
          <h4>I3H staff alert</h4>
          <span class="etag">Auto · on intake submit</span>
        </div>
        <div class="email-meta">
          <div><span class="l">From: </span><span class="v">Immune Health Platform &lt;noreply@immunehealth.science&gt;</span></div>
          <div><span class="l">To: </span><span class="v">intake@immunehealth.science</span></div>
          <div><span class="l">Cc: </span><span class="v">lguercio@pennmedicine.upenn.edu, khas@pennmedicine.upenn.edu</span></div>
          <div><span class="l">Subject: </span><span class="v">🆕 New inquiry — BHB ColCan · Dr. Katona · Internal</span></div>
        </div>
        <div class="email-body">
          <div class="em-brand-row">
            <div class="mark">I3H</div>
            <div class="name">Admin Console</div>
          </div>

          <h3>New study inquiry submitted</h3>

          <p style="font-size:0.86rem"><strong>BHB ColCan</strong> was just submitted by <strong>Dr. Katona</strong> (Penn Internal · Gastroenterology). Quick summary below — full intake is available in the console.</p>

          <div class="em-summary">
            <div class="r"><span class="l">Submitted</span><span class="v">May 12, 2026 · 11:02 AM</span></div>
            <div class="r"><span class="l">PI</span><span class="v">Dr. Katona · katona@pennmedicine.upenn.edu</span></div>
            <div class="r"><span class="l">Study lead</span><span class="v">John Smith · jsmith@pennmedicine.upenn.edu</span></div>
            <div class="r"><span class="l">Affiliation</span><span class="v">Penn Internal</span></div>
            <div class="r"><span class="l">IRB</span><span class="v">850567</span></div>
            <div class="r"><span class="l">Scope</span><span class="v">20 × 2 = 40 samples · fresh blood</span></div>
            <div class="r"><span class="l">Services</span><span class="v">PBMC, CyTOF MDIPA, Tier 1</span></div>
            <div class="r"><span class="l">Est. revenue</span><span class="v">$27,250</span></div>
            <div class="r"><span class="l">Budget code</span><span class="v">400-4661-1-605016-…-2459-0000</span></div>
          </div>

          <p style="font-size:0.86rem; margin:0.8rem 0 0"><strong>Objectives (PI's words):</strong></p>
          <p style="font-size:0.85rem; font-style:italic; color:#555; margin-bottom:1rem">
            "Investigation of beta-hydroxybutyrate (BHB) supplementation as a chemopreventive intervention for colorectal cancer.
            Quantify shifts in immune cell composition at baseline and 4 weeks post-supplementation."
          </p>

          <span class="em-cta">Open in Admin Console →</span>

          <p class="em-signoff" style="font-size:0.8rem">
            This is an automated alert from the Immune Health platform. Inquiry status, notes, and the full intake form are available in the console.
          </p>

          <div class="em-legal">
            Sent automatically by the I3H platform via MailerSend. To adjust who receives intake alerts, update the admin notification list in Settings.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
