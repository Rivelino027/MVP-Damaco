import type { Role } from './auth';

// ─── Enums ───────────────────────────────────────────────

export type ProjectStatus = 'diajukan' | 'berjalan' | 'ditutup';
export type TaskStatus = 'belum_mulai' | 'dikerjakan' | 'review' | 'selesai';
export type TaskPriority = 'rendah' | 'sedang' | 'tinggi';

// ─── Project Interfaces ───────────────────────────────────

export interface ProjectDepartment {
  id: string;
  name: string;
  annualBudget?: number | string;
}

export interface ProjectCostCenter {
  id: string;
  code: string;
  name: string;
}

export interface ProjectTypeRef {
  id: string;
  name: string;
}

export interface ProjectCreatedBy {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ProjectCount {
  members: number;
  phases: number;
  milestones: number;
  tasks: number;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  departmentId: string;
  department: ProjectDepartment;
  costCenterId: string;
  costCenter: ProjectCostCenter;
  projectTypeId: string | null;
  projectType: ProjectTypeRef | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  progressPercent: number | string;
  createdById: string;
  createdBy: ProjectCreatedBy;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count?: ProjectCount;
}

// ─── Project Member ───────────────────────────────────────

export interface ProjectMemberUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobTitle: string | null;
  avatarUrl: string | null;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  addedById: string | null;
  createdAt: string;
  user: ProjectMemberUser;
}

// ─── Phase & Milestone ────────────────────────────────────

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  milestones?: Milestone[];
  _count?: { tasks: number };
}

export interface Milestone {
  id: string;
  projectId: string;
  phaseId: string | null;
  name: string;
  dueDate: string;
  isDone: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Project Detail (from GET /projects/:id) ─────────────

export interface ProjectDetail extends ProjectItem {
  members: ProjectMember[];
  phases: Phase[];
  milestones: Milestone[];
}

// ─── Task Interfaces ─────────────────────────────────────

export interface TaskAssignee {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface TaskItem {
  id: string;
  projectId: string;
  phaseId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  assignee: TaskAssignee | null;
  dueDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    checklists: number;
    comments: number;
    attachments: number;
  };
  checklistTotal?: number;
  checklistDone?: number;
}

// ─── Checklist ────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  taskId: string;
  text: string;
  isDone: boolean;
  createdAt: string;
}

// ─── Comment ─────────────────────────────────────────────

export interface TaskCommentAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  body: string;
  createdAt: string;
  user: TaskCommentAuthor;
}

// ─── Attachment ───────────────────────────────────────────

export interface TaskAttachment {
  id: string;
  taskId: string;
  uploadedById: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

// ─── Query Params ─────────────────────────────────────────

export interface ProjectQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus;
  departmentId?: string;
  costCenterId?: string;
}

export interface TaskQueryParams {
  page?: number;
  limit?: number;
  projectId?: string;
  phaseId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  search?: string;
}

// ─── Payloads ─────────────────────────────────────────────

export interface CreateProjectPayload {
  name: string;
  description?: string;
  departmentId?: string;
  costCenterId: string;
  projectTypeId?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  costCenterId?: string;
  projectTypeId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateTaskPayload {
  projectId: string;
  phaseId?: string;
  title: string;
  description?: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  estimatedHours?: number;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  phaseId?: string | null;
  assigneeId?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  estimatedHours?: number | null;
}

export interface CreatePhasePayload {
  name: string;
  sortOrder?: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdatePhasePayload {
  name?: string;
  sortOrder?: number;
  startDate?: string | null;
  endDate?: string | null;
}

export interface CreateMilestonePayload {
  name: string;
  dueDate: string;
  phaseId?: string;
  isDone?: boolean;
}

export interface UpdateMilestonePayload {
  name?: string;
  dueDate?: string;
  isDone?: boolean;
  phaseId?: string | null;
}
