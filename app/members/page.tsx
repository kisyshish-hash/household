'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Member } from '@/lib/types'
import { Users, Pencil, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react'

const EMPTY_FORM = {
  name: '',
  role: '',
  preferred_tasks: '',
  disliked_tasks: '',
  weekly_capacity: 5,
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    setLoading(true)
    const { data } = await supabase.from('members').select('*').order('created_at')
    setMembers(data ?? [])
    setLoading(false)
  }

  function startEdit(m: Member) {
    setEditId(m.id)
    setForm({
      name: m.name,
      role: m.role ?? '',
      preferred_tasks: m.preferred_tasks.join(', '),
      disliked_tasks: m.disliked_tasks.join(', '),
      weekly_capacity: m.weekly_capacity,
    })
  }

  function cancelEdit() {
    setEditId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave() {
    if (!form.name.trim()) return alert('이름을 입력해주세요.')
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      role: form.role.trim(),
      preferred_tasks: form.preferred_tasks.split(',').map((s) => s.trim()).filter(Boolean),
      disliked_tasks: form.disliked_tasks.split(',').map((s) => s.trim()).filter(Boolean),
      weekly_capacity: Number(form.weekly_capacity),
    }

    if (editId) {
      await supabase.from('members').update(payload).eq('id', editId)
    } else {
      await supabase.from('members').insert(payload)
    }

    cancelEdit()
    setSaving(false)
    await loadMembers()
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('members').delete().eq('id', id)
    await loadMembers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users size={22} className="text-amber-500" />
        <h1 className="text-2xl font-bold text-gray-800">가족 구성원</h1>
      </div>

      {/* 추가/수정 폼 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100 space-y-3">
        <h2 className="font-semibold text-gray-700">{editId ? '구성원 수정' : '구성원 추가'}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">이름 *</label>
            <input
              className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-300"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: 김민준"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">역할</label>
            <input
              className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-300"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="예: 남편, 아내"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">선호 집안일 (쉼표로 구분)</label>
          <input
            className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-300"
            value={form.preferred_tasks}
            onChange={(e) => setForm({ ...form, preferred_tasks: e.target.value })}
            placeholder="예: 분리수거, 장보기"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">비선호 집안일 (쉼표로 구분)</label>
          <input
            className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-300"
            value={form.disliked_tasks}
            onChange={(e) => setForm({ ...form, disliked_tasks: e.target.value })}
            placeholder="예: 욕실 청소, 빨래 개기"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">주간 처리 가능 업무 수</label>
          <input
            type="number"
            min={1}
            max={20}
            className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-300"
            value={form.weekly_capacity}
            onChange={(e) => setForm({ ...form, weekly_capacity: Number(e.target.value) })}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-amber-400 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-500 disabled:opacity-50"
          >
            {saving ? '저장 중...' : editId ? '수정 저장' : '추가'}
          </button>
          {editId && (
            <button
              onClick={cancelEdit}
              className="px-4 py-2 border border-amber-100 rounded-lg text-sm text-gray-600 hover:bg-amber-50"
            >
              취소
            </button>
          )}
        </div>
      </div>

      {/* 구성원 목록 */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">불러오는 중...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-10 text-gray-400">등록된 구성원이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Users size={16} className="text-amber-500" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-800 text-base">{m.name}</span>
                    {m.role && <span className="ml-2 text-sm text-gray-400">{m.role}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => startEdit(m)}
                    className="p-1.5 rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-100"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 pl-11">
                <div className="flex items-start gap-1.5 text-sm">
                  <ThumbsUp size={13} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    {m.preferred_tasks.length > 0 ? m.preferred_tasks.join(', ') : '-'}
                  </span>
                </div>
                <div className="flex items-start gap-1.5 text-sm">
                  <ThumbsDown size={13} className="text-red-300 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">
                    {m.disliked_tasks.length > 0 ? m.disliked_tasks.join(', ') : '-'}
                  </span>
                </div>
                <p className="text-xs text-gray-400">주간 처리 가능: {m.weekly_capacity}건</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
