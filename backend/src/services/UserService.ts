import bcrypt from "bcryptjs";
import type { User } from "../types/api";
import { HttpError } from "../utils/httpError";
import { UserRepository } from "../repositories/UserRepository";

export class UserService {
  constructor(private readonly users = new UserRepository()) {}

  async register(email: string, name: string, password: string): Promise<User> {
    if (this.users.findByEmail(email)) {
      throw new HttpError(409, "email_in_use", "A user with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = this.users.create(email, name, passwordHash);

    return this.toPublicUser(user);
  }

  async verifyCredentials(email: string, password: string): Promise<User> {
    const user = this.users.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, "invalid_credentials", "Email or password is incorrect.");
    }

    return this.toPublicUser(user);
  }

  getProfile(userId: string): User {
    const user = this.users.findById(userId);

    if (!user) throw new HttpError(404, "user_not_found", "User was not found.");

    return this.toPublicUser(user);
  }

  updateProfile(userId: string, name: string): User {
    const user = this.users.updateProfile(userId, name);

    if (!user) throw new HttpError(404, "user_not_found", "User was not found.");

    return user;
  }

  private toPublicUser(user: User): User {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
