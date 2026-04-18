import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getClientId(): string | undefined {
  return process.env.GOOGLE_CLIENT_ID;
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'dev-only-change-me';
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  team: string | null;
  role: string;
  profileComplete: boolean;
  picture: string | null;
}

export class AuthService {
  private googleClient: OAuth2Client;

  constructor() {
    this.googleClient = new OAuth2Client(getClientId());
  }

  async verifyGoogleIdToken(idToken: string): Promise<{
    googleId: string;
    email: string;
    name: string;
    picture: string | null;
  }> {
    const clientId = getClientId();
    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID not configured on the server');
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new Error('Invalid Google ID token payload');
    }
    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture || null,
    };
  }

  async upsertFromGoogle(profile: {
    googleId: string;
    email: string;
    name: string;
    picture: string | null;
  }): Promise<SessionUser> {
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: {
        googleId: profile.googleId,
        name: profile.name,
        picture: profile.picture,
      },
      create: {
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        role: 'captain',
        profileComplete: false,
      },
    });
    return this.toSessionUser(user);
  }

  // Demo bypass: create or fetch a demo user by email. Used when GOOGLE_CLIENT_ID
  // is not configured so the app still works for local development.
  async demoLogin(email: string, name: string): Promise<SessionUser> {
    const user = await prisma.user.upsert({
      where: { email },
      update: { name },
      create: {
        email,
        name,
        role: 'captain',
        profileComplete: false,
      },
    });
    return this.toSessionUser(user);
  }

  issueJwt(user: SessionUser): string {
    return jwt.sign(
      { sub: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: '7d' },
    );
  }

  verifyJwt(token: string): { sub: string; email: string } {
    const decoded = jwt.verify(token, getJwtSecret());
    if (typeof decoded === 'string') throw new Error('Invalid token');
    return { sub: decoded.sub as string, email: decoded.email as string };
  }

  async getUserById(id: string): Promise<SessionUser | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? this.toSessionUser(user) : null;
  }

  async updateProfile(
    id: string,
    patch: { team?: string; role?: string; name?: string },
  ): Promise<SessionUser> {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.team !== undefined ? { team: patch.team } : {}),
        ...(patch.role !== undefined ? { role: patch.role } : {}),
        profileComplete: true,
      },
    });
    return this.toSessionUser(updated);
  }

  private toSessionUser(user: {
    id: string;
    email: string;
    name: string;
    team: string | null;
    role: string;
    profileComplete: boolean;
    picture: string | null;
  }): SessionUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      team: user.team,
      role: user.role,
      profileComplete: user.profileComplete,
      picture: user.picture,
    };
  }
}

export const authService = new AuthService();
