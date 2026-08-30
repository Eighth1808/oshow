import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EventForm from '@/components/dashboard/EventForm'

export default async function NewEventPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!org) redirect('/dashboard')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Nouvel événement</h1>
      <p className="mt-2 text-gray-500">Remplis les détails de ton événement</p>
      <div className="mt-6">
        <EventForm organizationId={org.id} />
      </div>
    </div>
  )
}
