import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private readonly isDev = process.env.NODE_ENV !== 'production';

  log(message: string, context?: string): void {
    if (this.shouldIgnore(message, context)) {
      return;
    }

    if (this.isDev && this.isNestStartingLog(message)) {
      console.clear();
      return;
    }

    if (this.isNestApplicationLog(message)) {
      return;
    }

    if (this.isInstanceLoaderLog(message)) {
      return;
    }

    if (this.isRouterExplorerLog(message)) {
      this.captureRouteMapping(message);
      return;
    }

    if (this.isRoutesResolverLog(message)) {
      this.logRoutesResolver(message);
      return;
    }

    this.printLog(message, context, 'LOG');
  }

  error(message: string, trace?: string, context?: string): void {
    this.printLog(`${message}${trace ? `\n${trace}` : ''}`, context, 'ERROR');
  }

  warn(message: string, context?: string): void {
    this.printLog(message, context, 'WARN');
  }

  debug(message: string, context?: string): void {
    if (this.isDev) {
      this.printLog(message, context, 'DEBUG');
    }
  }

  verbose(message: string, context?: string): void {
    if (this.isDev) {
      this.printLog(message, context, 'VERBOSE');
    }
  }

  private shouldIgnore(message: string, context?: string): boolean {
    const ignoredContexts = ['NestFactory'];

    if (!context) return false;

    if (
      ignoredContexts.some((ctx) => context.includes(ctx)) &&
      message.includes('dependencies initialized')
    ) {
      return true;
    }

    return false;
  }

  private isInstanceLoaderLog(message: string): boolean {
    return message.includes('dependencies initialized');
  }

  private isRouterExplorerLog(message: string): boolean {
    return message.includes('Mapped');
  }

  private isRoutesResolverLog(message: string): boolean {
    return message.includes('RoutesResolver');
  }

  private isNestApplicationLog(message: string): boolean {
    return message.includes('Nest application successfully started');
  }

  private isNestStartingLog(message: string): boolean {
    return message.includes('Starting Nest application');
  }

  private logRoutesResolver(message: string): void {
    const controllerMatch = message.match(/RoutesResolver.*\{([^}]+)\}/);
    if (controllerMatch) {
      const controllerName = controllerMatch[1].trim();
      this.printLog(`🔍 Resolving routes → ${controllerName}`, 'Router', 'LOG');
    }
  }

  private captureRouteMapping(message: string): void {
    const methodPathMatch = message.match(
      /Mapped\s*\{([^}]+),\s*(\w+)\}\s*route/,
    );
    if (!methodPathMatch) return;

    const [, path, method] = methodPathMatch;

    const methodColor = this.getMethodColor(method);
    this.printLog(
      `  ${methodColor}${method.padEnd(6)}\x1b[0m → ${path}`,
      'Route',
      'LOG',
    );
  }

  private getMethodColor(method: string): string {
    const colors: Record<string, string> = {
      GET: '\x1b[36m',
      POST: '\x1b[32m',
      PUT: '\x1b[33m',
      PATCH: '\x1b[35m',
      DELETE: '\x1b[31m',
    };
    return colors[method] || '\x1b[37m';
  }

  private printLog(
    message: string,
    context?: string,
    level: string = 'LOG',
  ): void {
    const timestamp = new Date().toLocaleTimeString();
    const contextStr = context ? `\x1b[90m[${context}]\x1b[0m` : '';
    const levelColors: Record<string, string> = {
      LOG: '\x1b[36m',
      ERROR: '\x1b[31m',
      WARN: '\x1b[33m',
      DEBUG: '\x1b[35m',
      VERBOSE: '\x1b[37m',
    };

    const color = levelColors[level] || '\x1b[37m';
    const reset = '\x1b[0m';

    console.log(`${color}[${timestamp}]${reset} ${contextStr} ${message}`);
  }
}
