// O app e 100% client-side, entao exporta como site estatico e roda no GitHub Pages
// sem servidor nenhum. `output: 'export'` fixo tambem serve de trava: se algum dia
// entrar codigo de servidor por engano, o build falha em vez de quebrar em producao.
const paraPages = process.env.GITHUB_PAGES === 'true';

// No Pages o site mora em /<repo>, e sem isto os assets apontariam para a raiz e
// nao carregariam. Rodando local, fica na raiz normalmente.
const base = '/formma3d';

const nextConfig = {
  output: 'export',
  ...(paraPages ? { basePath: base, assetPrefix: `${base}/` } : {}),
  images: { unoptimized: true },
};

export default nextConfig;
