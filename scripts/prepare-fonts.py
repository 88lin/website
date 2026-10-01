"""Fetch the existing OFL font sources when the Actions cache is empty."""
from io import BytesIO
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZipFile

dest = Path(__file__).resolve().parents[1] / '.shots' / 'fontsrc'
dest.mkdir(parents=True, exist_ok=True)
smiley = dest / 'SmileySans-Oblique.ttf'
if not smiley.exists():
    with urlopen('https://github.com/atelier-anchor/smiley-sans/releases/download/v2.0.1/smiley-sans-v2.0.1.zip', timeout=60) as response:
        with ZipFile(BytesIO(response.read())) as archive:
            name = next(n for n in archive.namelist() if Path(n).name == smiley.name)
            smiley.write_bytes(archive.read(name))
noto = dest / 'NotoSansSC-VF.ttf'
if not noto.exists():
    with urlopen('https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/Variable/TTF/Subset/NotoSansSC-VF.ttf', timeout=60) as response:
        noto.write_bytes(response.read())
print('Font sources ready')
