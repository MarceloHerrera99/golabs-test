"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background p-6">
        <Alert className="max-w-xl">
          <AlertTitle>Convex no está configurado</AlertTitle>
          <AlertDescription>
            Define NEXT_PUBLIC_CONVEX_URL para conectar el dashboard con el
            backend.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
