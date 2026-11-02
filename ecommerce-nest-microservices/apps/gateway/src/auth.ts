import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
  applyDecorators,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthUser, JwtPayload, Role } from '@app/common';

const ROLES_KEY = 'roles';

function readUser(jwt: JwtService, req: any): AuthUser | null {
  const header: string | undefined = req.headers?.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const p = jwt.verify<JwtPayload>(header.slice(7));
    return { id: p.sub, email: p.email, role: p.role };
  } catch {
    return null;
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const user = readUser(this.jwt, req);
    if (!user) throw new UnauthorizedException('Missing or invalid access token');
    req.user = user;
    return true;
  }
}

/** Attaches req.user when a valid token is sent, but never rejects the request. */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    req.user = readUser(this.jwt, req) ?? undefined;
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;
    const user: AuthUser = ctx.switchToHttp().getRequest().user;
    if (!user || !roles.includes(user.role as Role)) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}

/** @Auth() = any logged in user, @Auth(Role.ADMIN, Role.SELLER) = only those roles. */
export const Auth = (...roles: Role[]) =>
  applyDecorators(SetMetadata(ROLES_KEY, roles), UseGuards(JwtAuthGuard, RolesGuard));

export const OptionalAuth = () => UseGuards(OptionalAuthGuard);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
