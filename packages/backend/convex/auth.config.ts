import type { AuthConfig } from "convex/server";
import { getEnv } from "./env";

export default {
  providers: [
    {
      domain: getEnv("CLERK_JWT_ISSUER_DOMAIN")!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
