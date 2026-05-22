export interface FailureRecord {
  taskId: string;
  slotId: string;
  slotType: string;
  platform: string;
  status: string;
  reason: string;
  retryable: boolean;
  createdAt: string;
}

export interface ProjectFailureSummary {
  projectId: string;
  totalSlots: number;
  failedSlots: number;
  blockedSlots: number;
  compilingFailed: number;
  timeoutSlots: number;
  qcBlockedSlots: number;
  failures: FailureRecord[];
  recoverableCount: number;
  suggestedActions: string[];
}

export class FailureRecovery {
  handleCompileFailure(task: { id: string; error: string }): { status: string; reason: string; retryable: boolean } {
    return {
      status: 'compile_failed',
      reason: `编译失败: ${task.error}`,
      retryable: !task.error.includes('missing'),
    };
  }

  handleProviderFailover(attempt: { id: string; providerName: string; error: string }): { status: string; reason: string; action: string } {
    return {
      status: 'provider_failover',
      reason: `Provider ${attempt.providerName} 返回错误: ${attempt.error}`,
      action: 'failover_to_backup',
    };
  }

  handleTimeout(taskId: string, durationSec: number): { attemptStatus: string; taskStatus: string; reason: string } {
    return {
      attemptStatus: 'timeout',
      taskStatus: 'running',
      reason: `生成超时(${durationSec}s)，任务保持运行状态等待人工决策`,
    };
  }

  handleAnchorFailure(anchorTaskId: string, dependentSlotIds: string[]): { blockedTasks: string[]; reason: string } {
    return {
      blockedTasks: dependentSlotIds,
      reason: `锚点任务 ${anchorTaskId} 失败，${dependentSlotIds.length} 个依赖 slot 已自动标记为 blocked`,
    };
  }

  handleQCBlock(qcResult: { overallGrade: string; riskTags: string[] }): { status: string; reason: string; enterReview: boolean } {
    return {
      status: 'qc_blocked',
      reason: `QC 判级: ${qcResult.overallGrade}, 风险标签: ${qcResult.riskTags.join(', ')}`,
      enterReview: false,
    };
  }

  summarizeFailures(projectId: string, tasks: Array<{ id: string; status: string; bundleSlotId: string; slotCode: string; reason?: string }>): ProjectFailureSummary {
    const failures: FailureRecord[] = [];
    const totalSlots = tasks.length;
    let blockedSlots = 0;
    let compilingFailed = 0;
    let timeoutSlots = 0;
    let qcBlockedSlots = 0;

    for (const t of tasks) {
      switch (t.status) {
        case 'compile_failed':
          compilingFailed++;
          break;
        case 'blocked':
          blockedSlots++;
          break;
        case 'qc_blocked':
          qcBlockedSlots++;
          break;
        case 'timeout':
          timeoutSlots++;
          break;
      }
      if (['compile_failed', 'blocked', 'qc_blocked', 'failed'].includes(t.status)) {
        failures.push({
          taskId: t.id,
          slotId: t.bundleSlotId,
          slotType: t.slotCode,
          platform: '',
          status: t.status,
          reason: t.reason || '',
          retryable: t.status !== 'compile_failed',
          createdAt: new Date().toISOString(),
        });
      }
    }

    const failedSlots = compilingFailed + blockedSlots + qcBlockedSlots;
    const recoverableCount = failures.filter(f => f.retryable).length;

    const suggestedActions: string[] = [];
    if (compilingFailed > 0) suggestedActions.push('补全商品必填字段后重试编译');
    if (blockedSlots > 0) suggestedActions.push('解决锚点图问题后重试关联slot');
    if (qcBlockedSlots > 0) suggestedActions.push('QC C级拦截：检查图片合规性');

    return { projectId, totalSlots, failedSlots, blockedSlots, compilingFailed, timeoutSlots, qcBlockedSlots, failures, recoverableCount, suggestedActions };
  }
}

export const failureRecovery = new FailureRecovery();
