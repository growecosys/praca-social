export default function OnboardingProgress({
  account = false,
  email = false,
  identity = false,
  dark = false,
}: {
  account?: boolean;
  email?: boolean;
  identity?: boolean;
  dark?: boolean;
}) {
  const steps = [
    { name: "Criar conta", done: account, href: "/entrar" },
    { name: "Confirmar e-mail", done: email, href: "/confirmar-email" },
    { name: "Responder 5 perguntas", done: identity, href: "/perfil/concluir" },
    { name: "Receber seu papel", done: identity, href: "/perfil" },
  ];
  const current = !account ? 0 : !identity ? (email ? 2 : 1) : !email ? 1 : -1;
  return (
    <nav
      aria-label="Progresso da sua identidade"
      className={`my-6 rounded-sm border p-4 ${dark ? "border-white/25 text-[#f5f1e8]" : "border-[#c8c0b1] bg-[#f5f1e8]/95 text-[#244e35]"}`}
    >
      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li
            key={s.name}
            aria-current={i === current ? "step" : undefined}
            className="flex items-start gap-2 text-sm"
          >
            <span aria-hidden="true" className="font-semibold">
              {s.done ? "✓" : i + 1 + "."}
            </span>
            <span>
              {account && i === 1 && !s.done ? (
                <a href={s.href} className="underline underline-offset-4">
                  {s.name}
                </a>
              ) : (
                s.name
              )}
              <span className="block text-xs opacity-75">
                {s.done ? "Concluído" : i === current ? "Próximo passo" : "Pendente"}
              </span>
            </span>
          </li>
        ))}
      </ol>
      {account && !email && (
        <p className="mt-3 text-xs opacity-80">
          Você pode responder às perguntas agora e confirmar o e-mail depois.
        </p>
      )}
    </nav>
  );
}
