import {
  NotFoundException,
  GoneException,
  ConflictException,
} from '@nestjs/common';

export class InviteNotFoundException extends NotFoundException {
  constructor() {
    super('Invite not found');
  }
}

export class InviteExpiredException extends GoneException {
  constructor() {
    super('Invite has expired');
  }
}

export class InviteAlreadyAcceptedException extends ConflictException {
  constructor() {
    super('Invite has already been accepted');
  }
}
