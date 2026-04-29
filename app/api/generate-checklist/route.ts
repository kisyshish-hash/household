import { NextResponse } from 'next/server'
import { createSupabaseWithAccessToken } from '@/lib/supabase'
import { getOpenAIClient, safeParseJSON } from '@/lib/openai'
import { fallbackPreparations } from '@/lib/utils'
import { AIPreparation } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const accessToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!accessToken) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    const supabase = createSupabaseWithAccessToken(accessToken)
    const { eventId } = await request.json()
    if (!eventId) return NextResponse.json({ error: 'eventId 필요' }, { status: 400 })

    // 행사 정보, 선물 이력, 구성원 병렬 조회
    const [eventRes, giftRes, membersRes] = await Promise.all([
      supabase.from('family_events').select('*').eq('id', eventId).single(),
      supabase.from('gift_history').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('members').select('*'),
    ])

    if (eventRes.error) throw eventRes.error
    const event = eventRes.data
    const householdId = event.household_id
    const gifts = giftRes.data ?? []
    const members = membersRes.data ?? []

    // 기존 체크리스트 삭제 후 재생성
    await supabase.from('event_preparations').delete().eq('household_id', householdId).eq('event_id', eventId)

    let preparations: AIPreparation[]
    let usedAI = false

    const openai = getOpenAIClient()

    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `너는 맞벌이 부부를 위한 가정 운영 에이전트다.
경조사와 가정행사를 놓치지 않도록 준비 일정을 만든다.
선물 준비, 메시지 준비, 예약, 배송 확인을 실행 가능한 작업으로 쪼갠다.
결과는 반드시 JSON으로만 출력한다.`,
            },
            {
              role: 'user',
              content: `다음 경조사 정보를 바탕으로 준비 체크리스트를 만들어줘.

행사 정보:
${JSON.stringify(event, null, 2)}

대상자 선호 정보:
${event.preference_note ?? '없음'}

과거 선물 이력:
${JSON.stringify(gifts, null, 2)}

가족 구성원:
${JSON.stringify(members, null, 2)}

기준:
- D-30, D-14, D-7, D-3, D-1 기준으로 준비 작업을 생성
- 선물 후보는 예산 범위 안에서 제안
- 과거에 준 선물과 너무 겹치지 않게 할 것
- 담당자를 1명씩 배정 (assigned_to는 members의 id를 사용)
- 실행 가능한 작업 단위로 쪼갤 것

출력 형식:
[
  {
    "preparation_task": "...",
    "due_date": "YYYY-MM-DD",
    "assigned_to": "member id",
    "ai_suggestion": "..."
  }
]`,
            },
          ],
          temperature: 0.3,
        })

        const content = completion.choices[0]?.message?.content ?? ''
        const parsed = safeParseJSON<AIPreparation[]>(content)

        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          preparations = parsed
          usedAI = true
        } else {
          preparations = fallbackPreparations(event.event_date, members.map((m) => m.id))
        }
      } catch {
        preparations = fallbackPreparations(event.event_date, members.map((m) => m.id))
      }
    } else {
      preparations = fallbackPreparations(event.event_date, members.map((m) => m.id))
    }

    // event_preparations 저장
    const rows = preparations.map((p) => ({
      event_id: eventId,
      household_id: householdId,
      preparation_task: p.preparation_task,
      due_date: p.due_date,
      assigned_to: p.assigned_to || null,
      status: 'pending',
      ai_suggestion: p.ai_suggestion,
    }))

    const { error: insertError } = await supabase.from('event_preparations').insert(rows)
    if (insertError) throw insertError

    return NextResponse.json({ success: true, preparations, usedAI })
  } catch (err) {
    console.error('generate-checklist error:', err)
    return NextResponse.json({ error: '체크리스트 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
