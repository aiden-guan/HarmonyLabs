import Link from "next/link";
import { Mark } from "@/components/brand/mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <Link href="/" className="inline-flex items-center gap-2">
            <Mark className="h-8 w-8 text-accent" />
            <span className="text-xl font-bold tracking-tight text-ink">MogLabs</span>
          </Link>
        </div>

        <Card className="border border-line bg-panel shadow-sm text-center">
          <CardHeader>
            <span className="font-mono text-xs uppercase tracking-[0.16em] text-accent font-semibold block">
              ERROR 404
            </span>
            <CardTitle className="text-2xl mt-1">Page not found</CardTitle>
            <CardDescription className="mt-2">
              This route does not exist in MogLabs or may have been relocated.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Link href="/dashboard">
              <Button size="md" className="w-full">
                Return to dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
