# Dev helper: python3 scripts/patch-icon.py <category> <slug> '<new body>'
import re, sys
cat, slug, body = sys.argv[1:4]
p = f'icons-src/{cat}.mjs'
s = open(p).read()
m = re.search(r"(\['" + re.escape(slug) + r"',[^\n]*\n )(.*?)(\],\n)", s, re.S)
assert m, slug
s = s[:m.start(2)] + "'" + body + "'" + s[m.end(2):]
open(p, 'w').write(s)
print('patched', slug)
