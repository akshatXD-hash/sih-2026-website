import { signOutAction } from "@/app/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button className="button-secondary text-sm" type="submit">
        Sign out
      </button>
    </form>
  );
}
