export default function Page() {
  return (
    <div className="p-8 h-[calc(100vh-6rem)] overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-100 mb-4">User Flows</h1>
          <p className="text-lg text-zinc-400">Complete User Journey Documentation - TradeRush Web App</p>
        </div>

        {/* Navigation Flows */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-100 border-b border-zinc-800 pb-2">Navigation Flows</h2>
          
          {/* Main Navigation */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Main Navigation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Game Navigation</h4>
                <div className="space-y-2 text-sm text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    <span>Box Hit → Active game with grid-based betting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-zinc-600 rounded-full"></span>
                    <span>Soon → Additional modes coming soon</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Menu Navigation</h4>
                <div className="space-y-2 text-sm text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>Portfolio → User portfolio and stats</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>Leaderboard → Rankings and competition</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>Refer & Earn → Referral program</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Footer Navigation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Development Tools</h4>
                <div className="space-y-2 text-sm text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span>Styles for Dev → Design system documentation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span>User Flows → This documentation page</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Social & Support</h4>
                <div className="space-y-2 text-sm text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    <span>Discord → Community support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    <span>Twitter → Updates and announcements</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    <span>Docs → Technical documentation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Game Interaction Flows */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-100 border-b border-zinc-800 pb-2">Game Interaction Flows</h2>
          
          {/* Box Hit Game Flow */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Box Hit Game Flow</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-800 rounded p-4">
                  <h4 className="text-md font-medium text-zinc-300 mb-2">1. Game Entry</h4>
                  <div className="text-sm text-zinc-400 space-y-1">
                    <div>• Navigate to /box-hit</div>
                    <div>• Canvas loads with grid</div>
                    <div>• Real-time price ticker starts</div>
                    <div>• Grid cells populate with multipliers</div>
                  </div>
                </div>
                <div className="bg-zinc-800 rounded p-4">
                  <h4 className="text-md font-medium text-zinc-300 mb-2">2. Betting Flow</h4>
                  <div className="text-sm text-zinc-400 space-y-1">
                    <div>• Click &quot;Place Trade&quot; mode</div>
                    <div>• Set bet amount (10, 50, 100, 250, custom)</div>
                    <div>• Click grid cells to select</div>
                    <div>• Selected cells show orange border</div>
                    <div>• View potential payout</div>
                  </div>
                </div>
                <div className="bg-zinc-800 rounded p-4">
                  <h4 className="text-md font-medium text-zinc-300 mb-2">3. Payout Flow</h4>
                  <div className="text-sm text-zinc-400 space-y-1">
                    <div>• Ticker moves across grid</div>
                    <div>• Collision detection on selected cells</div>
                    <div>• Instant payout on hit</div>
                    <div>• Hit cells show green, miss show red</div>
                    <div>• PnL updates in real-time</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </section>

        {/* UI Element Flows */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-100 border-b border-zinc-800 pb-2">UI Element Interaction Flows</h2>
          
          {/* Modal Flows */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Modal & Popup Flows</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Profile Modal</h4>
                <div className="text-sm text-zinc-400 space-y-1">
                  <div>• Click profile avatar → Profile modal opens</div>
                  <div>• View user stats and settings</div>
                  <div>• Click X or outside → Modal closes</div>
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Notifications Modal</h4>
                <div className="text-sm text-zinc-400 space-y-1">
                  <div>• Click bell icon → Notifications modal opens</div>
                  <div>• View notification list</div>
                  <div>• Click X or outside → Modal closes</div>
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Deposit Modal</h4>
                <div className="text-sm text-zinc-400 space-y-1">
                    <div>• Click &quot;Deposit&quot; button → Deposit modal opens</div>
                  <div>• Select deposit method</div>
                  <div>• Complete deposit flow</div>
                  <div>• Click X or outside → Modal closes</div>
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Settings Modal</h4>
                <div className="text-sm text-zinc-400 space-y-1">
                  <div>• Click settings icon → Settings modal opens</div>
                  <div>• Adjust preferences</div>
                  <div>• Save changes</div>
                  <div>• Click X or outside → Modal closes</div>
                </div>
              </div>
            </div>
          </div>

          {/* Control Flows */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Control & Settings Flows</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Sound Controls</h4>
                <div className="text-sm text-zinc-400 space-y-1">
                  <div>• Click sound icon → Toggle sound on/off</div>
                  <div>• Icon changes: Volume2 ↔ VolumeX</div>
                  <div>• State persists across page navigation</div>
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Zoom Controls</h4>
                <div className="text-sm text-zinc-400 space-y-1">
                  <div>• Click + button → Zoom in (increases cell size)</div>
                  <div>• Click - button → Zoom out (decreases cell size)</div>
                  <div>• Zoom percentage displays current level</div>
                  <div>• Grid regenerates on zoom change</div>
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Asset Selection</h4>
                <div className="text-sm text-zinc-400 space-y-1">
                  <div>• Click asset dropdown → Asset list opens</div>
                  <div>• Select different cryptocurrency</div>
                  <div>• Price data updates in real-time</div>
                  <div>• Grid adjusts to new price range</div>
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Trade Mode Toggle</h4>
                <div className="text-sm text-zinc-400 space-y-1">
                  <div>• Click &quot;Place Trade&quot; → Enter betting mode</div>
                  <div>• Click &quot;Copy Trade&quot; → Enter copy mode</div>
                    <div>• Click &quot;Exit Trade Mode&quot; → Exit betting</div>
                  <div>• Mode affects interaction behavior</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trading & Betting Flows */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-100 border-b border-zinc-800 pb-2">Trading & Betting Flows</h2>
          
          {/* Betting Flow */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Complete Betting Flow</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-zinc-800 rounded p-4">
                  <h4 className="text-md font-medium text-zinc-300 mb-2">1. Setup</h4>
                  <div className="text-sm text-zinc-400 space-y-1">
                    <div>• Select game (Box Hit/Towers)</div>
                    <div>• Click &quot;Place Trade&quot;</div>
                    <div>• Set bet amount</div>
                    <div>• View potential payout</div>
                  </div>
                </div>
                <div className="bg-zinc-800 rounded p-4">
                  <h4 className="text-md font-medium text-zinc-300 mb-2">2. Selection</h4>
                  <div className="text-sm text-zinc-400 space-y-1">
                    <div>• Click grid cells to select</div>
                    <div>• Orange border indicates selection</div>
                    <div>• Multiple selections allowed</div>
                    <div>• Payout updates in real-time</div>
                  </div>
                </div>
                <div className="bg-zinc-800 rounded p-4">
                  <h4 className="text-md font-medium text-zinc-300 mb-2">3. Execution</h4>
                  <div className="text-sm text-zinc-400 space-y-1">
                    <div>• Ticker moves across grid</div>
                    <div>• Collision detection triggers</div>
                    <div>• Instant payout calculation</div>
                    <div>• Visual feedback (green/red)</div>
                  </div>
                </div>
                <div className="bg-zinc-800 rounded p-4">
                  <h4 className="text-md font-medium text-zinc-300 mb-2">4. Results</h4>
                  <div className="text-sm text-zinc-400 space-y-1">
                    <div>• PnL updates immediately</div>
                    <div>• Balance reflects winnings</div>
                    <div>• Position history recorded</div>
                    <div>• Ready for next bet</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Copy Trading Flow */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Copy Trading Flow</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-800 rounded p-4">
                  <h4 className="text-md font-medium text-zinc-300 mb-2">1. Copy Mode</h4>
                  <div className="text-sm text-zinc-400 space-y-1">
                    <div>• Click &quot;Copy Trade&quot; mode</div>
                    <div>• Set copy amount</div>
                    <div>• Select trader to copy</div>
                    <div>• Enable auto-copy</div>
                  </div>
                </div>
                <div className="bg-zinc-800 rounded p-4">
                  <h4 className="text-md font-medium text-zinc-300 mb-2">2. Auto Execution</h4>
                  <div className="text-sm text-zinc-400 space-y-1">
                    <div>• System copies trader&apos;s moves</div>
                    <div>• Proportional bet sizing</div>
                    <div>• Real-time synchronization</div>
                    <div>• Risk management applied</div>
                  </div>
                </div>
                <div className="bg-zinc-800 rounded p-4">
                  <h4 className="text-md font-medium text-zinc-300 mb-2">3. Performance</h4>
                  <div className="text-sm text-zinc-400 space-y-1">
                    <div>• Track copy performance</div>
                    <div>• Compare to original trader</div>
                    <div>• Adjust copy settings</div>
                    <div>• Stop/start copy anytime</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Data & State Flows */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-100 border-b border-zinc-800 pb-2">Data & State Flows</h2>
          
          {/* Real-time Data Flow */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Real-time Data Flow</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Price Data</h4>
                <div className="text-sm text-zinc-400 space-y-1">
                  <div>• WebSocket connections to exchanges</div>
                  <div>• Binance, Coinbase, Kraken feeds</div>
                  <div>• Real-time price updates</div>
                  <div>• Ticker movement animation</div>
                  <div>• Price history tracking</div>
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Game State</h4>
                <div className="text-sm text-zinc-400 space-y-1">
                  <div>• Grid cell generation</div>
                  <div>• Tower generation (Towers game)</div>
                  <div>• Collision detection</div>
                  <div>• Payout calculations</div>
                  <div>• State persistence</div>
                </div>
              </div>
            </div>
          </div>

          {/* User State Flow */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">User State Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Session State</h4>
                <div className="text-sm text-zinc-400 space-y-1">
                  <div>• User authentication</div>
                  <div>• Balance tracking</div>
                  <div>• PnL calculations</div>
                  <div>• Position history</div>
                  <div>• Settings preferences</div>
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">UI State</h4>
                <div className="text-sm text-zinc-400 space-y-1">
                  <div>• Modal open/close states</div>
                  <div>• Sound on/off toggle</div>
                  <div>• Zoom level persistence</div>
                  <div>• Selected cells list</div>
                  <div>• Trade mode state</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Error Handling Flows */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-100 border-b border-zinc-800 pb-2">Error Handling & Edge Cases</h2>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Error Scenarios</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Connection Issues</h4>
                <div className="text-sm text-zinc-400 space-y-1">
                  <div>• WebSocket connection fails</div>
                  <div>• Fallback to backup exchanges</div>
                  <div>• Connection timeout handling</div>
                  <div>• Retry logic with backoff</div>
                  <div>• User notification of issues</div>
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Game State Issues</h4>
                <div className="text-sm text-zinc-400 space-y-1">
                  <div>• Invalid bet amounts</div>
                  <div>• Insufficient balance</div>
                  <div>• Grid generation failures</div>
                  <div>• Collision detection errors</div>
                  <div>• State recovery mechanisms</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Performance & Optimization */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-100 border-b border-zinc-800 pb-2">Performance & Optimization</h2>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Optimization Strategies</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Rendering Optimization</h4>
                <div className="text-sm text-zinc-400 space-y-1">
                  <div>• Canvas-based rendering</div>
                  <div>• Efficient collision detection</div>
                  <div>• Debounced grid generation</div>
                  <div>• Selective re-rendering</div>
                  <div>• Memory management</div>
                </div>
              </div>
              <div>
                <h4 className="text-md font-medium text-zinc-300 mb-3">Data Optimization</h4>
                <div className="text-sm text-zinc-400 space-y-1">
                  <div>• WebSocket connection pooling</div>
                  <div>• Data caching strategies</div>
                  <div>• State update batching</div>
                  <div>• Lazy loading components</div>
                  <div>• Background processing</div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
