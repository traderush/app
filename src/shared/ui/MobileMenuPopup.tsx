'use client';

import Modal from './ui/modal';
import { PRIMARY_NAVIGATION } from './constants/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface NotificationsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

export default function NotificationsPopup({ isOpen, onClose, triggerRef }: NotificationsPopupProps) {

    const pathname = usePathname();

    useEffect( () => {
        onClose();
    }, [pathname]);
    
    return (
        <Modal title="Quick Access" isOpen={isOpen} onClose={onClose} triggerRef={triggerRef}>
            <MobileMenuContent />
        </Modal>
    );
}

const MobileMenuContent = () => {

    return (
        <div className='flex flex-col'>
            {
                PRIMARY_NAVIGATION.map((item) => (
                    <Link className='border-b border-zinc-800/50 px-4 py-3 hover:bg-zinc-800/50 transition-colors' href={item.href} key={item.href}>
                        <p className='text-xs font-medium text-gray-300'>{item.label}</p>
                    </Link>
                ))
            }
        </div>
    )
}