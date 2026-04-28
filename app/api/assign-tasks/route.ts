import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getOpenAIClient, safeParseJSON } from '@/lib/openai'
import { fallbackAssign, getWeekStart } from '@/lib/utils'
import { AIAssignment, Member, HouseTask, WeeklyAssignment } from '@/lib/types'

export async function POST() {
  try {
    const weekStart = getWeekStart()

    // 활성 집안일, 구성원, 최근 4주 이력 병렬 조회
    const [tasksRes, membersRes, historyRes] = await Promise.all([
      supabase.from('house_tasks').select('*').eq('is_active', true),
      supabase.from('members').select('*'),
      supabase
        .from('weekly_assignments')
        .select('*, house_tasks(name), members(name)')
        .gte('week_start', getWeeksAgo(4))
        .order('week_start', { ascending: false }),
    ])

    if (tasksRes.error) throw tasksRes.error
    if (membersRes.error) throw membersRes.error

    const tasks: HouseTask[] = tasksRes.data ?? []
    const members: Member[] = membersRes.data ?? []
    const history: WeeklyAssignment[] = historyRes.data ?? []

    // 기존 이번 주 배정 삭제 후 재생성
    await supabase.from('weekly_assignments').delete().eq('week_start', weekStart)

    let assignments: AIAssignment[]
    let usedAI = false

    const openai = getOpenAIClient()

    if (openai && tasks.length > 0 && members.length > 0) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `너는 맞벌이 부부를 위한 가정 운영 에이전트다.
집안일을 공정하고 현실적으로 분배한다.
한 사람에게 과도하게 몰아주지 않는다.
선호 업무와 비선호 업무를 고려한다.
반복 업무는 루틴화한다.
결과는 반드시 JSON으로만 출력한다.`,
            },
            {
              role: 'user',
              content: `다음 정보를 바탕으로 이번 주 집안일을 분배해줘.

가족 구성원:
${JSON.stringify(members, null, 2)}

집안일 목록:
${JSON.stringify(tasks, null, 2)}

지난 4주간 배정 이력:
${JSON.stringify(history, null, 2)}

이번 주 시작일: ${weekStart}

분배 기준:
- 난이도 총합이 최대한 비슷해야 함
- 같은 사람이 같은 일을 계속 맡지 않도록 할 것
- 선호 업무는 우선 반영
- 비선호 업무는 가능하면 피하되, 완전히 제외하지는 말 것
- due_date를 포함할 것
- 배정 이유를 짧게 작성할 것

출력 형식:
[
  {
    "task_id": "...",
    "task_name": "...",
    "assigned_to": "회원 id",
    "due_date": "YYYY-MM-DD",
    "reason": "..."
  }
]`,
            },
          ],
          temperature: 0.3,
        })

        const content = completion.choices[0]?.message?.content ?? ''
        const parsed = safeParseJSON<AIAssignment[]>(content)

        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          assignments = parsed
          usedAI = true
        } else {
          assignments = fallbackAssign(tasks, members, weekStart)
        }
      } catch {
        assignments = fallbackAssign(tasks, members, weekStart)
      }
    } else {
      assignments = fallbackAssign(tasks, members, weekStart)
    }

    // weekly_assignments 저장
    const rows = assignments.map((a) => ({
      week_start: weekStart,
      task_id: a.task_id,
      assigned_to: a.assigned_to,
      due_date: a.due_date,
      status: 'pending',
      ai_reason: a.reason,
    }))

    const { error: insertError } = await supabase.from('weekly_assignments').insert(rows)
    if (insertError) throw insertError

    return NextResponse.json({ success: true, assignments, usedAI, weekStart })
  } catch (err) {
    console.error('assign-tasks error:', err)
    return NextResponse.json({ error: '배정 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

// N주 전 날짜 반환
function getWeeksAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n * 7)
  return d.toISOString().split('T')[0]
}
