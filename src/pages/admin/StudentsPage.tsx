import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Trash2, Download, UserPlus } from 'lucide-react'
import { Button, Input, Card, Avatar, Badge, EmptyState, Modal, StatCard, Spinner } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { studentService } from '@/services/student.service'
import { formatDate, exportToCSV } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Profile } from '@/types'

export default function StudentsPage() {
  const { profile } = useAuthStore()
  const [students, setStudents] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState<Profile | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    if (!profile?.id) return
    studentService.listStudents(profile.id).then(setStudents).finally(() => setLoading(false))
  }, [profile?.id])

  const handleDelete = async (s: Profile) => {
    try {
      await studentService.deleteStudent(s.id)
      setStudents(list => list.filter(x => x.id !== s.id))
      toast.success('Student removed')
    } catch { toast.error('Delete failed') }
    setDeleteModal(null)
  }

  const handleExport = () => {
    exportToCSV(
      students.map(s => ({ 
        username: s.username, 
        name: s.display_name, 
        email: s.email, 
        mobile: s.phone || '-',
        xp: s.xp, 
        level: s.level, 
        joined: formatDate(s.created_at) 
      })),
      'students'
    )
  }

  const filtered = students.filter(s =>
    s.display_name.toLowerCase().includes(search.toLowerCase()) ||
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone && s.phone.includes(search))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-theme-primary">Students</h1>
          <p className="text-theme-secondary text-sm">{students.length} registered students</p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<UserPlus className="w-5 h-5" style={{ color: '#7c6fef' }} />} label="Total" value={students.length} color="rgba(124,111,239,0.15)" />
        <StatCard icon={<span className="text-xl">⚡</span>} label="Avg XP" value={students.length ? Math.round(students.reduce((a, s) => a + s.xp, 0) / students.length) : 0} color="rgba(249,40,184,0.15)" />
        <StatCard icon={<span className="text-xl">🏆</span>} label="Top Level" value={students.length ? Math.max(...students.map(s => s.level)) : 0} color="rgba(0,240,255,0.15)" />
      </div>

      {/* Search */}
      <Input placeholder="Search students..." leftIcon={<Search className="w-4 h-4" />} value={search} onChange={e => setSearch(e.target.value)} />

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="👥" title={search ? 'No students found' : 'No students yet'} description={search ? 'Try different search' : 'Students will appear here when they register'} />
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-theme">
                  {['Student', 'Username', 'Email', 'Mobile', 'XP / Level', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-theme-secondary uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-theme text-sm">
                {filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((s, i) => (
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar seed={s.avatar_seed} size="sm" />
                        <span className="font-medium text-theme-primary">{s.display_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-theme-secondary">@{s.username}</td>
                    <td className="px-4 py-3 text-sm text-theme-secondary">{s.email}</td>
                    <td className="px-4 py-3 text-sm text-theme-secondary">{s.phone || <span className="text-white/20 italic">Not filled</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="purple">Lv {s.level}</Badge>
                        <span className="text-xs text-theme-secondary">{s.xp.toLocaleString()} XP</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-theme-secondary">{formatDate(s.created_at)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setDeleteModal(s)} className="p-1.5 rounded-lg text-danger-400 hover:bg-danger-500/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-theme">
              <div className="flex items-center gap-2 text-sm text-theme-secondary">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="bg-white/5 border border-theme rounded-lg px-2 py-1 text-theme-primary focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {[10, 30, 50].map(size => (
                    <option key={size} value={size} className="bg-neutral-900 text-white">
                      {size}
                    </option>
                  ))}
                </select>
                <span>entries per page</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-theme-secondary">
                  Page <strong>{currentPage}</strong> of <strong>{Math.ceil(filtered.length / pageSize) || 1}</strong> ({filtered.length} entries)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filtered.length / pageSize), p + 1))}
                    disabled={currentPage === Math.ceil(filtered.length / pageSize) || Math.ceil(filtered.length / pageSize) === 0}
                  >
                    Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    )}
      </Card>

      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Remove Student">
        <p className="text-theme-secondary mb-6">Remove <strong className="text-theme-primary">{deleteModal?.display_name}</strong>? This will remove all their quiz history.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setDeleteModal(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => deleteModal && handleDelete(deleteModal)} leftIcon={<Trash2 className="w-4 h-4" />}>Remove</Button>
        </div>
      </Modal>
    </div>
  )
}
