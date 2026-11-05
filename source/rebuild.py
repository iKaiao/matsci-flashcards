from pathlib import Path
import json
source=Path(__file__).resolve().parent
root=source.parent
html=(source/'index_shell.html').read_text(encoding='utf-8')
css=(source/'app.css').read_text(encoding='utf-8')
js=(source/'app.js').read_text(encoding='utf-8')
data=json.loads((source/'cards.json').read_text(encoding='utf-8'))
json_data=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
html=html.replace('__APP_CSS__',css).replace('__APP_JS__',js).replace('__CARDS_DATA__',json_data)
(root/'index.html').write_text(html,encoding='utf-8')
print('已重新生成 index.html')
