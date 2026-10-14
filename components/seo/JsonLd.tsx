/** Bloco JSON-LD (schema.org) na pagina. `<` vira < para o texto nao fechar o script. */
export function JsonLd({ dados }: { dados: Record<string, unknown> | null }) {
  if (!dados) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, '\\u003c') }} />;
}
