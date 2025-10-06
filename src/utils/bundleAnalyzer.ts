// Bundle size analysis utilities for development

export const logBundleInfo = () => {
  if (process.env.NODE_ENV === 'development') {
    console.group('📦 Bundle Analysis');
    
    // Log component sizes (approximate)
    const components = [
      'AppShell',
      'SidebarRail', 
      'ClientView',
      'BoxHitCanvas',
      'SoundManager',
      'CanvasRenderer',
      'GridSystem'
    ];
    
    console.log('Component count:', components.length);
    console.log('Components:', components.join(', '));
    
    // Log hook count
    const hooks = [
      'usePlayerData',
      'usePriceData', 
      'useAnimationLoop',
      'useCanvas',
      'usePerformance'
    ];
    
    console.log('Custom hooks count:', hooks.length);
    console.log('Hooks:', hooks.join(', '));
    
    console.groupEnd();
  }
};

export const measureComponentSize = (componentName: string, size: number) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📏 ${componentName} size: ${size} lines`);
  }
};

export const logPerformanceMetrics = (metrics: {
  renderTime: number;
  frameRate: number;
  memoryUsage?: number;
}) => {
  if (process.env.NODE_ENV === 'development') {
    console.group('⚡ Performance Metrics');
    console.log(`Render time: ${metrics.renderTime.toFixed(2)}ms`);
    console.log(`Frame rate: ${metrics.frameRate} FPS`);
    if (metrics.memoryUsage) {
      console.log(`Memory usage: ${metrics.memoryUsage.toFixed(2)}MB`);
    }
    console.groupEnd();
  }
};
