$dir = "C:\Users\12\.gemini\antigravity\scratch\roguelike_game"
$files = @('main.js','Enemy.js','Particle.js','Gem.js','Projectile.js','Weapons.js','Terrain.js','TreasureChest.js','VFX.js','Player.js','Boss.js','BreakableCrate.js')
$utf8 = New-Object System.Text.UTF8Encoding($false)
foreach($f in $files) {
    $path = Join-Path $dir $f
    if(Test-Path $path) {
        $content = [System.IO.File]::ReadAllText($path)
        [System.IO.File]::WriteAllText($path, $content, $utf8)
        Write-Host "Fixed: $f"
    }
}
