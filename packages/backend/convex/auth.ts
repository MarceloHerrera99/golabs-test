import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getEnv } from "./env";

export type Role = "admin" | "editor" | "user";

type Identity = NonNullable<
  Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>
>;

export type AuthInfo = {
  tokenIdentifier: string;
  subject?: string;
  name?: string;
  email?: string;
  imageUrl?: string;
};

type AuthCtx = Pick<QueryCtx | MutationCtx | ActionCtx, "auth">;
type ReadCtx = Pick<QueryCtx | MutationCtx, "db">;

export type UserDoc = {
  _id: Id<"users">;
  tokenIdentifier: string;
  subject?: string;
  name?: string;
  email?: string;
  imageUrl?: string;
  role: Role;
  createdAt: number;
  updatedAt: number;
  lastSeenAt: number;
};

export async function requireIdentity(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Debes iniciar sesión para continuar.");
  }

  return identity;
}

export function authInfoFromIdentity(identity: Identity): AuthInfo {
  return {
    tokenIdentifier: identity.tokenIdentifier,
    subject: identity.subject,
    name: identity.name,
    email: identity.email,
    imageUrl:
      typeof identity.pictureUrl === "string" ? identity.pictureUrl : undefined,
  };
}

export function initialRoleForEmail(email?: string): Role {
  const adminEmails = (
    getEnv("CONVEX_ADMIN_EMAILS") ??
    getEnv("ADMIN_EMAILS") ??
    ""
  )
    .split(",")
    .map((item: string) => item.trim().toLowerCase())
    .filter(Boolean);

  return email && adminEmails.includes(email.toLowerCase()) ? "admin" : "user";
}

export async function getUserByTokenIdentifier(
  ctx: ReadCtx,
  tokenIdentifier: string,
) {
  return await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("tokenIdentifier"), tokenIdentifier))
    .first();
}

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await requireIdentity(ctx);
  const user = await getUserByTokenIdentifier(ctx, identity.tokenIdentifier);

  if (!user) {
    throw new Error("Tu perfil todavía no está sincronizado.");
  }

  return user;
}

export async function upsertUserFromAuth(
  ctx: MutationCtx,
  auth: AuthInfo,
): Promise<UserDoc> {
  const now = Date.now();
  const existing = await getUserByTokenIdentifier(ctx, auth.tokenIdentifier);
  const bootstrappedRole = initialRoleForEmail(auth.email);

  if (!existing) {
    const userId = await ctx.db.insert("users", {
      tokenIdentifier: auth.tokenIdentifier,
      subject: auth.subject,
      name: auth.name,
      email: auth.email,
      imageUrl: auth.imageUrl,
      role: bootstrappedRole,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    });

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("No se pudo crear el perfil.");
    }

    return user;
  }

  const role = bootstrappedRole === "admin" ? "admin" : existing.role;
  await ctx.db.patch(existing._id, {
    subject: auth.subject,
    name: auth.name,
    email: auth.email,
    imageUrl: auth.imageUrl,
    role,
    updatedAt: now,
    lastSeenAt: now,
  });

  const user = await ctx.db.get(existing._id);
  if (!user) {
    throw new Error("No se pudo leer el perfil actualizado.");
  }

  return user;
}

export function ensureRole(user: UserDoc, roles: Role[]) {
  if (!roles.includes(user.role)) {
    throw new Error("No tienes permisos para realizar esta acción.");
  }
}
