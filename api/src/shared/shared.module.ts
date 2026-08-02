import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomLoggerService } from '@/common/services';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiresIn = config.get<string>('JWT_EXPIRES_IN', '15m');
        return {
          secret: config.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: expiresIn as unknown as number },
        };
      },
    }),
  ],
  providers: [CustomLoggerService],
  exports: [CustomLoggerService, JwtModule],
})
export class SharedModule {}
