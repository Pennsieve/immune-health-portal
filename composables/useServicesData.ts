export async function useServicesData() {
  const servicesStore = useServicesStore()

  // Only fetch if not already loaded (important for navigation)
  if (servicesStore.services.length === 0) {
    await useAsyncData('services', () => servicesStore.fetchServices())
  }

  return servicesStore
}
