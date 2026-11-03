import Link from 'next/link';
import Icone from '@/components/ui/Icone';
import { GRUPOS_FERRAMENTAS } from '@/lib/navigation';

export default function FerramentasPage() {
  return <main className="page">
    <div className="consultation-intro"><h1 className="consultation-title">Ferramentas de apoio</h1><p className="consultation-lead">Fiscalização, estudo e documentos.</p></div>
    {GRUPOS_FERRAMENTAS.map(grupo => <section key={grupo.titulo} className="viewport-tool-group"><h2>{grupo.titulo}</h2>{grupo.itens.map(item => <Link key={item.href} href={item.href} className="viewport-tool-link"><Icone nome={item.icone} tamanho={22} /><span>{item.label}<small>{item.descricao}</small></span><Icone nome="seta" tamanho={18} /></Link>)}</section>)}
  </main>;
}
