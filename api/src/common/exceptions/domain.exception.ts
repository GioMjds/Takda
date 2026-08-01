export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainException';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class EntityNotFoundException extends DomainException {
  constructor(entityName: string, id: string) {
    super(`${entityName} with id ${id} not found`);
    this.name = 'EntityNotFoundException';
  }
}

export class InvalidStateException extends DomainException {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStateException';
  }
}

export class ValidationException extends DomainException {
  constructor(
    message: string,
    public readonly errors: ValidationError[],
  ) {
    super(message);
    this.name = 'ValidationException';
  }
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}
