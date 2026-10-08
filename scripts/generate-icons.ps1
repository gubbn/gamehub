Add-Type -AssemblyName System.Drawing
foreach ($iconSize in @(192, 512)) {
  $bitmap = [System.Drawing.Bitmap]::new($iconSize, $iconSize)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#6155d9'))
  $scale = $iconSize / 512.0
  $graphics.ScaleTransform($scale, $scale)
  $paper = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#fff8ee'))
  $ink = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#6155d9'))
  $shape = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $shape.AddArc(112, 112, 100, 100, 180, 90)
  $shape.AddArc(300, 112, 100, 100, 270, 90)
  $shape.AddArc(300, 300, 100, 100, 0, 90)
  $shape.AddArc(112, 300, 100, 100, 90, 90)
  $shape.CloseFigure()
  $graphics.FillPath($paper, $shape)
  foreach ($point in @(@(181,181),@(331,181),@(256,256),@(181,331),@(331,331))) {
    $graphics.FillEllipse($ink, $point[0]-24, $point[1]-24, 48, 48)
  }
  $iconPath = Join-Path $PSScriptRoot "../public/pwa-$iconSize.png"
  $bitmap.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $shape.Dispose()
  $paper.Dispose()
  $ink.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}
