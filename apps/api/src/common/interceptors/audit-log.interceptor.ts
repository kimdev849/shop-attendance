import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { AuditService } from "../../modules/audit/audit.service";

/**
 * Interceptor générique optionnel pour journaliser automatiquement les
 * mutations (POST/PATCH/DELETE) sur une route donnée. Les modules critiques
 * (workers, penalties, absences...) appellent en plus AuditService
 * explicitement pour capturer un message métier précis.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const user = request.user;
        this.auditService
          .log({
            userId: user?.userId ?? null,
            action: `${method} ${request.route?.path ?? request.url}`,
            entity: request.baseUrl?.split("/").pop() ?? "unknown",
            entityId: request.params?.id ?? null,
            metadata: { body: request.body },
          })
          .catch(() => undefined);
      }),
    );
  }
}
