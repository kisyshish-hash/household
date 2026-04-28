'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { WeeklyAssignment, FamilyEvent, Member } from '@/lib/types'
import { getWeekStart, getStatusColor, getStatusLabel, projectEventDate } from '@/lib/utils'
import Link from 'next/link'
import {
  CalendarDays, CheckCircle2, Clock, AlertTriangle,
  ChevronRight, TrendingUp, ListChecks, PartyPopper, Flame, User, Timer
} from 'lucide-react'

// HH:MM → 오전/오후 표기
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

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']

// YYYY-MM-DD → M월 D일 (요일)
function formatWithDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_KO[d.getDay()]})`
}

// M월 D일 표기
function formatShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

export default function Dashboard() {
  const [assignments, setAssignments] = useState<WeeklyAssignment[]>([])
  const [allEvents, setAllEvents] = useState<FamilyEvent[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  // null = 전체, memberId = 해당 구성원만
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  const weekStart = getWeekStart()
  const today = new Date().toISOString().split('T')[0]
  const currentYear = new Date().getFullYear()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [assignRes, eventRes, memberRes] = await Promise.all([
      supabase.from('weekly_assignments').select('*, house_tasks(*), members(*)').eq('week_start', weekStart),
      // 날짜 필터 없이 전체 조회 → 매년 반복 행사를 클라이언트에서 처리
      supabase.from('family_events').select('*'),
      supabase.from('members').select('*'),
    ])
    setAssignments(assignRes.data ?? [])
    setAllEvents(eventRes.data ?? [])
    setMembers(memberRes.data ?? [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: 'done' | 'skipped') {
    await supabase.from('weekly_assignments').update({ status }).eq('id', id)
    await loadData()
  }

  // 매년 반복 행사의 올해 날짜로 투영 (음력 지원)
  function getDisplayDate(e: FamilyEvent): string {
    return projectEventDate(e.event_date, e.is_lunar ?? false, e.repeat_type, currentYear)
  }

  // 다음 달 말일 계산
  const nextMonthEnd = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 2, 0) // 다음 달의 마지막 날
    return d.toISOString().split('T')[0]
  })()

  // 다가오는 경조사: 오늘 이후 ~ 다음 달 말까지, D-day 가까운 순
  const upcomingEvents = allEvents
    .map((e) => ({ ...e, displayDate: getDisplayDate(e) }))
    .filter((e) => e.displayDate >= today && e.displayDate <= nextMonthEnd)
    .sort((a, b) => a.displayDate.localeCompare(b.displayDate))

  function getDDayLabel(displayDate: string): string {
    const diff = Math.ceil(
      (new Date(displayDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime())
      / (1000 * 60 * 60 * 24)
    )
    if (diff === 0) return 'D-Day'
    if (diff > 0) return `D-${diff}`
    return `D+${Math.abs(diff)}`
  }

  // 구성원 필터 적용
  const filteredAssignments = selectedMember
    ? assignments.filter((a) => a.assigned_to === selectedMember)
    : assignments

  const overdueTasks = filteredAssignments.filter(
    (a) => a.status === 'pending' && a.due_date && a.due_date < today
  )
  const todayTasks = filteredAssignments.filter(
    (a) => a.due_date === today && a.status === 'pending'
  )
  const pendingTasks = filteredAssignments.filter((a) => a.status === 'pending')
  const doneTasks = filteredAssignments.filter((a) => a.status === 'done')

  // 진행률은 전체 기준
  const allDone = assignments.filter((a) => a.status === 'done').length
  const progress = assignments.length > 0 ? Math.round((allDone / assignments.length) * 100) : 0

  function overdueDays(dueDate: string): number {
    return Math.floor(
      (new Date(today + 'T00:00:00').getTime() - new Date(dueDate + 'T00:00:00').getTime())
      / (1000 * 60 * 60 * 24)
    )
  }

  const workload = members.map((m) => {
    const myTasks = assignments.filter((a) => a.assigned_to === m.id)
    const done = myTasks.filter((a) => a.status === 'done').length
    const total = myTasks.length
    const diffSum = myTasks.reduce((s, a) => s + (a.house_tasks?.difficulty ?? 0), 0)
    return { member: m, done, total, diffSum }
  })

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-amber-400 gap-2">
      <Clock size={18} className="animate-spin" />
      <span className="text-sm">불러오는 중...</span>
    </div>
  )

  const now = new Date()
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 ${DAY_KO[now.getDay()]}요일`

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div>
        <p className="text-sm text-amber-500 font-medium">{dateLabel}</p>
        <h1 className="text-2xl font-bold text-gray-800 mt-0.5">안녕하세요</h1>
      </div>

      {/* 구성원 필터 */}
      {members.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedMember(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
              selectedMember === null
                ? 'bg-amber-400 text-white border-amber-400'
                : 'bg-white text-gray-500 border-amber-100 hover:border-amber-300'
            }`}
          >
            전체
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMember(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                selectedMember === m.id
                  ? 'bg-amber-400 text-white border-amber-400'
                  : 'bg-white text-gray-500 border-amber-100 hover:border-amber-300'
              }`}
            >
              <User size={13} />
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* 요약 카드 3개 */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`rounded-2xl p-4 shadow-sm text-center border ${overdueTasks.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-amber-100'}`}>
          {overdueTasks.length > 0 ? (
            <>
              <div className="flex items-center justify-center gap-1">
                <Flame size={16} className="text-red-500" />
                <p className="text-2xl font-bold text-red-500">{overdueTasks.length}</p>
              </div>
              <p className="text-xs text-red-400 mt-1">기한 초과</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-amber-500">{todayTasks.length}</p>
              <p className="text-xs text-gray-500 mt-1">오늘 할 일</p>
            </>
          )}
        </div>
        <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-500">{doneTasks.length}</p>
          <p className="text-xs text-gray-500 mt-1">완료</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-orange-400">{pendingTasks.length}</p>
          <p className="text-xs text-gray-500 mt-1">남은 일</p>
        </div>
      </div>

      {/* 이번 주 진행률 */}
      <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-gray-700 font-semibold">
            <TrendingUp size={16} className="text-amber-500" />
            이번 주 진행률
          </div>
          <span className="text-amber-600 font-bold text-sm">{progress}%</span>
        </div>
        <div className="h-2.5 bg-amber-100 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        {workload.length > 0 && (
          <div className="mt-4 space-y-3">
            {workload.map(({ member, done, total, diffSum }) => (
              <div key={member.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700">
                    {member.name}
                    <span className="text-gray-400 font-normal ml-1">({member.role})</span>
                  </span>
                  <span className="text-gray-400">{done}/{total}건 · 난이도 합계 {diffSum}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-300 rounded-full" style={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 오늘 할 일 (기한초과 포함) */}
      <div className="rounded-2xl border shadow-sm overflow-hidden border-amber-100 bg-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-50">
          <div className="flex items-center gap-2 font-semibold text-gray-700">
            <ListChecks size={16} className="text-amber-500" />
            오늘 할 일
            {selectedMember && (
              <span className="text-xs text-amber-500 font-normal">
                · {members.find((m) => m.id === selectedMember)?.name}
              </span>
            )}
            {overdueTasks.length > 0 && (
              <span className="flex items-center gap-0.5 text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">
                <Flame size={11} /> 초과 {overdueTasks.length}
              </span>
            )}
          </div>
          <Link href="/tasks" className="flex items-center text-xs text-amber-500 hover:text-amber-600">
            전체 보기 <ChevronRight size={14} />
          </Link>
        </div>

        {overdueTasks.length === 0 && todayTasks.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            <CheckCircle2 size={24} className="mx-auto mb-2 text-green-300" />
            오늘 할 일이 없습니다
          </div>
        ) : (
          <ul className="divide-y divide-amber-50">
            {/* 기한 초과 — 맨 위, 오래된 순 */}
            {[...overdueTasks]
              .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
              .map((a) => (
                <li key={a.id} className="bg-red-50 border-l-4 border-red-400 px-4 py-3 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                      <p className="text-sm font-bold text-red-700">{a.house_tasks?.name}</p>
                      <span className="text-[11px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                        {overdueDays(a.due_date!)}일 초과
                      </span>
                    </div>
                    <p className="text-xs text-red-400 mt-0.5 ml-5">
                      {a.members?.name} · 기한 {formatWithDay(a.due_date!)}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => updateStatus(a.id, 'done')}
                      className="text-xs px-3 py-1.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600">
                      완료
                    </button>
                    <button onClick={() => updateStatus(a.id, 'skipped')}
                      className="text-xs px-3 py-1.5 bg-white border border-red-200 text-red-400 rounded-lg font-medium hover:bg-red-50">
                      건너뛰기
                    </button>
                  </div>
                </li>
              ))}

            {/* 오늘 기한 */}
            {todayTasks.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-3 gap-2 bg-white">
                <div>
                  <p className="text-sm font-medium text-gray-800">{a.house_tasks?.name}</p>
                  <p className="text-xs text-gray-400">{a.members?.name}</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => updateStatus(a.id, 'done')}
                    className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100">
                    완료
                  </button>
                  <button onClick={() => updateStatus(a.id, 'skipped')}
                    className="text-xs px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg font-medium hover:bg-gray-100">
                    건너뛰기
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 다가오는 경조사 — 이번 주 집안일 위로 이동 */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-50">
          <div className="flex items-center gap-2 font-semibold text-gray-700">
            <PartyPopper size={16} className="text-amber-500" />
            다가오는 경조사
          </div>
          <Link href="/events" className="flex items-center text-xs text-amber-500 hover:text-amber-600">
            전체 보기 <ChevronRight size={14} />
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">예정된 경조사가 없습니다</div>
        ) : (
          <ul className="divide-y divide-amber-50">
            {upcomingEvents.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-4 py-3 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">{e.title}</p>
                    {e.repeat_type === 'yearly' && (
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">매년</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{e.person_name} · {formatShort(e.displayDate)}</p>
                </div>
                <Link href={`/events/${e.id}`}
                  className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg hover:bg-amber-100 flex-shrink-0">
                  {getDDayLabel(e.displayDate)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 이번 주 집안일 전체 */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-50">
          <div className="flex items-center gap-2 font-semibold text-gray-700">
            <CalendarDays size={16} className="text-amber-500" />
            이번 주 루틴
            {selectedMember && (
              <span className="text-xs text-amber-500 font-normal">
                · {members.find((m) => m.id === selectedMember)?.name}
              </span>
            )}
          </div>
          <Link href="/tasks" className="flex items-center text-xs text-amber-500 hover:text-amber-600">
            관리 <ChevronRight size={14} />
          </Link>
        </div>
        {filteredAssignments.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            배정된 루틴이 없습니다.<br />
            <Link href="/tasks" className="text-amber-500 font-medium hover:underline">루틴 탭에서 자동 배정</Link>을 실행하세요.
          </div>
        ) : (
          <ul className="divide-y divide-amber-50">
            {filteredAssignments.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {a.status === 'done'
                    ? <CheckCircle2 size={15} className="text-green-400 flex-shrink-0" />
                    : <Clock size={15} className="text-amber-300 flex-shrink-0" />
                  }
                  <div className="min-w-0">
                    <span className={`text-sm block truncate ${a.status === 'done' ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                      {a.house_tasks?.name}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {a.due_date && (
                        <span className="text-xs text-gray-400">{formatWithDay(a.due_date)}</span>
                      )}
                      {(a.house_tasks?.start_time || a.house_tasks?.end_time) && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-500">
                          <Timer size={11} />
                          {timeRange(a.house_tasks.start_time, a.house_tasks.end_time)}
                        </span>
                      )}
                    </div>
                  </div>
                  {!selectedMember && (
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-auto">{a.members?.name}</span>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${getStatusColor(a.status)}`}>
                  {getStatusLabel(a.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
