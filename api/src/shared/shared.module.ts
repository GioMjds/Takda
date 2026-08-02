import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomLoggerService } from '@/common/services';
import { ENV } from '@/config';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiresIn = config.get<number>(ENV.JWT_EXPIRES_IN);
        return {
          secret: config.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: expiresIn },
        };
      },
    }),
  ],
  providers: [CustomLoggerService],
  exports: [CustomLoggerService, JwtModule],
})
export class SharedModule {}
