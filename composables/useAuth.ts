export function useAuth() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  return {
    user,
    getSession: () => supabase.auth.getSession(),
    getUser: () => supabase.auth.getUser(),
    signIn: (email: string, password: string) =>
      supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
    // Emails a password-reset link. The destination is controlled by the
    // Reset Password email template (…/admin/set-password?token_hash=…&type=recovery),
    // mirroring the invite flow — so the link is prefetch-resistant and no
    // redirectTo is needed here.
    sendPasswordReset: (email: string) =>
      supabase.auth.resetPasswordForEmail(email),
  }
}
