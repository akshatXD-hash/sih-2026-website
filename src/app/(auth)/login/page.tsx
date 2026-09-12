
import { T } from "@/components/language/LanguageProvider";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-slate-950"> <T>Welcome back</T> </h1>
      <p className="mb-7 mt-2 text-sm leading-6 text-slate-600"> <T>Sign in as an applicant or authorized officer.</T> </p>
      <LoginForm nextPath={next} />
    </>
  );
}

