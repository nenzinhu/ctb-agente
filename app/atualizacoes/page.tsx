import Link from 'next/link';
import AcervoChanges from '@/components/offline/AcervoChanges';
export default function AtualizacoesPage(){return <main className="page max-w-4xl"><div className="consultation-intro"><h1 className="consultation-title">Versões do acervo</h1><p className="consultation-lead">Confira diferenças entre as cópias guardadas neste aparelho.</p></div><AcervoChanges/><Link href="/offline" className="btn-secondary mt-4">Gerenciar pacote offline</Link></main>}
