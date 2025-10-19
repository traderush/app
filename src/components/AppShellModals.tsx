'use client';

import React from 'react';
import CustomSlider from './CustomSlider';
import { useUIStore, type WatchedPlayer } from '@/stores';
import type { PnLCustomization } from '@/stores/uiStore';

const LazyDepositPopup = React.lazy(() => import('./DepositPopup'));
const LazyNotificationsModal = React.lazy(() => import('./NotificationsModal'));
const LazySettingsPopup = React.lazy(() => import('./SettingsPopup'));
const LazyHowToPlayPopup = React.lazy(() => import('./HowToPlayPopup'));
const LazyNewsUpdatesPopup = React.lazy(() => import('./NewsUpdatesPopup'));
const LazyRewardsPopup = React.lazy(() => import('./RewardsPopup'));
const LazyPnLTrackerPopup = React.lazy(() => import('./PnLTrackerPopup'));
const LazyCustomizePopup = React.lazy(() => import('./CustomizePopup'));
const LazyWatchlistPopup = React.lazy(() => import('./WatchlistPopup'));
const LazyPlayerTrackerPopup = React.lazy(() => import('./PlayerTrackerPopup'));

const MODAL_FALLBACK = <div className="fixed inset-0 bg-black/60 z-[1000]" />;

type ModalController = {
  isOpen: boolean;
  open: (data?: unknown) => void;
  close: () => void;
  data?: unknown;
};

type ModalKey =
  | 'deposit'
  | 'notifications'
  | 'settings'
  | 'howToPlay'
  | 'newsUpdates'
  | 'rewards'
  | 'pnLTracker'
  | 'customize'
  | 'watchlist'
  | 'pnLCustomize';

interface AppShellModalsProps {
  signatureColor: string;
  modalRefs: {
    notificationsButtonRef: React.RefObject<HTMLButtonElement | null>;
    settingsButtonRef: React.RefObject<HTMLButtonElement | null>;
    howToPlayButtonRef: React.RefObject<HTMLButtonElement | null>;
    newsUpdatesButtonRef: React.RefObject<HTMLButtonElement | null>;
    rewardsButtonRef: React.RefObject<HTMLButtonElement | null>;
    customizeButtonRef: React.RefObject<HTMLButtonElement | null>;
  };
  modals: Record<ModalKey, ModalController>;
  watchedPlayers: WatchedPlayer[];
  onUpdateWatchedPlayers: React.Dispatch<React.SetStateAction<WatchedPlayer[]>>;
  isPlayerTrackerOpen: boolean;
  selectedPlayer: WatchedPlayer | null;
  onClosePlayerTracker: () => void;
}

interface PnLCustomizationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  signatureColor: string;
  customization: PnLCustomization;
  onChange: (updates: Partial<PnLCustomization>) => void;
  onReset: () => void;
}

const PnLCustomizationOverlay: React.FC<PnLCustomizationOverlayProps> = ({
  isOpen,
  onClose,
  signatureColor,
  customization,
  onChange,
  onReset,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 opacity-60 transition-all duration-300 ease-out z-[1000]" onClick={onClose} />

      <div className="fixed inset-0 z-[1001] flex items-center justify-center pointer-events-none">
        <div
          className="w-80 border border-zinc-800 rounded shadow-2xl pointer-events-auto transition-all duration-300 ease-out opacity-100 scale-100"
          style={{ backgroundColor: '#0E0E0E' }}
        >
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <h2 className="text-zinc-100 text-sm font-medium">Customize PnL Card</h2>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>

          <div className="space-y-3 p-3">
            <div className="space-y-2 rounded border border-zinc-700/50 p-2">
              <span className="text-xs text-zinc-200">Background Image URL</span>
              <input
                type="text"
                value={customization.backgroundImage}
                onChange={(event) => onChange({ backgroundImage: event.target.value })}
                placeholder="Enter image URL"
                className="w-full rounded border border-zinc-600 bg-zinc-700/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500"
              />
            </div>

            <div className="space-y-2 rounded border border-zinc-700/50 p-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-200">Background Opacity</span>
                <span className="text-zinc-400">{customization.backgroundOpacity}%</span>
              </div>
              <CustomSlider
                min={0}
                max={100}
                step={1}
                value={customization.backgroundOpacity}
                onChange={(value) => onChange({ backgroundOpacity: value })}
                signatureColor={signatureColor}
              />
            </div>

            <div className="space-y-2 rounded border border-zinc-700/50 p-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-200">Background Blur</span>
                <span className="text-zinc-400">{customization.backgroundBlur}px</span>
              </div>
              <CustomSlider
                min={0}
                max={8}
                step={1}
                value={customization.backgroundBlur}
                onChange={(value) => onChange({ backgroundBlur: value })}
                signatureColor={signatureColor}
              />
            </div>

            <div className="space-y-2 rounded border border-zinc-700/50 p-2">
              <span className="text-xs text-zinc-200">Text Colors</span>

              <label className="flex items-center justify-between p-1 text-xs text-zinc-200">
                <span>Balance</span>
                <input
                  type="color"
                  value={customization.generalTextColor}
                  onChange={(event) => onChange({ generalTextColor: event.target.value })}
                  className="h-8 w-8 cursor-pointer rounded border border-zinc-600 bg-zinc-700/50"
                />
              </label>

              <label className="flex items-center justify-between p-1 text-xs text-zinc-200">
                <span>Loss</span>
                <input
                  type="color"
                  value={customization.balanceTextColor}
                  onChange={(event) => onChange({ balanceTextColor: event.target.value })}
                  className="h-8 w-8 cursor-pointer rounded border border-zinc-700/50 bg-zinc-700/50"
                />
              </label>

              <label className="flex items-center justify-between p-1 text-xs text-zinc-200">
                <span>Profit</span>
                <input
                  type="color"
                  value={customization.pnlTextColor}
                  onChange={(event) => onChange({ pnlTextColor: event.target.value })}
                  className="h-8 w-8 cursor-pointer rounded border border-zinc-700/50 bg-zinc-700/50"
                />
              </label>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={onReset}
                className="flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-zinc-300"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                </svg>
                Reset to Default
              </button>
              <button
                onClick={onClose}
                className="rounded px-4 py-2 text-xs font-medium transition-colors"
                style={{ backgroundColor: signatureColor, color: '#09090B' }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

type ModalContext = {
  modalRefs: AppShellModalsProps['modalRefs'];
  modals: AppShellModalsProps['modals'];
  pnLCustomization: PnLCustomization;
  watchedPlayers: WatchedPlayer[];
  onUpdateWatchedPlayers: AppShellModalsProps['onUpdateWatchedPlayers'];
};

type BaseModalProps = { isOpen: boolean; onClose: () => void };

type ModalDefinition = {
  key: ModalKey;
  Component: React.LazyExoticComponent<React.ComponentType<BaseModalProps & Record<string, unknown>>>;
  getProps?: (ctx: ModalContext) => Record<string, unknown>;
};

const MODAL_DEFINITIONS: ModalDefinition[] = [
  { key: 'deposit', Component: LazyDepositPopup },
  {
    key: 'notifications',
    Component: LazyNotificationsModal,
    getProps: (ctx) => ({ triggerRef: ctx.modalRefs.notificationsButtonRef }),
  },
  {
    key: 'settings',
    Component: LazySettingsPopup,
    getProps: (ctx) => ({ triggerRef: ctx.modalRefs.settingsButtonRef }),
  },
  {
    key: 'howToPlay',
    Component: LazyHowToPlayPopup,
    getProps: (ctx) => ({ triggerRef: ctx.modalRefs.howToPlayButtonRef }),
  },
  {
    key: 'newsUpdates',
    Component: LazyNewsUpdatesPopup,
    getProps: (ctx) => ({ triggerRef: ctx.modalRefs.newsUpdatesButtonRef }),
  },
  {
    key: 'rewards',
    Component: LazyRewardsPopup,
    getProps: (ctx) => ({ triggerRef: ctx.modalRefs.rewardsButtonRef }),
  },
  {
    key: 'pnLTracker',
    Component: LazyPnLTrackerPopup,
    getProps: (ctx) => ({
      onCustomizeOpen: ctx.modals.pnLCustomize.open,
      customization: ctx.pnLCustomization,
    }),
  },
  { key: 'customize', Component: LazyCustomizePopup },
  {
    key: 'watchlist',
    Component: LazyWatchlistPopup,
    getProps: (ctx) => ({
      watchedPlayers: ctx.watchedPlayers,
      setWatchedPlayers: ctx.onUpdateWatchedPlayers,
    }),
  },
];

const AppShellModals: React.FC<AppShellModalsProps> = ({
  signatureColor,
  modalRefs,
  modals,
  watchedPlayers,
  onUpdateWatchedPlayers,
  isPlayerTrackerOpen,
  selectedPlayer,
  onClosePlayerTracker,
}) => {
  const pnLCustomization = useUIStore((state) => state.pnLCustomization);
  const updatePnLCustomization = useUIStore((state) => state.updatePnLCustomization);
  const resetPnLCustomization = useUIStore((state) => state.resetPnLCustomization);

  const modalContext: ModalContext = {
    modalRefs,
    modals,
    pnLCustomization,
    watchedPlayers,
    onUpdateWatchedPlayers,
  };

  return (
    <>
      {MODAL_DEFINITIONS.map(({ key, Component, getProps }) => {
        const controller = modals[key];
        const extraProps = getProps?.(modalContext) ?? {};
        return (
          <React.Suspense fallback={MODAL_FALLBACK} key={key}>
            <Component
              isOpen={controller.isOpen}
              onClose={controller.close}
              {...extraProps}
            />
          </React.Suspense>
        );
      })}

      <React.Suspense fallback={MODAL_FALLBACK}>
        <LazyPlayerTrackerPopup
          isOpen={isPlayerTrackerOpen}
          onClose={onClosePlayerTracker}
          player={selectedPlayer}
        />
      </React.Suspense>

      <PnLCustomizationOverlay
        isOpen={modals.pnLCustomize.isOpen}
        onClose={modals.pnLCustomize.close}
        signatureColor={signatureColor}
        customization={pnLCustomization}
        onChange={updatePnLCustomization}
        onReset={resetPnLCustomization}
      />
    </>
  );
};

export default React.memo(AppShellModals);
