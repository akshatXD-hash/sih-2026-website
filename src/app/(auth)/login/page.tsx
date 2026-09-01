import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Welcome back</h1>
      <p className="mb-7 mt-2 text-sm leading-6 text-slate-600">Sign in as an applicant or authorized officer.</p>
      <LoginForm nextPath={next} />
    </>
  );
}

