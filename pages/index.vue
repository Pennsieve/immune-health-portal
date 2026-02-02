<script setup lang="ts">
/**
 * Home Page
 *
 * Landing page with hero section, how it works overview, team showcase,
 * and partnership callout.
 */
import { useAuthStore } from '~/stores/auth'
import { useLoginModal } from '~/composables/useLoginModal'

const authStore = useAuthStore()
const { openLoginModal } = useLoginModal()

// Team data - could be fetched from Contentful
const teamMembers = [
  {
    initials: 'AG',
    name: 'Allie Greenplate, PhD',
    role: 'Director, Strategic Alliance',
    color: 'var(--accent)',
    bio: 'Architect of the I3H profiling platform – built the standardized pipeline from early concept to 4,000+ visits. Now focuses on strategic partnerships across pharma, biotech and academia, shaping the scientific direction of cross-institutional collaborations.',
    email: 'Allie.Greenplate@pennmedicine.upenn.edu',
  },
  {
    initials: 'AB',
    name: 'Amy Baxter, DPhil',
    role: 'Scientific Director – Research & Assay Development',
    color: 'var(--teal)',
    bio: 'Drives assay development and research strategy for Immune Health – designing, testing and validating new assays, optimizing protocols and integrating the profiling pipeline into research studies.',
    email: 'Amy.Baxter@pennmedicine.upenn.edu',
  },
  {
    initials: 'SA',
    name: 'Sharon Adamski, MS',
    role: 'Biospecimen Processing',
    color: 'var(--green)',
    bio: 'Manages end-to-end sample processing – from blood draw through PBMC isolation and cryopreservation. Maintains QC standards and chain-of-custody integrity across all active cohorts.',
    email: 'sadamski@pennmedicine.upenn.edu',
  },
  {
    initials: 'MM',
    name: 'Michelle McKeague, PhD',
    role: 'Platforms & Operations',
    color: 'var(--gold)',
    bio: 'Manages platform operations and investigator onboarding – scaling research assays into high throughput platforms approaches and coordinating new studies from initial consultation through sample receipt.',
    email: 'Michelle.Mckeague@pennmedicine.upenn.edu',
  },
  {
    initials: 'JW',
    name: 'Joost Wagenaar, PhD',
    role: 'Data Management – Pennsieve',
    color: '#6c3483',
    bio: 'Architect of the Pennsieve data platform at Penn. Leads FAIR-compliant data infrastructure connecting FCS files, clinical metadata, and provenance tracking across all I3H cohorts.',
    email: 'joostw@seas.upenn.edu',
  },
  {
    initials: 'MI',
    name: 'Matei Ionita',
    role: 'Data Analytics',
    color: '#1b2631',
    bio: 'Develops the computational gating and "immune fingerprinting" algorithms – validated against expert immunologist gating – that turn raw data into individual immune profiles.',
    email: 'matei.ionita@pennmedicine.upenn.edu',
  },
]

const handleStartProject = () => {
  if (authStore.isSignedIn) {
    navigateTo('/intake')
  }
  else {
    openLoginModal('Please sign in to start a project', '/intake')
  }
}
</script>

<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="home-hero">
      <div class="hero-badge">
        <span class="dot" />
        Penn's Institute for Immunology & Immune Health
      </div>

      <h1>Standardized <em>Immune Profiling</em> from Blood Draw to Insight</h1>

      <p class="hero-sub">
        High-dimensional CyTOF and spectral flow cytometry with integrated data management on Pennsieve. One pipeline. Thousands of comparable profiles.
      </p>

      <div class="hero-actions">
        <button class="btn btn-primary hero-btn" @click="handleStartProject">
          Submit a New Study
        </button>
        <NuxtLink to="/pipeline" class="btn btn-secondary hero-btn-outline">
          See How It Works
        </NuxtLink>
      </div>

      <div class="hero-metrics">
        <div class="hero-metric">
          <span class="num">4,000+</span>
          <span class="label">Patient Visits Profiled</span>
        </div>
        <div class="hero-metric">
          <span class="num">50</span>
          <span class="label">Immune Populations</span>
        </div>
        <div class="hero-metric">
          <span class="num">30+</span>
          <span class="label">MDIPA Markers</span>
        </div>
        <div class="hero-metric">
          <span class="num">&lt;48h</span>
          <span class="label">Draw → Analysis</span>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="section-header">
      <span class="overline">Your Project Journey</span>
      <h2>From Inquiry to Immune Fingerprint</h2>
      <p>Four phases connect your research question to a fully analyzed, QC-validated immune profile on Pennsieve.</p>
    </section>

    <div class="pipeline-flow">
      <div class="pipe-step">
        <div class="pipe-num" style="background: var(--accent)">
          1
        </div>
        <h4>Intake & Agreement</h4>
        <p>Submit your study details. We review scope, discuss objectives, and formalize a User Agreement.</p>
        <span class="arrow">→</span>
      </div>
      <div class="pipe-step">
        <div class="pipe-num" style="background: var(--teal)">
          2
        </div>
        <h4>Sample Processing</h4>
        <p>Blood draw, PBMC isolation, and sample prep – standardized SOPs with chain-of-custody tracking.</p>
        <span class="arrow">→</span>
      </div>
      <div class="pipe-step">
        <div class="pipe-num" style="background: var(--green)">
          3
        </div>
        <h4>CyTOF & Analysis</h4>
        <p>MDIPA staining, CyTOF acquisition, EQ normalization, automated gating, and QC.</p>
        <span class="arrow">→</span>
      </div>
      <div class="pipe-step">
        <div class="pipe-num" style="background: var(--gold)">
          4
        </div>
        <h4>Dashboard & Delivery</h4>
        <p>Track progress in real time. FCS files, QC reports, and Tier 1 analysis on your Pennsieve dashboard.</p>
      </div>
    </div>

    <!-- Partnership Callout -->
    <div class="partnership-callout">
      <div class="partnership-inner">
        <div class="pi-text">
          <h3>Partnership Opportunities</h3>
          <p>We work with academic institutions, biotech, and pharma partners to advance immune profiling research. If you're exploring a collaboration that leverages our standardized pipeline and 4,000+ patient dataset, we'd welcome a conversation.</p>
        </div>
        <div class="pi-action">
          <a href="mailto:lguercio@pennmedicine.upenn.edu?subject=Immune Health Partnership Inquiry">
            Contact Partnerships →
          </a>
        </div>
      </div>
    </div>

    <!-- Team Section -->
    <section class="section-header">
      <span class="overline">The Science Team</span>
      <h2>Expertise Behind the Pipeline</h2>
      <p>Every sample is handled by specialists who've collectively built and validated the profiling platform across thousands of patients.</p>
    </section>

    <div class="team-grid">
      <div v-for="member in teamMembers" :key="member.email" class="team-card">
        <div class="team-top">
          <div class="team-avatar" :style="{ background: member.color }">
            {{ member.initials }}
          </div>
          <div>
            <div class="team-name">
              {{ member.name }}
            </div>
            <div class="team-role">
              {{ member.role }}
            </div>
          </div>
        </div>
        <div class="team-blurb">
          {{ member.bio }}
        </div>
        <span class="team-email">{{ member.email }}</span>
      </div>
    </div>

    <div class="team-contacts">
      <div class="team-contacts-inner">
        <div class="team-contact-pill">
          <span class="pill-role">Partnerships</span>
          <span class="pill-dot" />
          <span class="pill-name">Leonardo Guercio · lguercio@pennmedicine.upenn.edu</span>
        </div>
        <div class="team-contact-pill">
          <span class="pill-role">Billing</span>
          <span class="pill-dot" />
          <span class="pill-name">Kenneth Hassinger · khas@pennmedicine.upenn.edu</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.home-hero {
  min-height: 85vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 4rem 2rem;
  position: relative;
  background: linear-gradient(175deg, #0a0f1a 0%, #1a3a5c 45%, #1a5276 100%);
  color: #fff;
  overflow: hidden;
  margin-top: calc(-1 * var(--nav-h));
  padding-top: calc(var(--nav-h) + 4rem);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(ellipse at 20% 50%, rgba(26, 122, 76, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 30%, rgba(41, 128, 185, 0.12) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 90%, rgba(192, 57, 43, 0.08) 0%, transparent 40%);
    pointer-events: none;
  }

  h1 {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(2.4rem, 5.5vw, 4rem);
    font-weight: 400;
    line-height: 1.1;
    margin-bottom: 1.5rem;
    position: relative;
    z-index: 1;
    max-width: 780px;

    em {
      font-style: italic;
      color: rgba(255, 255, 255, 0.6);
    }
  }
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 100px;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 2.5rem;
  backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.05);
  position: relative;
  z-index: 1;

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--green-light);
    animation: pulse-dot 2s ease-in-out infinite;
  }
}

.hero-sub {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.6);
  max-width: 580px;
  line-height: 1.7;
  position: relative;
  z-index: 1;
  font-weight: 300;
  margin-bottom: 2.5rem;
}

.hero-actions {
  display: flex;
  gap: 0.8rem;
  justify-content: center;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.hero-btn {
  background: #fff;
  color: var(--accent);
}

.hero-btn-outline {
  border-color: rgba(255, 255, 255, 0.4);
  color: #fff;
}

.hero-metrics {
  display: flex;
  gap: 3rem;
  margin-top: 3rem;
  position: relative;
  z-index: 1;
  flex-wrap: wrap;
  justify-content: center;
}

.hero-metric {
  text-align: center;

  .num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 2.2rem;
    font-weight: 500;
    color: #fff;
    display: block;
    line-height: 1;
  }

  .label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(255, 255, 255, 0.4);
    margin-top: 0.4rem;
    display: block;
  }
}

.pipeline-flow {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  padding: 0 2rem 4rem;
  max-width: 1080px;
  margin: 0 auto;

  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;

    .arrow {
      display: none;
    }
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
}

.pipe-step {
  background: var(--card);
  border-radius: var(--radius);
  padding: 1.8rem 1.5rem;
  box-shadow: var(--card-shadow);
  border: 1px solid rgba(0, 0, 0, 0.03);
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 24px rgba(10, 15, 26, 0.1);
  }

  h4 {
    font-size: 0.95rem;
    font-weight: 600;
    margin-bottom: 0.4rem;
  }

  p {
    font-size: 0.82rem;
    color: var(--muted);
    font-weight: 300;
    line-height: 1.6;
  }

  .arrow {
    position: absolute;
    right: -12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1rem;
    color: var(--line);
  }

  &:last-child .arrow {
    display: none;
  }
}

.pipe-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  font-weight: 500;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-bottom: 1rem;
}

.partnership-callout {
  max-width: 1080px;
  margin: 0 auto 4rem;
  padding: 0 2rem;
}

.partnership-inner {
  background: linear-gradient(135deg, #1a3a5c, #1a5276);
  border-radius: var(--radius);
  padding: 2.5rem 3rem;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 2.5rem;

  @media (max-width: 900px) {
    flex-direction: column;
    text-align: center;
  }

  .pi-text {
    flex: 1;

    h3 {
      font-family: 'DM Serif Display', serif;
      font-size: 1.5rem;
      font-weight: 400;
      margin-bottom: 0.5rem;
    }

    p {
      font-size: 0.92rem;
      color: rgba(255, 255, 255, 0.7);
      font-weight: 300;
      line-height: 1.7;
    }
  }

  .pi-action {
    flex-shrink: 0;

    a {
      display: inline-block;
      padding: 0.7rem 1.6rem;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
      font-weight: 600;
      font-size: 0.85rem;
      border: 1px solid rgba(255, 255, 255, 0.25);
      transition: all 0.2s;
      cursor: pointer;

      &:hover {
        background: rgba(255, 255, 255, 0.25);
      }
    }
  }
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.2rem;
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 2rem 2rem;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
}

.team-card {
  background: var(--card);
  border-radius: var(--radius);
  padding: 1.6rem 1.6rem 1.4rem;
  box-shadow: var(--card-shadow);
  border: 1px solid rgba(0, 0, 0, 0.03);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 24px rgba(10, 15, 26, 0.1);
  }

  .team-top {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    margin-bottom: 0.7rem;
  }

  .team-avatar {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.85rem;
    color: #fff;
    flex-shrink: 0;
    font-family: 'JetBrains Mono', monospace;
  }

  .team-name {
    font-weight: 600;
    font-size: 0.95rem;
    line-height: 1.2;
  }

  .team-role {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--teal);
    font-weight: 600;
  }

  .team-blurb {
    font-size: 0.82rem;
    color: #555;
    font-weight: 300;
    line-height: 1.6;
  }

  .team-email {
    font-size: 0.75rem;
    color: var(--muted);
    font-weight: 300;
    margin-top: 0.5rem;
    display: block;
  }
}

.team-contacts {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 2rem 4rem;
}

.team-contacts-inner {
  display: flex;
  gap: 2rem;
  justify-content: center;
  flex-wrap: wrap;
}

.team-contact-pill {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 1.2rem;
  background: var(--card);
  border-radius: 100px;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.05);
  font-size: 0.82rem;
  border: 1px solid rgba(0, 0, 0, 0.04);

  .pill-role {
    font-weight: 600;
    color: var(--ink);
  }

  .pill-name {
    color: var(--muted);
    font-weight: 300;
  }

  .pill-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--line);
  }
}
</style>
