import { createHash } from "node:crypto";
import { database } from "../database/connection";

type TokenRow = {
  token_hash: string;
  user_id: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

export class TokenRepository {
  save(refreshToken: string, userId: string, expiresAt: string): void {
    database.prepare(`
      INSERT INTO refresh_tokens (token_hash, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(hashToken(refreshToken), userId, expiresAt, new Date().toISOString());
  }

  findValid(refreshToken: string): { userId: string; expiresAt: string } | null {
    const row = database.prepare(`
      SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL
    `).get(hashToken(refreshToken)) as TokenRow | undefined;

    if (!row || new Date(row.expires_at).getTime() <= Date.now()) return null;

    return { userId: row.user_id, expiresAt: row.expires_at };
  }

  revoke(refreshToken: string): void {
    database.prepare("UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ?")
      .run(new Date().toISOString(), hashToken(refreshToken));
  }
}
