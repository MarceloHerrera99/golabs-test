import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <SignUp />
    </main>
  );
}
