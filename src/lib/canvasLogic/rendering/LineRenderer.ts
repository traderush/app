import { Theme } from '../config/theme'

export interface Point {
  x: number
  y: number
}

export interface LineRenderOptions {
  points: Point[]
  smooth?: boolean
  glow?: boolean
  dashPattern?: number[]
}

export class LineRenderer {
  private ctx: CanvasRenderingContext2D
  private theme: Theme

  constructor(ctx: CanvasRenderingContext2D, theme: Theme) {
    this.ctx = ctx
    this.theme = theme
  }

  public setTheme(theme: Theme): void {
    this.theme = theme
  }

  public render(options: LineRenderOptions): void {
    const { points, smooth = true, glow = false, dashPattern } = options
    
    if (points.length < 2) return

    this.ctx.save()

    // Enable anti-aliasing
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = 'high'

    // Set line properties
    this.ctx.strokeStyle = this.theme.line.color
    this.ctx.lineWidth = this.theme.line.width
    this.ctx.lineCap = this.theme.line.cap
    this.ctx.lineJoin = this.theme.line.join

    // Set dash pattern if provided
    if (dashPattern) {
      this.ctx.setLineDash(dashPattern)
    } else if (this.theme.line.dash) {
      this.ctx.setLineDash(this.theme.line.dash)
    }

    // Create a clipping region to ensure line doesn't extend past the last point
    if (points.length > 0) {
      const lastPoint = points[points.length - 1]
      this.ctx.save()
      this.ctx.beginPath()
      this.ctx.rect(0, 0, lastPoint.x + 1, this.ctx.canvas.height)
      this.ctx.clip()
    }

    // Draw glow effect if enabled
    if (glow && this.theme.line.glow?.enabled) {
      this.drawGlow(points, smooth)
    }

    // Draw main line
    this.drawLine(points, smooth)

    if (points.length > 0) {
      this.ctx.restore() // Restore clipping
    }

    this.ctx.restore()
  }

  private drawLine(points: Point[], smooth: boolean): void {
    this.ctx.beginPath()
    
    if (smooth && points.length > 2) {
      this.drawSmoothLine(points)
    } else {
      this.drawStraightLine(points)
    }
    
    this.ctx.stroke()
  }

  private drawStraightLine(points: Point[]): void {
    this.ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y)
    }
  }

  private drawSmoothLine(points: Point[]): void {
    this.ctx.moveTo(points[0].x, points[0].y)
    
    // Use Catmull-Rom splines to ensure the curve passes through all points
    if (points.length === 2) {
      // Just draw a straight line for 2 points
      this.ctx.lineTo(points[1].x, points[1].y)
    } else if (points.length === 3) {
      // For 3 points, use a quadratic curve through the middle point
      this.ctx.quadraticCurveTo(
        points[1].x, points[1].y,
        points[2].x, points[2].y
      )
    } else {
      // For 4+ points, use Catmull-Rom splines
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)]
        const p1 = points[i]
        const p2 = points[i + 1]
        const p3 = points[Math.min(points.length - 1, i + 2)]
        
        // Draw Catmull-Rom curve segment from p1 to p2
        this.drawCatmullRomSegment(p0, p1, p2, p3)
      }
    }
  }

  private drawCatmullRomSegment(p0: Point, p1: Point, p2: Point, p3: Point): void {
    const numSteps = 20 // Number of interpolation steps
    
    for (let t = 0; t <= numSteps; t++) {
      const tNorm = t / numSteps
      
      // Catmull-Rom spline formula
      const t2 = tNorm * tNorm
      const t3 = t2 * tNorm
      
      const x = 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * tNorm +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
      )
      
      const y = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * tNorm +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      )
      
      if (t === 0) {
        // Skip the first point as we've already moved to p1
        continue
      }
      
      this.ctx.lineTo(x, y)
    }
  }

  private drawGlow(points: Point[], smooth: boolean): void {
    if (!this.theme.line.glow) return

    this.ctx.save()
    
    // Set glow properties
    this.ctx.shadowColor = this.theme.line.glow.color
    this.ctx.shadowBlur = this.theme.line.glow.blur
    this.ctx.strokeStyle = this.theme.line.glow.color
    this.ctx.lineWidth = this.theme.line.width * 1.5
    
    this.drawLine(points, smooth)
    
    this.ctx.restore()
  }

  public renderDot(x: number, y: number, radius: number = 5, color?: string): void {
    this.ctx.save()
    
    this.ctx.fillStyle = color || this.theme.line.color
    this.ctx.beginPath()
    this.ctx.arc(x, y, radius, 0, Math.PI * 2)
    this.ctx.fill()
    
    this.ctx.restore()
  }

  public renderHorizontalLine(y: number, width: number, alpha: number = 0.3): void {
    this.ctx.save()
    
    this.ctx.strokeStyle = this.theme.line.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba')
    this.ctx.lineWidth = 1
    this.ctx.setLineDash([10, 5])
    this.ctx.beginPath()
    this.ctx.moveTo(0, y)
    this.ctx.lineTo(width, y)
    this.ctx.stroke()
    
    this.ctx.restore()
  }
}