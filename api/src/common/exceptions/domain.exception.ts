/**
 * Base class for all domain exceptions in the application.
 */
export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainException';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a requested domain entity or resource is not found.
 */
export class NotFoundException extends DomainException {
  constructor(entityName: string, id: string) {
    super(`${entityName} with id ${id} not found`);
    this.name = 'NotFoundException';
  }
}

export class UserNotFoundException extends NotFoundException {
  constructor(id: string) {
    super('User', id);
    this.name = 'UserNotFoundException';
  }
}

/**
 * Thrown when an operation conflicts with existing data or state.
 */
export class ConflictException extends DomainException {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictException';
  }
}

/**
 * Thrown when an action is executed without appropriate authorization.
 */
export class UnauthorizedException extends DomainException {
  constructor(message: string = "Unauthorized access") {
    super(message);
    this.name = 'UnauthorizedException';
  }
}

/**
 * Thrown when an operation is invalid for the entity's current lifecycle state.
 */
export class InvalidStateException extends DomainException {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStateException';
  }
}

/**
 * Structure representing an individual field validation error.
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Thrown when one or more input or domain validation rules fail.
 */
export class ValidationException extends DomainException {
  constructor(
    message: string,
    public readonly errors: ValidationError[],
  ) {
    super(message);
    this.name = 'ValidationException';
  }
}