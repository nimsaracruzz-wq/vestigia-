# Run from the repository root on Windows. Originals remain untouched.
Add-Type -AssemblyName System.Drawing
$imageRoot = Join-Path $PSScriptRoot '../public/images/products'
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$jobs = @(
    @{ Source = 'Vestigia_Hero.png'; Target = 'vestigia-hero-768.jpg'; Width = 768 },
    @{ Source = 'Vestigia_Hero.png'; Target = 'vestigia-hero-1254.jpg'; Width = 1254 },
    @{ Source = 'BRAND INTRODUCTION_Vestigia.png'; Target = 'vestigia-introduction-960.jpg'; Width = 960 },
    @{ Source = 'vestigia_logo.png'; Target = 'vestigia-logo-192.png'; Width = 192 }
)
foreach ($job in $jobs) {
    $source = [System.Drawing.Image]::FromFile((Join-Path $imageRoot $job.Source))
    $width = [Math]::Min($source.Width, $job.Width)
    $height = [int][Math]::Round($source.Height * $width / $source.Width)
    $bitmap = [System.Drawing.Bitmap]::new($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($source, 0, 0, $width, $height)
        $target = Join-Path $imageRoot $job.Target
        if ($job.Target.EndsWith('.png')) {
            $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
        } else {
            $parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
            try {
                $parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]82)
                $bitmap.Save($target, $jpegCodec, $parameters)
            } finally { $parameters.Dispose() }
        }
        Get-Item -LiteralPath $target | Select-Object Name, Length
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
        $source.Dispose()
    }
}
