<script setup lang="ts">
/**
 * Home Page
 */
import { useAuthStore } from '~/stores/auth'
import { useLoginModal } from '~/composables/useLoginModal'
import { useContentful } from '~/composables/useContentful'
import type { HomePageContent } from '~/types/index'

const authStore = useAuthStore()
const { openLoginModal } = useLoginModal()
const { fetchSingleton, fetchEntries } = useContentful()

const { data: homePage } = await useAsyncData('homePage', () =>
    fetchSingleton<HomePageContent>('homePage'),
)

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
        {{ homePage.heroBadge }}
      </div>

      <h1>
        <SharedRichTextRenderer :content="homePage.heroHeadline" />
      </h1>

      <p class="hero-sub">
        {{ homePage.heroSubheadline }}
      </p>

      <div class="hero-actions">
        <button class="btn hero-btn" @click="handleStartProject">
          {{ homePage.primaryCtaLabel }}
        </button>
        <NuxtLink to="/pipeline" class="btn btn-primary hero-btn-outline">
          {{ homePage.secondaryCtaLabel }}
        </NuxtLink>
      </div>

      <div class="hero-metrics">
        <div v-for="metric in homePage.heroMetrics" :key="metric.label" class="hero-metric">
          <span class="num">{{ metric.value }}</span>
          <span class="label">{{ metric.label }}</span>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="section-header">
      <span class="overline">{{ homePage.journeyOverline }}</span>
      <h2>{{ homePage.journeyHeading }}</h2>
      <p>{{ homePage.journeyDescription }}</p>
    </section>

    <div class="pipeline-flow">
      <div v-for="(step, idx) in homePage.journeySteps" :key="step.number" class="pipe-step">
        <div class="pipe-num" :style="{ background: step.color }">
          {{ step.number }}
        </div>
        <h4>{{ step.title }}</h4>
        <p>{{ step.description }}</p>
        <span v-if="idx < homePage.journeySteps.length - 1" class="arrow">→</span>
      </div>
    </div>

    <!-- Partnership Callout -->
    <div class="partnership-callout">
      <div class="partnership-inner">
        <div class="pi-text">
          <h3>{{ homePage.partnershipHeading }}</h3>
          <p>{{ homePage.partnershipDescription }}</p>
        </div>
        <div class="btn-primary pi-action">
          <a :href="`mailto:${homePage.partnershipEmail}?subject=Immune Health Partnership Inquiry`">
            {{ homePage.partnershipCtaLabel }}
          </a>
        </div>
      </div>
    </div>

    <!-- Team Section -->
    <section class="section-header">
      <span class="overline">{{ homePage.teamOverline }}</span>
      <h2>{{ homePage.teamHeading }}</h2>
      <p>{{ homePage.teamDescription }}</p>
    </section>

    <div class="team-grid">
      <div v-for="member in homePage.teamMembers" :key="member.email" class="team-card">
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
        <div v-for="pill in homePage.contactPills" :key="pill.role" class="team-contact-pill">
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
  background: linear-gradient(175deg, #0a0f1a 0%, #011F5B 45%, #1a5276 100%);
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

.hero-btn:hover {
  color: #FFF;
  background-color: var(--penn-light-blue);
}

.hero-btn-outline {
  border: 1px solid white;
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
  margin: 0 auto;
  padding: 0 2rem;
}

.partnership-inner {
  background: linear-gradient(135deg, #011F5B, #1a5276);
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
    border: 1px solid white;
    a {
      display: inline-block;
      padding: 0.7rem 1.6rem;
      border-radius: 4px;
      color: #fff;
      font-weight: 600;
      font-size: 0.85rem;
      transition: all 0.2s;
      cursor: pointer;

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
    border-radius: 4px;
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
