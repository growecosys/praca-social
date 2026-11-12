export default function PageBack({
  href = "/mural",
  label = "Voltar ao Mural",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4"
    >
      ← {label}
    </a>
  );
}
