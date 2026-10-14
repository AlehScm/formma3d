// O app e 100% client-side, entao exporta como site estatico e roda no GitHub Pages
// sem servidor nenhum. `output: 'export'` fixo tambem serve de trava: se algum dia
// entrar codigo de servidor por engano, o build falha em vez de quebrar em producao.
const paraPages = process.env.GITHUB_PAGES === 'true';

// No Pages o site mora em /<repo>, e sem isto os assets apontariam para a raiz e
// nao carregariam. Rodando local, fica na raiz normalmente.
const base = '/formma3d';

// Endereco publico do site, para canonical, sitemap, Open Graph e JSON-LD (precisam de URL
// absoluta). Com dominio proprio: trocar aqui, criar public/CNAME e tirar o basePath.
const site = paraPages ? `https://alehscm.github.io${base}` : 'http://localhost:3111';

const nextConfig = {
  output: 'export',
  ...(process.env.FORMMA_BUILD_DIR ? { distDir: process.env.FORMMA_BUILD_DIR } : {}),
  ...(paraPages ? { basePath: base, assetPrefix: `${base}/` } : {}),
  // Caminho de arquivos de public/ (fontes) no navegador.
  env: { NEXT_PUBLIC_BASE: paraPages ? base : '', NEXT_PUBLIC_SITE_URL: site },
  images: { unoptimized: true },
};

export default nextConfig;
