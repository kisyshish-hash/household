'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GiftHistory } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { Gift, User, Pencil, Trash2 } from 'lucide-react'

const REACTIONS = ['😍 완전 좋아함', '😊 만족', '😐 보통', '😕 별로', '😞 싫어함']

const EMPTY_FORM = {
  person_name: '',
  event_title: '',
  gift_item: '',
  price: 0,
  reaction: '',
  avoid_next_time: false,
  note: '',
}

export default function GiftsPage() {
  const [gifts, setGifts] = useState<GiftHistory[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGifts()
  }, [])

  async function loadGifts() {
    setLoading(true)
    const { data } = await supabase
      .from('gift_history')
      .select('*')
      .order('created_at', { ascending: false })
    setGifts(data ?? [])
    setLoading(false)
  }

  function startEdit(g: GiftHistory) {
    setEditId(g.id)
    setForm({
      person_name: g.person_name,
      event_title: g.event_title ?? '',
      gift_item: g.gift_item ?? '',
      price: g.price ?? 0,
      reaction: g.reaction ?? '',
      avoid_next_time: g.avoid_next_time,
      note: g.note ?? '',
    })
    setShowForm(true)
  }

  function cancelForm() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  async function handleSave() {
    if (!form.person_name.trim()) return alert('대상자 이름을 입력해주세요.')
    const payload = { ...form, person_name: form.person_name.trim(), price: Number(form.price) }
    if (editId) {
      await supabase.from('gift_history').update(payload).eq('id', editId)
    } else {
      await supabase.from('gift_history').insert(payload)
    }
    cancelForm()
    await loadGifts()
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('gift_history').delete().eq('id', id)
    await loadGifts()
  }

  // 사람별 그룹화
  const grouped = gifts.reduce<Record<string, GiftHistory[]>>((acc, g) => {
    const key = g.person_name
    if (!acc[key]) acc[key] = []
    acc[key].push(g)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift size={22} className="text-amber-500" />
          <h1 className="text-2xl font-bold text-gray-800">선물 이력</h1>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM) }}
          className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          선물 이력 추가
        </button>
      </div>

      {/* 추가/수정 폼 */}
      {showForm && (
        <div className="bg-white rounded-xl p-4 shadow-sm border space-y-3">
          <h2 className="font-semibold text-gray-700">{editId ? '선물 이력 수정' : '선물 이력 추가'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">대상자 *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.person_name}
                onChange={(e) => setForm({ ...form, person_name: e.target.value })} placeholder="예: 어머니" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">행사명</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.event_title}
                onChange={(e) => setForm({ ...form, event_title: e.target.value })} placeholder="예: 생신" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">선물</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.gift_item}
                onChange={(e) => setForm({ ...form, gift_item: e.target.value })} placeholder="예: 고려인삼 세트" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">금액 (원)</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">반응</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.reaction}
                onChange={(e) => setForm({ ...form, reaction: e.target.value })}>
                <option value="">선택</option>
                {REACTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">메모</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="기억해둘 내용" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="avoid" checked={form.avoid_next_time}
                onChange={(e) => setForm({ ...form, avoid_next_time: e.target.checked })} />
              <label htmlFor="avoid" className="text-sm text-gray-700">다음에는 이 선물 피하기</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              {editId ? '수정 저장' : '추가'}
            </button>
            <button onClick={cancelForm} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">취소</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">불러오는 중...</div>
      ) : gifts.length === 0 ? (
        <div className="text-center py-10 text-gray-400 border rounded-xl bg-white">등록된 선물 이력이 없습니다.</div>
      ) : (
        Object.entries(grouped).map(([person, items]) => (
          <div key={person} className="space-y-2">
            <div className="flex items-center gap-1.5">
              <User size={14} className="text-gray-400" />
              <h2 className="font-semibold text-gray-700">{person}</h2>
            </div>
            {items.map((g) => (
              <div key={g.id} className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-800">{g.gift_item || '(선물 미기입)'}</span>
                      {g.event_title && <span className="text-xs text-gray-400">{g.event_title}</span>}
                      {g.avoid_next_time && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">피할 것</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 space-x-2">
                      {g.price > 0 && <span>{g.price.toLocaleString()}원</span>}
                      {g.reaction && <span>{g.reaction}</span>}
                      <span>{formatDate(g.created_at)}</span>
                    </div>
                    {g.note && <p className="text-xs text-gray-400 mt-1 italic">{g.note}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => startEdit(g)} className="p-1.5 rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-100">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
