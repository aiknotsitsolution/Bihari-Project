export * from './constants';
export * from './rpc';
export * from './db';
export * from './dto/auth.dto';
export * from './dto/catalog.dto';
export * from './dto/order.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}
