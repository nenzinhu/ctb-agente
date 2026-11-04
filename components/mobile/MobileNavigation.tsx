'use client';
import {usePathname} from 'next/navigation';
import NavigationLinks from '@/components/NavigationLinks';
export default function MobileNavigation(){const pathname=usePathname()??'/';if(pathname.startsWith('/admin'))return null;return <nav className="mobile-nav mobile-nav-compact print:hidden md:hidden" aria-label="Navegação mobile"><NavigationLinks mobile/></nav>}
