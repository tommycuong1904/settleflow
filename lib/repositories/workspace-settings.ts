import { db } from "@/lib/db/client";

/**
 * Workspace-level notification & webhook settings.
 * Persisted on the Workspace record so each workspace can configure its own
 * webhook destination and opt-out of individual event notifications.
 */
export type WorkspaceNotificationSettings = {
  webhookUrl?: string;
  notifyOnSubmit: boolean;
  notifyOnApprove: boolean;
  notifyOnRelease: boolean;
};

export type UpdateWorkspaceNotificationSettingsInput = Partial<
  Pick<WorkspaceNotificationSettings, "notifyOnSubmit" | "notifyOnApprove" | "notifyOnRelease">
> & {
  webhookUrl?: string | null;
};

const DEFAULT_SETTINGS: WorkspaceNotificationSettings = {
  notifyOnSubmit: true,
  notifyOnApprove: true,
  notifyOnRelease: true,
};

export async function getWorkspaceSettings(
  workspaceId: string,
): Promise<WorkspaceNotificationSettings> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      webhookUrl: true,
      notifyOnSubmit: true,
      notifyOnApprove: true,
      notifyOnRelease: true,
    },
  });

  return {
    webhookUrl: workspace?.webhookUrl ?? undefined,
    notifyOnSubmit: workspace?.notifyOnSubmit ?? DEFAULT_SETTINGS.notifyOnSubmit,
    notifyOnApprove: workspace?.notifyOnApprove ?? DEFAULT_SETTINGS.notifyOnApprove,
    notifyOnRelease: workspace?.notifyOnRelease ?? DEFAULT_SETTINGS.notifyOnRelease,
  };
}

export async function updateWorkspaceSettings(
  workspaceId: string,
  input: UpdateWorkspaceNotificationSettingsInput,
): Promise<WorkspaceNotificationSettings> {
  const updated = await db.workspace.update({
    where: { id: workspaceId },
    data: {
      ...(input.webhookUrl !== undefined
        ? { webhookUrl: input.webhookUrl === null ? null : input.webhookUrl.trim() || null }
        : {}),
      ...(input.notifyOnSubmit !== undefined ? { notifyOnSubmit: input.notifyOnSubmit } : {}),
      ...(input.notifyOnApprove !== undefined ? { notifyOnApprove: input.notifyOnApprove } : {}),
      ...(input.notifyOnRelease !== undefined ? { notifyOnRelease: input.notifyOnRelease } : {}),
    },
    select: {
      webhookUrl: true,
      notifyOnSubmit: true,
      notifyOnApprove: true,
      notifyOnRelease: true,
    },
  });

  return {
    webhookUrl: updated.webhookUrl ?? undefined,
    notifyOnSubmit: updated.notifyOnSubmit,
    notifyOnApprove: updated.notifyOnApprove,
    notifyOnRelease: updated.notifyOnRelease,
  };
}
