Add-Type -AssemblyName System.Drawing

$size = 1024
$scale = 3
$bitmapSize = $size * $scale

function New-RoundedPath([float]$x, [float]$y, [float]$width, [float]$height, [float]$radius) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $radius * 2
  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-Icon([string]$path, [bool]$adaptive) {
  $bitmap = [System.Drawing.Bitmap]::new($bitmapSize, $bitmapSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.ScaleTransform($scale, $scale)
  if ($adaptive) {
    $graphics.TranslateTransform(512, 512)
    $graphics.ScaleTransform(0.9, 0.9)
    $graphics.TranslateTransform(-512, -512)
  }

  if (-not $adaptive) {
    $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
      [System.Drawing.Rectangle]::new(0, 0, $size, $size),
      [System.Drawing.Color]::FromArgb(255, 29, 78, 216),
      [System.Drawing.Color]::FromArgb(255, 67, 56, 202),
      35
    )
    $graphics.FillRectangle($background, 0, 0, $size, $size)
    $glow = [System.Drawing.Drawing2D.PathGradientBrush]::new([System.Drawing.Point[]]@(
      [System.Drawing.Point]::new(170, 130), [System.Drawing.Point]::new(620, 100),
      [System.Drawing.Point]::new(850, 420), [System.Drawing.Point]::new(330, 580)
    ))
    $glow.CenterColor = [System.Drawing.Color]::FromArgb(42, 255, 255, 255)
    $glow.SurroundColors = [System.Drawing.Color[]]@([System.Drawing.Color]::FromArgb(0, 255, 255, 255))
    $graphics.FillEllipse($glow, 120, 65, 700, 590)
    $background.Dispose()
    $glow.Dispose()
  }

  $wallet = New-RoundedPath 226 344 572 360 70
  if ($adaptive) {
    $walletPen = [System.Drawing.Pen]::new([System.Drawing.Color]::White, 48)
    $walletPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawPath($walletPen, $wallet)
    $walletPen.Dispose()
    $seamPen = [System.Drawing.Pen]::new([System.Drawing.Color]::White, 25)
    $seamPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $seamPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawLine($seamPen, 305, 451, 694, 451)
    $seamPen.Dispose()
  } else {
    $shadow = New-RoundedPath 226 362 572 360 70
    $graphics.FillPath([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(55, 16, 34, 92)), $shadow)
    $graphics.FillPath([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 250, 252, 255)), $wallet)
    $seamPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 206, 218, 244), 16)
    $seamPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $seamPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawLine($seamPen, 302, 451, 705, 451)
    $seamPen.Dispose()
    $shadow.Dispose()
  }

  $slot = New-RoundedPath 610 493 245 151 48
  if ($adaptive) {
    $slotPen = [System.Drawing.Pen]::new([System.Drawing.Color]::White, 34)
    $slotPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawPath($slotPen, $slot)
    $slotPen.Dispose()
  } else {
    $graphics.FillPath([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 30, 58, 138)), $slot)
    $slotPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 219, 231, 255), 8)
    $graphics.DrawPath($slotPen, $slot)
    $slotPen.Dispose()
  }

  $coin = [System.Drawing.Rectangle]::new(661, 535, 68, 68)
  $graphics.FillEllipse([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 245, 184, 76)), $coin)
  $coinLine = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 255, 229, 163), 7)
  $graphics.DrawEllipse($coinLine, 674, 548, 42, 42)
  $coinLine.Dispose()

  $wallet.Dispose()
  $slot.Dispose()
  $graphics.Dispose()

  $final = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $finalGraphics = [System.Drawing.Graphics]::FromImage($final)
  $finalGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $finalGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $finalGraphics.DrawImage($bitmap, 0, 0, $size, $size)
  $finalGraphics.Dispose()
  $bitmap.Dispose()
  $final.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $final.Dispose()
}

Draw-Icon (Join-Path $PSScriptRoot 'icon.png') $false
Draw-Icon (Join-Path $PSScriptRoot 'adaptive-icon.png') $true
