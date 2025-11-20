# Earn Rewards Notice - 5 Variants

## Option 1: Top Banner with Gradient Background
Positioned at the top of the popup with a gradient background using signature color.

```tsx
<div className="text-xs font-medium mb-3 px-2 py-1.5 rounded-md bg-gradient-to-r from-pink-500/20 to-pink-500/10 border border-pink-500/30" style={{ background: `linear-gradient(to right, ${signatureColor}20, ${signatureColor}10)`, borderColor: `${signatureColor}50` }}>
  <span className="bg-gradient-to-r from-pink-500 to-pink-400 bg-clip-text text-transparent" style={{ background: `linear-gradient(to right, ${signatureColor}, ${signatureColor}dd)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
    Earn rewards
  </span>
</div>
```

## Option 2: Bottom Badge with Icon
Positioned at the bottom as a small badge with an icon, using gradient text.

```tsx
<div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-zinc-800">
  <Gift size={12} className="text-pink-500" style={{ color: signatureColor }} />
  <span className="text-xs font-medium bg-gradient-to-r from-pink-500 to-pink-400 bg-clip-text text-transparent" style={{ background: `linear-gradient(to right, ${signatureColor}, ${signatureColor}dd)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
    Earn rewards
  </span>
</div>
```

## Option 3: Inline with Code Bubble
Positioned right after the code bubble, inline with subtle gradient background.

```tsx
<div className="flex items-center gap-2 mb-2">
  {/* ... existing code bubble ... */}
  <div className="text-xs font-medium px-2 py-1 rounded bg-gradient-to-r from-pink-500/15 to-pink-500/5" style={{ background: `linear-gradient(to right, ${signatureColor}25, ${signatureColor}10)` }}>
    <span className="bg-gradient-to-r from-pink-500 to-pink-300 bg-clip-text text-transparent" style={{ background: `linear-gradient(to right, ${signatureColor}, ${signatureColor}cc)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      Earn rewards
    </span>
  </div>
</div>
```

## Option 4: Centered Banner with Border
Centered at the bottom with a gradient border and subtle background.

```tsx
<div className="mt-3 pt-3 border-t border-zinc-800">
  <div className="text-center">
    <div className="inline-block px-3 py-1.5 rounded-md border-2" style={{ borderImage: `linear-gradient(to right, ${signatureColor}, ${signatureColor}80) 1`, backgroundColor: `${signatureColor}08` }}>
      <span className="text-xs font-semibold bg-gradient-to-r from-pink-500 via-pink-400 to-pink-500 bg-clip-text text-transparent" style={{ background: `linear-gradient(to right, ${signatureColor}, ${signatureColor}dd, ${signatureColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Earn rewards
      </span>
    </div>
  </div>
</div>
```

## Option 5: Subtle Underline with Gradient
Simple text at the bottom with a gradient underline effect.

```tsx
<div className="mt-2 pt-2 border-t border-zinc-800">
  <div className="relative inline-block">
    <span className="text-xs font-medium" style={{ color: signatureColor }}>
      Earn rewards
    </span>
    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-pink-500 to-transparent" style={{ background: `linear-gradient(to right, transparent, ${signatureColor}, transparent)` }} />
  </div>
</div>
```

