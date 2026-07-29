import { useEffect, useState } from 'react'
import { Card, Avatar, Badge, EmptyState, Spinner } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/types'

export default function ManageAdmins() {
  const [admins, setAdmins] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'admin').order('created_at', { ascending: false })
      setAdmins((data ?? []) as Profile[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-theme-primary">Manage Admins</h1>
      <Card padding="none">
        {loading ? <div className="flex justify-center py-20"><Spinner /></div> : admins.length === 0 ? (
          <EmptyState icon="🛡️" title="No admins yet" description="Admins who register will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-theme">{['Admin', 'Email', 'Username', 'Joined'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-theme-secondary uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-theme">
                {admins.map(a => (
                  <tr key={a.id} className="hover:bg-white/3">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar seed={a.avatar_seed} size="sm" /><span className="font-medium text-theme-primary">{a.display_name}</span></div></td>
                    <td className="px-4 py-3 text-sm text-theme-secondary">{a.email}</td>
                    <td className="px-4 py-3 text-sm text-theme-secondary">@{a.username}</td>
                    <td className="px-4 py-3 text-sm text-theme-secondary">{formatDate(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
