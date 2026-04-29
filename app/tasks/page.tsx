'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { HouseTask, WeeklyAssignment, Member } from '@/lib/types'
import { getWeekStart, formatDate, getStatusColor, getStatusLabel, getDifficultyLabel } from '@/lib/utils'
import {
  Wand2, Plus, CheckCircle2, SkipForward, RotateCcw,
  Pencil, Trash2, ChevronDown, ChevronUp, Zap, Clock, ClipboardList
} from 'lucide-react'

const FREQ_LABELS: Record<string, string> = {
  daily: '매일', weekly: '매주', biweekly: '격주', monthly: '매월', once: '1회',
}

const EMPTY_TASK_FORM = {
  name: '', description: '', frequency: 'weekly', preferred_day: '',
  difficulty: 2, estimated_minutes: 20, required_people: 1,
  start_time: '', end_time: '',
}

const EMPTY_ONE_TIME = {
  name: '', assigned_to: '', due_date: '', difficulty: 1, estimated_minutes: 10,
  start_time: '', end_time: '',
}

// HH:MM → 오전/오후 H:MM
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

function timeRange(start: string | null, end: string | null): string {
  if (!start && !end) return ''
  if (start && !end) return formatTime(start)
  if (!start && end) return `~ ${formatTime(end)}`
  return `${formatTime(start)} ~ ${formatTime(end)}`
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<HouseTask[]>([])
  const [assignments, setAssignments] = useState<WeeklyAssignment[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showOneTimeForm, setShowOneTimeForm] = useState(false)
  const [oneTimeForm, setOneTimeForm] = useState(EMPTY_ONE_TIME)
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [assignMsg, setAssignMsg] = useState<string | null>(null)
  const [tab, setTab] = useState<'week' | 'list'>('week')

  const weekStart = getWeekStart()
  const weekEnd = (() => {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + 6)
    return d.toISOString().split('T')[0]
  })()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [taskRes, assignRes, memberRes] = await Promise.all([
      supabase.from('house_tasks').select('*').order('created_at'),
      supabase
        .from('weekly_assignments')
        .select('*, house_tasks(*), members(*)')
        .gte('due_date', weekStart)
        .lte('due_date', weekEnd)
        .order('due_date'),
      supabase.from('members').select('*'),
    ])
    setTasks(taskRes.data ?? [])
    setAssignments(assignRes.data ?? [])
    setMembers(memberRes.data ?? [])
    setLoading(false)
  }

  async function handleAutoAssign() {
    setAssigning(true)
    setAssignMsg(null)
    try {
      const res = await fetch('/api/assign-tasks', { method: 'POST' })
      const data = await res.json()
      if (data.error) setAssignMsg(`오류: ${data.error}`)
      else {
        setAssignMsg(data.usedAI ? 'AI가 이번 주 루틴을 배정했습니다.' : '자동 배정 완료 (fallback 방식)')
        await loadAll()
      }
    } catch { setAssignMsg('네트워크 오류가 발생했습니다.') }
    setAssigning(false)
  }

  async function handleAddOneTime() {
    if (!oneTimeForm.name.trim()) return alert('루틴 이름을 입력해주세요.')
    if (!oneTimeForm.due_date) return alert('기한을 입력해주세요.')

    const { data: task, error: taskErr } = await supabase
      .from('house_tasks')
      .insert({
        name: oneTimeForm.name.trim(),
        frequency: 'once',
        difficulty: Number(oneTimeForm.difficulty),
        estimated_minutes: Number(oneTimeForm.estimated_minutes),
        start_time: oneTimeForm.start_time || null,
        end_time: oneTimeForm.end_time || null,
        is_active: false,
      })
      .select()
      .single()
    if (taskErr || !task) return alert('루틴 생성 실패')

    await supabase.from('weekly_assignments').insert({
      week_start: weekStart,
      task_id: task.id,
      assigned_to: oneTimeForm.assigned_to || null,
      due_date: oneTimeForm.due_date,
      status: 'pending',
      ai_reason: '일시적으로 추가된 루틴',
    })

    setOneTimeForm(EMPTY_ONE_TIME)
    setShowOneTimeForm(false)
    setTab('week')
    await loadAll()
  }

  function startEdit(t: HouseTask) {
    setEditId(t.id)
    setTaskForm({
      name: t.name, description: t.description ?? '', frequency: t.frequency,
      preferred_day: t.preferred_day ?? '', difficulty: t.difficulty,
      estimated_minutes: t.estimated_minutes, required_people: t.required_people,
      start_time: t.start_time ?? '', end_time: t.end_time ?? '',
    })
    setShowTaskForm(true)
  }

  function cancelTaskForm() { setEditId(null); setTaskForm(EMPTY_TASK_FORM); setShowTaskForm(false) }

  async function handleSaveTask() {
    if (!taskForm.name.trim()) return alert('루틴 이름을 입력해주세요.')
    const payload = {
      ...taskForm,
      name: taskForm.name.trim(),
      is_active: true,
      start_time: taskForm.start_time || null,
      end_time: taskForm.end_time || null,
    }
    if (editId) await supabase.from('house_tasks').update(payload).eq('id', editId)
    else await supabase.from('house_tasks').insert(payload)
    cancelTaskForm()
    await loadAll()
  }

  async function toggleActive(t: HouseTask) {
    await supabase.from('house_tasks').update({ is_active: !t.is_active }).eq('id', t.id)
    await loadAll()
  }

  async function handleDeleteTask(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('house_tasks').delete().eq('id', id)
    await loadAll()
  }

  async function updateStatus(id: string, status: 'done' | 'skipped' | 'pending') {
    await supabase.from('weekly_assignments').update({ status }).eq('id', id)
    await loadAll()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList size={22} className="text-amber-500" />
        <h1 className="text-2xl font-bold text-gray-800">홈 루틴 관리</h1>
      </div>

      {/* 자동 분배 카드 */}
      <div className="bg-amber-400 rounded-2xl p-4 text-white shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Wand2 size={18} />
          <span className="font-semibold">이번 주 루틴 자동 배정</span>
        </div>
        <p className="text-amber-100 text-xs mb-3">AI가 선호/비선호와 지난 4주 이력을 반영해 공평하게 배정합니다.</p>
        <button
          onClick={handleAutoAssign}
          disabled={assigning}
          className="w-full bg-white text-amber-600 py-2.5 rounded-xl font-bold text-sm hover:bg-amber-50 disabled:opacity-60 transition-colors"
        >
          {assigning ? '배정 중...' : '자동 배정 실행'}
        </button>
        {assignMsg && <p className="mt-2 text-xs text-amber-100 text-center">{assignMsg}</p>}
      </div>

      {/* 탭 */}
      <div className="flex gap-2 bg-white rounded-xl p-1 border border-amber-100">
        <button onClick={() => setTab('week')}
          className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ${tab === 'week' ? 'bg-amber-400 text-white shadow-sm' : 'text-gray-500 hover:text-amber-600'}`}>
          이번 주 루틴
        </button>
        <button onClick={() => setTab('list')}
          className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ${tab === 'list' ? 'bg-amber-400 text-white shadow-sm' : 'text-gray-500 hover:text-amber-600'}`}>
          전체 루틴
        </button>
      </div>

      {/* 이번 주 루틴 탭 */}
      {tab === 'week' && (
        <div className="space-y-3">
          {/* 일시적 루틴 추가 */}
          <button
            onClick={() => setShowOneTimeForm((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-dashed border-amber-300 text-amber-600 text-sm font-medium hover:bg-amber-50 transition-colors"
          >
            <div className="flex items-center gap-2"><Zap size={16} />일시적 루틴 추가</div>
            {showOneTimeForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showOneTimeForm && (
            <div className="bg-white rounded-xl border border-amber-100 p-4 space-y-3">
              <p className="text-xs text-gray-500">이번 주에만 추가되는 루틴입니다.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">이름 *</label>
                  <input className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-300"
                    value={oneTimeForm.name} onChange={(e) => setOneTimeForm({ ...oneTimeForm, name: e.target.value })}
                    placeholder="예: 에어컨 필터 청소" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">담당자</label>
                  <select className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                    value={oneTimeForm.assigned_to} onChange={(e) => setOneTimeForm({ ...oneTimeForm, assigned_to: e.target.value })}>
                    <option value="">미정</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">기한 *</label>
                  <input type="date" className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                    value={oneTimeForm.due_date} onChange={(e) => setOneTimeForm({ ...oneTimeForm, due_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">시작 시간</label>
                  <input type="time" className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                    value={oneTimeForm.start_time} onChange={(e) => setOneTimeForm({ ...oneTimeForm, start_time: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">종료 시간</label>
                  <input type="time" className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                    value={oneTimeForm.end_time} onChange={(e) => setOneTimeForm({ ...oneTimeForm, end_time: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">난이도 (1-5)</label>
                  <input type="number" min={1} max={5} className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                    value={oneTimeForm.difficulty} onChange={(e) => setOneTimeForm({ ...oneTimeForm, difficulty: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">소요 시간(분)</label>
                  <input type="number" min={1} className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                    value={oneTimeForm.estimated_minutes} onChange={(e) => setOneTimeForm({ ...oneTimeForm, estimated_minutes: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddOneTime} className="flex-1 bg-amber-400 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-500">추가</button>
                <button onClick={() => { setShowOneTimeForm(false); setOneTimeForm(EMPTY_ONE_TIME) }}
                  className="px-4 py-2 border border-amber-100 rounded-lg text-sm text-gray-500 hover:bg-gray-50">취소</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-10 text-amber-400 text-sm">불러오는 중...</div>
          ) : assignments.length === 0 ? (
            <div className="bg-white rounded-xl border border-amber-100 p-8 text-center text-gray-400 text-sm">
              이번 주 배정된 루틴이 없습니다.<br />위 자동 배정 버튼을 눌러보세요.
            </div>
          ) : (
            assignments.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-amber-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm ${a.status === 'done' ? 'line-through text-gray-300' : 'text-gray-800'}`}>
                        {a.house_tasks?.name}
                      </span>
                      {a.house_tasks?.frequency === 'once' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full">일시적</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(a.status)}`}>
                        {getStatusLabel(a.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                      <span className="text-xs text-gray-400">{a.members?.name}</span>
                      {a.due_date && <span className="text-xs text-gray-400">· {formatDate(a.due_date)}</span>}
                      {/* 시작/종료 시간 */}
                      {(a.house_tasks?.start_time || a.house_tasks?.end_time) && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-500">
                          <Clock size={11} />
                          {timeRange(a.house_tasks.start_time, a.house_tasks.end_time)}
                        </span>
                      )}
                      {a.house_tasks && <span className="text-xs text-gray-400">· 난이도 {getDifficultyLabel(a.house_tasks.difficulty)}</span>}
                    </div>
                    {a.ai_reason && <p className="text-xs text-amber-500 italic mt-1">{a.ai_reason}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {a.status !== 'done' && (
                      <button onClick={() => updateStatus(a.id, 'done')}
                        className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100" title="완료">
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    {a.status === 'pending' && (
                      <button onClick={() => updateStatus(a.id, 'skipped')}
                        className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100" title="건너뛰기">
                        <SkipForward size={16} />
                      </button>
                    )}
                    {a.status !== 'pending' && (
                      <button onClick={() => updateStatus(a.id, 'pending')}
                        className="p-1.5 rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-100" title="되돌리기">
                        <RotateCcw size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 전체 루틴 탭 */}
      {tab === 'list' && (
        <div className="space-y-3">
          <button
            onClick={() => { setShowTaskForm(true); setEditId(null); setTaskForm(EMPTY_TASK_FORM) }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white rounded-xl border border-dashed border-amber-300 text-amber-600 text-sm font-medium hover:bg-amber-50"
          >
            <Plus size={16} /> 루틴 추가
          </button>

          {showTaskForm && (
            <div className="bg-white rounded-xl border border-amber-100 p-4 space-y-3">
              <h2 className="font-semibold text-gray-700 text-sm">{editId ? '루틴 수정' : '루틴 추가'}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">이름 *</label>
                  <input className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-300"
                    value={taskForm.name} onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })} placeholder="예: 분리수거" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">설명</label>
                  <input className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                    value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">빈도</label>
                  <select className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                    value={taskForm.frequency} onChange={(e) => setTaskForm({ ...taskForm, frequency: e.target.value })}>
                    {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">선호 요일</label>
                  <select className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                    value={taskForm.preferred_day} onChange={(e) => setTaskForm({ ...taskForm, preferred_day: e.target.value })}>
                    <option value="">없음</option>
                    {['월요일','화요일','수요일','목요일','금요일','토요일','일요일'].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                {/* 시작/종료 시간 */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">시작 시간</label>
                  <input type="time" className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                    value={taskForm.start_time} onChange={(e) => setTaskForm({ ...taskForm, start_time: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">종료 시간</label>
                  <input type="time" className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                    value={taskForm.end_time} onChange={(e) => setTaskForm({ ...taskForm, end_time: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">난이도 (1-5)</label>
                  <input type="number" min={1} max={5} className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                    value={taskForm.difficulty} onChange={(e) => setTaskForm({ ...taskForm, difficulty: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">소요 시간(분)</label>
                  <input type="number" min={1} className="w-full border border-amber-100 rounded-lg px-3 py-2 text-sm"
                    value={taskForm.estimated_minutes} onChange={(e) => setTaskForm({ ...taskForm, estimated_minutes: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveTask} className="flex-1 bg-amber-400 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-500">
                  {editId ? '수정 저장' : '추가'}
                </button>
                <button onClick={cancelTaskForm} className="px-4 py-2 border border-amber-100 rounded-lg text-sm text-gray-500 hover:bg-gray-50">취소</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-10 text-amber-400 text-sm">불러오는 중...</div>
          ) : (
            tasks.map((t) => (
              <div key={t.id} className={`bg-white rounded-xl border border-amber-100 p-4 ${!t.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-800">{t.name}</span>
                      <span className="text-xs text-gray-400">{FREQ_LABELS[t.frequency] ?? t.frequency}</span>
                      {t.preferred_day && <span className="text-xs text-gray-400">{t.preferred_day}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                      {/* 시작/종료 시간 */}
                      {(t.start_time || t.end_time) && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-500">
                          <Clock size={11} />
                          {timeRange(t.start_time, t.end_time)}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">난이도 {t.difficulty}</span>
                      <span className="text-xs text-gray-400">{t.estimated_minutes}분</span>
                    </div>
                    {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => toggleActive(t)}
                      className={`text-xs px-2 py-1 rounded-lg ${t.is_active ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-600'}`}>
                      {t.is_active ? '비활성' : '활성화'}
                    </button>
                    <button onClick={() => startEdit(t)} className="p-1.5 rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-100">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDeleteTask(t.id)} className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
