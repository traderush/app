'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, ArrowUpRight, ArrowDownRight, Wallet, Clock, Maximize, ExternalLink, ArrowUp, ArrowDown, ChevronsUpDown, BarChart3 } from 'lucide-react';
import { useUIStore } from '@/shared/state';
import { PROFILE_AVATAR } from '@/shared/ui/constants/navigation';

// Game Icon Components
const BoxHitIcon = ({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3V2.25H2.25V3H3ZM10.2 3H10.95V2.25H10.2V3ZM10.2 10.2V10.95H10.95V10.2H10.2ZM3 10.2H2.25V10.95H3V10.2ZM13.8 13.8V13.05H13.05V13.8H13.8ZM21 13.8H21.75V13.05H21V13.8ZM21 21V21.75H21.75V21H21ZM13.8 21H13.05V21.75H13.8V21ZM3 16.5L2.73666 15.7978C2.42924 15.913 2.23254 16.2149 2.25121 16.5426C2.26988 16.8704 2.49958 17.148 2.8181 17.2276L3 16.5ZM10.2 13.8L10.9022 14.0633C11.0055 13.788 10.9383 13.4776 10.7303 13.2697C10.5224 13.0617 10.212 12.9945 9.93666 13.0978L10.2 13.8ZM7.5 21L6.77239 21.1819C6.85202 21.5004 7.12956 21.7301 7.45735 21.7488C7.78514 21.7675 8.08697 21.5708 8.20225 21.2633L7.5 21ZM6.6 17.4L7.32761 17.2181C7.26043 16.9494 7.05062 16.7396 6.7819 16.6724L6.6 17.4ZM13.8 3V2.25H13.05V3H13.8ZM21 3H21.75V2.25H21V3ZM21 10.2V10.95H21.75V10.2H21ZM13.8 10.2H13.05V10.95H13.8V10.2ZM3 3V3.75H10.2V3V2.25H3V3ZM10.2 3H9.45V10.2H10.2H10.95V3H10.2ZM10.2 10.2V9.45H3V10.2V10.95H10.2V10.2ZM3 10.2H3.75V3H3H2.25V10.2H3ZM13.8 13.8V14.55H21V13.8V13.05H13.8V13.8ZM21 13.8H20.25V21H21H21.75V13.8H21ZM21 21V20.25H13.8V21V21.75H21V21ZM13.8 21H14.55V13.8H13.8H13.05V21H13.8ZM3 16.5L3.26334 17.2022L10.4633 14.5022L10.2 13.8L9.93666 13.0978L2.73666 15.7978L3 16.5ZM10.2 13.8L9.49775 13.5367L6.79775 20.7367L7.5 21L8.20225 21.2633L10.9022 14.0633L10.2 13.8ZM7.5 21L8.22761 20.8181L7.32761 17.2181L6.6 17.4L5.87239 17.5819L6.77239 21.1819L7.5 21ZM6.6 17.4L6.7819 16.6724L3.1819 15.7724L3 16.5L2.8181 17.2276L6.4181 18.1276L6.6 17.4ZM13.8 3V3.75H21V3V2.25H13.8V3ZM21 3H20.25V10.2H21H21.75V3H21ZM21 10.2V9.45H13.8V10.2V10.95H21V10.2ZM13.8 10.2H14.55V3H13.8H13.05V10.2H13.8Z" fill={color}/>
  </svg>
);

const SketchIcon = ({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.5694 10.4349L11.0378 9.90583C10.9421 10.0019 10.8743 10.1222 10.8416 10.2538L11.5694 10.4349ZM10.561 14.4866L9.83321 14.3055C9.76959 14.5612 9.84477 14.8315 10.0313 15.0175C10.2177 15.2036 10.4882 15.2782 10.7437 15.2141L10.561 14.4866ZM14.5944 13.4737L14.7771 14.2011C14.9092 14.1679 15.0298 14.0994 15.1259 14.0028L14.5944 13.4737ZM16.6105 5.37028L16.0791 4.84103L16.0789 4.84119L16.6105 5.37028ZM20.5385 5.26407L20.007 5.79319L20.007 5.7932L20.5385 5.26407ZM20.5385 7.50235L21.0699 8.0316L21.0701 8.03148L20.5385 7.50235ZM19.7417 4.46356L20.2732 3.93444L20.2732 3.93444L19.7417 4.46356ZM17.5135 4.46356L18.0449 4.99281L18.0451 4.99269L17.5135 4.46356ZM2.46847 19.4709C2.17624 19.7644 2.17732 20.2393 2.47088 20.5315C2.76443 20.8238 3.23931 20.8227 3.53153 20.5291L3 20L2.46847 19.4709ZM5.59064 17.3976L6.12217 16.8684C5.98143 16.7271 5.79014 16.6476 5.59064 16.6476C5.39114 16.6476 5.19986 16.7271 5.05911 16.8684L5.59064 17.3976ZM7.14503 18.959L6.61349 19.4882C6.75424 19.6295 6.94552 19.709 7.14503 19.709C7.34453 19.709 7.53581 19.6295 7.67656 19.4882L7.14503 18.959ZM9.74907 17.4062C10.0413 17.1126 10.0402 16.6378 9.74666 16.3455C9.45311 16.0533 8.97823 16.0544 8.68601 16.348L9.21754 16.8771L9.74907 17.4062ZM11.5694 10.4349L10.8416 10.2538L9.83321 14.3055L10.561 14.4866L11.2888 14.6678L12.2972 10.6161L11.5694 10.4349ZM10.561 14.4866L10.7437 15.2141L14.7771 14.2011L14.5944 13.4737L14.4117 12.7463L10.3783 13.7592L10.561 14.4866ZM14.5944 13.4737L15.1259 12.9446L12.1009 9.9058L11.5694 10.4349L11.0378 10.9641L14.0628 14.0028L14.5944 13.4737ZM16.6105 5.37028L16.0789 5.89941L19.104 8.9382L19.6355 8.40907L20.167 7.87995L17.142 4.84116L16.6105 5.37028ZM19.6355 8.40907L19.1039 7.87998L14.0628 12.9446L14.5944 13.4737L15.1259 14.0028L20.1671 8.93817L19.6355 8.40907ZM11.5694 10.4349L12.1009 10.964L17.142 5.89938L16.6105 5.37028L16.0789 4.84119L11.0378 9.90583L11.5694 10.4349ZM19.7417 4.46356L19.2101 4.99269L20.007 5.79319L20.5385 5.26407L21.0701 4.73495L20.2732 3.93444L19.7417 4.46356ZM20.5385 7.50235L20.0071 6.9731L19.1041 7.87982L19.6355 8.40907L20.1669 8.93832L21.0699 8.0316L20.5385 7.50235ZM16.6105 5.37028L17.1419 5.89953L18.0449 4.99281L17.5135 4.46356L16.9821 3.93431L16.0791 4.84103L16.6105 5.37028ZM20.5385 5.26407L20.007 5.7932C20.331 6.11866 20.331 6.64776 20.007 6.97323L20.5385 7.50235L21.0701 8.03148C21.9766 7.12078 21.9766 5.64565 21.0701 4.73495L20.5385 5.26407ZM19.7417 4.46356L20.2732 3.93444C19.3647 3.02185 17.8904 3.02185 16.982 3.93444L17.5135 4.46356L18.0451 4.99269C18.3672 4.6691 18.888 4.6691 19.2101 4.99269L19.7417 4.46356ZM3 20L3.53153 20.5291L6.12217 17.9267L5.59064 17.3976L5.05911 16.8684L2.46847 19.4709L3 20ZM5.59064 17.3976L5.05911 17.9267L6.61349 19.4882L7.14503 18.959L7.67656 18.4299L6.12217 16.8684L5.59064 17.3976ZM7.14503 18.959L7.67656 19.4882L9.74907 17.4062L9.21754 16.8771L8.68601 16.348L6.61349 18.4299L7.14503 18.959Z" fill={color}/>
  </svg>
);

const AheadIcon = ({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 9H10.5V13.5H6V9Z" fill={color}/>
    <path d="M3 16.5H7.5V21H3V16.5Z" stroke={color} strokeWidth="1.5"/>
    <path d="M6 9H10.5V13.5H6V9Z" stroke={color} strokeWidth="1.5"/>
    <path d="M13.5 10.5H18V15H13.5V10.5Z" stroke={color} strokeWidth="1.5"/>
    <path d="M16.5 3H21V7.5H16.5V3Z" stroke={color} strokeWidth="1.5"/>
  </svg>
);

const TowersIcon = ({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 3H3V12H8V3ZM8 3H12M8 3V8H12V3M12 3H16M12 3V9H16V3M16 3H21V8H16V3ZM16 21H21L21 12H16V21ZM16 21H12M16 21L16 16H12V21M12 21H8M12 21L12 15H8L8 21M8 21H3L3 16H8L8 21Z" stroke={color} strokeWidth="1.5"/>
  </svg>
);

const formatCurrency = (num: number): string => {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

// Mock deposit activity data
const depositActivity = [
  { type: 'deposit', amount: 500, time: '2h ago', status: 'completed' },
  { type: 'withdraw', amount: 250, time: '5h ago', status: 'completed' },
  { type: 'withdraw', amount: 150, time: '8h ago', status: 'completed' },
  { type: 'deposit', amount: 1000, time: '1d ago', status: 'completed' },
  { type: 'deposit', amount: 750, time: '2d ago', status: 'completed' },
];

// Mock live bet data
const liveBets = [
  { result: 'Win', gameName: 'Box Hit', tradeAmount: '$250', targetPrice: '$65,420', age: '2s ago' },
  { result: 'Win', gameName: 'Box Hit', tradeAmount: '$150', targetPrice: '$65,380', age: '5s ago' },
  { result: 'Loss', gameName: 'Box Hit', tradeAmount: '$100', targetPrice: '$65,400', age: '8s ago' },
  { result: 'Win', gameName: 'Sketch', tradeAmount: '$300', targetPrice: '$65,450', age: '12s ago' },
  { result: 'Loss', gameName: 'Box Hit', tradeAmount: '$200', targetPrice: '$65,390', age: '15s ago' },
  { result: 'Win', gameName: 'Box Hit', tradeAmount: '$180', targetPrice: '$65,410', age: '18s ago' },
];

const games = [
  { name: 'Box Hit', href: '/box-hit', available: true, icon: BoxHitIcon, color: '#8b5cf6' },
  { name: 'Sketch', href: '/sketch', available: true, icon: SketchIcon, color: '#ec4899' },
  { name: 'Towers', href: '/towers', available: true, icon: TowersIcon, color: '#f59e0b' },
  { name: 'Ahead', href: '/ahead', available: true, icon: AheadIcon, color: '#10b981' },
];

export default function Home() {
  const signatureColor = useUIStore((state) => state.signatureColor);
  const tradingPositiveColor = useUIStore((state) => state.tradingPositiveColor);
  const tradingNegativeColor = useUIStore((state) => state.tradingNegativeColor);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedAccount, setSelectedAccount] = useState<'demo' | 'trading'>('demo');

  // Mock data
  const totalBalance = 12450.33;

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <div className="h-full relative flex text-white gap-3">
      {/* Left side with games panel and live bets */}
      <div className="flex flex-1 flex-col gap-3 p-0.5 ml-3">
        {/* Games Panel */}
        <div className="rounded-md border border-zinc-800 p-4" style={{ backgroundColor: '#0D0D0D' }}>
          <div className="grid grid-cols-2 gap-3">
              {games.map((game) => {
                const IconComponent = game.icon;
                return (
                  <Link
                    key={game.name}
                    href={game.available ? game.href : '#'}
                    className={`relative rounded-lg border overflow-hidden transition-all ${
                      game.available
                        ? 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/70 hover:border-zinc-700 cursor-pointer'
                        : 'border-zinc-800/50 bg-zinc-900/30 opacity-50 cursor-not-allowed'
                    }`}
                    onClick={(e) => !game.available && e.preventDefault()}
                  >
                    <div className="p-6 flex flex-col items-center justify-center min-h-[160px]">
                      <div 
                        className="w-16 h-16 rounded-lg flex items-center justify-center mb-4"
                        style={{ 
                          backgroundColor: game.available ? `${game.color}20` : 'rgba(63, 63, 70, 0.3)'
                        }}
                      >
                        <IconComponent 
                          size={32} 
                          color={game.available ? game.color : '#52525b'}
                        />
                      </div>
                      <div className="text-base font-semibold text-zinc-100 text-center">{game.name}</div>
                      {!game.available && (
                        <div className="text-xs text-zinc-500 text-center mt-2">Coming soon</div>
                      )}
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>

        {/* Live Bets Panel */}
        <div className="rounded-md border border-zinc-800 flex-1 flex flex-col min-h-0" style={{ backgroundColor: '#0D0D0D' }}>
          <div className="p-4 pb-2 flex-shrink-0">
            <h3 className="text-sm font-medium text-zinc-100">Live Bets</h3>
          </div>
          <div 
            className="flex-1 overflow-y-auto [&::-webkit-scrollbar-thumb]:bg-zinc-800/50 [&::-webkit-scrollbar-thumb]:hover:bg-zinc-800/50 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(39, 39, 42, 0.5) transparent'
            }}
          >
            <table className="w-full text-sm">
              <thead 
                className="sticky top-0 z-10" 
                style={{ 
                  backgroundColor: '#0D0D0D',
                  boxShadow: '0 1px 0 0 rgba(39, 39, 42, 0.5)'
                }}
              >
                <tr>
                  <th 
                    className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                    onClick={() => handleSort('result')}
                  >
                    <div className="flex items-center gap-1">
                      Result
                      {sortBy === 'result' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                    onClick={() => handleSort('gameName')}
                  >
                    <div className="flex items-center gap-1">
                      Game Name
                      {sortBy === 'gameName' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                    onClick={() => handleSort('tradeAmount')}
                  >
                    <div className="flex items-center gap-1">
                      Trade Amount
                      {sortBy === 'tradeAmount' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                    onClick={() => handleSort('targetPrice')}
                  >
                    <div className="flex items-center gap-1">
                      Target Price
                      {sortBy === 'targetPrice' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                    onClick={() => handleSort('age')}
                  >
                    <div className="flex items-center gap-1">
                      Age
                      {sortBy === 'age' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-normal text-zinc-400">
                    Explorer
                  </th>
                </tr>
              </thead>
              <tbody className="text-xs font-normal text-zinc-200">
                {liveBets.map((bet, index) => (
                  <tr
                    key={index}
                    className={`border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors ${
                      index % 2 === 0 && 'bg-zinc-950/30'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span 
                        className="text-xs font-medium"
                        style={{
                          color: bet.result === 'Win' ? tradingPositiveColor : tradingNegativeColor
                        }}
                      >
                        {bet.result}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-100">{bet.gameName}</td>
                    <td className="px-4 py-3">{bet.tradeAmount}</td>
                    <td className="px-4 py-3 text-zinc-300">{bet.targetPrice}</td>
                    <td className="px-4 py-3 text-zinc-400">{bet.age}</td>
                    <td className="px-4 py-3">
                      <button className="text-zinc-400 hover:text-white transition-colors">
                        <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Right side: Accounts and panels */}
      <div className="flex flex-col gap-3 h-full">
        <div className="flex w-[400px] flex-col gap-3 flex-1 min-h-0">
          {/* Accounts Panel */}
          <div className="rounded-md border border-zinc-800 p-4 flex-shrink-0" style={{ backgroundColor: '#0D0D0D' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-zinc-100">Accounts</h3>
              <button className="p-1.5 rounded-md transition-colors" style={{ backgroundColor: '#171717' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1f1f1f'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#171717'}>
                <Plus size={16} className="text-zinc-300" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Demo Account */}
              <button
                onClick={() => setSelectedAccount('demo')}
                className={`rounded-lg p-3 text-left transition-all border ${
                  selectedAccount === 'demo' ? 'border-zinc-800' : 'border-transparent hover:border-zinc-800/50'
                }`}
                style={{ 
                  backgroundColor: selectedAccount === 'demo' ? '#171717' : '#0D0D0D'
                }}
                onMouseEnter={(e) => {
                  if (selectedAccount !== 'demo') {
                    e.currentTarget.style.backgroundColor = '#131313';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedAccount !== 'demo') {
                    e.currentTarget.style.backgroundColor = '#0D0D0D';
                  }
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative w-8 h-8 rounded-md overflow-hidden">
                    <Image
                      src={PROFILE_AVATAR}
                      alt="Demo account"
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                </div>
                <div className="text-xs font-medium text-zinc-100">Demo</div>
                <div className="text-xs text-zinc-500">Trial account</div>
              </button>
              
              {/* Trading Account */}
              <button
                onClick={() => setSelectedAccount('trading')}
                className={`rounded-lg p-3 text-left transition-all border ${
                  selectedAccount === 'trading' ? 'border-zinc-800' : 'border-transparent hover:border-zinc-800/50'
                }`}
                style={{ 
                  backgroundColor: selectedAccount === 'trading' ? '#171717' : '#0D0D0D'
                }}
                onMouseEnter={(e) => {
                  if (selectedAccount !== 'trading') {
                    e.currentTarget.style.backgroundColor = '#131313';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedAccount !== 'trading') {
                    e.currentTarget.style.backgroundColor = '#0D0D0D';
                  }
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative w-8 h-8 rounded-md overflow-hidden">
                    <Image
                      src={PROFILE_AVATAR}
                      alt="Trading account"
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                </div>
                <div className="text-xs font-medium text-zinc-100">Trading</div>
                <div className="text-xs text-zinc-500">17 members</div>
              </button>
            </div>
          </div>
          
          {/* Wallet/Deposit Activity Panel */}
          <div className="rounded-md border border-zinc-800 p-4 flex flex-col" style={{ 
            backgroundColor: '#0D0D0D'
          }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-3xl font-semibold text-zinc-100 mb-1">{formatCurrency(totalBalance)}</div>
                <div className="text-xs text-zinc-500">Total Balance</div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 transition-colors" title="Withdraw">
                  <ArrowDownRight size={16} className="text-zinc-300" />
                </button>
                <button className="p-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 transition-colors" title="Deposit">
                  <Plus size={16} className="text-zinc-300" />
                </button>
              </div>
            </div>
            
            {/* Deposit Activity */}
            <div className="overflow-hidden flex flex-col -mx-4 -mb-4">
              <div className="text-xs text-zinc-400 mb-2 px-4 font-medium">Recent Activity</div>
              <div className="overflow-y-auto max-h-64">
                {depositActivity.map((activity, index) => {
                  const isDeposit = activity.type === 'deposit';
                  const color = isDeposit ? tradingPositiveColor : tradingNegativeColor;
                  
                  return (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between py-2 px-4 text-xs w-full border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors ${
                        index % 2 === 0 && 'bg-zinc-950/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                          {isDeposit ? (
                            <ArrowDownRight size={12} style={{ color, transform: 'rotate(180deg)' }} />
                          ) : (
                            <ArrowUpRight size={12} style={{ color }} />
                          )}
                        </div>
                        <div>
                          <span 
                            className="text-xs font-medium capitalize"
                            style={{
                              color: color
                            }}
                          >
                            {activity.type}
                          </span>
                          <div className="text-xs text-zinc-500 flex items-center gap-1">
                            <Clock size={10} />
                            {activity.time}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium" style={{ color }}>
                          {isDeposit ? '+' : '-'}{formatCurrency(activity.amount)}
                        </div>
                        <div className="text-xs text-zinc-500 capitalize">{activity.status}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* ETH/USDT Trading Card */}
          <div className="rounded-md border border-zinc-800 pb-4 px-4 pt-28 flex-shrink-0 relative overflow-hidden min-h-[250px]" style={{ backgroundColor: '#0D0D0D' }}>
            {/* Price Chart - Full width background, positioned lower */}
            <div className="absolute left-0 right-0 bottom-0 top-1/2 pointer-events-none overflow-visible">
              <svg width="100%" height="100%" viewBox="0 -5 200 90" preserveAspectRatio="none" className="absolute inset-0" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={tradingNegativeColor} stopOpacity="0.15" />
                    <stop offset="100%" stopColor={tradingNegativeColor} stopOpacity="0" />
                  </linearGradient>
                  <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                {/* Area fill - smooth varied downward trending */}
                <path
                  d="M 0,25 Q 15,29 30,23 T 60,27 T 90,15 T 120,21 T 150,13 T 180,19 T 200,23 L 200,85 L 0,85 Z"
                  fill="url(#chartGradient)"
                />
                {/* Line - smooth varied downward trend with glow */}
                <path
                  d="M 0,25 Q 15,29 30,23 T 60,27 T 90,15 T 120,21 T 150,13 T 180,19 T 200,23"
                  fill="none"
                  stroke={tradingNegativeColor}
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.7"
                  filter="url(#glow)"
                />
              </svg>
            </div>
            
            {/* Content - At the top of the panel */}
            <div className="absolute top-0 left-4 right-4 pt-6 z-10">
              <div className="flex items-start justify-between mb-3">
                {/* Crypto Logos */}
                <div className="relative">
                  {/* ETH Logo */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#627EEA' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white"/>
                      <path d="M2 17L12 22L22 17V12L12 17L2 12V17Z" fill="white"/>
                      <path d="M2 12L12 17L22 12V7L12 12L2 7V12Z" fill="white"/>
                    </svg>
                  </div>
                  {/* USDT Logo - Overlapping */}
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2" style={{ backgroundColor: '#26A17B', borderColor: '#0D0D0D' }}>
                    <span className="text-white text-xs font-bold">T</span>
                  </div>
                </div>
                
                {/* Chart Icon */}
                <button className="p-1.5 rounded bg-zinc-900/50 hover:bg-zinc-800 transition-colors">
                  <BarChart3 size={14} className="text-zinc-300" />
                </button>
              </div>
              
              {/* Trading Pair Info */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-zinc-100">Ethereum</h3>
                  <span className="text-sm text-zinc-400">USDT</span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium leading-none"
                    style={{ 
                      backgroundColor: `${tradingNegativeColor}20`,
                      color: tradingNegativeColor
                    }}
                  >
                    <svg width="5" height="4" viewBox="0 0 6 5" fill="none" className="shrink-0">
                      <path d="M3 5L0 0H6L3 5Z" fill="currentColor" />
                    </svg>
                    <span>-17.33%</span>
                  </div>
                  <span 
                    className="text-[11px] font-medium leading-none"
                    style={{ color: tradingNegativeColor }}
                  >
                    Lowest
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
