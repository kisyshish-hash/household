'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { WeeklyAssignment, FamilyEvent, Member } from '@/lib/types'
import { getWeekStart, getStatusColor, getStatusLabel, projectEventDate } from '@/lib/utils'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import Image from 'next/image'
import {
  CalendarDays, CheckCircle2, Clock, AlertTriangle,
  ChevronRight, ListChecks, PartyPopper, Flame, User, Timer, CloudSun, MapPin
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

const CHEER_MESSAGES = [
  '오늘도 충분히 잘하고 있어',
  '네가 있어서 참 좋아',
  '작은 걸음도 전진이야',
  '고마워, 늘 애써줘서',
  '너는 생각보다 더 강해',
  '지금 이 순간도 의미 있어',
  '넌 이미 소중한 사람이야',
  '웃는 너가 제일 예뻐',
  '여기까지 온 것만으로 대단해',
  '오늘 하루도 고생 많았어',
  '네 존재만으로도 빛나',
  '항상 응원하고 있어',
  '너는 혼자가 아니야',
  '넌 잘 해낼 거야',
  '지금처럼만 해도 충분해',
  '네가 자랑스러워',
  '고맙다는 말, 꼭 전하고 싶어',
  '네 선택을 믿어봐',
  '오늘도 좋은 하루야',
  '넌 사랑받기 위해 태어났어',
  '포기하지 않는 너, 멋있어',
  '네가 있어 세상이 따뜻해',
  '힘들 땐 잠시 쉬어도 괜찮아',
  '너의 속도를 존중해',
  '네가 해온 모든 노력, 알고 있어',
  '오늘의 너도 최고야',
  '웃을 일이 더 많아질 거야',
  '네 마음을 응원해',
  '넌 충분히 잘하고 있어',
  '늘 고마운 사람이야',
  '오늘도 반짝이는 하루 보내',
  '네 안의 가능성을 믿어',
  '네가 있어 행복해',
  '작은 기쁨도 놓치지 마',
  '너의 하루를 응원해',
  '넌 특별한 사람이야',
  '사랑받고 있다는 걸 기억해',
  '네가 웃으면 세상이 밝아져',
  '지금 이대로도 괜찮아',
  '늘 네 편이야',
  '네 노력이 곧 빛날 거야',
  '오늘도 힘내자',
  '네가 최고야',
  '고마워, 진심으로',
  '널 응원하는 사람이 있어',
  '네 꿈을 향해 한 걸음 더',
  '지금도 충분히 잘하고 있어',
  '네 하루가 따뜻하길',
  '넌 정말 소중해',
  '오늘도 널 믿어',
  '네 마음이 평안하길',
  '너라서 가능한 일이야',
  '늘 고마운 존재야',
  '네 미소를 응원해',
  '사랑받을 자격 충분해',
  '넌 빛나는 사람이야',
  '오늘 하루도 화이팅',
  '네 선택은 틀리지 않아',
  '네가 있어 다행이야',
  '넌 이미 충분해',
  '네 이야기를 응원해',
  '오늘도 멋지게 살아가고 있어',
  '넌 가치 있는 사람이야',
  '네가 있어서 힘이 나',
  '항상 응원할게',
  '너의 하루에 웃음이 가득하길',
  '넌 강한 사람이야',
  '지금도 잘하고 있어',
  '네 마음을 아껴줘',
  '고생했어, 진짜로',
  '네가 자랑스러워',
  '오늘도 반짝이자',
  '넌 충분히 빛나',
  '네 삶을 응원해',
  '너라서 좋아',
  '네가 행복하길 바라',
  '항상 고마워',
  '넌 소중한 존재야',
  '오늘도 좋은 일 생길 거야',
  '네가 최고야',
  '네 마음을 믿어봐',
  '넌 사랑받고 있어',
  '오늘도 수고했어',
  '네가 있어 행복해',
  '넌 잘 해내고 있어',
  '네 하루를 응원해',
  '작은 성취도 축하해',
  '넌 충분히 괜찮아',
  '네 존재 자체가 선물이야',
  '오늘도 힘내줘서 고마워',
  '넌 계속 성장 중이야',
  '네가 있어서 든든해',
  '넌 이미 잘하고 있어',
  '오늘도 웃어보자',
  '네 마음이 제일 중요해',
  '넌 멋진 사람이야',
  '언제나 응원할게',
  '넌 혼자가 아니야',
  '네가 행복하면 좋겠어',
  '오늘도 잘 살아냈어',
]

type Weather = {
  status: 'loading' | 'ready' | 'error'
  temp?: number
  wind?: number
  description?: string
  location: string
}

function weatherLabel(code: number): string {
  if (code === 0) return '맑음'
  if ([1, 2, 3].includes(code)) return '구름 조금'
  if ([45, 48].includes(code)) return '안개'
  if ([51, 53, 55, 56, 57].includes(code)) return '이슬비'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '비'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '눈'
  if ([95, 96, 99].includes(code)) return '천둥번개'
  return '날씨'
}

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
  const { member: linkedMember, householdId } = useAuth()
  const [assignments, setAssignments] = useState<WeeklyAssignment[]>([])
  const [allEvents, setAllEvents] = useState<FamilyEvent[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  // null = 전체, memberId = 해당 구성원만
  const [selectedMember, setSelectedMember] = useState<string | null | undefined>(undefined)
  const [memberFilterTouched, setMemberFilterTouched] = useState(false)
  const [weather, setWeather] = useState<Weather>({ status: 'loading', location: '서울' })
  const [cheerMessage, setCheerMessage] = useState(CHEER_MESSAGES[0])

  const weekStart = getWeekStart()
  const today = new Date().toISOString().split('T')[0]
  const currentYear = new Date().getFullYear()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [householdId])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadWeather() }, [])

  async function loadData() {
    if (!householdId) return
    setLoading(true)
    const [assignRes, eventRes, memberRes] = await Promise.all([
      supabase.from('weekly_assignments').select('*, house_tasks(*), members(*)').eq('household_id', householdId).eq('week_start', weekStart),
      // 날짜 필터 없이 전체 조회 → 매년 반복 행사를 클라이언트에서 처리
      supabase.from('family_events').select('*').eq('household_id', householdId),
      supabase.from('members').select('*').eq('household_id', householdId),
    ])
    setAssignments(assignRes.data ?? [])
    setAllEvents(eventRes.data ?? [])
    setMembers(memberRes.data ?? [])
    setLoading(false)
  }

  async function fetchWeather(latitude: number, longitude: number, location: string) {
    try {
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: 'temperature_2m,weather_code,wind_speed_10m',
        timezone: 'auto',
      })
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
      if (!res.ok) throw new Error('weather request failed')
      const data = await res.json()
      setWeather({
        status: 'ready',
        temp: Math.round(data.current.temperature_2m),
        wind: Math.round(data.current.wind_speed_10m),
        description: weatherLabel(data.current.weather_code),
        location,
      })
    } catch {
      setWeather({ status: 'error', location })
    }
  }

  function loadWeather() {
    if (!navigator.geolocation) {
      fetchWeather(37.5665, 126.9780, '서울')
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => fetchWeather(coords.latitude, coords.longitude, '현재 위치'),
      () => fetchWeather(37.5665, 126.9780, '서울'),
      { timeout: 5000 }
    )
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
  const activeMemberFilter = memberFilterTouched ? (selectedMember ?? null) : (linkedMember?.id ?? null)
  const filteredAssignments = activeMemberFilter
    ? assignments.filter((a) => a.assigned_to === activeMemberFilter)
    : assignments

  const overdueTasks = filteredAssignments.filter(
    (a) => a.status === 'pending' && a.due_date && a.due_date < today
  )
  const todayTasks = filteredAssignments.filter(
    (a) => a.due_date === today && a.status === 'pending'
  )

  function overdueDays(dueDate: string): number {
    return Math.floor(
      (new Date(today + 'T00:00:00').getTime() - new Date(dueDate + 'T00:00:00').getTime())
      / (1000 * 60 * 60 * 24)
    )
  }

  function showRandomCheer() {
    setCheerMessage((current) => {
      if (CHEER_MESSAGES.length === 1) return current
      let next = current
      while (next === current) {
        next = CHEER_MESSAGES[Math.floor(Math.random() * CHEER_MESSAGES.length)]
      }
      return next
    })
  }

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
      {/* 날씨 */}
      <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-amber-500 font-medium">{dateLabel}</p>
            <div className="mt-2 flex items-center gap-2 text-gray-800">
              <CloudSun size={24} className="text-amber-400" />
              <span className="text-2xl font-bold">
                {weather.status === 'ready' ? `${weather.temp}°` : weather.status === 'loading' ? '확인 중' : '날씨 정보 없음'}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
              <MapPin size={12} />
              {weather.location}
              {weather.description && ` · ${weather.description}`}
              {weather.wind !== undefined && ` · 바람 ${weather.wind}km/h`}
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-right text-xs text-amber-600">
            오늘도 집안일은<br />
            가볍게 하나씩
          </div>
        </div>
      </div>

      {/* 구성원 필터 */}
      {members.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => { setMemberFilterTouched(true); setSelectedMember(null) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
              activeMemberFilter === null
                ? 'bg-amber-400 text-white border-amber-400'
                : 'bg-white text-gray-500 border-amber-100 hover:border-amber-300'
            }`}
          >
            전체
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMemberFilterTouched(true); setSelectedMember(m.id) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                activeMemberFilter === m.id
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

      {/* 가족 응원 */}
      <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={showRandomCheer}
            aria-label="사랑하는 가족들의 응원문구 보기"
            className="relative flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-amber-50 transition-transform hover:scale-105 active:scale-95"
          >
            <Image
              src="/icon-180.png"
              width={84}
              height={84}
              alt="응원 아이콘"
              className="h-20 w-20 object-contain"
            />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-amber-500">사랑하는 가족들의 응원</p>
            <p className="mt-1 break-keep text-lg font-bold text-gray-800">{cheerMessage}</p>
            <p className="mt-2 text-xs text-gray-400">아이콘을 누르면 다른 응원문구가 나와요.</p>
          </div>
        </div>
      </div>

      {/* 오늘 할 일 (기한초과 포함) */}
      <div className="rounded-2xl border shadow-sm overflow-hidden border-amber-100 bg-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-50">
          <div className="flex items-center gap-2 font-semibold text-gray-700">
            <ListChecks size={16} className="text-amber-500" />
            오늘 할 일
            {activeMemberFilter && (
              <span className="text-xs text-amber-500 font-normal">
                · {members.find((m) => m.id === activeMemberFilter)?.name}
              </span>
            )}
            {overdueTasks.length > 0 && (
              <span className="flex items-center gap-0.5 text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">
                <Flame size={11} /> 초과 {overdueTasks.length}
              </span>
            )}
          </div>
          <Link href="/routines" className="flex items-center text-xs text-amber-500 hover:text-amber-600">
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
            {activeMemberFilter && (
              <span className="text-xs text-amber-500 font-normal">
                · {members.find((m) => m.id === activeMemberFilter)?.name}
              </span>
            )}
          </div>
          <Link href="/routines" className="flex items-center text-xs text-amber-500 hover:text-amber-600">
            관리 <ChevronRight size={14} />
          </Link>
        </div>
        {filteredAssignments.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            배정된 루틴이 없습니다.<br />
            <Link href="/routines" className="text-amber-500 font-medium hover:underline">루틴 탭에서 자동 배정</Link>을 실행하세요.
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
                  {!activeMemberFilter && (
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
