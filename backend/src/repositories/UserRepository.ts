import { randomUUID } from "node:crypto";
import { database } from "../database/connection";
import type { User } from "../types/api";

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

export type UserWithPasswordHash = User & {
  passwordHash: string;
};

const toUser = (row: UserRow): UserWithPasswordHash => ({
  id: row.id,
  email: row.email,
  name: row.name,
  passwordHash: row.password_hash,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class UserRepository {
  create(email: string, name: string, passwordHash: string): UserWithPasswordHash {
    const now = new Date().toISOString();
    const user: UserWithPasswordHash = {
      id: randomUUID(),
      email: email.toLowerCase(),
      name,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    database.prepare(`
      INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
      VALUES (@id, @email, @name, @passwordHash, @createdAt, @updatedAt)
    `).run(user);

    return user;
  }

  findByEmail(email: string): UserWithPasswordHash | null {
    const row = database.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as UserRow | undefined;

    return row ? toUser(row) : null;
  }

  findById(id: string): UserWithPasswordHash | null {
    const row = database.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;

    return row ? toUser(row) : null;
  }

  updateProfile(id: string, name: string): User | null {
    const updatedAt = new Date().toISOString();

    database.prepare("UPDATE users SET name = ?, updated_at = ? WHERE id = ?").run(name, updatedAt, id);

    const user = this.findById(id);

    return user ? { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt, updatedAt: user.updatedAt } : null;
  }
}
