
import { T } from "@/components/language/LanguageProvider";
import { signOutAction } from "@/app/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button className="button-secondary text-sm" type="submit"> <T>Sign out</T> </button>
    </form>
  );
}
