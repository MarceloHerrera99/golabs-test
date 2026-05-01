import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <SignIn />
    </main>
  );
}
