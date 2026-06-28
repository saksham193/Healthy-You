import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "../utils/httpError";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  jti?: string;
};

const signToken = (
  payload: AccessTokenPayload,
  secret: Secret,
  expiresIn: SignOptions["expiresIn"],
): string => jwt.sign(payload, secret, { expiresIn });

export const createAccessToken = (payload: AccessTokenPayload): string =>
  signToken(payload, env.JWT_ACCESS_SECRET, env.ACCESS_TOKEN_TTL as SignOptions["expiresIn"]);

export const createRefreshToken = (payload: AccessTokenPayload): string =>
  signToken(payload, env.JWT_REFRESH_SECRET, env.REFRESH_TOKEN_TTL as SignOptions["expiresIn"]);

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    if (typeof decoded === "object" && typeof decoded.sub === "string" && typeof decoded.email === "string") {
      return { sub: decoded.sub, email: decoded.email };
    }
  } catch {
    throw new HttpError(401, "invalid_access_token", "Access token is invalid or expired.");
  }

  throw new HttpError(401, "invalid_access_token", "Access token is invalid.");
};

export const verifyRefreshToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);

    if (typeof decoded === "object" && typeof decoded.sub === "string" && typeof decoded.email === "string") {
      return { sub: decoded.sub, email: decoded.email };
    }
  } catch {
    throw new HttpError(401, "invalid_refresh_token", "Refresh token is invalid or expired.");
  }

  throw new HttpError(401, "invalid_refresh_token", "Refresh token is invalid.");
};
