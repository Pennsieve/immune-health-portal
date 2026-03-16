<script setup lang="ts">
/**
 * Home Page
 *
 * Landing page with hero section, how it works overview, team showcase,
 * and partnership callout. Content is fetched from Contentful with
 * hardcoded fallbacks.
 */
import { useAuthStore } from '~/stores/auth'
import { useLoginModal } from '~/composables/useLoginModal'
import { useContentful } from '~/composables/useContentful'
import type { HomePageContent, TeamMemberContent } from '~/types'

const authStore = useAuthStore()
const { openLoginModal } = useLoginModal()
const { fetchSingleton, fetchEntries } = useContentful()

// Default team data (fallback when Contentful is unavailable)
const defaultTeamMembers = [
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

// Defaults for page content
const defaults = {
  heroBadge: 'Penn\'s Institute for Immunology & Immune Health',
  heroHeadline: 'Standardized <em>Immune Profiling</em> from Blood Draw to Insight',
  heroSubheadline: 'High-dimensional CyTOF and spectral flow cytometry with integrated data management on Pennsieve. One pipeline. Thousands of comparable profiles.',
  primaryCtaLabel: 'Submit a New Study',
  secondaryCtaLabel: 'See How It Works',
  heroMetrics: [
    { value: '4,000+', label: 'Patient Visits Profiled' },
    { value: '50', label: 'Immune Populations' },
    { value: '30+', label: 'MDIPA Markers' },
    { value: '<48h', label: 'Draw → Analysis' },
  ],
  journeyOverline: 'Your Project Journey',
  journeyHeading: 'From Inquiry to Immune Fingerprint',
  journeyDescription: 'Four phases connect your research question to a fully analyzed, QC-validated immune profile on Pennsieve.',
  journeySteps: [
    { number: 1, title: 'Intake & Agreement', description: 'Submit your study details. We review scope, discuss objectives, and formalize a User Agreement.', color: 'var(--accent)' },
    { number: 2, title: 'Sample Processing', description: 'Blood draw, PBMC isolation, and sample prep – standardized SOPs with chain-of-custody tracking.', color: 'var(--teal)' },
    { number: 3, title: 'CyTOF & Analysis', description: 'MDIPA staining, CyTOF acquisition, EQ normalization, automated gating, and QC.', color: 'var(--green)' },
    { number: 4, title: 'Dashboard & Delivery', description: 'Track progress in real time. FCS files, QC reports, and Tier 1 analysis on your Pennsieve dashboard.', color: 'var(--gold)' },
  ],
  partnershipHeading: 'Partnership Opportunities',
  partnershipDescription: 'We work with academic institutions, biotech, and pharma partners to advance immune profiling research. If you\'re exploring a collaboration that leverages our standardized pipeline and 4,000+ patient dataset, we\'d welcome a conversation.',
  partnershipEmail: 'lguercio@pennmedicine.upenn.edu',
  partnershipCtaLabel: 'Contact Partnerships →',
  teamOverline: 'The Science Team',
  teamHeading: 'Expertise Behind the Pipeline',
  teamDescription: 'Every sample is handled by specialists who\'ve collectively built and validated the profiling platform across thousands of patients.',
  contactPills: [
    { role: 'Partnerships', name: 'Leonardo Guercio', email: 'lguercio@pennmedicine.upenn.edu' },
    { role: 'Billing', name: 'Kenneth Hassinger', email: 'khas@pennmedicine.upenn.edu' },
  ],
}

// Reactive content state
const page = ref(defaults)
const teamMembers = ref(defaultTeamMembers)

// Fetch from Contentful on mount
onMounted(async () => {
  const [cmsPage, cmsTeam] = await Promise.all([
    fetchSingleton<HomePageContent>('homePage'),
    fetchEntries<TeamMemberContent>('teamMember'),
  ])

  if (cmsPage) {
    page.value = { ...defaults, ...cmsPage }
  }

  if (cmsTeam.length > 0) {
    teamMembers.value = cmsTeam.map(m => ({
      initials: m.initials,
      name: m.name,
      role: m.role,
      color: m.color,
      bio: m.bio,
      email: m.email,
    }))
  }
})

const handleStartProject = () => {
  navigateTo('/intake')
}
</script>

<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="home-hero">
      <div class="hero-badge">
        <span class="dot" />
        {{ page.heroBadge }}
      </div>

      <!-- eslint-disable-next-line vue/no-v-html -->
      <h1 v-html="page.heroHeadline" />

      <p class="hero-sub">
        {{ page.heroSubheadline }}
      </p>

      <div class="hero-actions">
        <button class="btn btn-primary hero-btn" @click="handleStartProject">
          {{ page.primaryCtaLabel }}
        </button>
        <NuxtLink to="/pipeline" class="btn btn-secondary hero-btn-outline">
          {{ page.secondaryCtaLabel }}
        </NuxtLink>
      </div>

      <div class="hero-metrics">
        <div v-for="metric in page.heroMetrics" :key="metric.label" class="hero-metric">
          <span class="num">{{ metric.value }}</span>
          <span class="label">{{ metric.label }}</span>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="section-header">
      <span class="overline">{{ page.journeyOverline }}</span>
      <h2>{{ page.journeyHeading }}</h2>
      <p>{{ page.journeyDescription }}</p>
    </section>

    <div class="pipeline-flow">
      <div v-for="(step, idx) in page.journeySteps" :key="step.number" class="pipe-step">
        <div class="pipe-num" :style="{ background: step.color }">
          {{ step.number }}
        </div>
        <h4>{{ step.title }}</h4>
        <p>{{ step.description }}</p>
        <span v-if="idx < page.journeySteps.length - 1" class="arrow">→</span>
      </div>
    </div>

    <!-- Partnership Callout -->
    <div class="partnership-callout">
      <div class="partnership-inner">
        <div class="pi-text">
          <h3>{{ page.partnershipHeading }}</h3>
          <p>{{ page.partnershipDescription }}</p>
        </div>
        <div class="pi-action">
          <a :href="`mailto:${page.partnershipEmail}?subject=Immune Health Partnership Inquiry`">
            {{ page.partnershipCtaLabel }}
          </a>
        </div>
      </div>
    </div>

    <!-- Team Section -->
    <section class="section-header">
      <span class="overline">{{ page.teamOverline }}</span>
      <h2>{{ page.teamHeading }}</h2>
      <p>{{ page.teamDescription }}</p>
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
        <div v-for="pill in page.contactPills" :key="pill.role" class="team-contact-pill">
          <span class="pill-role">{{ pill.role }}</span>
          <span class="pill-dot" />
          <span class="pill-name">{{ pill.name }} · {{ pill.email }}</span>
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
