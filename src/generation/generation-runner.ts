import path from 'node:path';
import fs from 'node:fs/promises';
import { prisma } from '@/lib/prisma';
import { PromptCompiler } from './prompt-compiler';
import { ProviderRegistry } from './provider-registry';
import { ProviderSelector } from './provider-selector';
import { TaskStatus, AttemptStatus } from '@/types/enums';
import { failureRecovery } from '@/control/failure-recovery';

const MAX_RETRY_COUNT = 2;
const GEN_TIMEOUT_SEC = 300;

export class GenerationRunner {
  private registry: ProviderRegistry;
  private selector: ProviderSelector;
  private compiler: PromptCompiler;

  constructor() {
    this.registry = new ProviderRegistry();
    this.selector = new ProviderSelector(this.registry);
    this.compiler = new PromptCompiler();
  }

  async executeTask(taskId: string): Promise<{
    success: boolean;
    status: string;
    attemptId?: string;
    assetIds?: string[];
    error?: string;
  }> {
    const task = await prisma.generationTask.findUnique({
      where: { id: taskId },
      include: {
        product: true,
        platformRulePack: true,
        bundleSlot: {
          include: {
            bundlePlan: {
              include: {
                project: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    await prisma.generationTask.update({
      where: { id: taskId },
      data: { status: TaskStatus.COMPILED },
    });

    const compileOutput = await this.compiler.compile({
      productId: task.productId,
      platformPackId: task.platformRulePack.platformName,
      slotType: task.bundleSlot.slotType,
      brandPackId: task.product.brandPackId || undefined,
      seriesPackId: task.product.seriesPackId || undefined,
    });

    const attempt = await prisma.generationAttempt.create({
      data: {
        taskId,
        status: AttemptStatus.CREATED,
        generationSpec: JSON.stringify(compileOutput.generationParams),
        promptText: compileOutput.promptText,
      },
    });

    const attemptId = attempt.id;

    try {
      await prisma.generationTask.update({
        where: { id: taskId },
        data: { status: TaskStatus.QUEUED },
      });

      const { provider, config } = await this.selector.getActiveProvider();

      await prisma.generationAttempt.update({
        where: { id: attemptId },
        data: {
          providerConfigId: config.id,
          status: AttemptStatus.SUBMITTED,
        },
      });

      const submitResult = await provider.submit(
        compileOutput.promptText,
        compileOutput.generationParams,
      );

      await prisma.generationTask.update({
        where: { id: taskId },
        data: { status: TaskStatus.RUNNING },
      });

      await prisma.generationAttempt.update({
        where: { id: attemptId },
        data: { status: AttemptStatus.POLLING },
      });

      if (submitResult.status === 'completed' && submitResult.images) {
        const outputDir = path.join(
          process.cwd(),
          'storage',
          task.projectId,
          taskId,
        );
        await fs.mkdir(outputDir, { recursive: true });

        const assetIds: string[] = [];

        for (let i = 0; i < submitResult.images.length; i++) {
          const imageUrl = submitResult.images[i];
          const ext = '.png';
          const filename = `${taskId}_${i}${ext}`;
          const filePath = path.join(outputDir, filename);

          const resp = await fetch(imageUrl);
          if (!resp.ok) {
            throw new Error(`Failed to download image: ${resp.statusText}`);
          }
          const buffer = Buffer.from(await resp.arrayBuffer());
          await fs.writeFile(filePath, buffer);

          const asset = await prisma.candidateAsset.create({
            data: {
              attemptId,
              taskId,
              localPath: filePath,
              remoteUrl: imageUrl,
              width: 0,
              height: 0,
              format: 'png',
              fileSizeBytes: buffer.length,
              imageUrl,
            },
          });

          assetIds.push(asset.id);
        }

        await prisma.generationAttempt.update({
          where: { id: attemptId },
          data: { status: AttemptStatus.SUCCEEDED },
        });

        await prisma.generationTask.update({
          where: { id: taskId },
          data: { status: TaskStatus.GENERATED },
        });

        if (task.bundleSlot.isAnchor) {
          await this.unblockSiblingTasks(task.bundleSlot.bundlePlanId);
        }

        await this.deductCredits(task);

        return {
          success: true,
          status: TaskStatus.GENERATED,
          attemptId,
          assetIds,
        };
      } else {
        const pollResult = await provider.poll(submitResult.taskId);

        if (pollResult.status === 'completed' && pollResult.images) {
          const outputDir = path.join(
            process.cwd(),
            'storage',
            task.projectId,
            taskId,
          );
          await fs.mkdir(outputDir, { recursive: true });

          const assetIds: string[] = [];

          for (let i = 0; i < pollResult.images.length; i++) {
            const imageUrl = pollResult.images[i];
            const ext = '.png';
            const filename = `${taskId}_${i}${ext}`;
            const filePath = path.join(outputDir, filename);

            const resp = await fetch(imageUrl);
            if (!resp.ok) {
              throw new Error(`Failed to download image: ${resp.statusText}`);
            }
            const buffer = Buffer.from(await resp.arrayBuffer());
            await fs.writeFile(filePath, buffer);

            const asset = await prisma.candidateAsset.create({
              data: {
                attemptId,
                taskId,
                localPath: filePath,
                remoteUrl: imageUrl,
                width: 0,
                height: 0,
                format: 'png',
                fileSizeBytes: buffer.length,
                imageUrl,
              },
            });

            assetIds.push(asset.id);
          }

          await prisma.generationAttempt.update({
            where: { id: attemptId },
            data: { status: AttemptStatus.SUCCEEDED },
          });

          await prisma.generationTask.update({
            where: { id: taskId },
            data: { status: TaskStatus.GENERATED },
          });

          if (task.bundleSlot.isAnchor) {
            await this.unblockSiblingTasks(task.bundleSlot.bundlePlanId);
          }

          await this.deductCredits(task);

          return {
            success: true,
            status: TaskStatus.GENERATED,
            attemptId,
            assetIds,
          };
        } else if (pollResult.status === 'failed') {
          throw new Error(pollResult.error || 'Provider generation failed');
        }
      }

      throw new Error('Unexpected generation flow end');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const isProviderError =
        errorMessage.includes('Provider') ||
        errorMessage.includes('provider') ||
        errorMessage.includes('API') ||
        errorMessage.includes('rate');

      const isTimeout =
        errorMessage.includes('timeout') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('aborted');

      if (isTimeout) {
        const timeoutResult = failureRecovery.handleTimeout(taskId, GEN_TIMEOUT_SEC);

        await prisma.generationAttempt.update({
          where: { id: attemptId },
          data: {
            status: AttemptStatus.TIMEOUT,
            errorMessage,
          },
        });

        return {
          success: false,
          status: TaskStatus.RUNNING,
          attemptId,
          error: timeoutResult.reason,
        };
      }

      if (isProviderError) {
        const { provider } = await this.selector.getActiveProvider();
        const providerName = provider.constructor.name;
        const failoverResult = failureRecovery.handleProviderFailover({
          id: attemptId,
          providerName,
          error: errorMessage,
        });

        await prisma.generationAttempt.update({
          where: { id: attemptId },
          data: {
            status: AttemptStatus.PROVIDER_FAILOVER,
            errorMessage,
          },
        });

        await prisma.generationTask.update({
          where: { id: taskId },
          data: { status: TaskStatus.PENDING },
        });

        return {
          success: false,
          status: TaskStatus.PENDING,
          attemptId,
          error: failoverResult.reason,
        };
      }

      await prisma.generationAttempt.update({
        where: { id: attemptId },
        data: {
          status: AttemptStatus.FAILED,
          errorMessage,
        },
      });

      if (task.bundleSlot.isAnchor && task.retryCount === 0) {
        const siblingSlots = await prisma.bundleSlot.findMany({
          where: {
            bundlePlanId: task.bundleSlot.bundlePlanId,
            isAnchor: false,
          },
          select: { id: true },
        });

        if (siblingSlots.length > 0) {
          await prisma.generationTask.updateMany({
            where: {
              bundleSlotId: { in: siblingSlots.map((s) => s.id) },
            },
            data: { status: TaskStatus.BLOCKED },
          });
        }
      }

      const newRetryCount = task.retryCount + 1;

      if (newRetryCount < MAX_RETRY_COUNT) {
        await prisma.generationTask.update({
          where: { id: taskId },
          data: {
            status: TaskStatus.PENDING,
            retryCount: newRetryCount,
          },
        });

        return {
          success: false,
          status: TaskStatus.PENDING,
          attemptId,
          error: errorMessage,
        };
      }

      await prisma.generationTask.update({
        where: { id: taskId },
        data: { status: TaskStatus.QC_FAILED },
      });

      return {
        success: false,
        status: TaskStatus.QC_FAILED,
        attemptId,
        error: errorMessage,
      };
    }
  }

  private async unblockSiblingTasks(bundlePlanId: string): Promise<void> {
    const siblingSlots = await prisma.bundleSlot.findMany({
      where: {
        bundlePlanId,
        isAnchor: false,
      },
      select: { id: true },
    });

    if (siblingSlots.length === 0) return;

    await prisma.generationTask.updateMany({
      where: {
        bundleSlotId: { in: siblingSlots.map((s) => s.id) },
        status: TaskStatus.BLOCKED,
      },
      data: { status: TaskStatus.PENDING },
    });
  }

  private async deductCredits(task: {
    id: string;
    projectId: string;
    creditCost: number;
  }): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
    })

    if (!project) {
      return
    }

    const taskRecord = await prisma.generationTask.findUnique({
      where: { id: task.id },
      select: { productId: true },
    })
    if (!taskRecord) {
      return
    }

    const product = await prisma.product.findUnique({
      where: { id: taskRecord.productId },
      select: { clientSpaceId: true },
    })

    if (!product?.clientSpaceId) {
      return;
    }

    const clientSpace = await prisma.clientSpace.findUnique({
      where: { id: product.clientSpaceId },
      select: { workspaceId: true },
    })

    if (!clientSpace) {
      return;
    }

    const workspaceId = clientSpace.workspaceId;

    const previousRecords = await prisma.creditRecord.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    const lastBalance =
      previousRecords.length > 0 ? previousRecords[0].balanceAfter : 100;
    const balanceAfter = lastBalance - task.creditCost;

    await prisma.creditRecord.create({
      data: {
        workspaceId,
        taskId: task.id,
        amount: -task.creditCost,
        balanceAfter,
        reason: `Generation task ${task.id}`,
      },
    });
  }
}
