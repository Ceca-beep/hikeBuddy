import pathlib
p = pathlib.Path(__file__).parent / 'trails.py'
print('size', p.stat().st_size)
print(p.read_bytes()[:200])
