import { getPracaUser } from "../lib/praca-auth";
import SiteNavigation, { type Section } from "./site-navigation";
export default async function SiteHeader({
  active = "home",
  dark = false,
}: {
  active?: Section;
  dark?: boolean;
}) {
  const user = await getPracaUser();
  return (
    <SiteNavigation
      active={active}
      dark={dark}
      signedIn={Boolean(user)}
      complete={Boolean(user?.profileComplete)}
      avatarUrl={
        user?.profileComplete ? `/avatar/${user.id}?v=${user.imageGenerationsUsed}` : undefined
      }
    />
  );
}
