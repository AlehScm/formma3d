function tlv(id: string, valor: string): string {
  const tamanho = new TextEncoder().encode(valor).length;
  if (tamanho > 99) throw new RangeError(`Campo Pix ${id} excede 99 bytes.`);
  return `${id}${String(tamanho).padStart(2, '0')}${valor}`;
}

function brAscii(valor: string, campo: string, max: number): string {
  const limpo = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 .,&'()/-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!limpo || limpo.length > max) throw new RangeError(`${campo} deve ter de 1 a ${max} caracteres (sem acentos).`);
  return limpo;
}

function validarChave(chave: string): string {
  const k = chave.trim();
  if (!k || new TextEncoder().encode(k).length > 77 || /[^\x20-\x7e]/.test(k)) throw new Error('A chave Pix deve ter entre 1 e 77 caracteres ASCII.');
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(k);
  const telefone = /^\+[1-9]\d{7,14}$/.test(k);
  const documento = /^\d{11}$/.test(k) || /^\d{14}$/.test(k) || /^[A-Z0-9]{12}\d{2}$/i.test(k);
  const aleatoria = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(k);
  if (!(email || telefone || documento || aleatoria)) throw new Error('A chave Pix não tem formato reconhecido (e-mail, telefone internacional, CPF/CNPJ ou chave aleatória).');
  return k;
}

export function crc16Ccitt(texto: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface OpcoesPixEstatico {
  chave: string;
  nome: string;
  cidade: string;
  valor?: number;
}

export function gerarPixEstatico({ chave, nome, cidade, valor }: OpcoesPixEstatico): string {
  const subconta = tlv('00', 'br.gov.bcb.pix') + tlv('01', validarChave(chave));
  const campos = [tlv('00', '01'), tlv('26', subconta), tlv('52', '0000'), tlv('53', '986')];
  if (valor !== undefined) {
    if (!Number.isFinite(valor) || valor <= 0) throw new RangeError('O valor Pix deve ser maior que zero.');
    const quantia = valor.toFixed(2);
    if (quantia.length > 13) throw new RangeError('O valor Pix excede o limite do BR Code.');
    campos.push(tlv('54', quantia));
  }
  campos.push(tlv('58', 'BR'), tlv('59', brAscii(nome, 'Nome', 25)), tlv('60', brAscii(cidade, 'Cidade', 15)), tlv('62', tlv('05', '***')));
  const parcial = campos.join('') + '6304';
  return parcial + crc16Ccitt(parcial);
}
