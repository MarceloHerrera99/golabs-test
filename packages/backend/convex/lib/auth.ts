type AuthContext = {
  auth: {
    getUserIdentity: () => Promise<{ subject: string } | null>;
  };
};

export async function getRequiredUserId(ctx: AuthContext) {
  const userId = await getOptionalUserId(ctx);

  if (!userId) {
    throw new Error("Debes iniciar sesion para continuar.");
  }

  return userId;
}

export async function getOptionalUserId(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}
