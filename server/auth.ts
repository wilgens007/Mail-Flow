import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || "your-jwt-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

export interface AuthRequest extends Request {
  user?: User;
  tenantId?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const user = await storage.getUser(payload.userId);
  
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  req.user = user;
  req.tenantId = user.tenantId || undefined;
  next();
}

export async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export async function tenantMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return res.status(403).json({ message: "No tenant associated with user" });
  }

  const tenant = await storage.getTenant(req.tenantId);
  
  if (!tenant) {
    return res.status(403).json({ message: "Tenant not found" });
  }

  if (tenant.status === "disabled") {
    return res.status(403).json({ message: "Tenant account is disabled" });
  }

  next();
}
