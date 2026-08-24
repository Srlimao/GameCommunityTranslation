import { Request, Response, NextFunction } from 'express';
import { AuthRepository } from './auth_repository.ts';
import { UserRole } from '../../types/domain_types.ts';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: UserRole;
    display_name?: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
  let token = '';

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (typeof authHeader === 'string') {
    token = authHeader.trim();
  }

  if (token) {
    const user = AuthRepository.validateSession(token);
    if (user) {
      req.user = user;
    }
  }

  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Access denied: Insufficient permissions' });
    }

    next();
  };
}
