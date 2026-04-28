'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { WeeklyAssignment, FamilyEvent, Member } from '@/lib/types'
import { getStatusColor, getStatusLabel, formatDate, getDDayLabel, projectEventDate } from '@/lib/utils'
import { ChevronLeft, ChevronRight, X, CheckCircle2, SkipForward, RotateCcw, Pencil, Timer } from 'lucide-react'

function formatTime(t: string | null | undefined): string {
  if (!t) return ''
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr)
  const m = mStr ?? '00'
  if (h === 0) return `오전 12:${m}`
  if (h < 12) return `오전 ${h}:${m}`
  if (h === 12) return `오후 12:${m}`
  return `오후 ${h - 12}:${m}`
}

function timeRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return ''
  if (start && !end) return formatTime(start)
  if (!start && end) return `~ ${formatTime(end)}`
  return `${formatTime(start)} ~ ${formatTime(end)}`
}
import Link from 'next/link'

type DayData = {
  date: string
  assignments: WeeklyAssignment[]
  events: FamilyEvent[]
}

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed
  const [assignments, setAssignments] = useState<WeeklyAssignment[]>([])
  const [events, setEvents] = useState<FamilyEvent[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)
  const [loading, setLoading] = useState(true)

  // 편집 상태 (경조사)
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null)
  const [editForm, setEditForm] = useState({ title: '', person_name: '', event_date: '', preference_note: '' })

  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`

  const loadData = useCallback(async () => {
    setLoading(true)
    const [assignRes, eventRes, memberRes] = await Promise.all([
      supabase
        .from('weekly_assignments')
        .select('*, house_tasks(*), members(*)')
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd),
      // 매년 반복 행사는 날짜 필터 없이 전체 가져옴 (클라이언트에서 처리)
      supabase.from('family_events').select('*'),
      supabase.from('members').select('*'),
    ])
    setAssignments(assignRes.data ?? [])
    setEvents(eventRes.data ?? [])
    setMembers(memberRes.data ?? [])
    setLoading(false)
  }, [monthStart, monthEnd])

  // 행사의 이번 달 표시 날짜 계산 (매년 반복이면 현재 연도로 투영, 음력 지원)
  function getDisplayDate(event: FamilyEvent): string {
    return projectEventDate(event.event_date, event.is_lunar ?? false, event.repeat_type, year)
  }

  // 이번 달에 표시할 행사만 필터링
  function getEventsForDate(dateStr: string): FamilyEvent[] {
    return events.filter((e) => getDisplayDate(e) === dateStr)
  }

  // D-day는 실제 표시 날짜 기준으로 계산
  function getEventDDay(event: FamilyEvent): string {
    const displayDate = getDisplayDate(event)
    const diff = Math.ceil(
      (new Date(displayDate).getTime() - new Date(new Date().toISOString().split('T')[0]).getTime())
      / (1000 * 60 * 60 * 24)
    )
    if (diff === 0) return 'D-Day'
    if (diff > 0) return `D-${diff}`
    return `D+${Math.abs(diff)}`
  }

  useEffect(() => { loadData() }, [loadData])

  // 월 이동
  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  // 달력 그리드 생성
  function buildCalendar() {
    const firstDay = new Date(year, month, 1).getDay() // 0=일
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }

  function getDateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function selectDay(day: number) {
    const dateStr = getDateStr(day)
    setSelectedDay({
      date: dateStr,
      assignments: assignments.filter((a) => a.due_date === dateStr),
      events: getEventsForDate(dateStr),
    })
  }

  async function updateAssignStatus(id: string, status: 'done' | 'skipped' | 'pending') {
    await supabase.from('weekly_assignments').update({ status }).eq('id', id)
    await loadData()
    // 선택된 날 데이터 갱신
    if (selectedDay) {
      const updated = assignments.map((a) => a.id === id ? { ...a, status } : a)
      setSelectedDay({
        ...selectedDay,
        assignments: updated.filter((a) => a.due_date === selectedDay.date) as WeeklyAssignment[],
      })
    }
  }

  function startEditEvent(e: FamilyEvent) {
    setEditingEvent(e)
    setEditForm({
      title: e.title,
      person_name: e.person_name ?? '',
      event_date: e.event_date,
      preference_note: e.preference_note ?? '',
    })
  }

  async function saveEditEvent() {
    if (!editingEvent) return
    await supabase.from('family_events').update(editForm).eq('id', editingEvent.id)
    setEditingEvent(null)
    await loadData()
    if (selectedDay) {
      setSelectedDay({
        ...selectedDay,
        events: events.map((e) =>
          e.id === editingEvent.id ? { ...e, ...editForm } : e
        ).filter((e) => e.event_date === selectedDay.date) as FamilyEvent[],
      })
    }
  }

  const cells = buildCalendar()
  const todayStr = today.toISOString().split('T')[0]

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">{year}년 {month + 1}월</h1>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 rounded-xl bg-white border border-amber-100 hover:bg-amber-50 text-gray-600">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }}
            className="px-3 py-1.5 rounded-xl bg-amber-400 text-white text-sm font-medium hover:bg-amber-500">
            오늘
          </button>
          <button onClick={nextMonth} className="p-2 rounded-xl bg-white border border-amber-100 hover:bg-amber-50 text-gray-600">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />집안일</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />경조사</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />완료</span>
      </div>

      {/* 달력 그리드 */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-amber-50">
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <div key={d} className={`text-center py-2 text-xs font-semibold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 셀 */}
        {loading ? (
          <div className="py-20 text-center text-sm text-amber-400">불러오는 중...</div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="min-h-[72px] bg-gray-50/50 border-b border-r border-amber-50/50" />

              const dateStr = getDateStr(day)
              const dayAssigns = assignments.filter((a) => a.due_date === dateStr)
              const dayEvents = getEventsForDate(dateStr)
              const isToday = dateStr === todayStr
              const isSelected = selectedDay?.date === dateStr
              const isSun = idx % 7 === 0
              const isSat = idx % 7 === 6

              return (
                <button
                  key={dateStr}
                  onClick={() => selectDay(day)}
                  className={`min-h-[72px] p-1.5 border-b border-r border-amber-50/50 text-left transition-colors ${
                    isSelected ? 'bg-amber-50' : 'hover:bg-amber-50/60'
                  }`}
                >
                  <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-amber-400 text-white' : isSun ? 'text-red-400' : isSat ? 'text-blue-400' : 'text-gray-700'
                  }`}>
                    {day}
                  </div>

                  {/* 집안일 도트 */}
                  <div className="space-y-0.5">
                    {dayAssigns.slice(0, 2).map((a) => (
                      <div key={a.id} className={`text-[10px] px-1 py-0.5 rounded truncate leading-tight ${
                        a.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {a.house_tasks?.name}
                      </div>
                    ))}
                    {dayAssigns.length > 2 && (
                      <div className="text-[10px] text-gray-400">+{dayAssigns.length - 2}개</div>
                    )}
                    {/* 경조사 */}
                    {dayEvents.slice(0, 1).map((e) => (
                      <div key={e.id} className="text-[10px] px-1 py-0.5 rounded truncate leading-tight bg-orange-100 text-orange-700">
                        {e.title}
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 선택된 날 상세 패널 */}
      {selectedDay && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-50 bg-amber-50">
            <span className="font-semibold text-gray-800">{formatDate(selectedDay.date)} 상세</span>
            <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          {selectedDay.assignments.length === 0 && selectedDay.events.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">이 날 일정이 없습니다</div>
          )}

          {/* 집안일 목록 */}
          {selectedDay.assignments.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">집안일</p>
              <ul className="space-y-2">
                {selectedDay.assignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${a.status === 'done' ? 'line-through text-gray-300' : 'text-gray-800'}`}>
                        {a.house_tasks?.name}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400">{a.members?.name}</span>
                        {(a.house_tasks?.start_time || a.house_tasks?.end_time) && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-500">
                            <Timer size={11} />
                            {timeRange(a.house_tasks.start_time, a.house_tasks.end_time)}
                          </span>
                        )}
                      </div>
                      {a.ai_reason && <p className="text-xs text-amber-500 italic">{a.ai_reason}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {a.status !== 'done' && (
                        <button onClick={() => updateAssignStatus(a.id, 'done')}
                          className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100" title="완료">
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                      {a.status !== 'skipped' && a.status !== 'done' && (
                        <button onClick={() => updateAssignStatus(a.id, 'skipped')}
                          className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100" title="건너뛰기">
                          <SkipForward size={15} />
                        </button>
                      )}
                      {a.status !== 'pending' && (
                        <button onClick={() => updateAssignStatus(a.id, 'pending')}
                          className="p-1.5 rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-100" title="되돌리기">
                          <RotateCcw size={15} />
                        </button>
                      )}
                      <span className={`self-center text-xs px-2 py-0.5 rounded-full ${getStatusColor(a.status)}`}>
                        {getStatusLabel(a.status)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 경조사 목록 */}
          {selectedDay.events.length > 0 && (
            <div className="px-4 py-3 border-t border-amber-50">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">경조사</p>
              <ul className="space-y-2">
                {selectedDay.events.map((e) => (
                  <li key={e.id}>
                    {editingEvent?.id === e.id ? (
                      /* 인라인 편집 폼 */
                      <div className="space-y-2 p-3 bg-amber-50 rounded-xl">
                        <input className="w-full border border-amber-200 rounded-lg px-3 py-1.5 text-sm bg-white"
                          value={editForm.title} onChange={(ev) => setEditForm({ ...editForm, title: ev.target.value })} placeholder="제목" />
                        <input className="w-full border border-amber-200 rounded-lg px-3 py-1.5 text-sm bg-white"
                          value={editForm.person_name} onChange={(ev) => setEditForm({ ...editForm, person_name: ev.target.value })} placeholder="대상자" />
                        <input type="date" className="w-full border border-amber-200 rounded-lg px-3 py-1.5 text-sm bg-white"
                          value={editForm.event_date} onChange={(ev) => setEditForm({ ...editForm, event_date: ev.target.value })} />
                        <textarea className="w-full border border-amber-200 rounded-lg px-3 py-1.5 text-sm bg-white" rows={2}
                          value={editForm.preference_note} onChange={(ev) => setEditForm({ ...editForm, preference_note: ev.target.value })} placeholder="메모" />
                        <div className="flex gap-2">
                          <button onClick={saveEditEvent} className="flex-1 bg-amber-400 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-amber-500">저장</button>
                          <button onClick={() => setEditingEvent(null)} className="px-4 py-1.5 border border-amber-200 rounded-lg text-sm text-gray-600 hover:bg-white">취소</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{e.title}
                            <span className="ml-2 text-xs font-bold text-orange-500">{getEventDDay(e)}</span>
                            {e.repeat_type === 'yearly' && (
                              <span className="ml-1 text-[10px] text-gray-400">매년 반복</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">{e.person_name} · {e.event_type}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => startEditEvent(e)}
                            className="p-1.5 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100">
                            <Pencil size={14} />
                          </button>
                          <Link href={`/events/${e.id}`}
                            className="text-xs px-2 py-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100">
                            상세
                          </Link>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
