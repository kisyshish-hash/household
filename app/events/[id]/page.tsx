'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FamilyEvent, EventPreparation, Member } from '@/lib/types'
import { getDDayLabel, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [event, setEvent] = useState<FamilyEvent | null>(null)
  const [preparations, setPreparations] = useState<EventPreparation[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    const [eventRes, prepRes, memberRes] = await Promise.all([
      supabase.from('family_events').select('*').eq('id', id).single(),
      supabase.from('event_preparations').select('*, members(*)').eq('event_id', id).order('due_date'),
      supabase.from('members').select('*'),
    ])
    setEvent(eventRes.data)
    setPreparations(prepRes.data ?? [])
    setMembers(memberRes.data ?? [])
    setLoading(false)
  }

  async function handleGenerateChecklist() {
    setGenerating(true)
    setGenResult(null)
    try {
      const res = await fetch('/api/generate-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id }),
      })
      const data = await res.json()
      if (data.error) {
        setGenResult(`오류: ${data.error}`)
      } else {
        setGenResult(data.usedAI ? '✅ AI가 준비 체크리스트를 생성했습니다.' : '✅ 체크리스트 생성 완료 (기본 템플릿)')
        await loadData()
      }
    } catch {
      setGenResult('네트워크 오류가 발생했습니다.')
    }
    setGenerating(false)
  }

  async function updateStatus(id: string, status: 'done' | 'skipped' | 'pending') {
    await supabase.from('event_preparations').update({ status }).eq('id', id)
    await loadData()
  }

  if (loading) return <div className="text-center py-20 text-gray-400">불러오는 중...</div>
  if (!event) return <div className="text-center py-20 text-gray-400">행사를 찾을 수 없습니다.</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← 뒤로</button>
      </div>

      {/* 행사 정보 */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{event.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-gray-500">
              <span>{event.event_type}</span>
              {event.person_name && <span>· {event.person_name}</span>}
              <span>· {formatDate(event.event_date)}</span>
              <span className="font-bold text-indigo-600">{getDDayLabel(event.event_date)}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600">{getDDayLabel(event.event_date)}</div>
            <div className="text-xs text-gray-400">{'★'.repeat(event.importance)}</div>
          </div>
        </div>
        {event.gift_budget_max > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            💰 예산: {event.gift_budget_min.toLocaleString()}원 ~ {event.gift_budget_max.toLocaleString()}원
          </p>
        )}
        {event.preference_note && (
          <p className="text-sm text-gray-500 mt-1 italic">📝 {event.preference_note}</p>
        )}
      </div>

      {/* 체크리스트 생성 버튼 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <button
          onClick={handleGenerateChecklist}
          disabled={generating}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {generating ? '생성 중...' : '📋 준비 체크리스트 생성'}
        </button>
        {genResult && <p className="mt-2 text-sm text-center text-gray-700">{genResult}</p>}
      </div>

      {/* 준비 체크리스트 */}
      <section className="space-y-2">
        <h2 className="font-semibold text-gray-800">준비 체크리스트 ({preparations.length})</h2>
        {preparations.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center text-gray-400 border">
            아직 체크리스트가 없습니다. 위 버튼을 눌러 생성하세요.
          </div>
        ) : (
          preparations.map((p) => (
            <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${p.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {p.preparation_task}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(p.status)}`}>
                      {getStatusLabel(p.status)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 space-x-2">
                    {p.due_date && <span>기한: {formatDate(p.due_date)}</span>}
                    {p.members?.name && <span>담당: {p.members.name}</span>}
                  </div>
                  {p.ai_suggestion && (
                    <p className="text-xs text-indigo-500 mt-1 italic">💡 {p.ai_suggestion}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {p.status !== 'done' && (
                    <button onClick={() => updateStatus(p.id, 'done')}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                      완료 처리
                    </button>
                  )}
                  {p.status !== 'skipped' && p.status !== 'done' && (
                    <button onClick={() => updateStatus(p.id, 'skipped')}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                      건너뛰기
                    </button>
                  )}
                  {p.status !== 'pending' && (
                    <button onClick={() => updateStatus(p.id, 'pending')}
                      className="text-xs px-2 py-1 border rounded text-gray-500 hover:bg-gray-50">
                      되돌리기
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
