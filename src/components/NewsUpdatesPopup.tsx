'use client';

import { useUIStore } from '@/stores';
import SlideShowPopup, { type SlideShowSlide } from './SlideShowPopup';

interface NewsUpdatesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const slides: SlideShowSlide[] = [
  {
    title: 'New Trading Features',
    description: 'Discover the latest trading tools and features added to enhance your trading experience.',
    image: 'https://i.ibb.co/chN47y4X/customwallettrackernotifications-ezgif-com-optimize.gif',
  },
  {
    title: 'Performance Improvements',
    description: 'Experience faster load times and smoother interactions with our latest performance updates.',
    image: 'https://i.ibb.co/ynd8cQB2/customtipstoastposition-ezgif-com-optimize-1.gif',
  },
  {
    title: 'UI/UX Enhancements',
    description: 'Enjoy a more intuitive interface with our redesigned components and improved user experience.',
    image: 'https://i.ibb.co/v4YX0JJ7/newchartindicators-ezgif-com-optimize.gif',
  },
];

export default function NewsUpdatesPopup({ isOpen, onClose, triggerRef }: NewsUpdatesPopupProps) {
  const signatureColor = useUIStore((state) => state.signatureColor);

  return (
    <SlideShowPopup
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      slides={slides}
      title="News & Updates"
      accentColor={signatureColor}
    />
  );
}
