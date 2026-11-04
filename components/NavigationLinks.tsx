'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useAbas} from '@/lib/client/navigation-preferences';
import {abaAtiva} from '@/lib/navigation';
import TabCarousel from './TabCarousel';
export default function NavigationLinks({mobile=false}:{mobile?:boolean}){const pathname=usePathname()??'/';const {abas}=useAbas();return <TabCarousel activeKey={`${pathname}:${abas.map(d=>d.href).join(',')}`}>{abas.map(d=><Link key={d.href} href={d.href} className={`${mobile?'mobile-nav-action':'nav-tab'} pmrv-tab`} aria-current={abaAtiva(d.href,pathname)?'page':undefined}><span>{d.curto}</span></Link>)}</TabCarousel>}
