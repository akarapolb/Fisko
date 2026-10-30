"""Build the Fisko SRS and SDS as bilingual (Thai and English) single-file HTML documents.

Usage
    python scripts/build_spec.py            build both documents
    python scripts/build_spec.py srs        build one (srs or sds)
    python scripts/build_spec.py --pdf      also print PDFs (one per language) with Edge headless
    python scripts/build_spec.py --no-docx  skip the Word files, for quick checks

Sources (docs/spec/src/)
    srs/_meta.json, sds/_meta.json    document metadata and the order of the chapter files
    srs/th/*.md  srs/en/*.md          the same chapters in Thai and in English, block for block
    sds/th/*.md  sds/en/*.md
    law/*.tsv                         the clause register: every legal clause Fisko must answer
    diagrams/*.puml                   PlantUML sources; rendered by scripts/render_diagrams.py
    assets/spec.css, spec.js, fonts/  the look and the behaviour of the page

Outputs (docs/spec/dist/, not committed)
    Fisko-SRS.html, Fisko-SDS.html    one offline file each, with a language switch and an A4 print stylesheet
    Fisko-SRS-rtm.csv                 requirement list with clause references, UTF-8 with BOM (Excel shows Thai correctly)
    Fisko-clause-coverage.csv         every registered clause with where it is answered
    Fisko-SRS-th.docx ... Fisko-SDS-en.docx  editable Word files, one per document and language (scripts/build_docx.py)

The Markdown dialect is small on purpose: ATX headings (with optional {#id} and {appendix}), paragraphs, **bold**,
*italic*, `code`, [links](url), bullet and numbered lists (nesting by two spaces), pipe tables, fenced code,
> [!NOTE|WARN|OPEN|LAW] callouts, --- rules, {{fig:id | caption}}, {{law-table: ...}}, {{coverage}}, {{figures}}
and <!-- covers: ref; ref --> comments. Thai and English files must have the same blocks in the same order: the
build stops and says where they differ, so the two languages cannot drift apart.
"""
from __future__ import annotations

import base64
import csv
import datetime as dt
import html
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = ROOT / 'docs' / 'spec'
SRC = SPEC / 'src'
DIST = SPEC / 'dist'
DIAG_SVG = SPEC / 'diagrams' / 'svg'
DIAG_SRC = SRC / 'diagrams'
SCREENS = SPEC / 'screens'
FONTS = SRC / 'assets' / 'fonts'
LANGS = ('th', 'en')

WARNINGS: list[str] = []


def warn(msg: str) -> None:
    WARNINGS.append(msg)


class SpecError(Exception):
    pass


# ----------------------------------------------------------------------------------------------------------
# parsing
# ----------------------------------------------------------------------------------------------------------

def parse_md(text: str, name: str) -> list[dict]:
    """Markdown text to a flat list of block dicts."""
    lines = text.replace('\r\n', '\n').split('\n')
    blocks: list[dict] = []
    i, n = 0, len(lines)

    def para_end(j: int) -> bool:
        s = lines[j]
        return (not s.strip() or s.startswith('#') or s.startswith('```') or s.startswith('>') or s.startswith('|')
                or re.match(r'^\s*([-*]|\d+\.)\s', s) is not None or s.strip() == '---' or s.startswith('{{')
                or s.startswith('<!--'))

    while i < n:
        s = lines[i]
        if not s.strip():
            i += 1
            continue
        m = re.match(r'^<!--\s*covers:\s*(.*?)\s*-->\s*$', s)
        if m:
            blocks.append({'t': 'covers', 'refs': [r.strip() for r in m.group(1).split(';') if r.strip()]})
            i += 1
            continue
        if s.startswith('<!--'):
            while i < n and '-->' not in lines[i]:
                i += 1
            i += 1
            continue
        m = re.match(r'^(#{1,4})\s+(.*?)\s*$', s)
        if m:
            title, ident, appendix = m.group(2), None, False
            am = re.search(r'\s*\{([^}]*)\}\s*$', title)
            if am:
                for tok in am.group(1).split():
                    if tok.startswith('#'):
                        ident = tok[1:]
                    elif tok == 'appendix':
                        appendix = True
                title = title[:am.start()]
            blocks.append({'t': 'h', 'level': len(m.group(1)), 'text': title, 'id': ident, 'appendix': appendix})
            i += 1
            continue
        if s.strip() == '---':
            blocks.append({'t': 'hr'})
            i += 1
            continue
        if s.startswith('```'):
            lang = s[3:].strip()
            body = []
            i += 1
            while i < n and not lines[i].startswith('```'):
                body.append(lines[i])
                i += 1
            i += 1
            blocks.append({'t': 'code', 'lang': lang, 'text': '\n'.join(body)})
            continue
        m = re.match(r'^\{\{(fig|screen):\s*([A-Za-z0-9_.-]+)\s*\|\s*(.*?)\s*\}\}\s*$', s)
        if m:
            blocks.append({'t': 'fig', 'kind': m.group(1), 'id': m.group(2), 'caption': m.group(3)})
            i += 1
            continue
        m = re.match(r'^\{\{(law-table|coverage|figures|status-summary|status-matrix)\s*:?\s*(.*?)\s*\}\}\s*$', s)
        if m:
            args = {}
            for part in m.group(2).split(';'):
                if '=' in part:
                    k, v = part.split('=', 1)
                    args[k.strip()] = v.strip()
            blocks.append({'t': 'dir', 'name': m.group(1), 'args': args})
            i += 1
            continue
        if s.startswith('>'):
            body = []
            while i < n and lines[i].startswith('>'):
                body.append(re.sub(r'^>\s?', '', lines[i]))
                i += 1
            kind = 'NOTE'
            first = body[0] if body else ''
            m = re.match(r'^\[!(NOTE|WARN|OPEN|LAW)\]\s*(.*)$', first)
            if m:
                kind = m.group(1)
                body[0] = m.group(2)
            blocks.append({'t': 'quote', 'kind': kind, 'text': ' '.join(x.strip() for x in body if x.strip())})
            continue
        if s.startswith('|'):
            rows = []
            while i < n and lines[i].startswith('|'):
                rows.append(lines[i])
                i += 1
            if len(rows) < 2 or not re.match(r'^\|[\s:|-]+\|\s*$', rows[1]):
                raise SpecError(f'{name}: a table needs a header row and a separator row near "{rows[0][:60]}"')
            head = split_row(rows[0])
            align = ['r' if c.strip().endswith(':') and not c.strip().startswith(':') else '' for c in split_row(rows[1])]
            body_rows = [split_row(r) for r in rows[2:]]
            for r in body_rows:
                if len(r) != len(head):
                    raise SpecError(f'{name}: table row has {len(r)} cells, header has {len(head)}: "{r[0][:50]}"')
            blocks.append({'t': 'table', 'head': head, 'rows': body_rows, 'align': align})
            continue
        if re.match(r'^\s*([-*]|\d+\.)\s', s):
            block, i = parse_list(lines, i)
            blocks.append(block)
            continue
        body = [s.strip()]
        i += 1
        while i < n and not para_end(i):
            body.append(lines[i].strip())
            i += 1
        blocks.append({'t': 'p', 'text': ' '.join(body)})
    return blocks


def split_row(line: str) -> list[str]:
    inner = line.strip()
    if inner.startswith('|'):
        inner = inner[1:]
    if inner.endswith('|') and not inner.endswith('\\|'):
        inner = inner[:-1]
    cells, cur, k = [], '', 0
    while k < len(inner):
        ch = inner[k]
        if ch == '\\' and k + 1 < len(inner) and inner[k + 1] == '|':
            cur += '|'
            k += 2
            continue
        if ch == '|':
            cells.append(cur.strip())
            cur = ''
        else:
            cur += ch
        k += 1
    cells.append(cur.strip())
    return cells


def parse_list(lines: list[str], i: int) -> tuple[dict, int]:
    """A list starting at line i: bullet or numbered, nesting by indentation."""
    first = lines[i]
    indent = len(first) - len(first.lstrip())
    ordered = bool(re.match(r'^\s*\d+\.\s', first))
    items: list[dict] = []
    n = len(lines)
    while i < n:
        s = lines[i]
        if not s.strip():
            # a blank line ends the list unless the next line continues it
            j = i + 1
            while j < n and not lines[j].strip():
                j += 1
            if j < n and re.match(r'^\s*([-*]|\d+\.)\s', lines[j]) and (len(lines[j]) - len(lines[j].lstrip())) >= indent:
                i = j
                continue
            break
        cur = len(s) - len(s.lstrip())
        m = re.match(r'^\s*([-*]|\d+\.)\s+(.*)$', s)
        if m and cur == indent:
            items.append({'text': m.group(2).strip(), 'sub': None})
            i += 1
        elif m and cur > indent and items:
            sub, i = parse_list(lines, i)
            items[-1]['sub'] = sub
        elif cur > indent and items and not m:
            items[-1]['text'] += ' ' + s.strip()
            i += 1
        else:
            break
    return {'t': 'ol' if ordered else 'ul', 'items': items}, i


# ----------------------------------------------------------------------------------------------------------
# merging the two languages
# ----------------------------------------------------------------------------------------------------------

def brief(b: dict) -> str:
    for k in ('text', 'caption', 'id', 'name'):
        if b.get(k):
            return f'{b["t"]} "{str(b[k])[:50]}"'
    return b['t']


def merge_blocks(th: list[dict], en: list[dict], fname: str) -> list[dict]:
    """Pair the Thai and English blocks one to one; stop with a precise message where they differ."""
    if len(th) != len(en):
        where = next((k for k in range(min(len(th), len(en))) if th[k]['t'] != en[k]['t']), min(len(th), len(en)))
        a = brief(th[where]) if where < len(th) else '(end)'
        b = brief(en[where]) if where < len(en) else '(end)'
        raise SpecError(f'{fname}: Thai has {len(th)} blocks, English has {len(en)}; they first differ at block {where + 1}: '
                        f'Thai {a} / English {b}')
    out = []
    for k, (a, b) in enumerate(zip(th, en)):
        at = f'{fname} block {k + 1}'
        if a['t'] != b['t']:
            raise SpecError(f'{at}: Thai is {brief(a)} but English is {brief(b)}')
        t = a['t']
        m: dict = {'t': t}
        if t == 'h':
            if a['level'] != b['level']:
                raise SpecError(f'{at}: heading levels differ ("{a["text"][:40]}" / "{b["text"][:40]}")')
            m.update(level=a['level'], text={'th': a['text'], 'en': b['text']}, id=b['id'] or a['id'],
                     appendix=a['appendix'] or b['appendix'])
        elif t == 'p':
            m['text'] = {'th': a['text'], 'en': b['text']}
        elif t in ('ul', 'ol'):
            m['items'] = merge_items(a['items'], b['items'], at)
        elif t == 'table':
            if len(a['rows']) != len(b['rows']) or len(a['head']) != len(b['head']):
                raise SpecError(f'{at}: table sizes differ: Thai {len(a["rows"])}x{len(a["head"])}, '
                                f'English {len(b["rows"])}x{len(b["head"])} (first English cell "{b["head"][0]}")')
            m.update(head=[{'th': x, 'en': y} for x, y in zip(a['head'], b['head'])],
                     rows=[[{'th': x, 'en': y} for x, y in zip(ra, rb)] for ra, rb in zip(a['rows'], b['rows'])],
                     align=b['align'], key=b['head'][0].strip())
        elif t == 'code':
            m.update(lang=a['lang'] or b['lang'], text={'th': a['text'], 'en': b['text']})
        elif t == 'quote':
            if a['kind'] != b['kind']:
                raise SpecError(f'{at}: callout kinds differ ({a["kind"]} / {b["kind"]})')
            m.update(kind=a['kind'], text={'th': a['text'], 'en': b['text']})
        elif t == 'fig':
            if a['id'] != b['id'] or a['kind'] != b['kind']:
                raise SpecError(f'{at}: figure ids differ ({a["id"]} / {b["id"]})')
            m.update(id=a['id'], kind=a['kind'], caption={'th': a['caption'], 'en': b['caption']})
        elif t == 'dir':
            if a['name'] != b['name'] or a['args'] != b['args']:
                raise SpecError(f'{at}: directive differs ({a["name"]} {a["args"]} / {b["name"]} {b["args"]})')
            m.update(name=a['name'], args=a['args'])
        elif t == 'covers':
            m['refs'] = sorted(set(a['refs']) | set(b['refs']))
        out.append(m)
    return out


def merge_items(a: list[dict], b: list[dict], at: str) -> list[dict]:
    if len(a) != len(b):
        raise SpecError(f'{at}: list lengths differ: Thai {len(a)}, English {len(b)} (English starts "{b[0]["text"][:40] if b else ""}")')
    out = []
    for x, y in zip(a, b):
        sub = None
        if bool(x['sub']) != bool(y['sub']):
            raise SpecError(f'{at}: one language has a nested list under "{y["text"][:40]}" and the other does not')
        if x['sub']:
            if x['sub']['t'] != y['sub']['t']:
                raise SpecError(f'{at}: nested list kinds differ under "{y["text"][:40]}"')
            sub = {'t': x['sub']['t'], 'items': merge_items(x['sub']['items'], y['sub']['items'], at)}
        out.append({'text': {'th': x['text'], 'en': y['text']}, 'sub': sub})
    return out


# ----------------------------------------------------------------------------------------------------------
# clause register
# ----------------------------------------------------------------------------------------------------------

LAW_COLS = ['ref', 'doc', 'page', 'scope', 'kind', 'category', 'th', 'en', 'disposition', 'verify', 'notes']
DOC_NAMES = {'PPA': ('PPA', 'พ.ร.บ.การจัดซื้อจัดจ้างฯ พ.ศ. 2560', 'Public Procurement Act B.E. 2560'),
             'PPR': ('PPR', 'ระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างฯ พ.ศ. 2560', 'Ministry of Finance Procurement Regulation B.E. 2560'),
             'PDPA': ('PDPA', 'พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562', 'Personal Data Protection Act B.E. 2562')}
CAT_CODE = {'functional': 'FUN', 'security': 'SEC', 'privacy': 'PRV', 'performance': 'PER', 'availability': 'AVL',
            'scalability': 'SCL', 'usability': 'USA', 'accessibility': 'ACC', 'i18n': 'I18', 'data': 'DAT',
            'integration': 'INT', 'api': 'API', 'search': 'SRC', 'ai': 'AI', 'mobile': 'MOB', 'deployment': 'DEP',
            'devsecops': 'DSO', 'observability': 'OBS', 'testing': 'TST', 'documentation': 'DOC', 'training': 'TRN',
            'licence': 'LIC', 'hardware': 'HWR', 'operations': 'OPS', 'project': 'PRJ', 'commercial': 'COM', 'other': 'OTH'}
CAT_LABEL = {
    'functional': ('ฟังก์ชันการทำงาน', 'Functional'), 'security': ('ความมั่นคงปลอดภัย', 'Security'),
    'privacy': ('ข้อมูลส่วนบุคคล', 'Privacy'), 'performance': ('ประสิทธิภาพ', 'Performance'),
    'availability': ('ความพร้อมใช้งาน', 'Availability'), 'scalability': ('การขยายขนาด', 'Scalability'),
    'usability': ('การใช้งาน', 'Usability'), 'accessibility': ('การเข้าถึงสำหรับทุกคน', 'Accessibility'),
    'i18n': ('ภาษาและท้องถิ่น', 'Language and locale'), 'data': ('ข้อมูล', 'Data'),
    'integration': ('การเชื่อมโยง', 'Integration'), 'api': ('API', 'API'), 'search': ('การค้นหา', 'Search'),
    'ai': ('ปัญญาประดิษฐ์', 'Artificial intelligence'), 'mobile': ('แอปพลิเคชันมือถือ', 'Mobile'),
    'deployment': ('การติดตั้งและปรับใช้', 'Deployment'), 'devsecops': ('DevSecOps', 'DevSecOps'),
    'observability': ('การเฝ้าระวัง', 'Observability'), 'testing': ('การทดสอบ', 'Testing'),
    'documentation': ('เอกสาร', 'Documentation'), 'training': ('การฝึกอบรม', 'Training'),
    'licence': ('ลิขสิทธิ์และสัญญาอนุญาต', 'Licences'), 'hardware': ('ฮาร์ดแวร์', 'Hardware'),
    'operations': ('การปฏิบัติการ', 'Operations'), 'project': ('การบริหารโครงการ', 'Project'),
    'commercial': ('เงื่อนไขเชิงพาณิชย์', 'Commercial'), 'other': ('อื่น ๆ', 'Other')}


def load_law() -> list[dict]:
    rows: list[dict] = []
    seen: dict[str, str] = {}
    for f in sorted((SRC / 'law').glob('law-*.tsv')):
        with f.open(encoding='utf-8-sig', newline='') as fh:
            reader = csv.reader(fh, delimiter='\t', quoting=csv.QUOTE_NONE)
            head = next(reader, None)
            if head != LAW_COLS:
                warn(f'{f.name}: header is {head}, expected {LAW_COLS}')
                continue
            for ln, r in enumerate(reader, start=2):
                if not r or not any(r):
                    continue
                if len(r) != len(LAW_COLS):
                    warn(f'{f.name}:{ln}: {len(r)} columns instead of {len(LAW_COLS)}')
                    continue
                d = dict(zip(LAW_COLS, r))
                d['file'] = f.name
                if d['ref'] in seen:
                    warn(f'{f.name}:{ln}: duplicate clause ref "{d["ref"]}" (also in {seen[d["ref"]]})')
                    continue
                seen[d['ref']] = f.name
                rows.append(d)
    return rows


def ref_key(ref: str) -> tuple:
    """Sort key: document order of a ref such as 'PDPA 37'."""
    m = re.match(r'^(\S+)\s+(.*)$', ref)
    head, rest = (m.group(1), m.group(2)) if m else (ref, '')
    nums = tuple(int(x) if x.isdigit() else 0 for x in re.findall(r'\d+', rest))
    return (head, nums, rest)


def law_anchor(ref: str) -> str:
    return 'law-' + re.sub(r'[^0-9A-Za-zก-๙]+', '-', ref).strip('-')


def load_id_lock() -> dict[str, str]:
    p = SRC / 'srs' / 'id-lock.tsv'
    lock = {}
    if p.exists():
        for line in p.read_text(encoding='utf-8').splitlines():
            if '\t' in line:
                a, b = line.split('\t', 1)
                lock[a] = b
    return lock


def save_id_lock(lock: dict[str, str]) -> None:
    p = SRC / 'srs' / 'id-lock.tsv'
    p.parent.mkdir(parents=True, exist_ok=True)
    lines = [f'{k}\t{v}' for k, v in sorted(lock.items(), key=lambda kv: (kv[1].rsplit('-', 1)[0], kv[1]))]
    p.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def expand_law_table(args: dict, law: list[dict], lock: dict[str, str]) -> dict:
    """A generated requirement table from the clause rows that match the filters."""
    def wanted(key: str) -> set[str] | None:
        return {x.strip() for x in args[key].split(',')} if key in args else None
    scope, kind, cat, disp, docs = (wanted(k) for k in ('scope', 'kind', 'category', 'disposition', 'doc'))
    sel = [r for r in law if (not scope or r['scope'] in scope) and (not kind or r['kind'] in kind)
           and (not cat or r['category'] in cat) and (not disp or r['disposition'] in disp) and (not docs or r['doc'] in docs)]
    sel.sort(key=lambda r: (r['doc'], ref_key(r['ref'])))
    prefix_scope = args.get('prefix', 'XC')
    head = [{'th': 'รหัส', 'en': 'ID'}, {'th': 'ข้อกำหนด', 'en': 'Requirement'}, {'th': 'ข้อกฎหมาย', 'en': 'Clause'},
            {'th': 'ทวนสอบ', 'en': 'Verify'}]
    rows = []
    for r in sel:
        rid = lock.get(r['ref'])
        if not rid:
            pre = f'{prefix_scope}-{CAT_CODE.get(r["category"], "OTH")}-'
            used = [int(v.rsplit('-', 1)[1]) for v in lock.values() if v.startswith(pre)]
            rid = f'{pre}{(max(used) if used else 0) + 1:03d}'
            lock[r['ref']] = rid
        note = r['notes'].strip()
        th = r['th'].strip() + (f' *(หมายเหตุ: {note})*' if note and re.search(r'[ก-๙]', note) else '')
        en = r['en'].strip()
        rows.append([{'th': rid, 'en': rid}, {'th': th, 'en': en}, {'th': r['ref'], 'en': r['ref']},
                     {'th': r['verify'], 'en': r['verify']}])
    return {'t': 'table', 'head': head, 'rows': rows, 'align': ['', '', '', ''], 'key': 'ID', 'generated': True}


# ----------------------------------------------------------------------------------------------------------
# inline rendering
# ----------------------------------------------------------------------------------------------------------

CODE_RE = re.compile(r'`([^`]+)`')
ID_RE = re.compile(r'\b((?:XC|PLT|BGT|PRC|FIN|PRJ|REV)-(?:[A-Z]{2,3}-)?\d{3}|UC-[A-Z]{3}-\d{2}|BR-[A-Z]{3}-\d{2}|AC-[A-Z]{3}-\d{3}|TC-[A-Z0-9]+-\d{3}|ADR-\d{4}|FIG-[A-Za-z0-9.-]+)\b')
LAW_RE = re.compile(r'((?:PPA|PPR|PDPA) \d+(?:\.\d+)*)')


CUR = {'doc': 'srs'}


class Registry:
    def __init__(self) -> None:
        self.reqs: dict[str, dict] = {}       # id -> {section, cells..., law:[refs]}
        self.figs: dict[str, dict] = {}       # id -> {n, caption}
        self.ids: set[str] = set()            # anchors in use
        self.covers: dict[str, list[str]] = {}  # law ref -> [section ids]
        self.cover_doc: dict[str, str] = {}   # section id that holds a covers comment -> 'srs' or 'sds'
        self.law: dict[str, dict] = {}
        self.adrs: dict[str, str] = {}
        for p in sorted((ROOT / 'docs' / 'adr').glob('[0-9][0-9][0-9][0-9]-*.md')):
            self.adrs[f'ADR-{p.name[:4]}'] = p.name

    def anchor(self, ref: str) -> str | None:
        if ref in self.reqs:
            return ref
        if ref in self.figs:
            return 'fig-' + ref
        return None


def inline(text: str, reg: Registry, lang: str, loose: bool = False) -> str:
    holes: list[str] = []

    def hold(m: re.Match) -> str:
        holes.append(m.group(1))
        return f'\x00{len(holes) - 1}\x00'

    t = CODE_RE.sub(hold, text)
    t = html.escape(t, quote=False)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])', r'<em>\1</em>', t)

    def link(m: re.Match) -> str:
        url = m.group(2)
        ext = re.match(r'^https?://', url) is not None
        return f'<a href="{url}"' + (' target="_blank" rel="noopener"' if ext else '') + f'>{m.group(1)}</a>'

    t = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', link, t)
    parts = re.split(r'(<[^>]+>)', t)
    inside_a = False
    for k, part in enumerate(parts):
        if part.startswith('<'):
            if part.startswith('<a '):
                inside_a = True
            elif part.startswith('</a'):
                inside_a = False
            continue
        if inside_a:
            continue

        def ref_sub(m: re.Match) -> str:
            tok = m.group(1)
            if tok in reg.reqs:
                far = '' if reg.reqs[tok]['doc'] == CUR['doc'] else f'Fisko-{reg.reqs[tok]["doc"].upper()}.html'
                return f'<a class="ref" href="{far}#{tok}">{tok}</a>'
            if tok in reg.adrs:
                return f'<a class="ref" href="../../adr/{reg.adrs[tok]}" target="_blank" rel="noopener">{tok}</a>'
            if tok.startswith('FIG-') and tok[4:] in reg.figs:
                far = '' if reg.figs[tok[4:]]['doc'] == CUR['doc'] else f'Fisko-{reg.figs[tok[4:]]["doc"].upper()}.html'
                return f'<a class="ref" href="{far}#fig-{tok[4:]}">{tok}</a>'
            return tok

        def law_sub(m: re.Match) -> str:
            tok = m.group(1)
            return f'<a class="law" href="#{law_anchor(tok)}">{tok}</a>' if tok in reg.law else tok

        parts[k] = LAW_RE.sub(law_sub, ID_RE.sub(ref_sub, part))
    t = ''.join(parts)
    t = re.sub(r'\x00(\d+)\x00', lambda m: f'<code>{html.escape(holes[int(m.group(1))], quote=False)}</code>', t)
    return t


def bi(text: dict, reg: Registry, loose: bool = False) -> str:
    """The same text in both languages, each in its own span."""
    return ''.join(f'<span lang="{lg}">{inline(text[lg], reg, lg)}</span>' for lg in LANGS)


def bi_plain(th: str, en: str) -> str:
    return f'<span lang="th">{html.escape(th)}</span><span lang="en">{html.escape(en)}</span>'


# ----------------------------------------------------------------------------------------------------------
# SVG diagrams
# ----------------------------------------------------------------------------------------------------------

def load_svg(fig_id: str, lang: str, uid: str) -> str | None:
    p = DIAG_SVG / lang / f'{fig_id}.svg'
    if not p.exists():
        return None
    s = p.read_text(encoding='utf-8')
    s = re.sub(r'^<\?xml[^>]*\?>\s*', '', s)
    s = re.sub(r'<svg\b([^>]*)>', lambda m: '<svg' + clean_svg_attrs(m.group(1), fig_id, lang) + '>', s, count=1)
    # make element ids unique across the many inlined diagrams
    ids = set(re.findall(r'\bid="([^"]+)"', s))
    for i in sorted(ids, key=len, reverse=True):
        s = s.replace(f'id="{i}"', f'id="{uid}-{i}"').replace(f'url(#{i})', f'url(#{uid}-{i})').replace(f'href="#{i}"', f'href="#{uid}-{i}"')
    return s


def clean_svg_attrs(attrs: str, fig_id: str, lang: str) -> str:
    vb = re.search(r'viewBox="([^"]+)"', attrs)
    out = ' xmlns="http://www.w3.org/2000/svg" class="diagram"'
    if vb:
        out += f' viewBox="{vb.group(1)}"'
    out += ' role="img" preserveAspectRatio="xMidYMin meet"'
    return out


# ----------------------------------------------------------------------------------------------------------
# document model
# ----------------------------------------------------------------------------------------------------------

def slug(s: str) -> str:
    s = re.sub(r'[^A-Za-z0-9]+', '-', s).strip('-').lower()
    return s or 'section'


def load_doc(kind: str) -> dict:
    base = SRC / kind
    meta = json.loads((base / '_meta.json').read_text(encoding='utf-8'))
    blocks: list[dict] = []
    for fname in meta['files']:
        files = {lg: base / lg / fname for lg in LANGS}
        for lg, p in files.items():
            if not p.exists():
                raise SpecError(f'{kind}/{lg}/{fname} is missing (the {"English" if lg == "th" else "Thai"} twin exists)')
        th = parse_md(files['th'].read_text(encoding='utf-8'), f'{kind}/th/{fname}')
        en = parse_md(files['en'].read_text(encoding='utf-8'), f'{kind}/en/{fname}')
        blocks += merge_blocks(th, en, f'{kind}/{fname}')
    return {'kind': kind, 'meta': meta, 'blocks': blocks}


def prepare(doc: dict, law: list[dict], lock: dict[str, str], reg: Registry) -> None:
    """Pass 1: expand generated tables, number headings, register ids, figures, requirements and coverage."""
    sec = [0, 0, 0, 0]
    reg.ids = set()   # each document is its own page, so the same heading id may appear in both
    app = [0, 0, 0, 0]
    doc['heads'] = []
    in_app = False
    cur_head: dict | None = None
    blocks = []
    for b in doc['blocks']:
        if b['t'] == 'dir' and b['name'] == 'law-table':
            b = expand_law_table(b['args'], law, lock)
        blocks.append(b)
    doc['blocks'] = blocks
    fig_n = 0
    for b in blocks:
        if b['t'] == 'h':
            lv = b['level']
            if lv == 1:
                in_app = b['appendix']
            ctr = app if in_app else sec
            ctr[lv - 1] += 1
            for k in range(lv, 4):
                ctr[k] = 0
            nums = ctr[:lv]
            label = (chr(ord('A') + nums[0] - 1) + ''.join('.' + str(x) for x in nums[1:])) if in_app else '.'.join(map(str, nums))
            ident = b['id'] or slug(b['text']['en'])
            base, k = ident, 2
            while ident in reg.ids:
                ident = f'{base}-{k}'
                k += 1
            reg.ids.add(ident)
            b['num'], b['anchor'] = label, ident
            cur_head = {'level': lv, 'num': label, 'anchor': ident, 'text': b['text'], 'appendix': in_app}
            doc['heads'].append(cur_head)
        elif b['t'] == 'fig':
            fig_n += 1
            b['n'] = fig_n
            reg.figs[b['id']] = {'n': fig_n, 'caption': b['caption'], 'section': cur_head['anchor'] if cur_head else '', 'doc': doc['kind']}
        elif b['t'] == 'covers' and cur_head:
            for ref in b['refs']:
                reg.covers.setdefault(ref, []).append(cur_head['anchor'])
            reg.cover_doc[cur_head['anchor']] = doc['kind']
        elif b['t'] == 'table' and b.get('key') == 'ID':
            heads_en = [h['en'].strip() for h in b['head']]
            col = {h: k for k, h in enumerate(heads_en)}
            for row in b['rows']:
                rid = row[0]['en'].strip()
                if not re.match(r'^[A-Z0-9]+(?:-[A-Z0-9]+)+$', rid):
                    warn(f'{doc["kind"]}: "{rid}" in a requirement table does not look like an id')
                    continue
                if rid in reg.reqs:
                    warn(f'{doc["kind"]}: duplicate requirement id {rid}')
                law_refs: list[str] = []
                if 'Clause' in col:
                    for x in re.split(r'[;,]', row[col['Clause']]['en']):
                        x = x.strip()
                        if x and x != '-':
                            law_refs.append(x)
                reg.reqs[rid] = {'doc': doc['kind'], 'section': cur_head['anchor'] if cur_head else '', 'law': law_refs,
                                 'text': row[col['Requirement']] if 'Requirement' in col else row[1],
                                 'pri': row[col['Priority']]['en'] if 'Priority' in col else '',
                                 'ver': row[col['Verify']]['en'] if 'Verify' in col else '',
                                 'status': row[col['Status']]['en'] if 'Status' in col else '',
                                 'legacy': row[col['Prototype']]['en'] if 'Prototype' in col else ''}


def covered_refs(reg: Registry, law: list[dict], via: str) -> dict[str, list[str]]:
    """clause ref -> ids that answer it. via = 'srs' (requirement tables) or 'sds' (covers comments and diagrams)."""
    res: dict[str, list[str]] = {}
    cites: dict[str, list[str]] = {}
    if via == 'srs':
        for rid, r in reg.reqs.items():
            for ref in r['law']:
                cites.setdefault(ref, []).append(rid)
    for ref, secs in reg.covers.items():
        # a covers comment counts for the document that holds it (diagram covers, 'fig-', belong to the SDS)
        cites.setdefault(ref, []).extend(x for x in secs if reg.cover_doc.get(x, 'sds') == via)
    for r in law:
        ref = r['ref']
        hit = list(cites.get(ref, []))
        for c, ids in cites.items():
            if c.endswith('.*') and (ref == c[:-2] or ref.startswith(c[:-2] + '.') or ref.startswith(c[:-2] + ' (')):
                hit += ids
        if hit:
            res[ref] = sorted(set(hit))
    return res


# ----------------------------------------------------------------------------------------------------------
# rendering
# ----------------------------------------------------------------------------------------------------------

ICONS = {
    'NOTE': '<path d="M12 8v5m0 3h.01M12 3a9 9 0 100 18 9 9 0 000-18z"/>',
    'WARN': '<path d="M12 9v4m0 3h.01M10.3 4l-8 14a2 2 0 001.7 3h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z"/>',
    'OPEN': '<path d="M9.1 9a3 3 0 115.8 1c0 2-3 2.5-3 4.5M12 18h.01M12 3a9 9 0 100 18 9 9 0 000-18z"/>',
    'LAW': '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7"/>',
}
CALLOUT_LABEL = {'NOTE': ('หมายเหตุ', 'Note'), 'WARN': ('ข้อควรระวัง', 'Caution'),
                 'OPEN': ('ประเด็นที่ยังต้องตัดสินใจ', 'Open question'), 'LAW': ('ข้อกฎหมาย', 'Legal clause')}


def icon(name: str) -> str:
    return f'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>'


def render_items(items: list[dict], reg: Registry) -> str:
    out = []
    for it in items:
        sub = ''
        if it['sub']:
            tag = it['sub']['t']
            sub = f'<{tag}>{render_items(it["sub"]["items"], reg)}</{tag}>'
        out.append(f'<li>{bi(it["text"], reg)}{sub}</li>')
    return ''.join(out)


def render_table(b: dict, reg: Registry) -> str:
    is_req = b.get('key') == 'ID'
    cls = 'req' if is_req else ''
    head = ''.join(f'<th scope="col">{bi(h, reg)}</th>' for h in b['head'])
    rows = []
    for row in b['rows']:
        tds = []
        for k, cell in enumerate(row):
            al = ' class="num"' if b['align'][k] == 'r' else ''
            if is_req and k == 0:
                rid = cell['en'].strip()
                tds.append(f'<td class="id"><a href="#{html.escape(rid)}">{html.escape(rid)}</a></td>')
            else:
                tds.append(f'<td{al}>{bi(cell, reg)}</td>')
        rid_attr = ''
        if is_req and re.match(r'^[A-Z0-9]+(?:-[A-Z0-9]+)+$', row[0]['en'].strip()):
            rid_attr = f' id="{html.escape(row[0]["en"].strip())}"'
        rows.append(f'<tr{rid_attr}>{"".join(tds)}</tr>')
    filt = ''
    if is_req and len(b['rows']) > 12:
        filt = (f'<div class="tfilter"><label><span class="sr-only">{bi_plain("กรองตาราง", "Filter the table")}</span>'
                f'<input type="search" data-filter placeholder="" aria-label="filter"></label>'
                f'<span class="count" aria-live="polite"></span></div>')
    return f'{filt}<div class="tw"><table class="{cls}"><thead><tr>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table></div>'


def render_screen(b: dict, reg: Registry) -> str:
    """A prototype screen captured by scripts/capture_screens.py: one WebP per language, shown with the language switch."""
    fid = b['id']
    shots = []
    for lg in LANGS:
        p = SCREENS / lg / f'{fid}.webp'
        if p.exists():
            data = base64.b64encode(p.read_bytes()).decode('ascii')
            shots.append(f'<div class="svgwrap" lang="{lg}"><img class="shot" loading="lazy" src="data:image/webp;base64,{data}" alt="{html.escape(b["caption"][lg])}"></div>')
        else:
            warn(f'screen {fid}: screens/{lg}/{fid}.webp is missing; run scripts/capture_screens.py')
            shots.append(f'<div class="svgwrap" lang="{lg}"><div class="missing">{html.escape(fid)} ({lg}): screen not captured yet</div></div>')
    return (f'<figure id="fig-{fid}" class="fig screen"><div class="figbox">{"".join(shots)}'
            f'<button type="button" class="expand" data-expand aria-label="expand"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>'
            f'<span>{bi_plain("ขยาย", "Expand")}</span></button></div>'
            f'<figcaption><strong>{bi_plain("รูปที่", "Figure")} {b["n"]}</strong> {bi(b["caption"], reg)}</figcaption></figure>')


def render_fig(b: dict, reg: Registry, uid_counter: list[int]) -> str:
    if b.get('kind') == 'screen':
        return render_screen(b, reg)
    uid_counter[0] += 1
    fid = b['id']
    svgs = []
    missing = False
    for lg in LANGS:
        s = load_svg(fid, lg, f'f{uid_counter[0]}{lg}')
        if s is None:
            missing = True
            warn(f'figure {fid}: diagrams/svg/{lg}/{fid}.svg is missing; run scripts/render_diagrams.py')
            s = f'<div class="missing">{html.escape(fid)} ({lg}): diagram not rendered yet</div>'
        svgs.append(f'<div class="svgwrap" lang="{lg}">{s}</div>')
    src = DIAG_SRC / f'{fid}.puml'
    srcblock = ''
    if src.exists():
        body = html.escape(src.read_text(encoding='utf-8'))
        srcblock = (f'<details class="src"><summary>{bi_plain("ต้นฉบับ PlantUML (แก้ไขได้)", "PlantUML source (editable)")}</summary>'
                    f'<pre><code>{body}</code></pre></details>')
    cap = bi(b['caption'], reg)
    return (f'<figure id="fig-{fid}" class="fig"><div class="figbox">{"".join(svgs)}'
            f'<button type="button" class="expand" data-expand aria-label="expand"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>'
            f'<span>{bi_plain("ขยาย", "Expand")}</span></button></div>'
            f'<figcaption><strong>{bi_plain("รูปที่", "Figure")} {b["n"]}</strong> {cap}</figcaption>{srcblock}</figure>')


def render_coverage(doc: dict, reg: Registry, law: list[dict]) -> str:
    kind = doc['kind']
    mine = 'SRS' if kind == 'srs' else 'SDS'
    cov = covered_refs(reg, law, kind)
    rows_all = sorted(law, key=lambda r: (r['doc'], ref_key(r['ref'])))
    total = {'SRS': 0, 'SDS': 0}
    done = {'SRS': 0, 'SDS': 0}
    body = []
    for r in rows_all:
        disp = r['disposition']
        if disp in total:
            total[disp] += 1
            if r['ref'] in cov:
                done[disp] += 1
        where = ''
        if r['ref'] in cov:
            ids = cov[r['ref']]
            where = ', '.join(f'<a href="{"" if reg.reqs.get(i, {"doc": CUR["doc"]})["doc"] == CUR["doc"] else "Fisko-SRS.html"}#{i}">{html.escape(i)}</a>' for i in ids[:6]) + (f' (+{len(ids) - 6})' if len(ids) > 6 else '')
            state = 'ok'
        elif disp == mine:
            state = 'gap'
        else:
            state = 'other'
        label = {'ok': ('ครอบคลุมแล้ว', 'Covered'), 'gap': ('ยังไม่จัดทำ', 'Not yet specified'),
                 'other': ({'SRS': 'ตอบใน SRS', 'SDS': 'ตอบใน SDS', 'PLAN': 'ตอบในแผนงาน', 'COM': 'เงื่อนไขเชิงพาณิชย์', 'INFO': 'ข้อมูลประกอบ'}.get(disp, disp),
                           {'SRS': 'Answered in the SRS', 'SDS': 'Answered in the SDS', 'PLAN': 'Answered in a plan', 'COM': 'Commercial term', 'INFO': 'Background'}.get(disp, disp))}[state]
        rows_text = bi({'th': r['th'], 'en': r['en']}, reg)
        body.append(f'<tr id="{law_anchor(r["ref"])}" data-state="{state}"><td class="id">{html.escape(r["ref"])}</td>'
                    f'<td>{html.escape(r["scope"])}</td><td>{html.escape(disp)}</td><td>{rows_text}</td>'
                    f'<td><span class="pill {state}">{bi_plain(*label)}</span> {where}</td></tr>')
    ok, tot = done[mine], total[mine]
    pct = f'{ok / tot * 100:.0f}' if tot else '0'
    summary = (f'<div class="covsum"><div><b>{ok}</b> / {tot}</div><div>{bi_plain(f"ข้อกำหนดที่ต้องตอบใน {mine} และจัดทำแล้ว ({pct}%)", f"Clauses owed to the {mine} that are specified ({pct}%)")}</div></div>'
               f'<div class="tfilter"><label><span class="sr-only">filter</span><input type="search" data-filter aria-label="filter"></label>'
               f'<select data-state-filter aria-label="state"><option value="">{bi_plain("ทุกสถานะ", "All states")}</option>'
               f'<option value="gap">{bi_plain("ยังไม่จัดทำ", "Not yet specified")}</option><option value="ok">{bi_plain("ครอบคลุมแล้ว", "Covered")}</option>'
               f'<option value="other">{bi_plain("ตอบที่อื่น", "Answered elsewhere")}</option></select><span class="count" aria-live="polite"></span></div>')
    head = ''.join(f'<th scope="col">{bi_plain(a, b)}</th>' for a, b in
                   [('ข้อกฎหมาย', 'Clause'), ('ระบบ', 'Scope'), ('ตอบใน', 'Owed to'), ('ข้อกำหนด', 'Requirement'), ('สถานะ', 'Status')])
    return f'{summary}<div class="tw"><table class="req cov"><thead><tr>{head}</tr></thead><tbody>{"".join(body)}</tbody></table></div>'


STATUS_TYPES = [('FR', 'ฟังก์ชัน', 'Functional'), ('DR', 'ข้อมูล', 'Data'), ('IR', 'การเชื่อมต่อ', 'Interface'),
                ('NFR', 'ที่ไม่ใช่ฟังก์ชัน', 'Non-functional'), ('CR', 'ข้อจำกัด', 'Constraint')]
MODULES = (('PLT', 'แพลตฟอร์ม', 'Platform'), ('BGT', 'งบประมาณ', 'Budget'), ('PRC', 'จัดซื้อจัดจ้าง', 'Procurement'),
           ('FIN', 'การเงิน', 'Finance'), ('PRJ', 'ทะเบียนโครงการ', 'Projects'), ('REV', 'ทบทวนและวิเคราะห์', 'Review and analytics'))
STATUSES = ('Prototyped', 'Partial', 'Planned')


def status_counts(reg: Registry, prefix: str) -> dict[str, dict[str, int]]:
    """prefix like 'PRC' -> {type: {status: n}} counted from the requirement tables (real requirement ids only)."""
    out: dict[str, dict[str, int]] = {t[0]: {s: 0 for s in STATUSES} for t in STATUS_TYPES}
    for rid, r in reg.reqs.items():
        m = REQ_ID.match(rid)
        if not m or not rid.startswith(prefix + '-'):
            continue
        typ = rid.split('-')[1]
        st = r['status'].strip()
        if typ in out and st in out[typ]:
            out[typ][st] += 1
    return out


def render_status_summary(reg: Registry, prefix: str) -> str:
    c = status_counts(reg, prefix)
    head = ''.join(f'<th>{bi_plain(*h)}</th>' for h in (('ชนิด', 'Type'), ('มีในต้นแบบ (Prototyped)', 'Prototyped'),
                                                       ('บางส่วน (Partial)', 'Partial'), ('วางแผน (Planned)', 'Planned'), ('รวม', 'Total')))
    rows, tot = [], {s: 0 for s in STATUSES}
    for typ, th, en in STATUS_TYPES:
        v = c[typ]
        n = sum(v.values())
        if not n:
            continue
        for s in STATUSES:
            tot[s] += v[s]
        rows.append(f'<tr><td>{bi_plain(th, en)} <code>{prefix}-{typ}</code></td>' + ''.join(f'<td>{v[s]}</td>' for s in STATUSES) + f'<td>{n}</td></tr>')
    rows.append(f'<tr><td><strong>{bi_plain("รวม", "Total")}</strong></td>' + ''.join(f'<td><strong>{tot[s]}</strong></td>' for s in STATUSES)
                + f'<td><strong>{sum(tot.values())}</strong></td></tr>')
    return f'<div class="tw"><table><thead><tr>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table></div>'


def render_status_matrix(reg: Registry) -> str:
    head = ''.join(f'<th>{bi_plain(*h)}</th>' for h in (('ชุดข้อกำหนด', 'Set'), ('จำนวน', 'Rows'), ('มีในต้นแบบ', 'Prototyped'),
                                                       ('บางส่วน', 'Partial'), ('วางแผน', 'Planned')))
    rows, grand = [], {s: 0 for s in STATUSES}
    xc = sum(1 for k in reg.reqs if k.startswith('XC-') and REQ_ID.match(k))
    rows.append(f'<tr><td>{bi_plain("ข้อกำหนดร่วมที่สร้างจากทะเบียนข้อกฎหมาย (XC)", "Cross-cutting (XC) generated from the clause register")}</td><td>{xc}</td>'
                f'<td colspan="3">{bi_plain("ไม่ประเมินสถานะ", "not assessed")}</td></tr>')
    for prefix, mod_th, mod_en in MODULES:
        c = status_counts(reg, prefix)
        tot = {s: sum(c[t][s] for t in c) for s in STATUSES}
        label = bi_plain(mod_th, mod_en)
        for s in STATUSES:
            grand[s] += tot[s]
        rows.append(f'<tr><td>{label}</td><td>{sum(tot.values())}</td>' + ''.join(f'<td>{tot[s]}</td>' for s in STATUSES) + '</tr>')
    rows.append(f'<tr><td><strong>{bi_plain("รวมทุกระบบ (ไม่รวม XC)", "All systems (without XC)")}</strong></td><td><strong>{sum(grand.values())}</strong></td>'
                + ''.join(f'<td><strong>{grand[s]}</strong></td>' for s in STATUSES) + '</tr>')
    return f'<div class="tw"><table><thead><tr>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table></div>'


def render_figures_list(reg: Registry) -> str:
    items = []
    for fid, f in sorted(((k, v) for k, v in reg.figs.items() if v['doc'] == CUR['doc']), key=lambda kv: kv[1]['n']):
        items.append(f'<li><a href="#fig-{fid}"><strong>{bi_plain("รูปที่", "Figure")} {f["n"]}</strong> {bi(f["caption"], reg)}</a></li>')
    return f'<ol class="figlist" style="list-style:none;padding:0">{"".join(items)}</ol>'


def render(doc: dict, reg: Registry, law: list[dict], css: str, js: str, fonts_css: str) -> str:
    CUR['doc'] = doc['kind']
    meta = doc['meta']
    out: list[str] = []
    uid = [0]
    toc: list[str] = []
    for h in doc['heads']:
        if h['level'] <= 2 or (h['level'] == 3 and not h['appendix']):
            toc.append(f'<li class="l{h["level"]}"><a href="#{h["anchor"]}"><span class="n">{h["num"]}</span> {unlink(bi(h["text"], reg))}</a></li>')
    for b in doc['blocks']:
        t = b['t']
        if t == 'h':
            lv = b['level'] + 1
            out.append(f'<h{lv} id="{b["anchor"]}"><a class="anc" href="#{b["anchor"]}" aria-label="link"><span class="n">{b["num"]}</span></a> {bi(b["text"], reg)}</h{lv}>')
        elif t == 'p':
            out.append(f'<p>{bi(b["text"], reg)}</p>')
        elif t in ('ul', 'ol'):
            out.append(f'<{t}>{render_items(b["items"], reg)}</{t}>')
        elif t == 'table':
            out.append(render_table(b, reg))
        elif t == 'code':
            if b['text']['th'] == b['text']['en']:
                out.append(f'<pre class="code"><code>{html.escape(b["text"]["en"])}</code></pre>')
            else:
                out.append(''.join(f'<pre class="code" lang="{lg}"><code>{html.escape(b["text"][lg])}</code></pre>' for lg in LANGS))
        elif t == 'quote':
            lab = CALLOUT_LABEL[b['kind']]
            out.append(f'<aside class="callout {b["kind"].lower()}">{icon(b["kind"])}<div><strong class="ct">{bi_plain(*lab)}</strong> {bi(b["text"], reg)}</div></aside>')
        elif t == 'hr':
            out.append('<hr>')
        elif t == 'fig':
            out.append(render_fig(b, reg, uid))
        elif t == 'dir':
            if b['name'] == 'coverage':
                out.append(render_coverage(doc, reg, law))
            elif b['name'] == 'figures':
                out.append(render_figures_list(reg))
            elif b['name'] == 'status-summary':
                out.append(render_status_summary(reg, b['args'].get('prefix', '')))
            elif b['name'] == 'status-matrix':
                out.append(render_status_matrix(reg))
    body = '\n'.join(out)
    title = meta['title']
    status = meta['status']
    ver = meta['version']
    date = meta['date']
    cover = f'''<header class="cover" id="top">
  <p class="org">Fisko</p>
  <h1>{bi_plain(title['th'], title['en'])}</h1>
  <p class="sub">{bi_plain(meta['subtitle']['th'], meta['subtitle']['en'])}</p>
  <dl class="docmeta">
    <div><dt>{bi_plain("รหัสเอกสาร", "Document code")}</dt><dd>{html.escape(meta['code'])}</dd></div>
    <div><dt>{bi_plain("ฉบับ", "Version")}</dt><dd>{html.escape(ver)}</dd></div>
    <div><dt>{bi_plain("วันที่", "Date")}</dt><dd>{html.escape(date)}</dd></div>
    <div><dt>{bi_plain("สถานะ", "Status")}</dt><dd>{bi_plain(status['th'], status['en'])}</dd></div>
  </dl>
</header>'''
    other = 'sds' if doc['kind'] == 'srs' else 'srs'
    page = f'''<!doctype html>
<html lang="th" data-lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(meta['code'])} · {html.escape(title['en'])}</title>
<meta name="description" content="{html.escape(meta['subtitle']['en'])}">
<style>{fonts_css}
{css}</style>
</head>
<body>
<a class="skip" href="#content">{bi_plain("ข้ามไปเนื้อหา", "Skip to content")}</a>
<div class="bar" role="banner">
  <button type="button" class="menu" data-menu aria-label="menu" aria-expanded="false"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
  <span class="code">{html.escape(meta['code'])}</span>
  <span class="ttl">{bi_plain(title['th'], title['en'])}</span>
  <span class="grow"></span>
  <span class="badge">{bi_plain(status['th'], status['en'])} · {html.escape(ver)}</span>
  <a class="btn" href="Fisko-{other.upper()}.html">{bi_plain("ไปที่ " + other.upper(), "Open the " + other.upper())}</a>
  <div class="seg" role="group" aria-label="language"><button type="button" data-set-lang="th" aria-pressed="true">ไทย</button><button type="button" data-set-lang="en" aria-pressed="false">EN</button></div>
</div>
<div class="shell">
<nav class="toc" aria-label="{bi_plain('สารบัญ', 'Contents')[0:0]}contents">
  <label class="tocfilter"><span class="sr-only">filter</span><input type="search" data-toc-filter placeholder="" aria-label="filter"></label>
  <ol>{"".join(toc)}</ol>
</nav>
<main id="content" tabindex="-1">
{cover}
<section class="toc-inline"><h2>{bi_plain("สารบัญ", "Contents")}</h2><ol>{"".join(toc)}</ol></section>
{body}
<footer class="foot"><p>{html.escape(meta['code'])} · {html.escape(ver)} · {html.escape(date)} · {bi_plain("สร้างจากไฟล์ต้นฉบับใน docs/spec/src ด้วย scripts/build_spec.py", "Built from docs/spec/src with scripts/build_spec.py")}</p></footer>
</main>
</div>
<dialog id="zoom" aria-label="diagram"><button type="button" data-close aria-label="close">×</button><div class="zbody"></div></dialog>
<script>{js}</script>
</body>
</html>
'''
    return page


# ----------------------------------------------------------------------------------------------------------
# outputs
# ----------------------------------------------------------------------------------------------------------

REQ_ID = re.compile(r'^((PLT|BGT|PRC|FIN|PRJ|REV)-(FR|NFR|IR|DR|CR)-\d+|XC-[A-Z]+-\d+)$')


def write_rtm(reg: Registry) -> pathlib.Path:
    p = DIST / 'Fisko-SRS-rtm.csv'
    with p.open('w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh)
        w.writerow(['Req ID', 'Section', 'Requirement (TH)', 'Requirement (EN)', 'Clause', 'Priority', 'Verify', 'Status', 'Prototype ref'])
        for rid, r in sorted(reg.reqs.items()):
            if not REQ_ID.match(rid):   # acceptance scenarios, tests, gaps and business rules are numbered tables, not requirements
                continue
            w.writerow([rid, r['section'], re.sub(r'[*`]', '', r['text']['th']), re.sub(r'[*`]', '', r['text']['en']),
                        '; '.join(r['law']), r['pri'], r['ver'], r['status'], r['legacy']])
    return p


def write_coverage_csv(srs_cov: dict, sds_cov: dict, law: list[dict]) -> pathlib.Path:
    p = DIST / 'Fisko-clause-coverage.csv'
    with p.open('w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh)
        w.writerow(['Clause', 'Doc', 'Scope', 'Kind', 'Category', 'Disposition', 'Requirement (EN)', 'SRS ids', 'SDS sections'])
        for r in sorted(law, key=lambda r: (r['doc'], ref_key(r['ref']))):
            w.writerow([r['ref'], r['doc'], r['scope'], r['kind'], r['category'], r['disposition'], r['en'],
                        '; '.join(srs_cov.get(r['ref'], [])), '; '.join(sds_cov.get(r['ref'], []))])
    return p


def print_pdfs(kind: str) -> None:
    edge = pathlib.Path(r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe')
    if not edge.exists():
        warn('Edge not found; PDFs skipped')
        return
    src = DIST / f'Fisko-{kind.upper()}.html'
    for lg in LANGS:
        out = DIST / f'Fisko-{kind.upper()}-{lg}.pdf'
        url = src.as_uri() + f'?lang={lg}&print=1'
        subprocess.run([str(edge), '--headless=new', '--disable-gpu', '--no-pdf-header-footer', f'--print-to-pdf={out}', url],
                       check=False, capture_output=True, timeout=240)
        print(f'  {out.name}: {out.stat().st_size // 1024:,} KB' if out.exists() else f'  {out.name}: NOT written')


def font_css() -> str:
    def b64(name: str) -> str:
        return base64.b64encode((FONTS / name).read_bytes()).decode()
    css = (FONTS / 'fonts.css').read_text(encoding='utf-8')
    for name in ('Anuphan-thai-0', 'Anuphan-latin-1'):
        css = css.replace(f'url({name}.woff2)', f'url(data:font/woff2;base64,{b64(name + ".woff2")})')
    return css


def unlink(markup: str) -> str:
    """Table-of-contents entries are links already: drop links nested in a heading (invalid HTML otherwise)."""
    return re.sub(r'<a\b[^>]*>(.*?)</a>', r'\1', markup)


def main(argv: list[str]) -> int:
    want = [a for a in argv if a in ('srs', 'sds')] or ['srs', 'sds']
    pdf = '--pdf' in argv
    DIST.mkdir(parents=True, exist_ok=True)
    law = load_law()
    lock = load_id_lock()
    lock_before = dict(lock)
    css = (SRC / 'assets' / 'spec.css').read_text(encoding='utf-8')
    js = (SRC / 'assets' / 'spec.js').read_text(encoding='utf-8')
    fonts = font_css()
    try:
        docs = {k: load_doc(k) for k in ('srs', 'sds')}
        reg = Registry()
        reg.law = {r['ref']: r for r in law}
        # one registry for both documents so that cross references between them resolve
        for k in ('srs', 'sds'):
            prepare(docs[k], law, lock, reg)
    except SpecError as e:
        print(f'ERROR: {e}', file=sys.stderr)
        return 1
    if lock != lock_before:
        save_id_lock(lock)
    # diagram sources can declare which clauses they answer: "' law: PDPA 37; PPR 162"
    for p in sorted(DIAG_SRC.glob('*.puml')):
        m = re.search(r"^'\s*law:\s*(.+)$", p.read_text(encoding='utf-8'), re.M)
        if m and p.stem in reg.figs:
            for ref in [x.strip() for x in m.group(1).split(';') if x.strip()]:
                reg.covers.setdefault(ref, []).append('fig-' + p.stem)
    srs_cov = covered_refs(reg, law, 'srs')
    sds_cov = covered_refs(reg, law, 'sds')
    for k in want:
        # the SDS coverage table links to the SDS, so render each document with its own view of the registry
        page = render(docs[k], reg, law, css, js, fonts)
        out = DIST / f'Fisko-{k.upper()}.html'
        out.write_text(page, encoding='utf-8')
        print(f'{out.relative_to(ROOT)}: {len(page) // 1024:,} KB')
        if pdf:
            print_pdfs(k)
    if '--no-docx' not in argv:
        # editable Word files (every document has a Word version) from the same parsed blocks, so they always match the HTML
        import build_docx
        for k in want:
            for lg in LANGS:
                p = build_docx.spec_docx(docs[k], reg, law, lg)
                print(f'{p.relative_to(ROOT)}: {p.stat().st_size // 1024:,} KB')
        WARNINGS.extend(build_docx.bs.WARNINGS)
    print(f'{write_rtm(reg).relative_to(ROOT)}: {sum(1 for k in reg.reqs if REQ_ID.match(k))} requirements')
    print(f'{write_coverage_csv(srs_cov, sds_cov, law).relative_to(ROOT)}: {len(law)} clauses '
          f'({sum(1 for r in law if r["disposition"] == "SRS")} owed to the SRS, {sum(1 for r in law if r["disposition"] == "SDS")} to the SDS)')
    unresolved = sorted({m for k in want for b in docs[k]['blocks'] if b['t'] == 'p' for lg in LANGS
                         for m in ID_RE.findall(b['text'][lg]) if m not in reg.reqs and m not in reg.adrs and not m.startswith(('FIG-', 'UC-', 'BR-', 'AC-', 'TC-'))})
    if unresolved:
        warn('ids mentioned in text but not defined: ' + ', '.join(unresolved[:20]))
    for w in WARNINGS:
        print(f'warning: {w}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
