/* 材料科学基础学习指导 · 跨设备响应式离线卡片。全部数据保存在本机浏览器。 */
(() => {
  'use strict';
  const DATA = JSON.parse(document.getElementById('embedded-data').textContent);
  const CARDS = DATA.cards;
  const CHAPTERS = DATA.metadata.chapters;
  const CARD_BY_ID = new Map(CARDS.map(card => [card.id, card]));
  const KEY = 'matsci-guidance-cards-v3';
  const TODAY = () => Date.now();
  const DAY = 86400000;
  const TYPES = ['全部类型','疑难解析','例题','习题','综合思考题'];
  const MODES = [['all','全部卡片'],['new','尚未学习'],['due','到期复习'],['wrong','待巩固'],['starred','我的收藏']];
  const DEFAULT = {notes:{},progress:{},starred:[],edits:{},settings:{theme:'light',font:16},updatedAt:0};
  let store = loadStore();
  let ui = {view:'study',chapter:'all',type:'全部类型',mode:'all',search:'',currentId:null,revealed:false,page:1};
  let openedEditId=null, toastTimer=null;
  let storageOkay=true;

  function loadStore(){
    try { const value=JSON.parse(localStorage.getItem(KEY) || 'null'); return { ...structuredClone(DEFAULT), ...(value && typeof value === 'object' ? value : {}), notes:value?.notes || {}, progress:value?.progress || {}, starred:Array.isArray(value?.starred)?value.starred:[], edits:value?.edits || {}, settings:{...DEFAULT.settings,...(value?.settings || {})} }; }
    catch(e){return structuredClone(DEFAULT);}
  }
  function save(){
    try {store.updatedAt=Date.now();localStorage.setItem(KEY,JSON.stringify(store));storageOkay=true;}
    catch(e){storageOkay=false;toast('浏览器无法保存，请及时导出备份 JSON');}
  }
  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function text(c,key){return (store.edits[c.id] && typeof store.edits[c.id][key] === 'string') ? store.edits[c.id][key] : c[key];}
  function snippet(s,n=120){s=String(s||'').replace(/\s+/g,' ');return s.length>n?s.slice(0,n)+'…':s;}
  function pad(n){return String(n).padStart(2,'0');}
  function fmtDate(n){return new Date(n).toLocaleDateString('zh-CN',{month:'short',day:'numeric'});}
  function getProgress(id){return store.progress[id] || null;}
  function starred(id){return store.starred.includes(id);}
  function studied(){return Object.keys(store.progress).filter(id=>CARD_BY_ID.has(id) && store.progress[id]?.count>0).length;}
  function known(){return Object.entries(store.progress).filter(([id,v])=>CARD_BY_ID.has(id) && v.lastGrade===2).length;}
  function wrong(){return Object.entries(store.progress).filter(([id,v])=>CARD_BY_ID.has(id) && v.lastGrade < 2).length;}
  function due(){return Object.entries(store.progress).filter(([id,v])=>CARD_BY_ID.has(id) && v.count>0 && v.due<=TODAY()).length;}
  function notesCount(){return Object.entries(store.notes).filter(([id,s])=>CARD_BY_ID.has(id) && String(s).trim()).length;}
  function statusLabel(c){const p=getProgress(c.id);if(!p || !p.count)return '未学';return p.lastGrade===2?'已掌握':p.lastGrade===1?'模糊':'待巩固';}
  function statusClass(c){const p=getProgress(c.id);if(!p || !p.count)return '';return p.lastGrade===2?'teal':p.lastGrade===1?'gold':'blue';}
  function countInChapter(ch){return CARDS.filter(c=>c.chapter===ch).length;}
  function matchesMode(c){
    const p=getProgress(c.id);
    switch(ui.mode){
      case 'new':return !p || !p.count;
      case 'due':return Boolean(p && p.count && p.due<=TODAY());
      case 'wrong':return Boolean(p && p.count && p.lastGrade < 2);
      case 'starred':return starred(c.id);
      default:return true;
    }
  }
  function filtered(){
    const q=ui.search.trim().toLowerCase();
    return CARDS.filter(c =>
      (ui.chapter==='all' || String(c.chapter)===String(ui.chapter)) &&
      (ui.type==='全部类型' || c.type===ui.type) &&
      matchesMode(c) &&
      (!q || (text(c,'front')+' '+text(c,'back')+' '+c.number+' '+CHAPTERS[c.chapter-1]).toLowerCase().includes(q))
    );
  }
  function shortTitle(ch){return `第${ch}章 · ${CHAPTERS[ch-1]}`;}
  function pdfLink(page){return 'book.pdf#page='+encodeURIComponent(page);}
  function markBadge(c){const status=statusLabel(c);return `<span class="pill ${statusClass(c)}">${escapeHtml(status)}</span>`;}
  function toast(msg){const node=document.getElementById('toast');node.textContent=msg;node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),2400);}

  function renderSidebar(){
    const nav=[['study','◈','开始记忆'],['library','▦','全部卡片'],['notes','✎','我的笔记'],['dashboard','◫','学习概览']];
    document.getElementById('navList').innerHTML=nav.map(([v,icon,label])=>`<button class="nav-item ${ui.view===v?'active':''}" data-action="view" data-view="${v}"><span class="ico">${icon}</span>${label}${v==='notes'?`<span class="count">${notesCount()}</span>`:''}</button>`).join('');
    document.getElementById('chapterList').innerHTML=`<button class="chapter-item ${ui.chapter==='all'?'active':''}" data-action="chapter" data-chapter="all"><span class="chapter-n">ALL</span><span class="chapter-label">全部章节</span><span class="count">${CARDS.length}</span></button>`+
      CHAPTERS.map((title,i)=>`<button class="chapter-item ${String(ui.chapter)===String(i+1)?'active':''}" data-action="chapter" data-chapter="${i+1}" title="${escapeHtml(title)}"><span class="chapter-n">${pad(i+1)}</span><span class="chapter-label">${escapeHtml(title)}</span><span class="count">${countInChapter(i+1)}</span></button>`).join('');
    document.getElementById('sidebarTotal').textContent=CARDS.length;
  }
  function renderFilters(){
    const chOpts='<option value="all">全部 11 章</option>'+CHAPTERS.map((name,i)=>`<option value="${i+1}" ${String(ui.chapter)===String(i+1)?'selected':''}>${pad(i+1)} · ${escapeHtml(name)}</option>`).join('');
    return `<div class="filter-bar panel"><div class="select-wrap"><select id="chapterSelect" aria-label="选择章节" class="select">${chOpts}</select></div><div class="segmented" aria-label="卡片类型">${TYPES.map(t=>`<button data-action="type" data-type="${t}" class="${ui.type===t?'active':''}">${t}</button>`).join('')}</div><div class="filter-spacer"></div><div class="select-wrap"><select id="modeSelect" class="select" aria-label="学习范围">${MODES.map(([v,label])=>`<option value="${v}" ${ui.mode===v?'selected':''}>${label}</option>`).join('')}</select></div><span class="filter-info">共 ${filtered().length} 张</span></div>`;
  }
  function heading(title,subtitle){return `<section class="hero"><div><div class="eyebrow">MATERIALS SCIENCE / STUDY CARDS</div><h1>${title}</h1><p>${subtitle}</p></div><div class="hero-aside">按章节学习 · 随卡笔记 · 离线可用</div></section>`;}
  function renderStats(){
    const n=CARDS.length,k=known();return `<div class="stats-grid"><div class="stat"><small>全部卡片</small><strong>${n}</strong><div class="sub">教材 11 章 · 3 类主要栏目</div></div><div class="stat"><small>已学习</small><strong>${studied()}</strong><div class="sub">学习覆盖率 ${Math.round(100*studied()/n)}%</div></div><div class="stat"><small>已掌握</small><strong>${k}</strong><div class="sub">按最近一次评价统计</div></div><div class="stat"><small>复习到期</small><strong>${due()}</strong><div class="sub">今日需要再次回忆</div></div></div>`;
  }
  function sourceButtons(c){
    const a=`<button class="btn tiny" data-action="open-pdf" data-page="${c.sourcePage}" title="原书页码 ${c.bookPage}，PDF 页码 ${c.sourcePage}">↗ 题目原页</button>`;
    const b=c.answerPage && c.answerPage!==c.sourcePage?`<button class="btn tiny" data-action="open-pdf" data-page="${c.answerPage}">↗ 答案原页</button>`:'';
    return a+b;
  }
  function renderStudy(){
    const cards=filtered();
    if(!cards.some(c=>c.id===ui.currentId)){ui.currentId=cards.length?cards[0].id:null;ui.revealed=false;}
    const c=CARD_BY_ID.get(ui.currentId);
    const idx=cards.findIndex(x=>x.id===ui.currentId);
    const badge=c?`${shortTitle(c.chapter)} · ${c.type}`:'暂无内容';
    const block=cards.length?renderCard(c,idx,cards.length):`<div class="panel study-empty"><div><div class="empty-symbol">◇</div><strong>这里暂时没有卡片</strong><p>可以切换章节、学习范围或清空搜索词。若是“到期复习”为空，说明当前没有到期的已学卡片。</p><button class="btn primary" data-action="reset-filter">查看全部卡片</button></div></div>`;
    const notes=cards.length?renderSideNotes(c):'';
    const title=ui.chapter==='all'?'今天，从一张卡片开始':`${CHAPTERS[Number(ui.chapter)-1]} · 记忆训练`;
    const banner=`<div class="feature-announce"><span><strong>学习小技巧：</strong>先试着回忆，再翻面核对。<span class="fine-detail">复习时用「不会 / 模糊 / 会了」标记，笔记会随着每张卡片分别保存。</span></span><button class="btn tiny" data-action="export-backup" title="备份笔记和进度">备份进度 ↗</button></div>`;
    return heading(title,`根据《材料科学基础学习指导》整理，随时可在右侧写下自己的解题思路。`)+renderStats()+banner+renderFilters()+`<div class="study-grid"><div class="card-wrap">${block}</div>${notes}</div>`;
  }
  function renderCard(c,idx,total){
    const showing=ui.revealed;
    const content=showing?text(c,'back'):text(c,'front');
    const meta=showing?'参考解析 / REFERENCE':'想一想 / RECALL';
    const p=getProgress(c.id);
    const dueMsg=p?.due?`上次：${statusLabel(c)} · 下次 ${fmtDate(p.due)}`:'尚未记录掌握情况';
    const returnBtn=showing?'<button class="btn tiny" data-action="flip">↶ 返回题目</button>':'<button class="btn primary" data-action="flip">查看参考解析 ↗</button>';
    return `<div class="${showing?'card-revealed':''}"><article class="flash-card panel"><div class="card-top"><div class="card-badges"><span class="pill blue">${escapeHtml(c.type)}</span><span class="pill">${escapeHtml(c.number)}</span>${markBadge(c)}</div><div class="card-icon-actions"><button class="card-icon ${starred(c.id)?'active':''}" data-action="star" data-id="${c.id}" aria-label="收藏卡片" title="收藏卡片">${starred(c.id)?'★':'☆'}</button><button class="card-icon" data-action="edit" data-id="${c.id}" aria-label="更正识别文字" title="更正识别文字">✎</button></div></div>
    <div class="card-content" data-action="flip" role="button" tabindex="0" aria-label="点击翻卡"><div class="side-label">${meta}</div><div class="${showing?'answer-text':'question-text'}">${escapeHtml(content)}</div>${showing && c.scanNote?`<div class="hint">⚠ ${escapeHtml(c.scanNote)}</div>`:!showing?'<div class="hint">轻点卡片任意位置翻面，或按空格键</div>':''}</div>
    <div class="card-bottom"><span class="small-meta">教材第 ${c.bookPage} 页 · ${dueMsg}</span><div class="card-footer-actions">${sourceButtons(c)}${returnBtn}</div></div></article>
    <div class="study-controls"><div class="action-graded"><button class="grade-btn red" data-action="grade" data-grade="0" title="按 1">× 不会</button><button class="grade-btn gold" data-action="grade" data-grade="1" title="按 2">◐ 模糊</button><button class="grade-btn green" data-action="grade" data-grade="2" title="按 3">✓ 会了</button></div><div class="study-nav"><button class="icon-btn" data-action="prev" title="上一张（←）">‹</button><button class="icon-btn" data-action="next" title="下一张（→）">›</button></div></div><div class="counter">${idx+1} / ${total} · ${escapeHtml(CHAPTERS[c.chapter-1])}</div></div>`;
  }
  function renderSideNotes(c){
    const value=store.notes[c.id]||'';
    return `<aside class="panel note-panel"><div class="note-top"><div><h2 class="note-heading">✎ 随卡笔记</h2><p class="note-sub">只属于这张卡片，输入后自动保存。</p></div><span class="pill teal">本地保存</span></div><textarea id="desktopNote" data-note-id="${c.id}" placeholder="试着用自己的话解释...\n\n• 一句话核心结论\n• 关键公式 / 解题步骤\n• 我容易犯的错误">${escapeHtml(value)}</textarea><div class="note-footer"><span class="note-save" id="noteSaveStatus"><span class="dot"></span>${value.trim()?'已保存 '+value.length+' 字':'等待输入'}</span><div class="note-tools"><button class="btn tiny subtle" data-action="template">+ 笔记模板</button><button class="btn tiny subtle" data-action="copy-note">复制</button></div></div><div class="tips"><strong>让记忆更牢固的方式</strong>先在笔记中写下“自己的答案”，然后再翻卡对照。如果是计算题，先记录已知条件、公式和最后结果。</div></aside>`;
  }
  function renderLibrary(){
    const list=filtered();const pages=Math.max(1,Math.ceil(list.length/25));ui.page=Math.min(ui.page,pages);const slice=list.slice((ui.page-1)*25,ui.page*25);
    return heading('全部卡片','按章节、题型和关键词定位内容，点开任何一张卡片继续复习。')+renderFilters()+`<div class="library-header"><h2 class="section-title">卡片目录 <span class="light-text">${list.length} 张</span></h2><span class="light-text">可收藏、搜索、查看原书对应页</span></div><div class="library-list">${slice.length?slice.map(c=>`<article class="list-card" data-action="open-card" data-id="${c.id}" tabindex="0" role="button"><div><span class="pill blue">${escapeHtml(c.type)}</span><span class="pill">${escapeHtml(c.number)}</span>${markBadge(c)}<h3>${escapeHtml(snippet(text(c,'front'),190))}</h3><p>${escapeHtml(CHAPTERS[c.chapter-1])} · 教材第 ${c.bookPage} 页 ${store.notes[c.id]?.trim()?' · 已写笔记':''}</p></div><div class="library-actions"><button class="card-icon ${starred(c.id)?'active':''}" data-action="star" data-id="${c.id}" title="收藏">${starred(c.id)?'★':'☆'}</button><span style="color:var(--muted);font-size:21px">›</span></div></article>`).join(''):`<div class="panel study-empty">没有符合条件的卡片。</div>`}</div><div class="pager"><button class="btn tiny" data-action="page-prev" ${ui.page<=1?'disabled':''}>上一页</button><span>第 ${ui.page} / ${pages} 页</span><button class="btn tiny" data-action="page-next" ${ui.page>=pages?'disabled':''}>下一页</button></div>`;
  }
  function renderNotes(){
    let list=CARDS.filter(c=>String(store.notes[c.id]||'').trim());
    const q=ui.search.trim().toLowerCase();if(q)list=list.filter(c=>(text(c,'front')+' '+store.notes[c.id]+' '+CHAPTERS[c.chapter-1]).toLowerCase().includes(q));
    if(ui.chapter!=='all')list=list.filter(c=>String(c.chapter)===String(ui.chapter));
    return heading('我的学习笔记','把自己的理解写下来，远比直接看答案更容易记住。所有笔记都与相应卡片关联。')+`<div class="feature-announce"><span><strong>${list.length} 张卡片有笔记</strong> · 仅保存在当前浏览器。换设备前请导出备份或 Markdown 文件。</span><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="btn tiny" data-action="export-md">导出 Markdown</button><button class="btn tiny primary" data-action="export-backup">备份 JSON</button></div></div><div class="library-header"><h2 class="section-title">笔记目录</h2><div class="light-text">支持继续编辑与查看原书</div></div><div class="notes-grid">${list.length?list.map(c=>`<article class="panel note-list-item"><div class="note-list-head"><div><span class="pill blue">${escapeHtml(c.type)}</span><span class="pill">${escapeHtml(c.number)}</span></div><span class="light-text">第 ${c.bookPage} 页</span></div><h3>${escapeHtml(snippet(text(c,'front'),170))}</h3><div class="note-preview">${escapeHtml(snippet(store.notes[c.id],600))}</div><div class="note-list-actions"><button class="btn tiny primary" data-action="open-card" data-id="${c.id}">继续学习 / 修改笔记</button><button class="btn tiny" data-action="open-pdf" data-page="${c.sourcePage}">原书页 ↗</button></div></article>`).join(''):`<div class="panel study-empty"><div><div class="empty-symbol">✎</div><strong>还没有写笔记</strong><p>打开一张卡片，在旁边记录你的理解。你的第一条笔记会出现在这里。</p><button class="btn primary" data-action="view" data-view="study">开始记一张卡片</button></div></div>`}</div>`;
  }
  function renderDashboard(){
    const coverage=Math.round(100*studied()/CARDS.length);
    const chapterProgress=CHAPTERS.map((name,i)=>{const cs=CARDS.filter(c=>c.chapter===i+1);const learned=cs.filter(c=>getProgress(c.id)?.count).length;const pct=Math.round(100*learned/cs.length);return `<div class="progress-row"><label title="${escapeHtml(name)}">${pad(i+1)} ${escapeHtml(name)}</label><div class="progress-track"><div style="width:${pct}%"></div></div><span>${learned}/${cs.length}</span></div>`;}).join('');
    return heading('学习概览','查看每一章的完成度，优先复习遗忘或不确定的知识点。')+renderStats()+`<div class="dashboard"><section class="panel dashboard-main"><div class="ring" style="--pct:${coverage}%"><div class="ring-inner"><strong>${coverage}%</strong><small>已学习</small></div></div><div class="dashboard-text"><strong>${studied()} / ${CARDS.length}</strong><p>覆盖率不等于掌握率。建议把“模糊”和“不会”的卡片重新看一遍。</p><button class="btn tiny primary" data-action="focus-wrong">复习薄弱项</button></div></section><section class="panel chapter-progress"><h2 class="section-title">各章学习进度</h2>${chapterProgress}</section></div><p class="fineprint">复习规则：不会约 5 分钟后再次到期；模糊安排短间隔复习；会了按间隔逐步延长。结果仅记录在当前浏览器，不上传任何服务器。</p>`;
  }
  function render(){
    document.documentElement.dataset.theme=store.settings.theme;
    document.documentElement.style.setProperty('--font',`${store.settings.font}px`);
    document.getElementById('globalSearch').value=ui.search;
    document.getElementById('themeBtn').textContent=store.settings.theme==='dark'?'☀':'☾';
    renderSidebar();
    const root=document.getElementById('mainView');
    root.innerHTML=ui.view==='library'?renderLibrary():ui.view==='notes'?renderNotes():ui.view==='dashboard'?renderDashboard():renderStudy();
    document.getElementById('mobileNoteBtn').style.display=ui.view==='study' && Boolean(ui.currentId)?'':'none';
    document.getElementById('mobileNoteBtn').setAttribute('aria-label',ui.currentId?'为当前卡片记笔记':'记笔记');
  }
  function navCard(step){const list=filtered();if(!list.length)return;let i=list.findIndex(c=>c.id===ui.currentId);if(i<0)i=0;ui.currentId=list[(i+step+list.length)%list.length].id;ui.revealed=false;render();}
  function grade(g){
    const c=CARD_BY_ID.get(ui.currentId);if(!c)return;
    const list=filtered();const before=list.findIndex(x=>x.id===c.id);const nextId=list.length>1?list[(before+1)%list.length].id:null;
    const prev=store.progress[c.id] || {count:0,reps:0,interval:0,ease:2.3};
    const p={...prev,count:(prev.count||0)+1,reps:prev.reps||0,interval:prev.interval||0,ease:prev.ease||2.3};
    if(g===0){p.reps=0;p.interval=0;p.due=TODAY()+5*60*1000;}
    else if(g===1){p.reps=0;p.interval=p.interval>1?Math.max(1,Math.round(p.interval*.6)):1;p.due=TODAY()+p.interval*DAY;}
    else {p.reps++;p.interval=p.reps===1?1:p.reps===2?3:Math.max(4,Math.round(p.interval*p.ease));p.ease=Math.min(3,Math.max(1.4,p.ease+.07));p.due=TODAY()+p.interval*DAY;}
    p.lastGrade=g;p.reviewedAt=TODAY();store.progress[c.id]=p;save();
    ui.currentId=nextId;ui.revealed=false;
    const labels=['已加入待巩固 · 5 分钟后复习','已标记模糊 · 安排短期复习','已记住 · 复习间隔延长'];
    render();toast(labels[g]);
  }
  function flip(){if(!ui.currentId)return;ui.revealed=!ui.revealed;render();}
  function editNote(value,id){
    if(!CARD_BY_ID.has(id))return;
    store.notes[id]=value;save();
    const count=document.getElementById('noteSaveStatus');if(count)count.innerHTML=`<span class="dot"></span>已自动保存 ${value.length} 字`;
    document.querySelectorAll(`[data-note-id="${CSS.escape(id)}"]`).forEach(node=>{if(node!==document.activeElement)node.value=value;});
  }
  function openDrawer(){
    if(!ui.currentId)return;
    document.getElementById('drawerTitle').textContent='笔记 · '+CARD_BY_ID.get(ui.currentId).number;
    const input=document.getElementById('mobileNoteInput');input.dataset.noteId=ui.currentId;input.value=store.notes[ui.currentId] || '';
    document.getElementById('drawer').classList.add('open');document.getElementById('drawerBackdrop').classList.add('open');
    setTimeout(()=>input.focus({preventScroll:true}),200);
  }
  function closeDrawer(){document.getElementById('drawer').classList.remove('open');document.getElementById('drawerBackdrop').classList.remove('open');}
  function openEdit(id){const c=CARD_BY_ID.get(id);if(!c)return;openedEditId=id;document.getElementById('editFront').value=text(c,'front');document.getElementById('editBack').value=text(c,'back');document.getElementById('editModal').classList.add('open');}
  function closeEdit(){document.getElementById('editModal').classList.remove('open');openedEditId=null;}
  function saveEdit(){const id=openedEditId;if(!id)return;const front=document.getElementById('editFront').value.trim(),back=document.getElementById('editBack').value.trim();if(!front || !back){toast('题目与答案都不能为空');return;}store.edits[id]={front,back};save();closeEdit();render();toast('卡片更正已保存到当前浏览器');}
  function resetEdit(){if(!openedEditId)return;if(!confirm('恢复为 PDF 提取的初始文字？笔记和学习记录不会受影响。'))return;delete store.edits[openedEditId];save();closeEdit();render();toast('已恢复初始文字');}
  function template(){const id=ui.currentId;if(!id)return;const pre=store.notes[id]||'';const next=(pre?pre+'\n\n':'')+'【核心概念】\n\n【关键公式 / 解题步骤】\n\n【易错点】\n\n【我的问题】\n';editNote(next,id);render();toast('笔记模板已插入');}
  function download(content,filename,mime){
    const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportBackup(){const data={application:'matsci-flashcard-offline',version:3,exportedAt:new Date().toISOString(),...store};download(JSON.stringify(data,null,2),'材料科学基础_记忆卡片_进度与笔记.json','application/json;charset=utf-8');toast('已导出进度与笔记备份');}
  function exportNotes(){
    const contents=['# 材料科学基础 · 我的学习笔记','',`导出日期：${new Date().toLocaleDateString('zh-CN')}`,''];
    CARDS.filter(c=>String(store.notes[c.id]||'').trim()).forEach(c=>contents.push(`## ${CHAPTERS[c.chapter-1]} / ${c.type} ${c.number}`,'',`**题目**：${text(c,'front')}`,'',`**来源**：教材第 ${c.bookPage} 页`,'',store.notes[c.id],'','---',''));
    download(contents.join('\n'),'材料科学基础_我的笔记.md','text/markdown;charset=utf-8');toast('笔记 Markdown 已导出');
  }
  function importBackup(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{
      try{const data=JSON.parse(String(reader.result));if(data.application!=='matsci-flashcard-offline' && (!data.notes || !data.progress))throw new Error('不是学习记录文件');
        const n=Object.keys(data.notes||{}).length;if(!confirm(`检测到 ${n} 条笔记。要合并到当前设备的学习记录吗？（同一张卡片的导入笔记将覆盖当前笔记）`))return;
        for(const [id,v] of Object.entries(data.notes||{})){if(CARD_BY_ID.has(id) && typeof v==='string')store.notes[id]=v;}
        for(const [id,v] of Object.entries(data.progress||{})){if(CARD_BY_ID.has(id) && typeof v==='object' && v){const cur=store.progress[id];if(!cur || (v.reviewedAt||0)>=(cur.reviewedAt||0))store.progress[id]=v;}}
        if(Array.isArray(data.starred))store.starred=[...new Set([...store.starred,...data.starred].filter(id=>CARD_BY_ID.has(id)))];
        for(const [id,change] of Object.entries(data.edits||{})){if(CARD_BY_ID.has(id)&&change&&typeof change.front==='string'&&typeof change.back==='string')store.edits[id]=change;}
        save();render();toast('学习记录已合并，建议再导出一次备份');
      }catch(e){alert('导入失败：'+e.message);}document.getElementById('backupInput').value='';
    };reader.readAsText(file,'utf-8');}
  function toggleStar(id){if(!CARD_BY_ID.has(id))return;store.starred=starred(id)?store.starred.filter(x=>x!==id):[...store.starred,id];save();render();toast(starred(id)?'已加入收藏':'已取消收藏');}
  function setView(v){if(!['study','library','notes','dashboard'].includes(v))return;ui.view=v;ui.page=1;closeSidebar();closeDrawer();render();window.scrollTo({top:0,behavior:'smooth'});}
  function setChapter(v){ui.chapter=v;ui.page=1;ui.currentId=null;ui.revealed=false;closeSidebar();render();window.scrollTo({top:0,behavior:'smooth'});}
  function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebarBackdrop').classList.remove('on');}
  function openPdf(page){const a=document.createElement('a');a.href=pdfLink(page);a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();}
  async function copyNote(){const t=store.notes[ui.currentId]||'';if(!t){toast('这张卡片还没有笔记');return;}try{await navigator.clipboard.writeText(t);toast('笔记已复制');}catch{toast('复制受浏览器限制，请选中笔记手动复制');}}

  document.addEventListener('click',ev=>{
    const el=ev.target.closest('[data-action]');if(!el)return;
    const act=el.dataset.action;
    switch(act){
      case 'view':setView(el.dataset.view);break;
      case 'chapter':setChapter(el.dataset.chapter);break;
      case 'type':ui.type=el.dataset.type;ui.currentId=null;ui.revealed=false;ui.page=1;render();break;
      case 'flip':flip();break;
      case 'grade':grade(Number(el.dataset.grade));break;
      case 'prev':navCard(-1);break;
      case 'next':navCard(1);break;
      case 'star':toggleStar(el.dataset.id);break;
      case 'open-card':ui.currentId=el.dataset.id;ui.mode='all';ui.chapter='all';ui.type='全部类型';ui.search='';ui.revealed=false;setView('study');break;
      case 'open-pdf':openPdf(Number(el.dataset.page));break;
      case 'edit':openEdit(el.dataset.id);break;
      case 'save-edit':saveEdit();break;
      case 'reset-edit':resetEdit();break;
      case 'close-edit':closeEdit();break;
      case 'template':template();break;
      case 'copy-note':copyNote();break;
      case 'export-backup':exportBackup();break;
      case 'export-md':exportNotes();break;
      case 'import-backup':document.getElementById('backupInput').click();break;
      case 'reset-filter':ui.chapter='all';ui.type='全部类型';ui.mode='all';ui.search='';ui.currentId=null;render();break;
      case 'page-prev':ui.page=Math.max(1,ui.page-1);render();break;
      case 'page-next':ui.page++;render();break;
      case 'focus-wrong':ui.view='study';ui.mode='wrong';ui.chapter='all';ui.type='全部类型';ui.currentId=null;render();break;
      case 'close-drawer':closeDrawer();break;
      case 'open-drawer':openDrawer();break;
    }
  });
  document.addEventListener('change',ev=>{
    const target=ev.target;
    if(target.id==='chapterSelect')setChapter(target.value);
    if(target.id==='modeSelect'){ui.mode=target.value;ui.page=1;ui.currentId=null;ui.revealed=false;render();}
    if(target.id==='backupInput')importBackup(target.files?.[0]);
  });
  document.addEventListener('input',ev=>{
    const target=ev.target;
    if(target.id==='globalSearch'){ui.search=target.value;ui.page=1;ui.currentId=null;ui.revealed=false;render();}
    if(target.dataset?.noteId)editNote(target.value,target.dataset.noteId);
  });
  document.addEventListener('keydown',ev=>{
    if(ev.key==='Escape'){closeDrawer();closeEdit();closeSidebar();return;}
    const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||'');if(typing)return;
    if(ev.key==='/'){ev.preventDefault();document.getElementById('globalSearch').focus();return;}
    if(ui.view!=='study' || !ui.currentId)return;
    if(ev.key===' '){ev.preventDefault();flip();}
    else if(ev.key==='ArrowRight')navCard(1);
    else if(ev.key==='ArrowLeft')navCard(-1);
    else if(['1','2','3'].includes(ev.key))grade(Number(ev.key)-1);
    else if(ev.key==='n'||ev.key==='N'){document.getElementById('desktopNote')?.focus();}
  });
  document.getElementById('menuBtn').addEventListener('click',()=>{document.getElementById('sidebar').classList.add('open');document.getElementById('sidebarBackdrop').classList.add('on');});
  document.getElementById('sidebarBackdrop').addEventListener('click',closeSidebar);
  document.getElementById('drawerBackdrop').addEventListener('click',closeDrawer);
  document.getElementById('mobileNoteBtn').addEventListener('click',openDrawer);
  document.getElementById('themeBtn').addEventListener('click',()=>{store.settings.theme=store.settings.theme==='dark'?'light':'dark';save();render();});
  document.getElementById('fontBtn').addEventListener('click',()=>{const sizes=[16,18,20];store.settings.font=sizes[(sizes.indexOf(store.settings.font)+1)%sizes.length];save();render();toast('字号已调整为 '+store.settings.font+' px');});
  document.getElementById('shortcutBtn').addEventListener('click',()=>{alert('键盘快捷键：\n空格：翻面\n← / →：上一张 / 下一张\n1：不会  2：模糊  3：会了\nN：聚焦笔记\n/：搜索\nESC：关闭弹窗');});
  document.getElementById('editModal').addEventListener('click',ev=>{if(ev.target.id==='editModal')closeEdit();});
  window.addEventListener('beforeunload',()=>{if(!storageOkay)console.warn('Storage unavailable: export a backup.');});
  document.getElementById('cardCountHeader').textContent=String(CARDS.length)+' 张卡片';
  render();
  if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
