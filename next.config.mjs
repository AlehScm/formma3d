// O app e 100% client-side, entao exporta como site estatico e roda no GitHub Pages
// sem servidor nenhum. `output: 'export'` fixo tambem serve de trava: se algum dia
// entrar codigo de servidor por engano, o build falha em vez de quebrar em producao.
const paraPages = process.env.GITHUB_PAGES === 'true';

// Com dominio proprio (public/CNAME) o Pages serve na raiz, sem /<repo>. Se um dia voltar
// para alehscm.github.io/<repo>, por aqui o prefixo do repo, senao os assets nao carregam.
const base = '';

// Endereco publico do site, para canonical, sitemap, Open Graph e JSON-LD (precisam de URL
// absoluta). Trocar o dominio: aqui e em public/CNAME.
const site = paraPages ? 'https://scarprint.com.br' : 'http://localhost:3111';

const nextConfig = {
  output: 'export',
  ...(process.env.FORMMA_BUILD_DIR ? { distDir: process.env.FORMMA_BUILD_DIR } : {}),
  ...(paraPages && base ? { basePath: base, assetPrefix: `${base}/` } : {}),
  // Caminho de arquivos de public/ (fontes) no navegador.
  env: { NEXT_PUBLIC_BASE: paraPages ? base : '', NEXT_PUBLIC_SITE_URL: site },
  images: { unoptimized: true },
};

export default nextConfig;
