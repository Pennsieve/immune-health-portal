export default defineNuxtRouteMiddleware((to) => {
  if (!to.path.startsWith('/admin')) return
  if (to.path === '/admin/login') return
  if (to.path.startsWith('/admin/sign/')) return

  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo('/admin/login')
  }
})
