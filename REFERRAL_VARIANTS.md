# Referral Link Display Variants

## Option 1: Icon-only button with tooltip
```tsx
{/* Icon-only with tooltip */}
<button 
  onClick={handleCopyRefcode}
  className="relative grid place-items-center w-8 h-8 text-zinc-300 hover:text-white transition-colors cursor-pointer group"
  title={`Referral: ${refcode} - Click to copy`}
>
  <UserPlus size={18} />
  {/* Tooltip on hover */}
  <div className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs bg-zinc-800 text-zinc-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
    {refcode}
  </div>
</button>
```

## Option 2: Compact badge with inline copy
```tsx
{/* Compact badge */}
<div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-800 bg-surface-900 hover:bg-surface-850 transition-colors group">
  <span className="text-xs text-zinc-400">{refcode}</span>
  <button 
    onClick={handleCopyRefcode}
    className="opacity-0 group-hover:opacity-100 transition-opacity"
    title="Copy"
  >
    <Copy size={12} className="text-zinc-400 hover:text-white" />
  </button>
</div>
```

## Option 3: Text link style
```tsx
{/* Text link that opens popover */}
<button 
  onClick={() => setIsRefPopoverOpen(!isRefPopoverOpen)}
  className="text-xs text-zinc-400 hover:text-white transition-colors relative"
>
  Refer
  {isRefPopoverOpen && (
    <div className="absolute bottom-full right-0 mb-2 w-64 p-3 rounded-md border border-zinc-800 bg-surface-850 shadow-xl">
      <div className="text-xs text-zinc-400 mb-2">Your referral code</div>
      <div className="flex items-center gap-2 mb-2">
        <code className="text-sm text-white font-mono">{refcode}</code>
        <button onClick={handleCopyRefcode}>
          <Copy size={14} className="text-zinc-400 hover:text-white" />
        </button>
      </div>
      <div className="text-xs text-zinc-500">Share this code with friends</div>
    </div>
  )}
</button>
```

## Option 4: Dropdown/popover trigger
```tsx
{/* Dropdown trigger */}
<div className="relative">
  <button 
    onClick={() => setIsRefDropdownOpen(!isRefDropdownOpen)}
    className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
  >
    <UserPlus size={14} />
    <span>Refer</span>
    <ChevronDown size={12} className={isRefDropdownOpen ? 'rotate-180' : ''} />
  </button>
  {isRefDropdownOpen && (
    <div className="absolute bottom-full right-0 mb-2 w-72 p-4 rounded-md border border-zinc-800 bg-surface-850 shadow-xl">
      <div className="text-xs font-medium text-zinc-300 mb-3">Referral Program</div>
      <div className="flex items-center gap-2 mb-3 p-2 rounded bg-surface-900">
        <code className="text-sm text-white font-mono flex-1">{refcode}</code>
        <button 
          onClick={handleCopyRefcode}
          className="px-2 py-1 rounded bg-surface-800 hover:bg-surface-700 text-xs text-zinc-300"
        >
          Copy
        </button>
      </div>
      <div className="text-xs text-zinc-500">Earn rewards when friends sign up</div>
    </div>
  )}
</div>
```

## Option 5: Minimalist text with copy icon
```tsx
{/* Minimalist text + icon */}
<div className="flex items-center gap-1.5 text-xs text-zinc-400">
  <span>{refcode}</span>
  <button 
    onClick={handleCopyRefcode}
    className="text-zinc-500 hover:text-white transition-colors"
    title="Copy referral code"
  >
    <Copy size={12} />
  </button>
</div>
```

