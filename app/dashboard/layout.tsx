import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user = null
  let profile = null
  let organization = null

  try {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      redirect('/login?redirect=/dashboard')
    }

    user = authUser

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    profile = profileData

    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', authUser.id)
      .single()

    organization = orgData
  } catch {
    redirect('/login?redirect=/dashboard')
  }

  return (
    <DashboardShell
      user={user}
      profile={profile}
      organization={organization}
    >
      {children}
    </DashboardShell>
  )
}
