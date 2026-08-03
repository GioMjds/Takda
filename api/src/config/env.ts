import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

type NodeEnv = 'development' | 'test' | 'preview' | 'production';

const frontendUrlByEnv = {
  development: 'http://localhost:3000',
  test: 'https://app.takda.test',
  preview: 'https://takda-preview.vercel.app',
  production: 'https://takda.app',
} satisfies Record<NodeEnv, string>;

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'preview', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  DATABASE_URL: z.string(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be ≥32 chars'),
  JWT_EXPIRES_IN: z.coerce.string().default('15m'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(2592000),

  PASSWORD_RESET_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
  INVITE_TTL_SECONDS: z.coerce.number().int().positive().default(604800),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('noreply@takda.app'),

  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_LOGIN_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(900000),

  SMS_PROVIDER: z.enum(['semaphore', 'twilio']).default('semaphore'),
  SMS_API_KEY: z.string().optional(),
  SMS_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SMS_SENDER_NAME: z.string().optional(),
  SMS_SEMAPHORE_BASE_URL: z.string().default('https://api.semaphore.co/api/v4'),
  SMS_TWILIO_ACCOUNT_SID: z.string().optional(),
  SMS_TWILIO_AUTH_TOKEN: z.string().optional(),
  SMS_TWILIO_FROM: z.string().optional(),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  FRONTEND_URL: z.url('FRONTEND_URL must be a valid URL').optional(),

  MOBILE_APP_SCHEME: z
    .string()
    .regex(/^[a-z][a-z0-9+.-]*:\/\/$/i, 'MOBILE_APP_SCHEME must end with ://')
    .default('takda://'),
});

const env = envSchema.parse(process.env);
const fallbackFrontendUrl =
  frontendUrlByEnv[env.NODE_ENV] ?? frontendUrlByEnv.development;

export type Env = typeof env & { FRONTEND_URL: string };

export const ENV = {
  ...env,
  FRONTEND_URL: env.FRONTEND_URL ?? fallbackFrontendUrl,
} satisfies Env;
