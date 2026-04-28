'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FamilyEvent } from '@/lib/types'
import { projectEventDate } from '@/lib/utils'
import Link from 'next/link'
import { Plus, CalendarDays, Clock, Star, MoonStar } from 'lucide-react'

const EVENT_TYPES = ['생일', '결혼기념일', '돌잔치', '졸업식', '명절', '기타']

const EMPTY_FORM = {
  title: '',
  person_name: '',
  event_type: '생일',
  event_date: '',
  is_lunar: false,
  repeat_type: 'yearly',
  importance: 3,
  gift_budget_min: 0,
  gift_budget_max: 0,
  preference_note: '',
}

// D-day 계산
function dDayLabel(displayDate: string, today: string): string {
  const diff = Math.ceil(
    (new Date(displayDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime())
    / (1000 * 60 * 60 * 24)
  )
  if (diff === 0) return 'D-Day'
  if (diff > 0) return `D-${diff}`
  return `D+${Math.abs(diff)}`
}

// M월 D일 표기
function fmt(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

// 음력 날짜 표기 (event_date의 MM-DD 부분을 음력으로 표시)
function fmtLunar(eventDate: string): string {
  const [, mm, dd] = eventDate.split('-')
  return `음력 ${parseInt(mm)}월 ${parseInt(dd)}일`
}

export default function EventsPage() {
  const [events, setEvents] = useState<FamilyEvent[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'all'>('upcoming')

  const today = new Date().toISOString().split('T')[0]
  const currentYear = new Date().getFullYear()

  // 다음 달 말일
  const nextMonthEnd = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 2, 0)
    return d.toISOString().split('T')[0]
  })()

  useEffect(() => { loadEvents() }, [])

  async function loadEvents() {
    setLoading(true)
    const { data } = await supabase.from('family_events').select('*')
    setEvents(data ?? [])
    setLoading(false)
  }

  function startEdit(e: FamilyEvent) {
    setEditId(e.id)
    setForm({
      title: e.title,
      person_name: e.person_name ?? '',
      event_type: e.event_type ?? '생일',
      event_date: e.event_date,
      is_lunar: e.is_lunar ?? false,
      repeat_type: e.repeat_type ?? 'yearly',
      importance: e.importance,
      gift_budget_min: e.gift_budget_min ?? 0,
      gift_budget_max: e.gift_budget_max ?? 0,
      preference_note: e.preference_note ?? '',
    })
    setShowForm(true)
  }

  function cancelForm() { setEditId(null); setForm(EMPTY_FORM); setShowForm(false) }

  async function handleSave() {
    if (!form.title.trim()) return alert('제목을 입력해주세요.')
    if (!form.event_date) return alert('날짜를 입력해주세요.')
    const payload = {
      ...form,
      title: form.title.trim(),
      gift_budget_min: Number(form.gift_budget_min),
      gift_budget_max: Number(form.gift_budget_max),
      importance: Number(form.importance),
    }
    if (editId) await supabase.from('family_events').update(payload).eq('id', editId)
    else await supabase.from('family_events').insert(payload)
    cancelForm()
    await loadEvents()
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('family_events').delete().eq('id', id)
    await loadEvents()
  }

  // 다가오는 행사: 오늘 ~ 다음 달 말, 날짜 가까운 순
  const upcomingEvents = events
    .map((e) => ({
      ...e,
      displayDate: projectEventDate(e.event_date, e.is_lunar ?? false, e.repeat_type, currentYear),
    }))
    .filter((e) => e.displayDate >= today && e.displayDate <= nextMonthEnd)
    .sort((a, b) => a.displayDate.localeCompare(b.displayDate))

  // 전체 탭: 원본 event_date 기준 정렬
  const allSorted = [...events].sort((a, b) => a.event_date.localeCompare(b.event_date))

  const thisMonthLabel = (() => { const d = new Date(); return `${d.getMonth() + 1}월` })()
  const nextMonthLabel = (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return `${d.getMonth() + 1}월` })()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">경조사 / 가정행사</h1>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM) }}
          className="flex items-center gap-1.5 text-sm bg-amber-400 text-white px-4 py-2 rounded-xl hover:bg-amber-500 font-medium"
        >
          <Plus size={15} /> 행사 추가
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 bg-white rounded-xl p-1 border border-amber-100">
        <button
          onClick={() => setTab('upcoming')}
          className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ${tab === 'upcoming' ? 'bg-amber-400 text-white shadow-sm' : 'text-gray-500 hover:text-amber-600'}`}
        >
          다가오는 행사
          {upcomingEvents.length > 0 && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === 'upcoming' ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-600'}`}>
              {upcomingEvents.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('all')}
          className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ${tab === 'all' ? 'bg-amber-400 text-white shadow-sm' : 'text-gray-500 hover:text-amber-600'}`}
        >
          전체 행사
        </button>
      </div>

      {/* 추가/수정 폼 */}
      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 space-y-3">
          <h2 className="font-semibold text-gray-700">{editId ? '행사 수정' : '행사 추가'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">제목 *</label>
              <input className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-300"
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 어머니 생신" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">대상자</label>
              <input className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                value={form.person_name} onChange={(e) => setForm({ ...form, person_name: e.target.value })} placeholder="예: 어머니" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">종류</label>
              <select className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* 음력/양력 선택 */}
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">달력 유형</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_lunar: false })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    !form.is_lunar
                      ? 'bg-amber-400 text-white border-amber-400'
                      : 'border-amber-100 text-gray-500 hover:bg-amber-50'
                  }`}
                >
                  양력
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_lunar: true })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                    form.is_lunar
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-amber-100 text-gray-500 hover:bg-amber-50'
                  }`}
                >
                  <MoonStar size={13} /> 음력
                </button>
              </div>
            </div>

            {/* 날짜 입력 */}
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">
                날짜 * {form.is_lunar && <span className="text-indigo-500">— 음력 날짜를 입력하세요</span>}
              </label>
              <input
                type="date"
                className={`w-full border rounded-lg px-3 py-2 text-sm ${form.is_lunar ? 'border-indigo-200 bg-indigo-50/30 focus:border-indigo-400' : 'border-amber-100 focus:border-amber-300'} focus:outline-none`}
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              />
              {form.is_lunar && (
                <p className="text-[11px] text-indigo-400 mt-1">
                  입력한 날짜의 월/일을 음력으로 해석합니다. 매년 해당 음력 날짜에 맞는 양력 날짜를 자동 계산합니다.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">반복</label>
              <select className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                value={form.repeat_type} onChange={(e) => setForm({ ...form, repeat_type: e.target.value })}>
                <option value="yearly">매년</option>
                <option value="once">1회</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">중요도 (1-5)</label>
              <input type="number" min={1} max={5} className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                value={form.importance} onChange={(e) => setForm({ ...form, importance: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">선물 예산 최소 (원)</label>
              <input type="number" className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                value={form.gift_budget_min} onChange={(e) => setForm({ ...form, gift_budget_min: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">선물 예산 최대 (원)</label>
              <input type="number" className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                value={form.gift_budget_max} onChange={(e) => setForm({ ...form, gift_budget_max: Number(e.target.value) })} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">대상자 선호/메모</label>
              <textarea className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm" rows={2}
                value={form.preference_note} onChange={(e) => setForm({ ...form, preference_note: e.target.value })}
                placeholder="예: 실용적인 선물 선호, 향수 알레르기 있음" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex-1 bg-amber-400 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-500">
              {editId ? '수정 저장' : '추가'}
            </button>
            <button onClick={cancelForm} className="px-4 py-2 border border-amber-100 rounded-lg text-sm text-gray-500 hover:bg-gray-50">취소</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-amber-400 text-sm">불러오는 중...</div>
      ) : (
        <>
          {/* 다가오는 행사 탭 */}
          {tab === 'upcoming' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
                <CalendarDays size={13} />
                오늘부터 {nextMonthLabel} 말까지 ({thisMonthLabel} ~ {nextMonthLabel})
              </div>

              {upcomingEvents.length === 0 ? (
                <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center text-gray-400 text-sm">
                  이 기간에 예정된 행사가 없습니다
                </div>
              ) : (
                upcomingEvents.map((e) => {
                  const days = Math.ceil(
                    (new Date(e.displayDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime())
                    / (1000 * 60 * 60 * 24)
                  )
                  const urgency = days <= 3 ? 'border-red-200 bg-red-50' : days <= 7 ? 'border-orange-200 bg-orange-50' : 'border-amber-100 bg-white'
                  const dDayColor = days <= 3 ? 'text-red-600 bg-red-100' : days <= 7 ? 'text-orange-600 bg-orange-100' : 'text-amber-600 bg-amber-100'

                  return (
                    <div key={e.id} className={`rounded-2xl border p-4 shadow-sm ${urgency}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-800">{e.title}</span>
                            <span className="text-xs text-gray-400">{e.event_type}</span>
                            {e.person_name && <span className="text-xs text-gray-400">· {e.person_name}</span>}
                            {e.repeat_type === 'yearly' && (
                              <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">매년</span>
                            )}
                            {e.is_lunar && (
                              <span className="flex items-center gap-0.5 text-[10px] bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded">
                                <MoonStar size={9} /> 음력
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock size={11} /> {fmt(e.displayDate)}
                              {e.is_lunar && (
                                <span className="text-indigo-400 ml-1">({fmtLunar(e.event_date)})</span>
                              )}
                            </span>
                            {e.gift_budget_max > 0 && (
                              <span className="text-xs text-gray-400">
                                예산 {e.gift_budget_min.toLocaleString()}~{e.gift_budget_max.toLocaleString()}원
                              </span>
                            )}
                            <span className="flex items-center gap-0.5 text-xs text-amber-400">
                              {Array.from({ length: e.importance }).map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                            </span>
                          </div>
                          {e.preference_note && (
                            <p className="text-xs text-gray-400 mt-1 italic">{e.preference_note}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span className={`text-sm font-bold px-2.5 py-1 rounded-xl ${dDayColor}`}>
                            {dDayLabel(e.displayDate, today)}
                          </span>
                          <Link href={`/events/${e.id}`}
                            className="text-xs px-2 py-1 bg-white border border-amber-200 text-amber-600 rounded-lg hover:bg-amber-50">
                            상세
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* 전체 행사 탭 */}
          {tab === 'all' && (
            <div className="space-y-2">
              {allSorted.length === 0 ? (
                <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center text-gray-400 text-sm">
                  등록된 행사가 없습니다
                </div>
              ) : (
                allSorted.map((e) => (
                  <div key={e.id} className="bg-white rounded-2xl border border-amber-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-gray-800">{e.title}</span>
                          <span className="text-xs text-gray-400">{e.event_type}</span>
                          {e.person_name && <span className="text-xs text-gray-400">· {e.person_name}</span>}
                          {e.repeat_type === 'yearly' && (
                            <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">매년</span>
                          )}
                          {e.is_lunar && (
                            <span className="flex items-center gap-0.5 text-[10px] bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded">
                              <MoonStar size={9} /> 음력
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-400">
                          {e.is_lunar
                            ? <span>{fmtLunar(e.event_date)}</span>
                            : <span>{fmt(e.event_date)}</span>
                          }
                          {e.gift_budget_max > 0 && (
                            <span>예산 {e.gift_budget_min.toLocaleString()}~{e.gift_budget_max.toLocaleString()}원</span>
                          )}
                          <span className="flex items-center gap-0.5 text-amber-400">
                            {Array.from({ length: e.importance }).map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <Link href={`/events/${e.id}`}
                          className="text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 text-center">
                          상세
                        </Link>
                        <button onClick={() => startEdit(e)}
                          className="text-xs px-2 py-1 border border-amber-100 rounded-lg text-gray-500 hover:bg-gray-50">
                          수정
                        </button>
                        <button onClick={() => handleDelete(e.id)}
                          className="text-xs px-2 py-1 border border-red-100 rounded-lg text-red-400 hover:bg-red-50">
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
