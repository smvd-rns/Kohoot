import { useEffect, useState } from 'react'
import { Card, Avatar, Badge, EmptyState, Spinner, Button } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/types'
import toast from 'react-hot-toast'

export default function ManageAdmins() {
  const [admins, setAdmins] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: false })
    setAdmins((data ?? []) as Profile[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: !currentStatus })
        .eq('id', id)
      if (error) throw error
      setAdmins(prev => prev.map(a => a.id === id ? { ...a, is_approved: !currentStatus } : a))
      toast.success(currentStatus ? 'Admin account suspended.' : 'Admin account approved successfully!')
    } catch {
      toast.error('Failed to update admin status.')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-theme-primary">Manage Admins</h1>
      <Card padding="none">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : admins.length === 0 ? (
          <EmptyState icon="🛡️" title="No admins yet" description="Admins who register will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-theme text-xs font-semibold text-theme-secondary uppercase">
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {admins.map(a => (
                  <tr key={a.id} className="hover:bg-white/3 text-sm">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar seed={a.avatar_seed} size="sm" />
                        <span className="font-semibold text-theme-primary">{a.display_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-theme-secondary">{a.email}</td>
                    <td className="px-4 py-3 text-theme-secondary">@{a.username}</td>
                    <td className="px-4 py-3 text-theme-secondary">{formatDate(a.created_at)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={a.is_approved ? 'success' : 'warning'}>
                        {a.is_approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="xs"
                        variant={a.is_approved ? 'danger' : 'success'}
                        onClick={() => handleToggleApproval(a.id, a.is_approved)}
                      >
                        {a.is_approved ? 'Suspend' : 'Approve'}
                      </Button>
                    </td>
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
