import { UnauthorizedException } from "./domain.exception";

export class ResetTokenInvalidException extends UnauthorizedException {
  constructor() {
    super("Invalid or expired password reset token");
  }
}