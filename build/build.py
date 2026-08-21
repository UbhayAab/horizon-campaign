# -*- coding: utf-8 -*-
"""Convert the Horizon playbook markdown into the WARD PAPER artifact HTML."""
import re, json, html, io, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'PLAYBOOK.md')
SHELL = os.path.join(os.path.dirname(__file__), 'shell.html')
OUT = os.path.join(ROOT, 'site', 'index.html')

text = io.open(SRC, encoding='utf-8').read()

# Split the front matter off: the masthead already carries the title, and the
# two standing notes read better as a lede than as a numbered section.
NL = chr(10)
_i = text.index(NL + '# 1.')
_pre = text[:_i]
text = text[_i + 1:]
_pre_paras = [p.strip() for p in _pre.split(NL + NL)
              if p.strip() and not p.strip().startswith('#') and p.strip() != '---']


# ---------------------------------------------------------------- helpers
ENTITY = re.compile(r'&(?:[a-zA-Z][a-zA-Z0-9]{1,10}|#\d{1,6}|#x[0-9a-fA-F]{1,6});')

def esc(s):
    """Escape < > and bare & without double-escaping existing entities."""
    out = []
    i = 0
    for m in ENTITY.finditer(s):
        out.append(s[i:m.start()].replace('&', '&amp;'))
        out.append(m.group(0))
        i = m.end()
    out.append(s[i:].replace('&', '&amp;'))
    s = ''.join(out)
    return s.replace('<', '&lt;').replace('>', '&gt;')

CELL_SPLIT = re.compile(r'(?<!\\)\|')

def split_row(line):
    """Split a markdown table row on unescaped pipes, then unescape the rest."""
    body = line.strip()
    if body.startswith('|'): body = body[1:]
    if body.endswith('|') and not body.endswith('\\|'): body = body[:-1]
    return [c.strip().replace('\\|', '|') for c in CELL_SPLIT.split(body)]

def slug(s):
    s = re.sub(r'[^a-zA-Z0-9\s-]', '', s).strip().lower()
    return re.sub(r'[\s-]+', '-', s)[:60]

TOKEN = re.compile(r'\{\{[A-Z_:a-z0-9]+\}\}')
FILL = re.compile(r'&lt;FILL:[^&]*&gt;')
UTM = re.compile(r'(utm_[a-z]+=[A-Za-z0-9_\-]+)')

def decorate_pre(s):
    """Highlight merge tokens, FILL placeholders and UTM params inside specimens."""
    s = FILL.sub(lambda m: '<span class="fill">' + m.group(0) + '</span>', s)
    s = TOKEN.sub(lambda m: '<span class="tok">' + m.group(0) + '</span>', s)
    s = UTM.sub(lambda m: '<span class="utm">' + m.group(0) + '</span>', s)
    return s

def inline(s):
    s = esc(s)
    s = re.sub(r'`([^`]+)`', lambda m: '<code>' + m.group(1) + '</code>', s)
    s = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)',
               lambda m: '<a href="' + m.group(2) + '" target="_blank" rel="noopener">' + m.group(1) + '</a>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', lambda m: '<strong>' + m.group(1) + '</strong>', s)
    s = re.sub(r'(?<![\*\w])\*([^*\n]+)\*(?!\*)', lambda m: '<em>' + m.group(1) + '</em>', s)
    s = TOKEN.sub(lambda m: '<code class="tok">' + m.group(0) + '</code>', s)
    return s

# ---------------------------------------------------------------- block parse
lines = text.split('\n')
out = []
toc = []          # (level, id, title)
i = 0
n = len(lines)
open_section = False
seen_ids = {}

def uid(base):
    c = seen_ids.get(base, 0)
    seen_ids[base] = c + 1
    return base if c == 0 else '%s-%d' % (base, c + 1)

def close_section():
    global open_section
    if open_section:
        out.append('</section>')
        open_section = False

while i < n:
    line = lines[i]
    st = line.strip()

    # ---- fenced code
    if st.startswith('```'):
        lang = st[3:].strip().lower()
        i += 1
        buf = []
        while i < n and not lines[i].strip().startswith('```'):
            buf.append(lines[i]); i += 1
        i += 1
        body = '\n'.join(buf)
        if lang == 'mermaid':
            out.append('<figure class="diagram"><div class="diagram-scroll">'
                       '<pre class="mermaid">' + esc(body) + '</pre></div>'
                       '<figcaption>The full branch map. Every arrow is a cut a person makes, '
                       'not a rule the platform enforces.</figcaption></figure>')
        else:
            cls = 'specimen' if ('Dear ' in body or 'Hi ' in body or 'Warm regards' in body
                                 or 'Subject:' in body) else 'code'
            out.append('<div class="pre-wrap"><pre class="' + cls + '"><code>'
                       + decorate_pre(esc(body)) + '</code></pre></div>')
        continue

    # ---- heading
    m = re.match(r'^(#{1,4})\s+(.*)$', st)
    if m:
        lvl = len(m.group(1)); title = m.group(2).strip()
        if lvl == 1:
            close_section()
            sid = uid('s-' + slug(title))
            toc.append((1, sid, title))
            num = ''
            mm = re.match(r'^(\d+)\.\s*(.*)$', title)
            label = title
            if mm:
                num = mm.group(1); label = mm.group(2)
            out.append('<section id="' + sid + '" class="sec">')
            open_section = True
            out.append('<header class="sec-head">'
                       + ('<span class="sec-num">' + num + '</span>' if num else '')
                       + '<h2>' + inline(label) + '</h2></header>')
        elif lvl == 2:
            sid = uid('h-' + slug(title))
            toc.append((2, sid, title))
            out.append('<h3 id="' + sid + '">' + inline(title) + '</h3>')
        elif lvl == 3:
            out.append('<h4>' + inline(title) + '</h4>')
        else:
            out.append('<h5>' + inline(title) + '</h5>')
        i += 1
        continue

    # ---- hr
    if re.match(r'^(---+|\*\*\*+)$', st):
        out.append('<hr>')
        i += 1
        continue

    # ---- table
    if st.startswith('|') and i + 1 < n and re.match(r'^\|[\s:\-|]+\|$', lines[i+1].strip()):
        head = split_row(st)
        i += 2
        rows = []
        while i < n and lines[i].strip().startswith('|'):
            rows.append(split_row(lines[i].strip()))
            i += 1
        # A key/value spec table ships with an empty header row. Rendering it as a
        # blank band is worse than dropping it and letting column one be the label.
        bare = not any(h for h in head)
        t = ['<div class="table-wrap"><table' + (' class="spec"' if bare else '') + '>']
        if not bare:
            t.append('<thead><tr>')
            for h in head:
                t.append('<th>' + inline(h) + '</th>')
            t.append('</tr></thead>')
        t.append('<tbody>')
        for r in rows:
            t.append('<tr>')
            for c in r:
                cls = ''
                low = c.lower()
                if re.match(r'^\*?\*?(p0|blocker)', low): cls = ' class="c-crit"'
                t.append('<td' + cls + '>' + inline(c) + '</td>')
            t.append('</tr>')
        t.append('</tbody></table></div>')
        out.append(''.join(t))
        continue

    # ---- blockquote
    if st.startswith('> '):
        buf = []
        while i < n and lines[i].strip().startswith('>'):
            buf.append(lines[i].strip().lstrip('>').strip()); i += 1
        out.append('<blockquote>' + inline(' '.join(buf)) + '</blockquote>')
        continue

    # ---- list
    if re.match(r'^([-*]|\d+\.)\s+', st):
        ordered = bool(re.match(r'^\d+\.\s+', st))
        tag = 'ol' if ordered else 'ul'
        items = []
        while i < n:
            s2 = lines[i].strip()
            m2 = re.match(r'^(?:[-*]|\d+\.)\s+(.*)$', s2)
            if m2:
                items.append([m2.group(1)])
            elif s2 and not re.match(r'^(#{1,4}\s|\||```|---)', s2) and items and lines[i].startswith(('  ', '\t')):
                items[-1].append(s2)
            else:
                break
            i += 1
        out.append('<' + tag + '>' + ''.join('<li>' + inline(' '.join(it)) + '</li>' for it in items) + '</' + tag + '>')
        continue

    # ---- blank
    if not st:
        i += 1
        continue

    # ---- paragraph
    buf = []
    while i < n and lines[i].strip() and not re.match(r'^(#{1,4}\s|\||```|>\s|---+$|([-*]|\d+\.)\s)', lines[i].strip()):
        buf.append(lines[i].strip()); i += 1
    para = ' '.join(buf)
    cls = ''
    if para.startswith('**CTA:**') or para.startswith('**Words:**') or para.startswith('**CTA:'):
        cls = ' class="meta-line"'
    elif para.startswith('**Craft note') or para.startswith('*Craft note'):
        cls = ' class="craft"'
    elif para.startswith('**From:**') or para.startswith('**Subject:**') or para.startswith('**Reply-to:**'):
        cls = ' class="envelope"'
    out.append('<p' + cls + '>' + inline(para) + '</p>')

close_section()
lede = '<div class="lede">' + ''.join('<p>' + inline(p) + '</p>' for p in _pre_paras) + '</div>'
body_html = lede + '\n' + '\n'.join(out)

# ---------------------------------------------------------------- TOC
tocbits = []
for lvl, sid, title in toc:
    if lvl == 1:
        mm = re.match(r'^(\d+)\.\s*(.*)$', title)
        num, label = (mm.group(1), mm.group(2)) if mm else ('', title)
        tocbits.append('<a class="toc-1" href="#' + sid + '"><span class="toc-num">'
                       + num + '</span><span>' + html.escape(label) + '</span></a>')
    else:
        if len(title) > 62:
            title = title[:60] + '\u2026'
        tocbits.append('<a class="toc-2" href="#' + sid + '">' + html.escape(title) + '</a>')
toc_html = '\n'.join(tocbits)

shell = io.open(SHELL, encoding='utf-8').read()
doc = shell.replace('<!--TOC-->', toc_html).replace('<!--BODY-->', body_html)
io.open(OUT, 'w', encoding='utf-8').write(doc)
print('sections', sum(1 for l, _, _ in toc if l == 1), '| toc entries', len(toc), '| html chars', len(doc))
