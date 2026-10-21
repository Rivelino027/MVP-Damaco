import { api } from './api';
import type {
  CreateMilestonePayload,
  CreatePhasePayload,
  CreateProjectPayload,
  CreateTaskPayload,
  PaginatedResponse,
  ProjectDetail,
  ProjectItem,
  ProjectMember,
  ProjectQueryParams,
  TaskAttachment,
  TaskComment,
  TaskItem,
  TaskQueryParams,
  UpdateMilestonePayload,
  UpdatePhasePayload,
  UpdateProjectPayload,
  UpdateTaskPayload,
  ChecklistItem,
  Phase,
  Milestone,
} from '@/types';

// ─── Projects ─────────────────────────────────────────────

export async function getProjectsApi(
  params?: ProjectQueryParams,
): Promise<PaginatedResponse<ProjectItem>> {
  const { data } = await api.get<PaginatedResponse<ProjectItem>>('/projects', { params });
  return data;
}

export async function getProjectApi(id: string): Promise<ProjectDetail> {
  const { data } = await api.get<ProjectDetail>(`/projects/${id}`);
  return data;
}

export async function createProjectApi(
  payload: CreateProjectPayload,
): Promise<ProjectItem> {
  const { data } = await api.post<ProjectItem>('/projects', payload);
  return data;
}

export async function updateProjectApi(
  id: string,
  payload: UpdateProjectPayload,
): Promise<ProjectItem> {
  const { data } = await api.patch<ProjectItem>(`/projects/${id}`, payload);
  return data;
}

export async function closeProjectApi(
  id: string,
): Promise<ProjectItem> {
  const { data } = await api.post<ProjectItem>(`/projects/${id}/close`);
  return data;
}

export async function deleteProjectApi(
  id: string,
): Promise<{ message: string; id: string }> {
  const { data } = await api.delete<{ message: string; id: string }>(`/projects/${id}`);
  return data;
}

// ─── Project Members ──────────────────────────────────────

export async function getProjectMembersApi(projectId: string): Promise<ProjectMember[]> {
  const { data } = await api.get<ProjectMember[]>(`/projects/${projectId}/members`);
  return data;
}

export async function addProjectMemberApi(
  projectId: string,
  userId: string,
): Promise<ProjectMember> {
  const { data } = await api.post<ProjectMember>(`/projects/${projectId}/members`, { userId });
  return data;
}

export async function removeProjectMemberApi(
  projectId: string,
  userId: string,
): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(
    `/projects/${projectId}/members/${userId}`,
  );
  return data;
}

// ─── Phases ───────────────────────────────────────────────

export async function createPhaseApi(
  projectId: string,
  payload: CreatePhasePayload,
): Promise<Phase> {
  const { data } = await api.post<Phase>(`/projects/${projectId}/phases`, payload);
  return data;
}

export async function updatePhaseApi(
  projectId: string,
  phaseId: string,
  payload: UpdatePhasePayload,
): Promise<Phase> {
  const { data } = await api.patch<Phase>(`/projects/${projectId}/phases/${phaseId}`, payload);
  return data;
}

export async function deletePhaseApi(
  projectId: string,
  phaseId: string,
): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(
    `/projects/${projectId}/phases/${phaseId}`,
  );
  return data;
}

// ─── Milestones ───────────────────────────────────────────

export async function createMilestoneApi(
  projectId: string,
  payload: CreateMilestonePayload,
): Promise<Milestone> {
  const { data } = await api.post<Milestone>(`/projects/${projectId}/milestones`, payload);
  return data;
}

export async function updateMilestoneApi(
  projectId: string,
  milestoneId: string,
  payload: UpdateMilestonePayload,
): Promise<Milestone> {
  const { data } = await api.patch<Milestone>(
    `/projects/${projectId}/milestones/${milestoneId}`,
    payload,
  );
  return data;
}

export async function deleteMilestoneApi(
  projectId: string,
  milestoneId: string,
): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(
    `/projects/${projectId}/milestones/${milestoneId}`,
  );
  return data;
}

// ─── Tasks ────────────────────────────────────────────────

export async function getTasksApi(
  params?: TaskQueryParams,
): Promise<PaginatedResponse<TaskItem>> {
  const { data } = await api.get<PaginatedResponse<TaskItem>>('/tasks', { params });
  return data;
}

export async function getTaskApi(id: string): Promise<TaskItem> {
  const { data } = await api.get<TaskItem>(`/tasks/${id}`);
  return data;
}

export async function createTaskApi(payload: CreateTaskPayload): Promise<TaskItem> {
  const { data } = await api.post<TaskItem>('/tasks', payload);
  return data;
}

export async function updateTaskApi(
  id: string,
  payload: UpdateTaskPayload,
): Promise<TaskItem> {
  const { data } = await api.patch<TaskItem>(`/tasks/${id}`, payload);
  return data;
}

export async function updateTaskStatusApi(
  id: string,
  status: string,
): Promise<TaskItem> {
  const { data } = await api.patch<TaskItem>(`/tasks/${id}/status`, { status });
  return data;
}

export async function deleteTaskApi(id: string): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/tasks/${id}`);
  return data;
}

// ─── Task Checklists ──────────────────────────────────────

export async function createChecklistApi(
  taskId: string,
  text: string,
): Promise<ChecklistItem> {
  const { data } = await api.post<ChecklistItem>(`/tasks/${taskId}/checklists`, { text });
  return data;
}

export async function updateChecklistApi(
  taskId: string,
  checklistId: string,
  payload: { text?: string; isDone?: boolean },
): Promise<ChecklistItem> {
  const { data } = await api.patch<ChecklistItem>(
    `/tasks/${taskId}/checklists/${checklistId}`,
    payload,
  );
  return data;
}

export async function deleteChecklistApi(
  taskId: string,
  checklistId: string,
): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(
    `/tasks/${taskId}/checklists/${checklistId}`,
  );
  return data;
}

// ─── Task Comments ────────────────────────────────────────

export async function createCommentApi(
  taskId: string,
  body: string,
): Promise<TaskComment> {
  const { data } = await api.post<TaskComment>(`/tasks/${taskId}/comments`, { body });
  return data;
}

export async function deleteCommentApi(
  taskId: string,
  commentId: string,
): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(
    `/tasks/${taskId}/comments/${commentId}`,
  );
  return data;
}

// ─── Task Attachments ─────────────────────────────────────

export async function getAttachmentsApi(taskId: string): Promise<TaskAttachment[]> {
  const { data } = await api.get<TaskAttachment[]>(`/tasks/${taskId}/attachments`);
  return data;
}

export async function uploadAttachmentApi(
  taskId: string,
  file: File,
): Promise<TaskAttachment> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<TaskAttachment>(`/tasks/${taskId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/**
 * Unduh lampiran sebagai blob (token di header, bukan URL).
 * Mengembalikan URL blob sementara untuk dibuka/diunduh oleh browser.
 */
export async function downloadAttachmentApi(
  taskId: string,
  attachmentId: string,
): Promise<string> {
  const response = await api.get(
    `/tasks/${taskId}/attachments/${attachmentId}/download`,
    { responseType: 'blob' },
  );
  return URL.createObjectURL(response.data as Blob);
}

export async function deleteAttachmentApi(
  taskId: string,
  attachmentId: string,
): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(
    `/tasks/${taskId}/attachments/${attachmentId}`,
  );
  return data;
}
