import {
  ArgumentsHost,
  Catch,
  HttpException,
  Logger,
  RpcExceptionFilter,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  ClientProxy,
  ClientsModule,
  MicroserviceOptions,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import {
  Observable,
  TimeoutError,
  catchError,
  firstValueFrom,
  throwError,
  timeout,
} from 'rxjs';

/** Turns any exception thrown inside a microservice handler into a plain serialisable error. */
@Catch()
export class AllRpcExceptionsFilter implements RpcExceptionFilter {
  private readonly logger = new Logger('RpcException');

  catch(exception: any, _host: ArgumentsHost): Observable<any> {
    if (exception instanceof HttpException) {
      const res: any = exception.getResponse();
      const message = typeof res === 'string' ? res : res?.message ?? exception.message;
      return throwError(() => ({
        statusCode: exception.getStatus(),
        message: Array.isArray(message) ? message.join(', ') : message,
      }));
    }
    if (exception instanceof RpcException) {
      const err = exception.getError();
      return throwError(() =>
        typeof err === 'object' ? err : { statusCode: 500, message: String(err) },
      );
    }
    this.logger.error(exception?.stack ?? String(exception));
    return throwError(() => ({ statusCode: 500, message: 'Internal server error' }));
  }
}

/** Converts an error coming back over TCP into an HttpException again. */
function toHttpException(err: any): HttpException {
  if (err instanceof HttpException) return err;
  if (err instanceof TimeoutError) return new HttpException('Upstream service timed out', 504);
  const status = Number(err?.statusCode ?? err?.status ?? 500);
  const message = err?.message ?? 'Internal server error';
  // ECONNREFUSED etc. -> service down
  if (err?.code === 'ECONNREFUSED') return new HttpException('Upstream service unavailable', 503);
  return new HttpException(message, status >= 400 && status < 600 ? status : 500);
}

/** Request/response call to another service. Errors are re-thrown as HttpException. */
export function call<T = any>(
  client: ClientProxy,
  pattern: string,
  data: unknown = {},
  timeoutMs = 15000,
): Promise<T> {
  return firstValueFrom(
    client.send<T>(pattern, data).pipe(
      timeout(timeoutMs),
      catchError((err) => throwError(() => toHttpException(err))),
    ),
  );
}

/** Fire-and-forget event. Never throws. */
export function emitEvent(client: ClientProxy, pattern: string, data: unknown) {
  const logger = new Logger('emitEvent');
  client.emit(pattern, data).subscribe({
    error: (e) => logger.error(`Failed to emit ${pattern}: ${e?.message ?? e}`),
  });
}

/** Registers a TCP client to another service. Host/port are read from env. */
export function tcpClient(token: string, envPrefix: string, defaultPort: number) {
  return ClientsModule.registerAsync([
    {
      name: token,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: Transport.TCP,
        options: {
          host: config.get<string>(`${envPrefix}_HOST`, 'localhost'),
          port: Number(config.get(`${envPrefix}_PORT`, defaultPort)),
        },
      }),
    },
  ]);
}

/** Boots a TCP microservice. */
export async function bootstrapMicroservice(module: any, envPrefix: string, defaultPort: number) {
  const port = Number(process.env[`${envPrefix}_PORT`] ?? defaultPort);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(module, {
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port },
  });
  app.useGlobalFilters(new AllRpcExceptionsFilter());
  await app.listen();
  Logger.log(`${envPrefix} microservice listening on TCP :${port}`, 'Bootstrap');
}
