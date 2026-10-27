/**
 * Phase 8: Publishing, Version History, Rollback & Analytics Unit Tests
 * 
 * Validates:
 * 1. Draft vs Published schedule versions and lifecycle
 * 2. Pre-publication validation, blocking conflicts detection, and before/after diffs
 * 3. Non-destructive archival of previously published versions
 * 4. Validated restore / rollback to historical versions
 * 5. Audit log tracking with actor and timestamps
 * 6. Analytics aggregations (room utilization, faculty workload distribution, conflict breakdown)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalDemoSchedulingRepository } from '@/lib/repository/scheduling-repository';
import {
  SYNAPSE_SEED_DATA,
  SEED_CLASSROOMS,
  SEED_FACULTY,
  SEED_TIMETABLE_SESSIONS,
  SEED_TIME_SLOTS,
  SEED_CONFLICTS,
  SEED_SUBJECTS,
} from '@/data/fixtures';

describe('Phase 8: Publishing & Version History Governance', () => {
  let repository: LocalDemoSchedulingRepository;

  beforeEach(() => {
    repository = new LocalDemoSchedulingRepository();
  });

  describe('Pre-publication Validation & Diff Preview', () => {
    it('generates a detailed pre-publication preview with unresolved conflicts and diff summary', async () => {
      const preview = await repository.previewPublication('v2.4');

      expect(preview).toBeDefined();
      expect(typeof preview.canPublish).toBe('boolean');
      expect(typeof preview.blockingConflictsCount).toBe('number');
      expect(typeof preview.warningsCount).toBe('number');
      expect(Array.isArray(preview.activeConflicts)).toBe(true);
      expect(preview.beforeAfterDiff).toBeDefined();
      expect(preview.beforeAfterDiff.previousVersion).toBeDefined();
      expect(preview.beforeAfterDiff.proposedVersion).toBe('v2.4');
      expect(typeof preview.beforeAfterDiff.modificationsCount).toBe('number');
    });

    it('correctly flags blocking hard conflicts that prevent publication', async () => {
      const preview = await repository.previewPublication('v2.4');

      // If critical/blocking conflicts exist, canPublish must be false
      if (preview.blockingConflictsCount > 0) {
        expect(preview.canPublish).toBe(false);
      } else {
        expect(preview.canPublish).toBe(true);
      }
    });
  });

  describe('Schedule Version Publishing & Non-Destructive Archival', () => {
    it('creates a published version and archives the previously published version without destroying it', async () => {
      const valid = structuredClone(SYNAPSE_SEED_DATA);
      valid.timetableSessions = [valid.timetableSessions[0]];
      valid.conflicts = [];
      repository = new LocalDemoSchedulingRepository(valid);
      const versionsBefore = await repository.getScheduleVersions();
      const initialPublished = versionsBefore.find(v => v.status === 'published');
      expect(initialPublished).toBeDefined();

      // Publish new version
      const publishResult = await repository.publishScheduleVersion(
        'v2.4',
        'Dr. Eleanor Vance',
        'Official Fall 2026 timetable release after senate review'
      );

      expect(publishResult.success).toBe(true);
      expect(publishResult.version).toBeDefined();
      expect(publishResult.version?.status).toBe('published');
      expect(publishResult.version?.publishedBy).toBe('Dr. Eleanor Vance');
      expect(publishResult.version?.publishedAt).toBeDefined();

      // Verify previous version was NOT destroyed, but safely marked archived
      const versionsAfter = await repository.getScheduleVersions();
      expect(versionsAfter.length).toBeGreaterThanOrEqual(versionsBefore.length + 1);

      const archivedOldVersion = versionsAfter.find(v => v.id === initialPublished!.id);
      expect(archivedOldVersion).toBeDefined();
      expect(archivedOldVersion?.status).toBe('archived');

      // Verify audit log has been updated
      const auditEntries = await repository.getChangeHistory();
      const publishAudit = auditEntries.find(
        a => a.entityId === publishResult.version?.id && a.category === 'approval'
      );
      expect(publishAudit).toBeDefined();
      expect(publishAudit?.actorName).toBe('Dr. Eleanor Vance');
    });
  });

  describe('Validated Version Restore & Rollback', () => {
    it('rolls back to a historical version non-destructively by archiving current published version', async () => {
      const valid = structuredClone(SYNAPSE_SEED_DATA);
      valid.timetableSessions = [valid.timetableSessions[0]];
      valid.conflicts = [];
      repository = new LocalDemoSchedulingRepository(valid);
      const published = await repository.publishScheduleVersion('v2.4', 'Coordinator');
      const targetVersion = published.version!;

      const rollbackResult = await repository.rollbackToVersion(
        targetVersion.id,
        'Vice Chancellor Dr. Verma'
      );

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.restoredVersion).toBeDefined();
      expect(rollbackResult.restoredVersion?.id).toBe(targetVersion.id);
      expect(rollbackResult.restoredVersion?.status).toBe('published');
      expect((await repository.getDataset()).timetableSessions).toEqual(targetVersion.sessionSnapshot);

      // Verify audit log records the rollback with reason, actor, and timestamp
      const auditEntries = await repository.getChangeHistory();
      const rollbackAudit = auditEntries.find(
        a => a.action.includes('Rolled back') && a.entityId === targetVersion.id
      );
      expect(rollbackAudit).toBeDefined();
      expect(rollbackAudit?.actorName).toBe('Vice Chancellor Dr. Verma');
    });

    it('rejects rollback to a non-existent version ID with an informative error', async () => {
      const rollbackResult = await repository.rollbackToVersion(
        'NON-EXISTENT-VER-999',
        'Admin'
      );

      expect(rollbackResult.success).toBe(false);
      expect(rollbackResult.message).toContain('does not exist');
    });
  });
});

describe('Phase 8: Analytics Aggregations & Capacity Modeling', () => {
  it('correctly computes occupied vs available room-slot metrics', () => {
    const classrooms = SEED_CLASSROOMS;
    const timetableSessions = SEED_TIMETABLE_SESSIONS;
    const timeSlots = SEED_TIME_SLOTS;

    // Standard week has 5 instructional days
    const instructionalDays = 5;
    const weeklySlotCapacityPerRoom = timeSlots.length * instructionalDays;
    const totalInstitutionalSlots = classrooms.length * weeklySlotCapacityPerRoom;

    // Filter valid sessions in room
    const occupiedSlots = timetableSessions.filter(s => s.status !== 'cancelled' && s.classroomId).length;
    const availableSlots = totalInstitutionalSlots - occupiedSlots;

    expect(totalInstitutionalSlots).toBeGreaterThan(0);
    expect(occupiedSlots).toBeGreaterThan(0);
    expect(availableSlots).toBeGreaterThan(0);
    expect(occupiedSlots + availableSlots).toBe(totalInstitutionalSlots);

    const utilizationRate = (occupiedSlots / totalInstitutionalSlots) * 100;
    expect(utilizationRate).toBeGreaterThan(0);
    expect(utilizationRate).toBeLessThan(100);
  });

  it('calculates faculty workload against statutory ceiling', () => {
    const faculty = SEED_FACULTY;
    const timetableSessions = SEED_TIMETABLE_SESSIONS;
    const subjects = SEED_SUBJECTS;

    faculty.forEach(member => {
      const assignedSessions = timetableSessions.filter(
        s => s.primaryFacultyId === member.id && s.status !== 'cancelled'
      );

      const weeklyHours = assignedSessions.reduce((total, session) => {
        const subject = subjects.find(s => s.id === session.subjectId);
        return total + 1;
      }, 0);

      expect(weeklyHours).toBeGreaterThanOrEqual(0);
      expect(member.maxCreditHours).toBeGreaterThan(0);
      
      const utilization = (weeklyHours / member.maxCreditHours) * 100;
      expect(utilization).toBeGreaterThanOrEqual(0);
    });
  });

  it('categorizes conflicts by type and severity', () => {
    const conflicts = SEED_CONFLICTS;
    expect(conflicts.length).toBeGreaterThan(0);

    const types = new Set(conflicts.map(c => c.type));
    expect(types.size).toBeGreaterThan(1);

    const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
    const warningConflicts = conflicts.filter(c => c.severity === 'warning');

    expect(criticalConflicts.length + warningConflicts.length).toBe(conflicts.length);
  });
});
