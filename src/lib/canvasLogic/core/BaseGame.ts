import { Theme, defaultTheme } from '../config/theme';
import { EventEmitter } from '../utils/EventEmitter';

export interface GameConfig {
  theme?: Theme;
  width?: number;
  height?: number;
  dpr?: number;
  fps?: number;
}

export interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  score: number;
  time: number;
}

export abstract class BaseGame extends EventEmitter {
  protected container: HTMLElement;
  public canvas: HTMLCanvasElement; // Make canvas public for debugging
  protected ctx: CanvasRenderingContext2D;
  protected width: number = 0;
  protected height: number = 0;
  protected dpr: number;
  protected animationId: number | null = null;
  protected lastFrameTime: number = 0;
  protected targetFPS: number = 60;
  private resizeObserver: ResizeObserver | null = null;

  protected theme: Theme;
  protected state: GameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    time: 0,
  };

  constructor(container: HTMLElement, config: GameConfig = {}) {
    super();

    this.container = container;
    this.theme = config.theme || defaultTheme;
    this.dpr = config.dpr || window.devicePixelRatio || 1;
    this.targetFPS = config.fps || 60;

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.zIndex = '1'; // Ensure canvas is visible
    this.canvas.style.backgroundColor = 'rgba(0,255,0,0.1)'; // Temporary green background for debugging

    const ctx = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false,
    });

    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    this.ctx = ctx;
    
    console.log('Appending canvas to container:', {
      container: this.container,
      canvas: this.canvas,
      containerChildren: this.container.children.length
    });
    
    try {
      this.container.appendChild(this.canvas);
      console.log('Canvas appended successfully, container now has', this.container.children.length, 'children');
      console.log('Canvas parent:', this.canvas.parentElement);
      console.log('Canvas in DOM:', document.body.contains(this.canvas));
      
      // Add mutation observer to track if canvas gets removed
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.removedNodes.forEach((node) => {
              if (node === this.canvas) {
                console.warn('Canvas was removed from DOM during component lifecycle - this is normal in React development mode');
              }
            });
          }
        });
      });
      
      observer.observe(this.container, { childList: true, subtree: true });
      
      // Store observer to disconnect later
      (this as any)._mutationObserver = observer;
    } catch (error) {
      console.error('Failed to append canvas:', error);
    }

    this.setupCanvas();
    this.setupEventListeners();
    
    // Check canvas visibility immediately and after a frame
    console.log('Canvas initial visibility:', {
      display: this.canvas.style.display,
      visibility: this.canvas.style.visibility,
      opacity: this.canvas.style.opacity,
      width: this.canvas.style.width,
      height: this.canvas.style.height,
      offsetWidth: this.canvas.offsetWidth,
      offsetHeight: this.canvas.offsetHeight
    });
    
    requestAnimationFrame(() => {
      console.log('Canvas visibility after frame:', {
        inDOM: document.body.contains(this.canvas),
        parent: this.canvas.parentElement,
        display: this.canvas.style.display,
        offsetWidth: this.canvas.offsetWidth,
        offsetHeight: this.canvas.offsetHeight,
        containerChildren: this.container.children.length
      });
    });
  }

  protected setupCanvas(): void {
    const computedStyle = window.getComputedStyle(this.container);

    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;

    this.width = this.container.clientWidth - paddingLeft - paddingRight;
    this.height = this.container.clientHeight - paddingTop - paddingBottom;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    // Reset any existing transform before applying DPR scale to avoid compounding
    if ((this.ctx as any).setTransform) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    this.ctx.scale(this.dpr, this.dpr);

    this.emit('resize', { width: this.width, height: this.height });
  }

  protected setupEventListeners(): void {
    window.addEventListener('resize', () => this.setupCanvas());
    // Re-run once on next frame to catch post-mount layout sizing
    requestAnimationFrame(() => this.setupCanvas());

    // Observe container size changes to correctly size the canvas when layout stabilizes
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        // Only update if size actually changed
        const prevWidth = this.width;
        const prevHeight = this.height;
        this.setupCanvas();
        if (this.width !== prevWidth || this.height !== prevHeight) {
          this.emit('resize', { width: this.width, height: this.height });
        }
      });
      this.resizeObserver.observe(this.container);
    }

    // Mouse events
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
  }

  public start(): void {
    if (this.state.isRunning) return;

    this.state.isRunning = true;
    this.state.isPaused = false;
    this.lastFrameTime = performance.now();

    this.emit('start');
    this.gameLoop();
  }

  public pause(): void {
    this.state.isPaused = true;
    this.emit('pause');
  }

  public resume(): void {
    this.state.isPaused = false;
    this.emit('resume');
  }

  public stop(): void {
    this.state.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.emit('stop');
  }

  private gameLoop(): void {
    if (!this.state.isRunning) return;

    this.animationId = requestAnimationFrame(() => this.gameLoop());

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    const targetFrameTime = 1 / this.targetFPS;

    if (deltaTime < targetFrameTime) return;

    this.lastFrameTime = currentTime;

    if (!this.state.isPaused) {
      this.update(deltaTime);
      this.render();
    }
  }

  protected clearCanvas(): void {
    this.ctx.fillStyle = this.theme.colors.background;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  public setTheme(theme: Theme): void {
    this.theme = theme;
    this.emit('themeChange', theme);
  }

  public destroy(): void {
    this.stop();

    // Remove event listeners
    window.removeEventListener('resize', () => this.setupCanvas());
    if (this.resizeObserver) {
      try {
        this.resizeObserver.disconnect();
      } catch {}
      this.resizeObserver = null;
    }

    // Remove canvas
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    this.emit('destroy');
    this.removeAllListeners();
  }

  // Abstract methods to be implemented by subclasses
  protected abstract update(deltaTime: number): void;
  protected abstract render(): void;

  // Event handlers to be optionally overridden
  protected handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.emit('click', { x, y, event: e });
  }

  protected handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.emit('mouseMove', { x, y, event: e });
  }

  protected handleMouseLeave(e: MouseEvent): void {
    this.emit('mouseLeave', { event: e });
  }

  protected handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.emit('mouseDown', { x, y, event: e });
  }

  protected handleMouseUp(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.emit('mouseUp', { x, y, event: e });
  }

  protected handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const touches = Array.from(e.touches).map((touch) => ({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
      id: touch.identifier,
    }));
    this.emit('touchStart', { touches, event: e });
  }

  protected handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const touches = Array.from(e.touches).map((touch) => ({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
      id: touch.identifier,
    }));
    this.emit('touchMove', { touches, event: e });
  }

  protected handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    this.emit('touchEnd', { event: e });
  }
}
