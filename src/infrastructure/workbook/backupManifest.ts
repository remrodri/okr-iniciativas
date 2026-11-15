import type { SessionSnapshot } from '@/domain/ports';
import {
  BACKUP_APPLICATION,
  BACKUP_FORMAT_VERSION,
  type NormalizedBackup,
  validateBackupManifest,
} from './workbookSchema';

export interface BackupManifestOptions {
  readonly backupId: string;
  readonly exportedAt: string;
}

function nullable(value: string | undefined): string | null {
  return value ?? null;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export async function calculateBackupChecksum(
  manifest: NormalizedBackup,
): Promise<string> {
  const checksumless = structuredClone(manifest);
  checksumless.Metadata[0]!.checksum = '';
  return sha256(stableJson(checksumless));
}

export async function createBackupManifest(
  snapshot: SessionSnapshot,
  options: BackupManifestOptions,
): Promise<NormalizedBackup> {
  const { state } = snapshot;
  const { session } = state;
  const refinements: NormalizedBackup['Refinements'] = [];

  for (const initiative of state.initiatives) {
    for (const authorId of initiative.authorIds) {
      refinements.push({
        recordId: `author-${initiative.id}-${authorId}`,
        kind: 'AUTHOR',
        initiativeId: initiative.id,
        relatedId: authorId,
        text: null,
        numericValue: null,
        createdAt: null,
        status: null,
        responseText: null,
      });
    }
    for (const original of initiative.originals) {
      refinements.push({
        recordId: `original-${original.id}`,
        kind: 'ORIGINAL',
        initiativeId: initiative.id,
        relatedId: original.authorId,
        text: original.text,
        numericValue: null,
        createdAt: original.fusedAt,
        status: null,
        responseText: null,
      });
    }
  }
  session.finalistIds?.forEach((initiativeId, index) => {
    refinements.push({
      recordId: `finalist-${initiativeId}`,
      kind: 'FINALIST',
      initiativeId,
      relatedId: null,
      text: null,
      numericValue: index + 1,
      createdAt: null,
      status: null,
      responseText: null,
    });
  });
  session.tieBreak?.candidateIds.forEach((initiativeId) => {
    refinements.push({
      recordId: `tie-${initiativeId}`,
      kind: 'TIE_CANDIDATE',
      initiativeId,
      relatedId: null,
      text: null,
      numericValue: session.tieBreak?.slotsRemaining ?? null,
      createdAt: null,
      status: null,
      responseText: null,
    });
  });
  for (const clarification of state.clarifications) {
    refinements.push({
      recordId: clarification.id,
      kind: 'CLARIFICATION',
      initiativeId: clarification.initiativeId,
      relatedId: null,
      text: clarification.message,
      numericValue: null,
      createdAt: clarification.createdAt,
      status: clarification.status,
      responseText: clarification.responseText,
    });
  }

  const manifest: NormalizedBackup = {
    Metadata: [
      {
        formatVersion: BACKUP_FORMAT_VERSION,
        application: BACKUP_APPLICATION,
        backupId: options.backupId,
        exportedAt: options.exportedAt,
        checksum: '',
      },
    ],
    Session: [
      {
        id: session.id,
        version: session.version,
        stage: session.stage,
        x0: session.x0,
        xf: session.xf,
        expectedParticipants: session.expectedParticipants,
        initiativesPerParticipant: session.initiativesPerParticipant,
        finalistCount: session.finalistCount,
        iceMethod: session.iceConfig?.method ?? null,
        weightImpact: session.iceConfig?.weights?.impact ?? null,
        weightConfidence: session.iceConfig?.weights?.confidence ?? null,
        weightEase: session.iceConfig?.weights?.ease ?? null,
        paused: session.paused,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        finalizedAt: nullable(session.finalizedAt),
        expiresAt: nullable(session.expiresAt),
      },
    ],
    Participants: state.participants.map((participant) => ({
      id: participant.id,
      alias: participant.alias,
      realName: participant.realName,
      accessTokenId: participant.accessTokenId,
      brainstormingSubmitted: participant.progress.brainstormingSubmitted,
      refinementSubmitted: participant.progress.refinementSubmitted,
      tieBreakSubmitted: participant.progress.tieBreakSubmitted,
      iceSubmitted: participant.progress.iceSubmitted,
      connected: participant.connected,
    })),
    Initiatives: state.initiatives.map((initiative) => ({
      id: initiative.id,
      text: initiative.text,
      status: initiative.status,
      mergedIntoId: initiative.mergedIntoId,
      revision: initiative.revision,
    })),
    Refinements: refinements,
    Votes: state.ballots.flatMap((ballot) =>
      ballot.selection.map((selectedInitiativeId, index) => ({
        ballotId: ballot.id,
        participantId: ballot.participantId,
        round: ballot.round,
        selectedInitiativeId,
        selectionOrder: index + 1,
        submissionId: ballot.submissionId,
        submittedAt: ballot.submittedAt,
      })),
    ),
    IceRatings: state.iceEvaluations.flatMap((evaluation) =>
      Object.entries(evaluation.ratings).map(([initiativeId, scores]) => ({
        evaluationId: evaluation.id,
        participantId: evaluation.participantId,
        initiativeId,
        impact: scores.impact,
        confidence: scores.confidence,
        ease: scores.ease,
        submissionId: evaluation.submissionId,
        submittedAt: evaluation.submittedAt,
      })),
    ),
    Results: state.ranking.map((entry) => ({ ...entry })),
    Audit: state.audit.flatMap((event) => {
      const details = Object.entries(event.details ?? {}).sort(([left], [right]) =>
        left.localeCompare(right),
      );
      const rows = details.length === 0 ? [[null, null] as const] : details;
      return rows.map(([detailKey, detailValue]) => ({
        eventId: event.id,
        actorId: event.actorId,
        actorRole: event.actorRole,
        action: event.action,
        fromStage: event.fromStage,
        toStage: event.toStage,
        at: event.at,
        detailKey,
        detailValue: detailValue === null ? null : JSON.stringify(detailValue),
      }));
    }),
  };

  manifest.Metadata[0]!.checksum = await calculateBackupChecksum(manifest);
  return validateBackupManifest(manifest);
}
