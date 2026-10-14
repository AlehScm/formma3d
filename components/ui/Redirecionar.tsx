'use client';

/** Pagina estatica que so encaminha para outro endereco do site (com o link, se o script nao rodar). */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function Redirecionar({ para }: { para: string }) {
  const router = useRouter();
  useEffect(() => router.replace(para), [router, para]);
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-fundo p-6 text-texto-2">
      <Link href={para} className="text-acento underline underline-offset-2">Abrir no editor</Link>
    </main>
  );
}
