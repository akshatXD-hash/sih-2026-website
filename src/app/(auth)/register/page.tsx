import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Create your account</h1>
      <p className="mb-7 mt-2 text-sm leading-6 text-slate-600">
        Your role is assigned securely. Public registration always creates an applicant account.
      </p>
      <RegisterForm />
    </>
  );
}

