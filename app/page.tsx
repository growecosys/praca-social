import SiteHeader from "../components/site-header";
import {
  Eyebrow,
  HeroSection,
  PrimaryAction,
  SecondaryAction,
  Steps,
  stagger,
} from "../components/home-hero";
import { getPracaUser } from "../lib/praca-auth";

export const dynamic = "force-dynamic";

/** Long names would otherwise wrap into a wall of display type and push the actions off-screen. */
function nameSize(name: string) {
  if (name.length <= 12) return "text-[clamp(3.25rem,9vw,8rem)] leading-[.92]";
  if (name.length <= 24) return "text-[clamp(2.75rem,6.5vw,5.5rem)] leading-[.95]";
  return "text-[clamp(2.25rem,4.75vw,4rem)] leading-[1]";
}

export default async function Home() {
  const user = await getPracaUser();

  if (user?.profileComplete)
    return (
      <main className="min-h-screen bg-background text-foreground">
        <SiteHeader active="home" />
        <HeroSection>
          <Eyebrow>você está na praça como</Eyebrow>
          <h1
            className={`rise mt-5 max-w-full text-balance break-words font-serif tracking-[-.035em] ${nameSize(user.displayName)}`}
            style={stagger(1)}
          >
            {user.displayName}
          </h1>
          <p className="rise mt-6 font-serif text-3xl text-primary" style={stagger(2)}>
            {user.roleTitle}
          </p>
          <div
            className="rise mt-10 flex flex-wrap items-center gap-x-6 gap-y-4"
            style={stagger(3)}
          >
            <PrimaryAction href="/mural">Ver o Mural</PrimaryAction>
            <SecondaryAction href="/perfil" outlined>
              Meu perfil
            </SecondaryAction>
          </div>
        </HeroSection>
      </main>
    );

  const next = user ? "/perfil/concluir" : "/entrar";
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader active="home" />
      <HeroSection>
        <Eyebrow>publique ideias, encontre pessoas e cuide do que é comum</Eyebrow>
        <h1
          className="rise mt-4 font-serif text-[clamp(3.75rem,9vw,8.25rem)] leading-[.86] tracking-[-.04em]"
          style={stagger(1)}
        >
          Entre.
          <br />
          <span className="text-primary">A praça</span>
          <br />é nossa!
        </h1>
        <div className="rise mt-8 flex flex-wrap items-center gap-x-6 gap-y-4" style={stagger(2)}>
          <PrimaryAction href={next}>
            {user ? "Concluir meu perfil" : "Crie sua identidade"}
          </PrimaryAction>
          <SecondaryAction href="/mural">Explorar o Mural</SecondaryAction>
        </div>
        <Steps index={3} />
      </HeroSection>
    </main>
  );
}
