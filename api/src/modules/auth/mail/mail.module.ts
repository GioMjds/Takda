import { Module } from "@nestjs/common";
import { MailService } from "./mail.service.interface";
import { MailListener } from "./mail.listener";
import { NodemailerMailService } from "./nodemailer-mail.service";

@Module({
  imports: [],
  providers: [
    MailListener,
    {
      provide: MailService,
      useClass: NodemailerMailService,
    }
  ],
  exports: [MailService],
})
export class MailModule {}