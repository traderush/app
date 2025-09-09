export default function Page() {
  return (
    <div className="p-8 h-[calc(100vh-6rem)] overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-100 mb-4">Styles for Dev</h1>
          <p className="text-lg text-zinc-400">Typography, Colors & Component Showcase - TradeRush Web App</p>
        </div>

        {/* Font Weights */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-100 border-b border-zinc-800 pb-2">Font Weights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <span className="text-sm text-zinc-500">Font Weight 300 (Light)</span>
                <div className="text-2xl font-light text-zinc-100">Light Weight Text</div>
              </div>
              <div>
                <span className="text-sm text-zinc-500">Font Weight 400 (Regular)</span>
                <div className="text-2xl font-normal text-zinc-100">Regular Weight Text</div>
              </div>
              <div>
                <span className="text-sm text-zinc-500">Font Weight 500 (Medium)</span>
                <div className="text-2xl font-medium text-zinc-100">Medium Weight Text</div>
              </div>
              <div>
                <span className="text-sm text-zinc-500">Font Weight 600 (Semi-bold)</span>
                <div className="text-2xl font-semibold text-zinc-100">Semi-bold Weight Text</div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-zinc-500">Font Weight 700 (Bold)</span>
                <div className="text-2xl font-bold text-zinc-100">Bold Weight Text</div>
              </div>
              <div>
                <span className="text-sm text-zinc-500">Font Weight 800 (Extra Bold)</span>
                <div className="text-2xl" style={{fontWeight: 800}}>Extra Bold Weight Text</div>
              </div>
              <div>
                <span className="text-sm text-zinc-500">Font Weight 900 (Black)</span>
                <div className="text-2xl" style={{fontWeight: 900}}>Black Weight Text</div>
              </div>
            </div>
          </div>
        </section>

        {/* Thin Font Variations */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-100 border-b border-zinc-800 pb-2">Thin Font Variations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <span className="text-sm text-zinc-500">Ultra Light (100) - Available</span>
                <div className="text-2xl" style={{fontWeight: 100}}>Ultra Light Weight Text</div>
              </div>
              <div>
                <span className="text-sm text-zinc-500">Extra Light (200) - Available</span>
                <div className="text-2xl" style={{fontWeight: 200}}>Extra Light Weight Text</div>
              </div>
              <div>
                <span className="text-sm text-zinc-500">Light (300) - Available</span>
                <div className="text-2xl font-light text-zinc-100">Light Weight Text</div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-zinc-500">Thin Variations Comparison</span>
                <div className="space-y-2">
                  <div className="text-lg" style={{fontWeight: 100}}>Ultra Light (100) - Ultra thin text</div>
                  <div className="text-lg" style={{fontWeight: 200}}>Extra Light (200) - Very thin text</div>
                  <div className="text-lg font-light text-zinc-300">Light (300) - Body text alternative</div>
                  <div className="text-lg font-normal text-zinc-300">Regular (400) - Standard body text</div>
                  <div className="text-lg font-medium text-zinc-300">Medium (500) - Emphasized text</div>
                </div>
              </div>
              <div>
                <span className="text-sm text-zinc-500">Usage Examples</span>
                <div className="space-y-2">
                  <div className="text-sm" style={{fontWeight: 100}}>Ultra Light: Ultra subtle elements</div>
                  <div className="text-sm" style={{fontWeight: 200}}>Extra Light: Very subtle labels</div>
                  <div className="text-sm font-light text-zinc-400">Light: Subtle labels and captions</div>
                  <div className="text-sm font-normal text-zinc-400">Regular: Standard interface text</div>
                  <div className="text-sm font-medium text-zinc-400">Medium: Interactive elements</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Font Sizes */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-100 border-b border-zinc-800 pb-2">Font Sizes</h2>
          <div className="space-y-4">
            <div>
              <span className="text-sm text-zinc-500">text-xs (12px) - Footer Stats</span>
              <div className="text-xs text-zinc-400">Players Online: 1,247 • Volatility Index: +12.4% • BTC: $108.2K</div>
            </div>
            <div>
              <span className="text-sm text-zinc-500">text-[10px] (10px) - Notification Badge</span>
              <div className="text-[10px] text-zinc-400 bg-orange-500 text-[#0E0E0E] px-2 py-1 rounded inline-block">12</div>
            </div>
            <div>
              <span className="text-sm text-zinc-500">text-[8px] (8px) - Sidebar Placeholder</span>
              <div className="text-[8px] text-zinc-500">No Active<br/>Positions</div>
            </div>
            <div>
              <span className="text-sm text-zinc-500">text-sm (14px) - Button Text & Body</span>
              <div className="text-sm text-zinc-300">This is standard body text used throughout the app</div>
            </div>
            <div>
              <span className="text-sm text-zinc-500">text-[15px] (15px) - Navbar Menu Items</span>
              <div className="text-[15px] font-medium text-zinc-300">Portfolio • Leaderboard • Refer & Earn</div>
            </div>
            <div>
              <span className="text-sm text-zinc-500">text-lg (18px) - Popup Headers</span>
              <div className="text-lg font-semibold text-zinc-100">Profile • Settings • Deposit • Notifications</div>
            </div>
            <div>
              <span className="text-sm text-zinc-500">text-2xl (24px) - Balance/PnL Values</span>
              <div className="text-2xl font-semibold text-zinc-100">0</div>
              <div className="text-2xl font-semibold" style={{color: '#04DF72'}}>+0</div>
            </div>
            <div>
              <span className="text-sm text-zinc-500">text-4xl (36px) - Page Headers</span>
              <div className="text-4xl font-bold text-zinc-100">Large Page Title</div>
            </div>
          </div>
        </section>

        {/* Color System */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-100 border-b border-zinc-800 pb-2">Color System</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <span className="text-sm text-zinc-500">Primary Colors</span>
                <div className="space-y-2">
                  <div className="text-lg text-white">text-white - Main headings</div>
                  <div className="text-lg text-zinc-100">text-zinc-100 - Primary content</div>
                  <div className="text-lg text-zinc-300">text-zinc-300 - Secondary content</div>
                  <div className="text-lg text-zinc-400">text-zinc-400 - Labels & tertiary</div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-zinc-500">Special Colors</span>
                <div className="space-y-2">
                  <div className="text-lg" style={{color: '#04DF72'}}>text-green-500 - Positive values</div>
                  <div className="text-lg text-red-400">text-red-400 - Negative/Logout</div>
                  <div className="text-lg text-orange-500">text-orange-500 - Bitcoin price</div>
                  <div className="text-lg text-blue-500">text-blue-500 - Ethereum price</div>
                  <div className="text-lg" style={{color: '#FA5616'}}>text-[#FA5616] - Brand color</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Component Examples */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-100 border-b border-zinc-800 pb-2">Component Examples</h2>
          
          {/* Navbar Style */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
            <span className="text-sm text-zinc-500 mb-3 block">Navbar Style</span>
            <div className="flex items-center gap-6">
              <div className="text-[15px] font-medium text-zinc-300">Box Hit</div>
              <div className="text-[15px] font-medium text-white">Towers</div>
              <div className="text-[15px] font-medium text-zinc-300">Sketch</div>
              <div className="text-[15px] font-medium text-zinc-300">Ahead</div>
            </div>
          </div>

          {/* Button Style */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
            <span className="text-sm text-zinc-500 mb-3 block">Button Style</span>
            <button className="px-4 py-2 bg-[#FA5616] hover:bg-[#FA5616]/90 text-[#0E0E0E] text-sm font-medium rounded transition-colors">
              Deposit
            </button>
          </div>

          {/* Popup Header Style */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
            <span className="text-sm text-zinc-500 mb-3 block">Popup Header Style</span>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-100">Profile</h2>
              <button className="grid place-items-center w-8 h-8 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
                ×
              </button>
            </div>
          </div>

          {/* Footer Style */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
            <span className="text-sm text-zinc-500 mb-3 block">Footer Style</span>
            <div className="flex items-center gap-4 text-xs text-zinc-400">
              <span>Players Online: 1,247</span>
              <span>Volatility Index: <span style={{color: '#04DF72'}}>+12.4%</span></span>
              <span>BTC: <span className="text-orange-500">$108.2K</span></span>
              <span>ETH: <span className="text-blue-500">$4385</span></span>
            </div>
          </div>

          {/* Sidebar Style */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
            <span className="text-sm text-zinc-500 mb-3 block">Sidebar Style</span>
            <div className="flex flex-col gap-3">
              <div className="text-zinc-300 hover:text-zinc-100 transition-colors">How to Play</div>
              <div className="text-zinc-300 hover:text-zinc-100 transition-colors">News & Updates</div>
              <div className="text-zinc-300 hover:text-zinc-100 transition-colors">Rewards</div>
              <div className="text-[8px] text-zinc-500">No Active<br/>Positions</div>
            </div>
          </div>
        </section>

        {/* Responsive Typography */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-100 border-b border-zinc-800 pb-2">Responsive Typography (PnL Tracker)</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
            <span className="text-sm text-zinc-500 mb-3 block">Dynamic Scaling Based on Container Width</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <span className="text-sm text-zinc-500 mb-2 block">Small Container (200px)</span>
                <div className="bg-zinc-800 rounded p-3" style={{width: '200px', margin: '0 auto'}}>
                  <div className="text-lg font-semibold text-white">0</div>
                  <div className="text-sm text-zinc-400">Balance</div>
                </div>
              </div>
              <div className="text-center">
                <span className="text-sm text-zinc-500 mb-2 block">Medium Container (320px)</span>
                <div className="bg-zinc-800 rounded p-3" style={{width: '320px', margin: '0 auto'}}>
                  <div className="text-2xl font-semibold text-white">0</div>
                  <div className="text-sm text-zinc-400">Balance</div>
                </div>
              </div>
              <div className="text-center">
                <span className="text-sm text-zinc-500 mb-2 block">Large Container (500px)</span>
                <div className="bg-zinc-800 rounded p-3" style={{width: '500px', margin: '0 auto'}}>
                  <div className="text-3xl font-semibold text-white">0</div>
                  <div className="text-base text-zinc-400">Balance</div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
