import type { Request } from 'express';
import type { Types } from 'mongoose';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface JwtPayloadWithExp extends JwtPayload {
  exp?: number;
  iat?: number;
}

export interface AuthUser {
  _id?: Types.ObjectId | string;
  sub?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  phone?: string;
  isDeleted?: boolean;
  isBan?: boolean;
  firebaseUid?: string;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RequestWithCookies extends Request {
  cookies: Record<string, string | undefined>;
}

export interface AuthenticatedRequest extends RequestWithCookies {
  user: AuthUser;
}

export interface ValidatedRefreshTokenResult {
  userId: string;
  email: string;
  role: string;
  refreshToken: string;
}

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
}
