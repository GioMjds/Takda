import 'reflect-metadata';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ENV } from './config/env';
import { networkInterfaces } from 'os';
import cookieParser from 'cookie-parser';

const nets = networkInterfaces();

let hostIp = '0.0.0.0';

for (const name of Object.keys(nets)) {
  for (const net of nets[name] ?? []) {
    if (net.family === 'IPv4' && !net.internal) {
      hostIp = net.address;
      break;
    }
  }
  if (hostIp !== '0.0.0.0') break;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger:
      ENV.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const port = ENV.PORT;

  app.use(cookieParser());

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: ['http://localhost:3000', `http://${hostIp}:3000`],
    methods: ['GET', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS', 'QUERY'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Bearer',
      'Origin',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Credentials',
    ],
  });

  await app.listen(port);
  new Logger('Bootstrap').log(`API listening on :${port}`);
}

void bootstrap();
