/**
 * Timora — Structured Domain & Persistence Errors
 * Provides typed, predictable error classes for institutional operations,
 * optimistic concurrency conflicts, authorization checks, and constraint failures.
 */

export type ErrorCode =
  | "SCHEDULE_VERSION_STALE"
  | "HARD_CONSTRAINT_VIOLATED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "DATABASE_ERROR"
  | "VALIDATION_FAILED";

export class SchedulingError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly timestamp: string;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "SchedulingError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an optimistic concurrency check fails because another coordinator
 * published or modified the schedule version since the current view was loaded.
 */
export class ConcurrencyError extends SchedulingError {
  public readonly expectedVersion: number;
  public readonly currentVersion: number;

  constructor(expectedVersion: number, currentVersion: number, message?: string) {
    super(
      "SCHEDULE_VERSION_STALE",
      message ||
        `Optimistic lock failure: Schedule version has been modified by another coordinator (expected v${expectedVersion}, found v${currentVersion}). Please refresh before committing.`
    );
    this.name = "ConcurrencyError";
    this.expectedVersion = expectedVersion;
    this.currentVersion = currentVersion;
  }
}

/**
 * Thrown when a proposed session change violates one or more hard constraints.
 */
export class ConstraintViolationError extends SchedulingError {
  public readonly violations: string[];

  constructor(violations: string[]) {
    super(
      "HARD_CONSTRAINT_VIOLATED",
      `Cannot persist schedule change: ${violations.length} hard constraint(s) violated: ${violations.join("; ")}`,
      { violations }
    );
    this.name = "ConstraintViolationError";
    this.violations = violations;
  }
}

/**
 * Thrown when an action exceeds the active user role's permissions.
 */
export class AuthorizationError extends SchedulingError {
  public readonly role: string;
  public readonly action: string;

  constructor(role: string, action: string, message?: string) {
    super(
      "FORBIDDEN",
      message || `User with role '${role}' is not authorized to perform action '${action}'.`,
      { role, action }
    );
    this.name = "AuthorizationError";
    this.role = role;
    this.action = action;
  }
}

/**
 * Thrown when an entity (session, room, conflict, request) is not found.
 */
export class NotFoundError extends SchedulingError {
  public readonly entityType: string;
  public readonly entityId: string;

  constructor(entityType: string, entityId: string) {
    super("NOT_FOUND", `${entityType} with ID '${entityId}' was not found.`, {
      entityType,
      entityId,
    });
    this.name = "NotFoundError";
    this.entityType = entityType;
    this.entityId = entityId;
  }
}

/**
 * Thrown when a database query or mutation fails.
 */
export class DatabaseError extends SchedulingError {
  constructor(message: string, originalError?: unknown) {
    super("DATABASE_ERROR", message, originalError);
    this.name = "DatabaseError";
  }
}
