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
  }
}
