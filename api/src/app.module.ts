import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  NodeIdempotencyModule,
  StorageAdapterEnum,
} from '@node-idempotency/nestjs';
import {
  AppointmentsModule,
  AuthModule,
  BusinessesModule,
  HealthModule,
  PrismaModule,
  QueuesModule,
  SubscriptionsModule,
  UsersModule,
  NotificationsModule,
} from '@/modules';
import { SharedModule } from './shared/shared.module';
import { JwtModule } from '@nestjs/jwt';
import { ENV } from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<number>(ENV.JWT_EXPIRES_IN) },
      }),
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL', 60),
          limit: configService.get<number>('THROTTLE_LIMIT', 10),
        },
      ],
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    NodeIdempotencyModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        storage: { adapter: StorageAdapterEnum.memory },
        cacheTTLMS: configService.get<number>(
          'IDEMPOTENCY_CACHE_TTL_MS',
          600_000,
        ),
      }),
    }),
    PrismaModule,
    HealthModule,
    NotificationsModule,
    SubscriptionsModule,
    AppointmentsModule,
    AuthModule,
    UsersModule,
    BusinessesModule,
    QueuesModule,
    SharedModule,
  ],
})
export class AppModule {}
