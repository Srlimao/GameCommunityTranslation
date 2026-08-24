import { Router, Response } from 'express';
import { AuthRepository } from './auth_repository.ts';
import { AuthenticatedRequest, requireRole } from './auth_middleware.ts';
import { UserRole } from '../../types/domain_types.ts';

export const authRouter = Router();

// Ensure admin exists on startup
AuthRepository.ensureDefaultAdmin();

// GET current authenticated user profile
authRouter.get('/me', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.json({ success: true, user: null });
  }
  res.json({ success: true, user: req.user });
});

// POST register new user
authRouter.post('/register', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, password, displayName } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    if (password.length < 4) {
      return res.status(400).json({ success: false, error: 'Password must be at least 4 characters long' });
    }

    const allUsers = AuthRepository.getAllUsers();
    // First user is admin, subsequent users are translators
    const role: UserRole = allUsers.length === 0 ? 'admin' : 'translator';

    const user = AuthRepository.createUser({
      username,
      password,
      role,
      displayName,
    });

    const session = AuthRepository.createSession(user.id);
    res.json({ success: true, session, user });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST login
authRouter.post('/login', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const user = AuthRepository.validateUser(username, password);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const session = AuthRepository.createSession(user.id);
    res.json({ success: true, session, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST logout
authRouter.post('/logout', (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
  let token = '';
  if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7).trim();
  else if (typeof authHeader === 'string') token = authHeader.trim();

  if (token) {
    AuthRepository.deleteSession(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// Admin User Management Routes
authRouter.get('/users', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = AuthRepository.getAllUsers();
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

authRouter.put('/users/:id/role', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!role || !['admin', 'translator', 'viewer'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }
    const updated = AuthRepository.updateUserRole(req.params.id, role);
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

authRouter.delete('/users/:id', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.id === req.params.id) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own admin account' });
    }
    const success = AuthRepository.deleteUser(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
