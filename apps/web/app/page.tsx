import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  "Next.js app router",
  "Tailwind CSS v4",
  "shadcn/ui components",
  "Clerk and Convex ready",
];

export default function Home() {
  return (
    <main className="min-h-svh bg-background px-6 py-10 text-foreground">
      <section className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-5xl flex-col justify-center gap-8">
        <div className="max-w-2xl space-y-5">
          <Badge variant="secondary" className="w-fit">
            Pellas monorepo
          </Badge>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">
              Frontend is wired with Tailwind and shadcn/ui.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              This home page uses local shadcn components, Tailwind utility
              classes, and the app-level providers already configured in the
              Next.js app.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg">Start building</Button>
            <Button variant="outline" size="lg">
              View components
            </Button>
          </div>
        </div>

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Installed stack</CardTitle>
            <CardDescription>
              Basic frontend dependencies are ready to use.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <span className="size-2 rounded-full bg-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
