export type TaskStatus = "pending" | "blocked" | "completed";
export type CadenceType = "daily" | "weekly" | "monthly" | "custom";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  color: string;
  description?: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  project_id?: string | null;
  name: string;
  description?: string | null;
  can_be_done_virtually: boolean;
  expected_minutes?: number | null;
  start_date?: string | null;
  due_date?: string | null;
  tags: string[];
  status: TaskStatus;
  completed_at?: string | null;
  completion_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskSummary {
  id: string;
  name: string;
  status: TaskStatus;
  can_be_done_virtually?: boolean;
  expected_minutes?: number | null;
  start_date?: string | null;
  due_date?: string | null;
  project_id?: string | null;
}

export interface TaskSuggestion {
  task: Task;
  selection_mode: "estimated" | "fallback";
  message: string;
}

export interface TaskDependencies {
  blocked_by: TaskSummary[];
  blocking: TaskSummary[];
}

export interface TaskActivity {
  id: string;
  task_id: string;
  actor_user_id: string;
  type: "created" | "comment" | "due_date_changed" | "status_changed" | string;
  message?: string | null;
  meta?: Record<string, any> | null;
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  project_id?: string | null;
  name: string;
  description?: string | null;
  cadence_type: CadenceType;
  cadence_days?: number[] | null;
  cadence_day_of_month?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  completed_date: string;
  completed_at: string;
  completion_notes?: string | null;
}

export interface HabitMetrics {
  habit_id: string;
  completion_rate_7d: number;
  completion_rate_30d: number;
  completion_rate_all_time: number;
  current_streak: number;
  longest_streak: number;
  total_completions: number;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserMe {
  id: string;
  email: string;
  email_verified_at?: string | null;
  providers: string[];
}

export interface MobileAuthResponse {
  user: UserMe;
  access_token: string;
  refresh_token: string;
}
