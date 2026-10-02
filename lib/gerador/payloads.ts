function wifiEscapar(valor: string): string {
  return valor.replace(/[\\;,:\"]/g, (c) => `\\${c}`);
}

export function payloadUrl(valor: string): string {
  const s = valor.trim();
  let u: URL;
  try { u = new URL(s); } catch { throw new Error('Informe uma URL completa, incluindo https://.'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('A URL deve começar com http:// ou https://.');
  return u.toString();
}

export function payloadWifi(ssid: string, senha: string, seguranca: 'WPA' | 'WEP' | 'nopass' = 'WPA'): string {
  if (!ssid.trim()) throw new Error('Informe o nome da rede Wi-Fi.');
  if (seguranca !== 'nopass' && !senha) throw new Error('Informe a senha da rede Wi-Fi.');
  return `WIFI:T:${seguranca};S:${wifiEscapar(ssid)};${seguranca === 'nopass' ? '' : `P:${wifiEscapar(senha)};`};`;
}

export function payloadWhatsapp(telefone: string, mensagem = ''): string {
  if (!telefone.trim().startsWith('+')) throw new Error('Use telefone no formato internacional E.164, com DDI e sem zero inicial.');
  const numero = telefone.replace(/[+\s().-]/g, '');
  if (!/^\d{8,15}$/.test(numero) || numero.startsWith('0')) throw new Error('Use telefone no formato internacional E.164, com DDI e sem zero inicial.');
  const url = new URL(`https://wa.me/${numero}`);
  if (mensagem) url.searchParams.set('text', mensagem);
  return url.toString();
}
