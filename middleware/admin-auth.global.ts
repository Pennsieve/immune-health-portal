export default defineNuxtRouteMiddleware((to) => {
  if (!to.path.startsWith('/admin')) return
  if (to.path === '/admin/login') return
  if (to.path === '/admin/set-password') return
  if (to.path.startsWith('/admin/sign/')) return

  const { user } = useAuth()
  if (!user.value) {
    return navigateTo('/admin/login')
  }
})
