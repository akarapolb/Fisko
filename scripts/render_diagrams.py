"""Render the Fisko SRS and SDS diagrams: every docs/spec/src/diagrams/*.puml to SVG and PNG, in Thai and in English.

Usage
    python scripts/render_diagrams.py            render what changed
    python scripts/render_diagrams.py --force    render everything
    python scripts/render_diagrams.py arch-context prc-state-case    only these ids

Needs the PlantUML jar (download plantuml-mit-*.jar into tools/plantuml) and Java. One source gives both languages: labels are written as
$t("ไทย", "English") (see src/diagrams/include/common.puml); the English run passes -DLANG_EN.

Outputs: docs/spec/diagrams/svg/{th,en}/<id>.svg and docs/spec/diagrams/png/{th,en}/<id>.png (committed, so readers get ready images). A source may start with comment lines that the renderer reads:
    ' title.th: ...      ' title.en: ...      the accessible name of the diagram (<title> in the SVG)
    ' desc.th:  ...      ' desc.en:  ...      a longer description (<desc>), what a reader who cannot see it needs to know
    ' law: PDPA 37; PPR 162                    the clauses the diagram answers (read by build_spec.py for coverage)
"""
from __future__ import annotations

import html
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / 'docs' / 'spec' / 'src' / 'diagrams'
OUT = ROOT / 'docs' / 'spec' / 'diagrams'
JAR = next(iter(sorted((ROOT / 'tools' / 'plantuml').glob('plantuml-mit-*.jar'))), None)
FONT_STACK = "'Leelawadee UI', Tahoma, 'Noto Sans Thai', Anuphan, sans-serif"


def meta(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for m in re.finditer(r"^'\s*([a-z]+(?:\.[a-z]+)?):\s*(.+?)\s*$", text, re.M):
        out[m.group(1)] = m.group(2)
    return out


def run(files: list[pathlib.Path], lang: str, fmt: str) -> bool:
    out = OUT / fmt / lang
    out.mkdir(parents=True, exist_ok=True)
    cmd = ['java', '-Dfile.encoding=UTF-8', '-DPLANTUML_LIMIT_SIZE=16384', '-jar', str(JAR), f'-t{fmt}', '-charset', 'UTF-8', '-o', str(out)]
    if lang == 'en':
        cmd.append('-DLANG_EN')
    cmd += [str(f) for f in files]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0 or 'Error' in r.stderr or 'Syntax' in r.stdout:
        print(f'  PlantUML ({lang}, {fmt}) reported problems:')
        print('    ' + (r.stderr or r.stdout).strip().replace('\n', '\n    ')[:1500])
        return False
    return True


def finish_svg(path: pathlib.Path, md: dict[str, str], lang: str) -> None:
    s = path.read_text(encoding='utf-8')
    s = re.sub(r"font-family=\"[^\"]*\"", f'font-family="{FONT_STACK}"', s)
    title = html.escape(md.get(f'title.{lang}', path.stem))
    desc = html.escape(md.get(f'desc.{lang}', ''))
    if '<title' not in s[:600]:
        extra = f'<title>{title}</title>' + (f'<desc>{desc}</desc>' if desc else '')
        s = re.sub(r'(<svg\b[^>]*>)', lambda m: m.group(1) + extra, s, count=1)
    path.write_text(s, encoding='utf-8')


def main(argv: list[str]) -> int:
    if JAR is None:
        print('PlantUML jar not found: run  download plantuml-mit-*.jar into tools/plantuml', file=sys.stderr)
        return 1
    force = '--force' in argv
    ids = [a for a in argv if not a.startswith('-')]
    sources = sorted(p for p in SRC.glob('*.puml') if not ids or p.stem in ids)
    if not sources:
        print('no diagram sources')
        return 0
    newest_dep = max([JAR.stat().st_mtime] + [p.stat().st_mtime for p in (SRC / 'include').glob('*.puml')])
    todo = []
    for p in sources:
        stamp = max(p.stat().st_mtime, newest_dep)
        outs = [OUT / f / lg / f'{p.stem}.{f}' for f in ('svg', 'png') for lg in ('th', 'en')]
        if force or any(not o.exists() or o.stat().st_mtime < stamp for o in outs):
            todo.append(p)
    if not todo:
        print(f'{len(sources)} diagrams are up to date')
        return 0
    ok = True
    for lang in ('th', 'en'):
        for fmt in ('svg', 'png'):
            ok &= run(todo, lang, fmt)
    for p in todo:
        md = meta(p.read_text(encoding='utf-8'))
        for lang in ('th', 'en'):
            svg = OUT / 'svg' / lang / f'{p.stem}.svg'
            if svg.exists():
                finish_svg(svg, md, lang)
            else:
                print(f'  missing output: {svg.relative_to(ROOT)}')
                ok = False
    print(f'rendered {len(todo)} of {len(sources)} diagrams (th and en, svg and png)' + ('' if ok else ' WITH PROBLEMS'))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
