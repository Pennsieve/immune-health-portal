<script setup lang="ts">
/**
 * Services & Pricing Page
 *
 * Displays service catalog with toggle between internal and external rates.
 */
import { useServicesStore } from '~/stores/services'

const servicesStore = useServicesStore()

const setRateView = (view: 'internal' | 'external') => {
  servicesStore.setRateView(view)
}

const formatRate = (service: { internalRate: number; externalRate: number }): string => {
  const rate = servicesStore.rateView === 'internal' ? service.internalRate : service.externalRate
  if (rate === 0) return 'Contact'
  return `$${rate.toLocaleString()}`
}

const getBadgeClass = (isActive: boolean): string => {
  return isActive ? 'badge-active' : 'badge-coming'
}
</script>

<template>
  <div class="services-page">
    <section class="section-header" style="padding-top: 6rem;">
      <span class="overline">Service Catalog</span>
      <h2>Immune Health Core Services</h2>
      <p>Consolidated pricing for Penn internal and academic external investigators. All services billed through iLabs. Rates re-evaluated each fiscal year.</p>
    </section>

    <div class="services-section">
      <div class="rate-toggle-wrapper">
        <div class="rate-toggle">
          <button
            :class="{ active: servicesStore.rateView === 'internal' }"
            @click="setRateView('internal')"
          >
            Penn Internal
          </button>
          <button
            :class="{ active: servicesStore.rateView === 'external' }"
            @click="setRateView('external')"
          >
            Academic External
          </button>
        </div>
      </div>

      <table class="srv-table">
        <thead>
          <tr>
            <th>Service</th>
            <th>Description</th>
            <th>Status</th>
            <th>Rate</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="service in servicesStore.activeServices" :key="service.id">
            <td><strong>{{ service.name }}</strong></td>
            <td>{{ service.description }}</td>
            <td>
              <span class="badge" :class="getBadgeClass(service.isActive)">
                {{ service.isActive ? 'Active' : 'Coming' }}
              </span>
            </td>
            <td class="srv-rate mono">
              {{ formatRate(service) }}
            </td>
            <td>{{ service.unit }}</td>
          </tr>
        </tbody>
      </table>

      <p class="pricing-note">
        Corporate/industry rates available on request. Contact <strong>lguercio@pennmedicine.upenn.edu</strong> for partnership pricing.
      </p>
    </div>

    <section class="section-header">
      <h2 style="font-size: 1.6rem;">
        Payment & Billing
      </h2>
      <p>Monthly invoices billed through iLabs. 26-digit Penn budget account number required before work begins. Billing questions: <strong>khas@pennmedicine.upenn.edu</strong></p>
    </section>
  </div>
</template>

<style scoped lang="scss">
.services-page {
  padding-bottom: 4rem;
}

.services-section {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 2rem;
}

.rate-toggle-wrapper {
  text-align: center;
  margin-bottom: 1.5rem;
}

.rate-toggle {
  display: inline-flex;
  border: 1.5px solid var(--line);
  border-radius: 8px;
  overflow: hidden;

  button {
    padding: 0.5rem 1.2rem;
    font-size: 0.8rem;
    font-weight: 600;
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    color: var(--muted);
    transition: all 0.2s;

    &.active {
      background: var(--accent);
      color: #fff;
    }
  }
}

.srv-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--card);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--card-shadow);

  thead {
    background: var(--ink);
    color: #fff;
  }

  th {
    padding: 1rem 1.5rem;
    text-align: left;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 600;
  }

  td {
    padding: 0.9rem 1.5rem;
    font-size: 0.88rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    font-weight: 300;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: rgba(13, 115, 119, 0.02);
  }
}

.srv-rate {
  font-weight: 500;
  font-size: 0.85rem;
}

.pricing-note {
  font-size: 0.78rem;
  color: var(--muted);
  font-weight: 300;
  margin-top: 1rem;
  text-align: center;

  strong {
    color: var(--ink);
    font-weight: 600;
  }
}
</style>
