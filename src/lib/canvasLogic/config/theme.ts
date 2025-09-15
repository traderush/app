export interface ColorScheme {
  primary: string
  secondary: string
  background: string
  text: string
  border: string
  success: string
  warning: string
  error: string
  hover: string
}

export interface AnimationConfig {
  duration: number
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier'
  cubicBezier?: [number, number, number, number]
}

export interface LineConfig {
  color: string
  width: number
  cap: CanvasLineCap
  join: CanvasLineJoin
  dash?: number[]
  glow?: {
    enabled: boolean
    color: string
    blur: number
  }
}

export interface SquareConfig {
  borderColor: string
  borderWidth: number
  fillColor?: string
  textColor: string
  font: string
  fontSize: number
  padding: number
  cornerRadius?: number
  shadow?: {
    enabled: boolean
    color: string
    blur: number
    offsetX: number
    offsetY: number
  }
}

export interface Theme {
  name: string
  colors: ColorScheme
  animations: {
    squareSelect: AnimationConfig
    lineSmoothing: AnimationConfig
    cameraMovement: AnimationConfig
  }
  line: LineConfig
  square: {
    default: SquareConfig
    hovered: SquareConfig
    highlighted: SquareConfig
    selected: SquareConfig
    activated: SquareConfig
  }
  axis: {
    color: string
    width: number
    font: string
    fontSize: number
    tickSize: number
  }
}

export const defaultTheme: Theme = {
  name: 'default',
  colors: {
    primary: '#00ff00',
    secondary: '#ffffff',
    background: '#000000',
    text: '#ffffff',
    border: '#333333',
    success: '#00ff00',
    warning: '#ffaa00',
    error: '#ff0000',
    hover: '#cccccc'
  },
  animations: {
    squareSelect: {
      duration: 300,
      easing: 'ease-out'
    },
    lineSmoothing: {
      duration: 88,
      easing: 'linear'
    },
    cameraMovement: {
      duration: 200,
      easing: 'ease-out'
    }
  },
  line: {
    color: '#00ff00',
    width: 3,
    cap: 'round',
    join: 'round',
    glow: {
      enabled: false,
      color: '#00ff00',
      blur: 10
    }
  },
  square: {
    default: {
      borderColor: 'rgba(180, 180, 180, 0.3)',
      borderWidth: 1,
      textColor: 'rgba(180, 180, 180, 0.4)',
      font: 'Monaco, "Courier New", monospace',
      fontSize: 12,
      padding: 0
    },
    hovered: {
      borderColor: 'rgba(255, 255, 255, 0.7)',
      borderWidth: 1,
      fillColor: 'rgba(255, 255, 255, 0.05)',
      textColor: 'rgba(255, 255, 255, 0.8)',
      font: 'Monaco, "Courier New", monospace',
      fontSize: 12,
      padding: 0
    },
    highlighted: {
      borderColor: 'rgba(255, 170, 0, 0.9)',
      borderWidth: 2,
      fillColor: 'rgba(255, 170, 0, 0.1)',
      textColor: 'rgba(255, 170, 0, 0.9)',
      font: 'Monaco, "Courier New", monospace',
      fontSize: 14,
      padding: 0
    },
    selected: {
      borderColor: 'rgba(0, 255, 0, 0.9)',
      borderWidth: 2,
      textColor: 'rgba(0, 255, 0, 0.9)',
      font: 'Monaco, "Courier New", monospace',
      fontSize: 12,
      padding: 0
    },
    activated: {
      borderColor: 'rgba(0, 255, 0, 1.0)',
      borderWidth: 1,
      fillColor: 'rgba(0, 255, 0, 0.8)',
      textColor: '#000000',
      font: 'Monaco, "Courier New", monospace',
      fontSize: 12,
      padding: 0
    }
  },
  axis: {
    color: 'rgba(255, 255, 255, 0.3)',
    width: 1,
    font: '12px Arial',
    fontSize: 12,
    tickSize: 10
  }
}