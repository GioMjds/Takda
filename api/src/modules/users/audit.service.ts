import { Injectable, NotImplementedException } from "@nestjs/common";
import { UsersRepository } from "./users.repository";

@Injectable()
export class AuditService {
  constructor(private readonly repo: UsersRepository) {}

  async logAction(action: string, entityId: bigint | string) {
    throw new NotImplementedException({
      error: "Not implemented",
    });
  }
}