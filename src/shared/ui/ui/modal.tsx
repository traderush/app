'use client';
import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  className?: string;
}

export default function Modal({ title, isOpen, onClose, triggerRef, children, className }: ModalProps) {
  const [position, setPosition] = useState({ top: 0, right: 0 });

  // Update position when isOpen changes or window resizes
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, triggerRef]);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()} modal>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 bg-black/60 z-[1000]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=open]:opacity-60 data-[state=closed]:opacity-0',
            'transition-opacity duration-300 ease-out',
            className
          )}
        />

        {/* Content positioned relative to trigger */}
        <DialogPrimitive.Content
          className={cn(
            'fixed w-80 border border-zinc-800 rounded shadow-2xl z-[1002]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'transition-all duration-300 ease-out',
            'focus:outline-none'
          )}
          style={{
            top: position.top,
            right: position.right,
            backgroundColor: '#0E0E0E',
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <DialogPrimitive.Title className="text-zinc-100" style={{ fontSize: '14px', fontWeight: 500 }}>
              {title}
            </DialogPrimitive.Title>
            <div className="flex items-center gap-2">
              <DialogPrimitive.Close
                className="grid place-items-center w-4 h-4 rounded hover:bg-white/5 transition-colors"
                aria-label="Close modal"
              >
                <X className="text-white" size={16} />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[calc(100vh-10rem)] overflow-auto">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}