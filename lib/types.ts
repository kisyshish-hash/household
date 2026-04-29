export interface Household {
  id: string
  name: string
  invite_code: string
  owner_user_id: string | null
  created_at: string
}

export interface Member {
  id: string
  household_id: string | null
  name: string
  role: string
  preferred_tasks: string[]
  disliked_tasks: string[]
  weekly_capacity: number
  auth_user_id: string | null
  created_at: string
}

export interface HouseTask {
  id: string
  household_id: string | null
  name: string
  description: string
  frequency: string
  preferred_day: string
  difficulty: number
  estimated_minutes: number
  required_people: number
  is_active: boolean
  default_assigned_to: string | null
  start_time: string | null  // HH:MM 형식
  end_time: string | null    // HH:MM 형식
  created_at: string
}

export interface WeeklyAssignment {
  id: string
  household_id: string | null
  week_start: string
  task_id: string
  assigned_to: string
  due_date: string
  status: 'pending' | 'done' | 'skipped'
  ai_reason: string
  created_at: string
  // joined fields
  house_tasks?: HouseTask
  members?: Member
}

export interface FamilyEvent {
  id: string
  household_id: string | null
  title: string
  person_name: string
  event_type: string
  event_date: string       // 양력이면 YYYY-MM-DD, 음력이면 YYYY-음력MM-음력DD
  is_lunar: boolean        // true = 음력 날짜
  repeat_type: string
  importance: number
  gift_budget_min: number
  gift_budget_max: number
  preference_note: string
  created_at: string
}

export interface EventPreparation {
  id: string
  household_id: string | null
  event_id: string
  preparation_task: string
  due_date: string
  assigned_to: string
  status: 'pending' | 'done' | 'skipped'
  ai_suggestion: string
  created_at: string
  members?: Member
}

export interface GiftHistory {
  id: string
  household_id: string | null
  person_name: string
  event_title: string
  gift_item: string
  price: number
  reaction: string
  avoid_next_time: boolean
  note: string
  created_at: string
}

// AI 응답 타입
export interface AIAssignment {
  task_id: string
  task_name: string
  assigned_to: string
  due_date: string
  reason: string
}

export interface AIPreparation {
  preparation_task: string
  due_date: string
  assigned_to: string
  ai_suggestion: string
}
