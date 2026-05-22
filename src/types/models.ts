import {
  Platform,
  SlotType,
  ProjectStatus,
  TaskStatus,
  AttemptStatus,
  QCGrade,
  InputMode,
  ProjectType,
  ExportStatus,
} from './enums';

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  inputMode: InputMode;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandPack {
  id: string;
  name: string;
  brandName: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeriesPack {
  id: string;
  name: string;
  brandPackId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  brandPackId: string;
  seriesPackId?: string;
  mainImageUrl?: string;
  extraImages?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformRule {
  id: string;
  platform: Platform;
  slotType: SlotType;
  width: number;
  height: number;
  format: string;
  maxSizeKB: number;
  updatedAt: Date;
}

export interface BundlePlan {
  id: string;
  projectId: string;
  platform: Platform;
  slots: SlotPlan[];
}

export interface SlotPlan {
  slotType: SlotType;
  width: number;
  height: number;
}

export interface GenerationTask {
  id: string;
  projectId: string;
  platform: Platform;
  slotType: SlotType;
  status: TaskStatus;
  prompt?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerationAttempt {
  id: string;
  taskId: string;
  providerId: string;
  status: AttemptStatus;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QCResult {
  id: string;
  attemptId: string;
  grade: QCGrade;
  score: number;
  issues?: string[];
  createdAt: Date;
}

export interface ReviewResult {
  id: string;
  taskId: string;
  approved: boolean;
  comment?: string;
  reviewedAt?: Date;
  createdAt: Date;
}

export interface ExportRecord {
  id: string;
  projectId: string;
  status: ExportStatus;
  fileUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
