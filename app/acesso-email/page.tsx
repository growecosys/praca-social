import ConfirmEmailAccess from "./confirm";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function Page() {
  return <ConfirmEmailAccess />;
}
