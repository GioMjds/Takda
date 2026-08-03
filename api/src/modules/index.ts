// Hand-written barrel. The auto-generator would re-export every leaf
// barrel with `export *`, which collides on sub-namespace names that
// appear in more than one module (e.g. `dto`, `mail`). List the public
// surface explicitly instead.
//
// For sub-paths (dto, mail, rate-limit, etc.) import directly:
//   import { LoginDto } from '@/modules/auth/dto';

export { AppointmentsModule } from './appointments/appointments.module';
export { AuthModule } from './auth/auth.module';
export { BusinessesModule } from './businesses/businesses.module';
export { HealthModule, HealthController, HealthService } from './health';
export { NotificationsModule } from './notifications/notifications.module';
export { PrismaModule, PrismaService } from './prisma';
export { QueuesModule } from './queues/queues.module';
export { SubscriptionsModule } from './subscriptions/subscriptions.module';
export { UsersModule } from './users/users.module';
