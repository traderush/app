'use client';

import { useUIStore } from '@/stores';
import SlideShowPopup, { type SlideShowSlide } from './SlideShowPopup';

interface HowToPlayPopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const slides: SlideShowSlide[] = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of trading and how to place your first bet on the platform.',
    image: 'https://i.ibb.co/chN47y4X/customwallettrackernotifications-ezgif-com-optimize.gif',
  },
  {
    title: 'Advanced Strategies',
    description: 'Discover advanced trading strategies and risk management techniques.',
    image: 'https://i.ibb.co/ynd8cQB2/customtipstoastposition-ezgif-com-optimize-1.gif',
  },
  {
    title: 'Community Features',
    description: 'Connect with other traders, share insights, and track top performers.',
    image: 'https://i.ibb.co/v4YX0JJ7/newchartindicators-ezgif-com-optimize.gif',
  },
];

export default function HowToPlayPopup({ isOpen, onClose, triggerRef }: HowToPlayPopupProps) {
  const signatureColor = useUIStore((state) => state.signatureColor);

  return (
    <SlideShowPopup
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      slides={slides}
      title="How to Play"
      accentColor={signatureColor}
    />
  );
}
