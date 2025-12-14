import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { IUser } from '../models/user.model';

export class Token {
  // 🔹 Generate access + refresh tokens
  public static async generateTokens(user: IUser) {
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email } as JwtPayload,
      process.env.JWT_ACCESS_SECRET as string,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { sub: user.id, email: user.email } as JwtPayload,
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: '15d' }
    );

    return { accessToken, refreshToken };
  }

  // 🔹 Verify access token
  public static verifyAccessToken(token: string) {
    try {
      return jwt.verify(token, process.env.JWT_ACCESS_SECRET as string);
    } catch {
      return null;
    }
  }

  // 🔹 Verify refresh token
  public static verifyRefreshToken(token: string) {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string);
    } catch {
      return null;
    }
  }
}
