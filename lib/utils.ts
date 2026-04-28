import { HouseTask, Member, AIAssignment } from './types'

/**
 * 음력 월/일 → 해당 연도의 양력 날짜 (YYYY-MM-DD) 변환
 * Intl.DateTimeFormat의 'ca-korean' 달력을 활용해 전체 양력 날짜를 순회하며 매핑
 * 윤달(intercalary month)이 있는 해에는 첫 번째 매칭 날짜를 반환
 */
export function lunarToSolar(
  targetYear: number,
  lunarMonth: number,
  lunarDay: number
): string | null {
  try {
    const fmt = new Intl.DateTimeFormat('ko-KR-u-ca-korean', {
      month: 'numeric',
      day: 'numeric',
    })

    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(targetYear, m + 1, 0).getDate()
      for (let d = 1; d <= daysInMonth; d++) {
        const solarDate = new Date(targetYear, m, d)
        const parts = fmt.formatToParts(solarDate)
        const lm = parseInt(parts.find((p) => p.type === 'month')?.value ?? '0')
        const ld = parseInt(parts.find((p) => p.type === 'day')?.value ?? '0')
        if (lm === lunarMonth && ld === lunarDay) {
          return solarDate.toISOString().split('T')[0]
        }
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * FamilyEvent의 event_date(음력 or 양력)를 targetYear의 표시용 양력 날짜로 투영
 */
export function projectEventDate(
  eventDate: string,
  isLunar: boolean,
  repeatType: string,
  targetYear: number
): string {
  const [, mm, dd] = eventDate.split('-')
  if (repeatType === 'yearly') {
    if (isLunar) {
      return lunarToSolar(targetYear, parseInt(mm), parseInt(dd)) ?? `${targetYear}-${mm}-${dd}`
    }
    return `${targetYear}-${mm}-${dd}`
  }
  return eventDate
}

// 이번 주 월요일 날짜 반환
export function getWeekStart(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

// D-day 계산
export function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// D-day 레이블
export function getDDayLabel(dateStr: string): string {
  const days = getDaysUntil(dateStr)
  if (days === 0) return 'D-Day'
  if (days > 0) return `D-${days}`
  return `D+${Math.abs(days)}`
}

// 날짜 포맷 (YYYY-MM-DD → M월 D일)
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

// 난이도 레이블
export function getDifficultyLabel(level: number): string {
  const labels = ['', '쉬움', '보통', '어려움', '매우 어려움', '극도로 어려움']
  return labels[level] ?? `${level}단계`
}

// 상태 레이블
export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '진행 중',
    done: '완료',
    skipped: '건너뜀',
  }
  return map[status] ?? status
}

// 상태 배지 색상
export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    done: 'bg-green-100 text-green-800',
    skipped: 'bg-gray-100 text-gray-600',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

// OpenAI 없을 때 fallback 분배 로직
// difficulty 합계가 적은 사람에게 순차 배정
export function fallbackAssign(
  tasks: HouseTask[],
  members: Member[],
  weekStart: string
): AIAssignment[] {
  const loads: Record<string, number> = {}
  members.forEach((m) => (loads[m.id] = 0))

  const assignments: AIAssignment[] = []

  for (const task of tasks) {
    // 현재 부하가 가장 적은 구성원 선택
    const assignee = members.reduce((a, b) => (loads[a.id] <= loads[b.id] ? a : b))

    // due_date: 선호 요일 또는 이번 주 일요일
    const dueDate = getDueDateForTask(task, weekStart)

    assignments.push({
      task_id: task.id,
      task_name: task.name,
      assigned_to: assignee.id,
      due_date: dueDate,
      reason: `난이도 기준 자동 배정 (fallback)`,
    })

    loads[assignee.id] += task.difficulty
  }

  return assignments
}

// 집안일의 due_date 계산 (선호 요일 반영)
function getDueDateForTask(task: HouseTask, weekStart: string): string {
  const dayMap: Record<string, number> = {
    월요일: 0, 화요일: 1, 수요일: 2, 목요일: 3,
    금요일: 4, 토요일: 5, 일요일: 6,
  }
  const offset = task.preferred_day ? (dayMap[task.preferred_day] ?? 6) : 6
  const base = new Date(weekStart)
  base.setDate(base.getDate() + offset)
  return base.toISOString().split('T')[0]
}

// 경조사 fallback 준비 체크리스트 생성
export function fallbackPreparations(
  eventDate: string,
  memberIds: string[]
): Array<{ preparation_task: string; due_date: string; assigned_to: string; ai_suggestion: string }> {
  const date = new Date(eventDate)
  const assignee = memberIds[0] ?? ''

  const items = [
    { days: 30, task: '선물 후보 3개 정하기', suggestion: '예산 범위 내에서 선물 후보를 조사하세요.' },
    { days: 14, task: '선물 주문 또는 예약', suggestion: '배송 기간을 고려해 주문하세요.' },
    { days: 7, task: '축하 메시지 작성', suggestion: '진심이 담긴 메시지를 미리 작성해두세요.' },
    { days: 3, task: '배송 확인', suggestion: '배송 상태를 확인하고 필요 시 조치하세요.' },
    { days: 1, task: '최종 준비 확인', suggestion: '모든 준비가 완료되었는지 최종 점검하세요.' },
  ]

  return items.map(({ days, task, suggestion }) => {
    const dueDate = new Date(date)
    dueDate.setDate(dueDate.getDate() - days)
    return {
      preparation_task: task,
      due_date: dueDate.toISOString().split('T')[0],
      assigned_to: assignee,
      ai_suggestion: suggestion,
    }
  })
}
