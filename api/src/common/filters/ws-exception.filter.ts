import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient();
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (exception instanceof WsException) {
      const error = exception.getError();
      if (typeof error === 'object' && error !== null) {
        code = (error as any).code ?? 'WS_ERROR';
        message = (error as any).message ?? 'WebSocket error';
      } else if (typeof error === 'string') {
        code = 'WS_ERROR';
        message = error;
      }
    }

    client.emit('exception', {
      status: 'error',
      code,
      message,
    });
  }
}
