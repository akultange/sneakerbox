"""Build dist/: inline critical CSS + catalog, minify JS/CSS, copy assets. Usage: python3 tools/build.py [base_url]"""
import json, os, shutil, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
base = sys.argv[1] if len(sys.argv) > 1 else ''

def esbuild(src, loader):
    return subprocess.run([os.path.join(ROOT, 'node_modules/.bin/esbuild'), f'--loader={loader}', '--minify', '--target=es2020,chrome100,safari15'],
                          input=open(src, 'rb').read(), capture_output=True, check=True).stdout.decode()

shutil.rmtree(DIST, ignore_errors=True)
os.makedirs(os.path.join(DIST, 'assets'))
css = esbuild(os.path.join(ROOT, 'src/style.css'), 'css')
catalog = json.dumps(json.load(open(os.path.join(ROOT, 'assets/data/catalog.json'))), ensure_ascii=False, separators=(',', ':'))
version = time.strftime('%Y%m%d%H%M')
page = open(os.path.join(ROOT, 'src/index.html')).read()
page = page.replace('{{CSS}}', css.strip()).replace('{{CATALOG}}', catalog.replace('</', '<\\/')).replace('{{VERSION}}', version).replace('{{BASE}}', base)
open(os.path.join(DIST, 'index.html'), 'w').write(page)
open(os.path.join(DIST, 'assets/app.js'), 'w').write(esbuild(os.path.join(ROOT, 'src/app.js'), 'js'))
for sub in ('fonts', 'img'):
    shutil.copytree(os.path.join(ROOT, 'assets', sub), os.path.join(DIST, 'assets', sub))
open(os.path.join(DIST, '.nojekyll'), 'w').write('')
total = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(DIST) for f in fs)
print('index.html', os.path.getsize(os.path.join(DIST, 'index.html')), 'B; app.js', os.path.getsize(os.path.join(DIST, 'assets/app.js')), 'B; dist total', round(total / 1e6, 1), 'MB')
