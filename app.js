const C=window.FLORA;
const DB_NAME=C.dbName,DB_VERSION=3;
const APP_NAME='Offline Field & Travel Guide of Southern Africa';
const CITE='Created with '+APP_NAME+' \u00B7 \u00A9 2026 Henry van der Schyff';
/* Three sections share one database. 'flora' keeps the original store name so existing observations are preserved. */
const SEC={
 flora:{store:'observations',noun:'flora',eyebrow:'FLORA LOG',title:'Flora observations',icon:'#i-flora',season:true,ph:{commonNameEn:'e.g. King protea',commonNameAf:'e.g. Koningsprotea',family:'e.g. Proteaceae',genus:'e.g. Protea',species:'e.g. cynaroides',locality:'Where was it found? Habitat, altitude, number of plants, specimen description',notes:'Identification notes, references, pollinators, observations'}},
 culture:{store:'culture',noun:'cultural site',eyebrow:'CULTURE & TOURIST SITES',title:'Cultural & tourist sites',icon:'#i-culture',season:false,ph:{}},
 fauna:{store:'fauna',noun:'fauna',eyebrow:'FAUNA LOG',title:'Fauna observations',icon:'#i-fauna',season:false,ph:{commonNameEn:'e.g. Lion',commonNameAf:'e.g. Leeu',family:'e.g. Felidae',genus:'e.g. Panthera',species:'e.g. leo',locality:'Where was it seen? Habitat, behaviour, number of animals, specimen details',notes:'Identification notes, references, behaviour, observations'}}
};
let cur='flora';
const $=id=>document.getElementById(id);
let db,data={flora:[],fauna:[],culture:[]},groupMode='family',viewMode='cards',currentPhotos=[];
const recs=()=>data[cur];const store=()=>SEC[cur].store;
let onlyMissing=false;
const closedFamilies=new Set(),closedGenera=new Set(),closedDates=new Set();
try{viewMode=localStorage.getItem('floraView')||'cards';groupMode=localStorage.getItem('floraGroup')||'family';{const s=localStorage.getItem('floraSection');cur=(s==='fauna'||s==='culture')?s:'flora';}}catch{}

/* ---------- storage (IndexedDB) ---------- */
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{for(const s of Object.values(SEC))if(!req.result.objectStoreNames.contains(s.store))req.result.createObjectStore(s.store,{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function allRecords(st=store()){return new Promise((resolve,reject)=>{const r=db.transaction(st,'readonly').objectStore(st).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function saveRecord(rec,st=store()){return new Promise((resolve,reject)=>{const tx=db.transaction(st,'readwrite');tx.objectStore(st).put(rec);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
function deleteRecord(id,st=store()){return new Promise((resolve,reject)=>{const tx=db.transaction(st,'readwrite');tx.objectStore(st).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}

/* ---------- helpers ---------- */
const escapeHTML=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const todayISO=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
function fmtDate(d){if(!d)return'Date not recorded';const dt=new Date(d+'T00:00:00');return isNaN(dt)?escapeHTML(d):dt.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}
const isUnid=r=>!(r.genus||'').trim()&&!(r.species||'').trim();
function sciName(r){const g=(r.genus||'').trim(),s=(r.species||'').trim();return g&&s?g+' '+s:g?g+' sp.':s||(r.commonNameEn||'').trim()||(r.commonNameAf||'').trim()||((r.tracks||'').trim()?'Unidentified tracks / spoor':'Unidentified');}
const emptyLast=(a,b)=>!a?1:!b?-1:a.localeCompare(b);
const byNewest=(a,b)=>(b.dateObserved||'').localeCompare(a.dateObserved||'')||sciName(a).localeCompare(sciName(b));
const photosOf=r=>Array.isArray(r.photos)&&r.photos.length?r.photos:(r.photo?[r.photo]:[]);
const MAX_PHOTOS=12;
const commonLine=r=>{const en=(r.commonNameEn||'').trim(),af=(r.commonNameAf||'').trim();const l=isUnid(r)?(en?[af]:[]):[en,af];return l.filter(Boolean).map(escapeHTML).join(' · ');};
const pendingTag=r=>isUnid(r)?'<span class="tag pending">&#9998; Scientific name to be added</span>':'';
const iconFor=()=>`<svg class="ico" viewBox="0 0 512 512" aria-hidden="true"><use href="${SEC[cur].icon}"/></svg>`;

/* ---------- init ---------- */
async function init(){
  document.title=C.name;$('brandName').textContent=C.short;$('brandTag').textContent=C.tagline;$('heroTitle').innerHTML=C.hero;$('footerName').textContent=C.footer;$('footerNote').textContent=C.disclaimer;if(C.copyright)$('copyright').textContent=C.copyright;
  db=await openDB();data.flora=await allRecords('observations');data.fauna=await allRecords('fauna');data.culture=await allRecords('culture');await migratePhotos();$('reportFrom').value=$('reportTo').value=todayISO();applySection();render();storageInfo();updateConnection();
}
async function migratePhotos(){
  for(const sec of Object.keys(SEC))for(const r of data[sec]){if(r.photo!==undefined&&!(Array.isArray(r.photos)&&r.photos.length&&!r.photo)){r.photos=photosOf(r);delete r.photo;await saveRecord(r,SEC[sec].store);}}
}
function updateConnection(){const on=navigator.onLine;$('connection').textContent=on?'Online · local log ready':'Offline · local log ready';$('dot').style.background=on?'#8ac69b':'#e2b65f';}
addEventListener('online',updateConnection);addEventListener('offline',updateConnection);

/* ---------- sections (flora / fauna) ---------- */
function applySection(){
  const s=SEC[cur],cu=cur==='culture';
  for(const [k,id] of [['flora','tabFlora'],['fauna','tabFauna'],['culture','tabCulture']]){$(id).classList.toggle('active',cur===k);$(id).setAttribute('aria-selected',cur===k);}
  $('sectionEyebrow').textContent=s.eyebrow;$('sectionTitle').textContent=s.title;
  $('addLabel').textContent=cu?'Add site visit':'Add '+s.noun+' observation';
  $('csvSection').textContent=cu?'culture & sites':s.noun;
  $('groupLabel').textContent=cu?'By place':'By family';
  $('genusFilter').classList.toggle('hidden',cu);
  if(cu){
    $('search').placeholder='Search sites by title, town, era, role players or notes';
    ['statL1','statL2','statL3','statL4','statL5'].forEach((id,i)=>$(id).textContent=['Site visits','Provinces / places','Towns','Photographs','With GPS'][i]);
    $('missingFilter').classList.add('hidden');
  }else{
    $('seasonField').classList.toggle('hidden',!s.season);$('heightField').classList.toggle('hidden',cur!=='flora');$('tracksField').classList.toggle('hidden',cur!=='fauna');
    for(const k of ['commonNameEn','commonNameAf','family','genus','species','locality','notes'])$(k).placeholder=s.ph[k];
    $('search').placeholder='Search '+s.noun+' by name, family, genus, species, place or notes';
    ['statL1','statL2','statL3','statL4','statL5'].forEach((id,i)=>$(id).textContent=['Observations','Families','Genera','Species','Photographs'][i]);
  }
}
function setSection(name){
  if(name===cur)return;cur=name;setPref('floraSection',cur);
  $('search').value='';$('familyFilter').value='';$('genusFilter').value='';
  onlyMissing=false;closedFamilies.clear();closedGenera.clear();closedDates.clear();
  applySection();render();
}
$('tabFlora').onclick=()=>setSection('flora');$('tabFauna').onclick=()=>setSection('fauna');$('tabCulture').onclick=()=>setSection('culture');

/* ---------- rendering ---------- */
function cardHTML(r){
  return `<article class="obs-card" data-id="${r.id}" tabindex="0" role="button" aria-label="Edit ${escapeHTML(sciName(r))}">
  <div class="obs-image">${photosOf(r).length?`<img src="${photosOf(r)[0]}" alt="${escapeHTML(sciName(r))}" loading="lazy">`:iconFor()}${photosOf(r).length>1?`<span class="photobadge">&#128247; ${photosOf(r).length}</span>`:''}</div>
  <div class="obs-body"><h3${isUnid(r)?' class="unid"':''}>${escapeHTML(sciName(r))}</h3>
  ${commonLine(r)?`<div class="common">${commonLine(r)}</div>`:''}
  <div class="obs-meta">${fmtDate(r.dateObserved)}${r.family?' · '+escapeHTML(r.family):''}</div>
  ${pendingTag(r)}${r.floweringSeason?`<span class="tag">✿ ${escapeHTML(r.floweringSeason)}</span>`:''}${r.height?`<span class="tag">&#8597; ${escapeHTML(r.height)}</span>`:''}${r.tracks?'<span class="tag">&#128062; Tracks / spoor</span>':''}
  ${r.locality?`<div class="obs-note">${escapeHTML(r.locality)}</div>`:''}
  ${r.notes?`<div class="obs-note"><em>${escapeHTML(r.notes)}</em></div>`:''}
  <div class="card-actions"><button class="smallbtn" type="button" data-edit="${r.id}">Edit</button></div></div></article>`;
}
function rowHTML(r){
  return `<div class="obs-row" data-id="${r.id}" tabindex="0" role="button" aria-label="Edit ${escapeHTML(sciName(r))}">
  <div class="row-thumb">${photosOf(r).length?`<img src="${photosOf(r)[0]}" alt="" loading="lazy">`:iconFor()}</div>
  <div class="row-main"><strong${isUnid(r)?' class="unid"':''}>${escapeHTML(sciName(r))}</strong>${commonLine(r)?`<span class="common">${commonLine(r)}</span>`:''}
  <span class="row-sub">${isUnid(r)?'✎ Scientific name to be added · ':''}${fmtDate(r.dateObserved)}${r.height?' · &#8597; '+escapeHTML(r.height):''}${r.tracks?' · &#128062; Tracks / spoor':''}${r.floweringSeason?' · ✿ '+escapeHTML(r.floweringSeason):''}${r.locality?' · '+escapeHTML(r.locality.replace(/\s+/g,' ')):''}</span></div>
  <button class="smallbtn" type="button" data-edit="${r.id}">Edit</button></div>`;
}
const itemsHTML=list=>list.length?`<div class="${viewMode==='cards'?'obs-grid':'obs-list'}">${list.map(viewMode==='cards'?cardHTML:rowHTML).join('')}</div>`:'';
const plural=(n,one,many)=>`${n} ${n===1?one:many}`;

function render(){
  renderBackupBanner();
  $('viewCards').classList.toggle('active',viewMode==='cards');$('viewList').classList.toggle('active',viewMode==='list');
  $('groupFamily').classList.toggle('active',groupMode==='family');$('groupDate').classList.toggle('active',groupMode==='date');
  const q=$('search').value.trim().toLowerCase();
  const records=recs();
  $('floraTabCount').textContent=data.flora.length;$('faunaTabCount').textContent=data.fauna.length;$('cultureTabCount').textContent=data.culture.length;
  updateReportCount();
  if(cur==='culture'){renderCulture();return;}
  const families=[...new Set(records.map(r=>r.family).filter(Boolean))].sort();
  const oldF=$('familyFilter').value;
  $('familyFilter').innerHTML='<option value="">All families</option>'+families.map(f=>`<option>${escapeHTML(f)}</option>`).join('');
  $('familyFilter').value=families.includes(oldF)?oldF:'';
  const fam=$('familyFilter').value;
  const genera=[...new Set(records.filter(r=>!fam||r.family===fam).map(r=>r.genus).filter(Boolean))].sort();
  const oldG=$('genusFilter').value;
  $('genusFilter').innerHTML='<option value="">All genera</option>'+genera.map(g=>`<option>${escapeHTML(g)}</option>`).join('');
  $('genusFilter').value=genera.includes(oldG)?oldG:'';
  const gen=$('genusFilter').value;
  const filtered=records.filter(r=>{
    const hay=[r.commonNameEn,r.commonNameAf,r.family,r.genus,r.species,sciName(r),r.dateObserved,r.locality,r.floweringSeason,r.height,r.tracks,r.notes].join(' ').toLowerCase();
    return(!q||hay.includes(q))&&(!fam||r.family===fam)&&(!gen||r.genus===gen)&&(!onlyMissing||isUnid(r));
  });
  const missing=records.filter(isUnid).length;
  $('missingCount').textContent=missing;$('missingFilter').classList.toggle('hidden',!missing&&!onlyMissing);$('missingFilter').classList.toggle('on',onlyMissing);
  $('obsCount').textContent=records.length;
  $('familyCount').textContent=families.length;
  $('genusCount').textContent=new Set(records.map(r=>norm(r.genus)).filter(Boolean)).size;
  $('speciesCount').textContent=new Set(records.filter(r=>r.species).map(r=>norm(r.genus+' '+r.species))).size;
  $('photoCount').textContent=records.reduce((n,r)=>n+photosOf(r).length,0);
  const filtering=!!(q||fam||gen||onlyMissing);
  if(!filtered.length){$('obsGrid').innerHTML=`<div class="empty">${records.length?'No matching observations. Try another search or filter.':`No ${SEC[cur].noun} observations yet. Tap “Add ${SEC[cur].noun} observation” to record your first one.`}</div>`;return;}
  if(groupMode==='date'){
    const by=new Map();
    for(const r of filtered){const k=(r.dateObserved||'').slice(0,7);if(!by.has(k))by.set(k,[]);by.get(k).push(r);}
    $('obsGrid').innerHTML=[...by.keys()].sort((a,b)=>!a?1:!b?-1:b.localeCompare(a)).map(k=>{
      const list=by.get(k).sort(byNewest);
      const label=k?new Date(k+'-01T00:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'}):'Date not recorded';
      return `<details class="date-group" data-dkey="${escapeHTML(k)}"${closedDates.has(k)&&!filtering?'':' open'}><summary><span class="fam-name">${escapeHTML(label)}</span><span class="fam-count">${plural(list.length,'observation','observations')}</span></summary><div class="date-body">${itemsHTML(list)}</div></details>`;
    }).join('');
    return;
  }
  const byFam=new Map();
  for(const r of filtered){const f=r.family||'',g=r.genus||'';if(!byFam.has(f))byFam.set(f,new Map());const gm=byFam.get(f);if(!gm.has(g))gm.set(g,[]);gm.get(g).push(r);}
  $('obsGrid').innerHTML=[...byFam.keys()].sort(emptyLast).map(f=>{
    const gm=byFam.get(f),gkeys=[...gm.keys()].sort(emptyLast),count=[...gm.values()].reduce((n,a)=>n+a.length,0);
    const body=gkeys.map(g=>{const key=f+'|'+g,list=gm.get(g).sort(byNewest);
      return `<details class="genus-group" data-gkey="${escapeHTML(key)}"${closedGenera.has(key)&&!filtering?'':' open'}><summary class="genus-title"><span>${g?escapeHTML(g):'Genus not specified'}</span><span class="fam-count">${plural(list.length,'observation','observations')}</span></summary>${itemsHTML(list)}</details>`;}).join('');
    return `<details class="family-group" data-family="${escapeHTML(f)}"${closedFamilies.has(f)&&!filtering?'':' open'}><summary><span class="fam-name">${f?escapeHTML(f):'Family not specified'}</span><span class="fam-count">${plural(gkeys.length,'genus','genera')} · ${plural(count,'observation','observations')}</span></summary><div class="family-body">${body}</div></details>`;
  }).join('');
}
$('obsGrid').addEventListener('toggle',e=>{
  const d=e.target;if(!d.matches)return;
  const flip=(set,key)=>d.open?set.delete(key):set.add(key);
  if(d.matches('details.family-group'))flip(closedFamilies,d.dataset.family);
  else if(d.matches('details.genus-group'))flip(closedGenera,d.dataset.gkey);
  else if(d.matches('details.date-group'))flip(closedDates,d.dataset.dkey);
},true);
$('obsGrid').addEventListener('click',e=>{if(e.target.closest('summary'))return;const el=e.target.closest('[data-id]');if(el)openEntry(el.dataset.id);});
$('obsGrid').addEventListener('keydown',e=>{if(e.key!=='Enter'||e.target.tagName==='BUTTON')return;const el=e.target.closest('[data-id]');if(el)openEntry(el.dataset.id);});
$('expandAll').onclick=()=>{closedFamilies.clear();closedGenera.clear();closedDates.clear();render();};
function openEntry(id){const r=recs().find(x=>x.id===id);if(!r)return;if(cur==='culture')openSite(r);else openForm(r);}
$('collapseAll').onclick=()=>{if(cur==='culture'){data.culture.forEach(r=>{closedFamilies.add(placeOf(r));closedGenera.add(placeOf(r)+'|'+(r.town||''));closedDates.add(visitDate(r).slice(0,7));});render();return;}recs().forEach(r=>{closedFamilies.add(r.family||'');closedGenera.add((r.family||'')+'|'+(r.genus||''));closedDates.add((r.dateObserved||'').slice(0,7));});render();};
const setPref=(k,v)=>{try{localStorage.setItem(k,v);}catch{}};
$('viewCards').onclick=()=>{viewMode='cards';setPref('floraView',viewMode);render();};
$('viewList').onclick=()=>{viewMode='list';setPref('floraView',viewMode);render();};
$('groupFamily').onclick=()=>{groupMode='family';setPref('floraGroup',groupMode);render();};
$('groupDate').onclick=()=>{groupMode='date';setPref('floraGroup',groupMode);render();};
$('missingFilter').onclick=()=>{onlyMissing=!onlyMissing;render();};
$('search').oninput=render;$('familyFilter').onchange=render;$('genusFilter').onchange=render;

/* ---------- add / edit form ---------- */
function renderPhotos(){
  const n=currentPhotos.length;
  $('photoGrid').innerHTML=currentPhotos.map((src,i)=>`<div class="thumb"><img src="${src}" alt="Photograph ${i+1}" data-view="${i}"><button type="button" class="thumbdel" data-del="${i}" aria-label="Delete photograph ${i+1}">&times;</button></div>`).join('');
  $('photoEmpty').classList.toggle('hidden',n>0);
  $('removeAllPhotos').classList.toggle('hidden',n<2);
  $('photoCountLabel').textContent=n?`(${n})`:'';
}
$('photoGrid').addEventListener('click',e=>{
  const del=e.target.closest('[data-del]'),view=e.target.closest('[data-view]');
  if(del){if(confirm('Delete this photograph?')){currentPhotos.splice(+del.dataset.del,1);renderPhotos();}}
  else if(view){$('photoLarge').src=currentPhotos[+view.dataset.view];openModal($('photoDialog'));}
});
$('removeAllPhotos').onclick=()=>{if(confirm('Delete all '+currentPhotos.length+' photographs from this observation?')){currentPhotos=[];renderPhotos();}};
$('closePhoto').onclick=()=>$('photoDialog').close();
$('photoDialog').addEventListener('click',e=>{if(e.target===$('photoDialog'))$('photoDialog').close();});
let photoTarget='rec';
const photoArr=()=>photoTarget==='site'?sitePhotosCur:currentPhotos;
const refreshPhotoUI=()=>photoTarget==='site'?renderSitePhotos():renderPhotos();
async function addFiles(files){
  let failed=0;
  for(const f of files){
    if(photoArr().length>=MAX_PHOTOS){alert(`Up to ${MAX_PHOTOS} photographs can be kept per observation.`);break;}
    try{photoArr().push(await fileToDataURL(f));refreshPhotoUI();}catch{failed++;}
  }
  if(failed)alert(failed+' image(s) could not be read. Please try another photograph.');
}
$('photo').onchange=async e=>{photoTarget='rec';const fs=[...e.target.files];e.target.value='';await addFiles(fs);};
$('camNative').onchange=async e=>{const fs=[...e.target.files];e.target.value='';await addFiles(fs);if(fs.length){$('cameraDialog').close();}};

/* ---------- in-app camera (opens the phone or laptop camera directly) ---------- */
let camStream=null,camFacing='environment',camShots=0;
function stopCamera(){if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null;}const v=$('camVideo');v.srcObject=null;$('camShoot').disabled=true;}
function showCamErr(msg){const e=$('camErr');e.textContent=msg;e.classList.remove('hidden');$('camFallback').classList.remove('hidden');$('camShoot').disabled=true;}
async function startCamera(){
  stopCamera();$('camErr').classList.add('hidden');$('camFallback').classList.add('hidden');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){showCamErr('The live camera is not available here (it needs a secure https link). Use the button below to open your camera app instead.');return;}
  try{
    camStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:camFacing},width:{ideal:1920},height:{ideal:1440}},audio:false});
    const v=$('camVideo');v.srcObject=camStream;await v.play().catch(()=>{});
    const front=(camStream.getVideoTracks()[0].getSettings().facingMode||camFacing)==='user';
    v.classList.toggle('mirror',front);
    $('camShoot').disabled=false;
    const cams=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');
    $('camSwitch').classList.toggle('hidden',cams.length<2);
  }catch(err){
    const n=err&&err.name;
    showCamErr(n==='NotAllowedError'||n==='SecurityError'?'Camera permission was blocked. Tap the lock icon next to the web address, allow Camera for this site, then tap Take photo again. Or use the button below.':n==='NotFoundError'||n==='OverconstrainedError'?'No camera was found on this device. You can pick a photo instead.':'The camera could not be started. Use the button below to open your camera app instead.');
  }
}
function openCamera(target){
  photoTarget=target;
  if(photoArr().length>=MAX_PHOTOS){alert(`Up to ${MAX_PHOTOS} photographs can be kept per observation.`);return;}
  camShots=0;$('camCount').textContent='0';openModal($('cameraDialog'));startCamera();
}
$('takePhoto').onclick=()=>openCamera('rec');
$('camShoot').onclick=()=>{
  const v=$('camVideo');if(!v.videoWidth)return;
  if(photoArr().length>=MAX_PHOTOS){alert(`Up to ${MAX_PHOTOS} photographs can be kept per observation.`);return;}
  const s=Math.min(1,1400/Math.max(v.videoWidth,v.videoHeight)),c=document.createElement('canvas');
  c.width=Math.round(v.videoWidth*s);c.height=Math.round(v.videoHeight*s);c.getContext('2d').drawImage(v,0,0,c.width,c.height);
  photoArr().push(c.toDataURL('image/jpeg',.82));refreshPhotoUI();camShots++;$('camCount').textContent=camShots;
  const st=document.querySelector('.camstage');st.classList.add('flash');setTimeout(()=>st.classList.remove('flash'),180);
};
$('camSwitch').onclick=()=>{camFacing=camFacing==='environment'?'user':'environment';startCamera();};
$('camDone').onclick=$('camClose').onclick=()=>$('cameraDialog').close();
$('cameraDialog').addEventListener('close',stopCamera);
function refreshLists(){
  const records=recs();
  const opt=a=>a.map(v=>`<option value="${escapeHTML(v)}">`).join('');
  $('familyList').innerHTML=opt([...new Set(records.map(r=>r.family).filter(Boolean))].sort());
  const fam=$('family').value.trim().toLowerCase();
  const pool=records.filter(r=>!fam||(r.family||'').toLowerCase()===fam);
  $('genusList').innerHTML=opt([...new Set((pool.length?pool:records).map(r=>r.genus).filter(Boolean))].sort());
  const g=norm($('genus').value);
  $('speciesList').innerHTML=opt([...new Set(records.filter(r=>g&&norm(r.genus)===g).map(r=>r.species).filter(Boolean))].sort());
}
function suggestFamily(genus){
  const g=norm(genus);if(!g)return'';
  const hit=[...recs()].filter(r=>norm(r.genus)===g&&r.family).sort(byNewest)[0];
  return hit?hit.family:'';
}
$('genus').addEventListener('input',()=>{
  const f=$('family');
  if(!f.value.trim()||f.dataset.auto==='1'){const s=suggestFamily($('genus').value);if(s){f.value=s;f.dataset.auto='1';}else if(f.dataset.auto==='1'){f.value='';}}
  refreshLists();
});
function suggestCommon(){
  const g=norm($('genus').value),s=norm($('species').value);if(!g||!s)return;
  const hit=[...recs()].filter(r=>norm(r.genus)===g&&norm(r.species)===s&&(r.commonNameEn||r.commonNameAf)).sort(byNewest)[0];
  if(!hit)return;
  if(!$('commonNameEn').value.trim()&&hit.commonNameEn)$('commonNameEn').value=hit.commonNameEn;
  if(!$('commonNameAf').value.trim()&&hit.commonNameAf)$('commonNameAf').value=hit.commonNameAf;
}
function suggestScientific(field){
  const v=norm($(field).value);if(!v||$('genus').value.trim()||$('species').value.trim())return;
  const hit=[...recs()].filter(r=>!isUnid(r)&&norm(r[field])===v).sort(byNewest)[0];
  if(!hit)return;
  $('genus').value=hit.genus||'';$('species').value=hit.species||'';
  if(!$('family').value.trim()&&hit.family)$('family').value=hit.family;
  const other=field==='commonNameEn'?'commonNameAf':'commonNameEn';
  if(!$(other).value.trim()&&hit[other])$(other).value=hit[other];
  refreshLists();
}
$('commonNameEn').addEventListener('change',()=>suggestScientific('commonNameEn'));$('commonNameAf').addEventListener('change',()=>suggestScientific('commonNameAf'));
$('species').addEventListener('change',suggestCommon);$('species').addEventListener('blur',suggestCommon);
$('family').addEventListener('input',()=>{$('family').dataset.auto='';refreshLists();});
function openForm(r){
  $('recordForm').reset();$('gpsMsg').textContent='';$('family').dataset.auto='';
  $('recordId').value=r?.id||'';
  $('dialogTitle').textContent=(r?'Edit ':'Add ')+SEC[cur].noun+' observation';
  $('deleteRecord').classList.toggle('hidden',!r);
  $('family').value=r?.family||'';$('genus').value=r?.genus||'';$('species').value=r?.species||'';
  $('dateObserved').value=r?r.dateObserved||'':todayISO();
  $('commonNameEn').value=r?.commonNameEn||'';$('commonNameAf').value=r?.commonNameAf||'';
  $('locality').value=r?.locality||'';$('floweringSeason').value=r?.floweringSeason||'';$('plantHeight').value=r?.height||'';$('tracks').value=r?.tracks||'';$('notes').value=r?.notes||'';
  $('photo').value='';currentPhotos=[...photosOf(r||{})];renderPhotos();
  refreshLists();
  openModal($('recordDialog'));
}
$('addRecord').onclick=()=>cur==='culture'?openSite():openForm();
$('closeDialog').onclick=$('cancelDialog').onclick=()=>$('recordDialog').close();
function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(r.error);r.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('bad image'));img.onload=()=>{const s=Math.min(1,1400/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.82));};img.src=r.result;};r.readAsDataURL(file);});}
$('useGps').onclick=()=>{
  const msg=$('gpsMsg');
  if(!navigator.geolocation){msg.textContent='GPS is not available on this device.';return;}
  msg.textContent='Finding position...';
  navigator.geolocation.getCurrentPosition(p=>{
    const t=`GPS ${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)} (±${Math.round(p.coords.accuracy)} m)`;
    const l=$('locality');l.value=l.value.trim()?l.value.trim()+'\n'+t:t;msg.textContent='Position added.';
  },err=>{msg.textContent=err.code===1?'Location permission was denied.':'Could not get a position. Try outdoors.';},{enableHighAccuracy:true,timeout:20000,maximumAge:30000});
};
$('recordForm').onsubmit=async e=>{
  e.preventDefault();
  const genus=$('genus').value.trim(),species=$('species').value.trim();
  const cEn=$('commonNameEn').value.trim(),cAf=$('commonNameAf').value.trim();
  const tr=$('tracks').value.trim();
  if(!genus&&!species&&!cEn&&!cAf&&!(cur==='fauna'&&tr)){alert('Please enter at least one name: a common name, or a genus / species'+(cur==='fauna'?' (or describe the tracks / spoor)':'')+'. The scientific name can be added later.');$('commonNameEn').focus();return;}
  const id=$('recordId').value||crypto.randomUUID();
  const prev=recs().find(r=>r.id===id)||{};
  const rec={id,family:$('family').value.trim(),genus,species,commonNameEn:$('commonNameEn').value.trim(),commonNameAf:$('commonNameAf').value.trim(),dateObserved:$('dateObserved').value,locality:$('locality').value.trim(),notes:$('notes').value.trim(),photos:[...currentPhotos],createdAt:prev.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(SEC[cur].season)rec.floweringSeason=$('floweringSeason').value.trim();
  if(cur==='flora')rec.height=$('plantHeight').value.trim();
  if(cur==='fauna')rec.tracks=tr;
  try{await saveRecord(rec);}catch(err){alert('Could not save. The device storage may be full.');return;}
  data[cur]=await allRecords();$('recordDialog').close();render();toast('Observation saved');
};
$('deleteRecord').onclick=async()=>{
  const id=$('recordId').value;if(!id||!confirm('Delete this observation from this device?'))return;
  const old=recs().find(r=>r.id===id),st=store(),sec=cur;
  await deleteRecord(id);data[sec]=await allRecords(st);$('recordDialog').close();render();
  toast('Observation deleted',async()=>{await saveRecord(old,st);data[sec]=await allRecords(st);render();});
};

/* ---------- export / import ---------- */
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
$('exportData').onclick=()=>{download(new Blob([JSON.stringify({format:C.exportFormat,version:3,exportedAt:new Date().toISOString(),flora:data.flora,fauna:data.fauna,culture:data.culture},null,2)],{type:'application/json'}),C.backupFile);markBackup();};
const csvCols=()=>SEC[cur].season?['family','genus','species','commonNameEn','commonNameAf','dateObserved','locality','floweringSeason','height','notes']:['family','genus','species','commonNameEn','commonNameAf','dateObserved','locality','tracks','notes'];
$('exportCsv').onclick=()=>{
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  if(cur==='culture'){const cc=['title','era','province','town','country','roles','notes','visitDate','latitude','longitude','capturedAt'];const flat=r=>({...r,visitDate:visitDate(r),latitude:r.gps?r.gps.lat:'',longitude:r.gps?r.gps.lon:''});download(new Blob(['\uFEFF'+[cc.join(','),...data.culture.map(r=>{const f=flat(r);return cc.map(c=>q(f[c])).join(',');})].join('\r\n')],{type:'text/csv;charset=utf-8'}),C.backupFile.replace(/\.json$/,'-culture.csv'));toast('Exported culture & sites as CSV (photographs are only included in the JSON backup)');return;}
  const cols=csvCols();
  download(new Blob(['\uFEFF'+[cols.join(','),...recs().map(r=>cols.map(c=>q(r[c])).join(','))].join('\r\n')],{type:'text/csv;charset=utf-8'}),C.backupFile.replace(/\.json$/,'-'+SEC[cur].noun+'.csv'));
  toast('Exported '+SEC[cur].noun+' as CSV (photographs are only included in the JSON backup)');
};
function parseCSV(s){s=s.replace(/^\uFEFF/,'');const rows=[];let row=[],v='',q=false;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){v+='"';i++;}else if(c==='"')q=false;else v+=c;}else if(c==='"')q=true;else if(c===','){row.push(v);v='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(v);rows.push(row);row=[];v='';}else v+=c;}if(v!==''||row.length){row.push(v);rows.push(row);}const head=(rows.shift()||[]).map(h=>h.trim());return rows.filter(r=>r.some(x=>x.trim())).map(r=>Object.fromEntries(head.map((h,i)=>[h,(r[i]||'').trim()])));}
const recKey=r=>norm((r.genus||'')+' '+(r.species||'')+' '+(r.commonNameEn||'')+' '+(r.commonNameAf||''))+'|'+(r.dateObserved||'')+'|'+norm(r.locality);
async function importInto(sec,rows){
  if(sec==='culture')return importCulture(rows);
  const st=SEC[sec].store,existing=data[sec];
  const have=new Set(existing.map(recKey)),ids=new Set(existing.map(r=>r.id));
  let added=0,updated=0,skipped=0;
  for(const r of rows){
    if(!r||(!(r.genus||'').trim()&&!(r.species||'').trim()&&!(r.commonNameEn||'').trim()&&!(r.commonNameAf||'').trim()&&!(r.tracks||'').trim())){skipped++;continue;}
    const rec={id:r.id||crypto.randomUUID(),family:(r.family||'').trim(),genus:(r.genus||'').trim(),species:(r.species||'').trim(),commonNameEn:(r.commonNameEn||'').trim(),commonNameAf:(r.commonNameAf||'').trim(),dateObserved:r.dateObserved||'',locality:r.locality||'',notes:r.notes||'',photos:photosOf(r),createdAt:r.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(SEC[sec].season)rec.floweringSeason=r.floweringSeason||'';
    if(sec==='flora')rec.height=r.height||'';
    if(sec==='fauna')rec.tracks=r.tracks||'';
    if(ids.has(rec.id)){await saveRecord(rec,st);updated++;continue;}
    if(have.has(recKey(rec))){skipped++;continue;}
    await saveRecord(rec,st);have.add(recKey(rec));ids.add(rec.id);added++;
  }
  data[sec]=await allRecords(st);
  return{added,updated,skipped};
}
$('importFile').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    const text=await file.text();const jobs=[];
    if(file.name.toLowerCase().endsWith('.csv')){
      const rows=cur==='culture'?parseCSV(text).map(cultureFromCsv):parseCSV(text).map(r=>{
        let genus=r.genus||'',species=r.species||'';
        if(!genus&&!species&&r.scientificName){const p=r.scientificName.split(/\s+/);genus=p.shift()||'';species=p.join(' ');}
        return{family:r.family,genus,species,commonNameEn:r.commonNameEn||r.commonName||r.english||'',commonNameAf:r.commonNameAf||r.afrikaans||'',dateObserved:r.dateObserved||r.date||'',locality:r.locality||'',floweringSeason:r.floweringSeason||r.flowering||'',height:r.height||'',tracks:r.tracks||'',notes:r.notes||r.researchNotes||''};
      });
      jobs.push([cur,rows]);
    }else{
      const j=JSON.parse(text);
      if(Array.isArray(j))jobs.push([cur,j]);
      else{
        const flora=j.flora||j.observations||j.records,fauna=j.fauna,culture=j.culture;
        if(Array.isArray(flora))jobs.push(['flora',flora]);
        if(Array.isArray(fauna))jobs.push(['fauna',fauna]);
        if(Array.isArray(culture))jobs.push(['culture',culture]);
        if(!jobs.length)throw new Error('no records');
      }
    }
    let t={added:0,updated:0,skipped:0};
    for(const [sec,rows] of jobs){const r=await importInto(sec,rows);t.added+=r.added;t.updated+=r.updated;t.skipped+=r.skipped;}
    render();
    toast(`Import finished: ${t.added} added, ${t.updated} updated, ${t.skipped} skipped`);
  }catch(err){console.error(err);alert('That file could not be imported. Please choose a JSON backup or a CSV file made by this app.');}
  e.target.value='';
};

/* ---------- backup reminder, storage info, toast ---------- */
function markBackup(){try{localStorage.setItem('floraLastBackup',String(Date.now()));localStorage.removeItem('floraSnooze');}catch{}renderBackupBanner();}
function renderBackupBanner(){
  let last=0,snooze=0;try{last=+localStorage.getItem('floraLastBackup')||0;snooze=+localStorage.getItem('floraSnooze')||0;}catch{}
  const total=data.flora.length+data.fauna.length+data.culture.length;
  const days=last?Math.floor((Date.now()-last)/864e5):null;
  const due=total>0&&(days===null||days>=14)&&Date.now()>snooze;
  $('backupBanner').classList.toggle('hidden',!due);
  if(due)$('backupText').textContent=days===null?`You have ${plural(total,'observation','observations')} stored only on this device. Export a backup so you never lose them.`:`Your last backup was ${days} days ago. Export a fresh backup to keep your observations safe.`;
}
$('backupNow').onclick=()=>$('exportData').click();
$('backupLater').onclick=()=>{try{localStorage.setItem('floraSnooze',String(Date.now()+3*864e5));}catch{}renderBackupBanner();};
async function storageInfo(){
  try{
    const ok=navigator.storage?.persist?await navigator.storage.persist():false;
    const e=navigator.storage?.estimate?await navigator.storage.estimate():null;
    $('storageInfo').textContent='Stored on this device'+(e?` · ${(e.usage/1048576).toFixed(1)} MB used`:'')+(ok?' · protected':'');
  }catch{$('storageInfo').textContent='Stored on this device';}
}
let toastTimer;
function toast(msg,undo,label='Undo'){
  $('toastMsg').textContent=msg;$('toast').classList.remove('hidden');$('toastUndo').classList.toggle('hidden',!undo);$('toastUndo').textContent=label;
  $('toastUndo').onclick=async()=>{$('toast').classList.add('hidden');await undo();};
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),undo?9000:3500);
}

/* ---------- Android back button closes the open window instead of leaving the app ---------- */
const modalStack=[];let ignorePops=0;
function openModal(d){d.showModal();history.pushState({m:d.id},'');modalStack.push(d);}
['recordDialog','siteDialog','cameraDialog','photoDialog','donateDialog','guidesDialog','manualDialog'].forEach(id=>{
  const d=$(id);
  d.addEventListener('close',()=>{if(d._byPop){d._byPop=false;return;}const i=modalStack.lastIndexOf(d);if(i<0)return;modalStack.splice(i,1);ignorePops++;history.back();});
});
addEventListener('popstate',()=>{
  if(ignorePops>0){ignorePops--;return;}
  const d=modalStack.pop();if(d&&d.open){d._byPop=true;d.close();}
});


/* ---------- cultural & tourist sites ---------- */
const PROVINCE_OUTSIDE='Outside South Africa';
let sitePhotosCur=[],siteGpsData=null,siteGpsState='';
const visitDate=r=>r.visitDate||(r.capturedAt?new Date(new Date(r.capturedAt).getTime()-new Date(r.capturedAt).getTimezoneOffset()*60000).toISOString().slice(0,10):'');
const placeOf=r=>r.province===PROVINCE_OUTSIDE?(r.country||PROVINCE_OUTSIDE):(r.province||'Place not specified');
const fmtStamp=d=>{const dt=new Date(d);return isNaN(dt)?'':dt.toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});};
const siteName=r=>(r.title||'').replace(/\s*\n\s*/g,' ').trim()||('Site visit: '+(r.town||placeOf(r)));
const siteHeadHTML=r=>escapeHTML((r.title||'').trim()||('Site visit: '+(r.town||placeOf(r)))).replace(/\n/g,'<br>');
const siteNewest=(a,b)=>(b.capturedAt||'').localeCompare(a.capturedAt||'')||(visitDate(b)).localeCompare(visitDate(a));
const gpsText=g=>g?`${(+g.lat).toFixed(5)}, ${(+g.lon).toFixed(5)}${g.acc?` (±${Math.round(g.acc)} m)`:''}`:'';
function siteCard(r){
  const ph=photosOf(r);
  return `<article class="obs-card" data-id="${r.id}" tabindex="0" role="button" aria-label="Edit ${escapeHTML(siteName(r))}">
  <div class="obs-image">${ph.length?`<img src="${ph[0]}" alt="" loading="lazy">`:iconFor()}${ph.length>1?`<span class="photobadge">&#128247; ${ph.length}</span>`:''}</div>
  <div class="obs-body"><h3 class="unid">${siteHeadHTML(r)}</h3>
  <div class="obs-meta">${fmtDate(visitDate(r))} · ${escapeHTML(r.town||'')}${r.province&&r.province!==PROVINCE_OUTSIDE?', '+escapeHTML(r.province):r.country?', '+escapeHTML(r.country):''}</div>
  ${r.era?`<span class="tag">&#128368; ${escapeHTML(r.era)}</span>`:''}${r.gps?'<span class="tag">&#128205; GPS saved</span>':''}
  ${r.roles?`<div class="obs-note">&#128101; ${escapeHTML(r.roles.replace(/\s*\n+\s*/g,', '))}</div>`:''}
  ${r.notes?`<div class="obs-note"><em>${escapeHTML(r.notes)}</em></div>`:''}
  <div class="card-actions"><button class="smallbtn" type="button" data-edit="${r.id}">Edit</button></div></div></article>`;
}
function siteRow(r){
  const ph=photosOf(r);
  return `<div class="obs-row" data-id="${r.id}" tabindex="0" role="button" aria-label="Edit ${escapeHTML(siteName(r))}">
  <div class="row-thumb">${ph.length?`<img src="${ph[0]}" alt="" loading="lazy">`:iconFor()}</div>
  <div class="row-main"><strong class="unid">${escapeHTML(siteName(r))}</strong><span class="row-sub">${fmtDate(visitDate(r))} · ${escapeHTML(r.town||'')} · ${escapeHTML(placeOf(r))}${r.era?' · '+escapeHTML(r.era):''}</span></div>
  <button class="smallbtn" type="button" data-edit="${r.id}">Edit</button></div>`;
}
const siteItems=list=>list.length?`<div class="${viewMode==='cards'?'obs-grid':'obs-list'}">${list.map(viewMode==='cards'?siteCard:siteRow).join('')}</div>`:'';
function renderCulture(){
  const records=data.culture,q=$('search').value.trim().toLowerCase();
  const places=[...new Set(records.map(placeOf))].sort();
  const oldF=$('familyFilter').value;
  $('familyFilter').innerHTML='<option value="">All provinces / places</option>'+places.map(f=>`<option>${escapeHTML(f)}</option>`).join('');
  $('familyFilter').value=places.includes(oldF)?oldF:'';
  const fam=$('familyFilter').value;
  const filtered=records.filter(r=>{
    const hay=[r.title,r.era,r.roles,r.notes,r.province,r.town,r.country].join(' ').toLowerCase();
    return(!q||hay.includes(q))&&(!fam||placeOf(r)===fam);
  });
  $('obsCount').textContent=records.length;
  $('familyCount').textContent=places.length;
  $('genusCount').textContent=new Set(records.map(r=>norm(r.town)).filter(Boolean)).size;
  $('speciesCount').textContent=records.reduce((n,r)=>n+photosOf(r).length,0);
  $('photoCount').textContent=records.filter(r=>r.gps).length;
  const filtering=!!(q||fam);
  if(!filtered.length){$('obsGrid').innerHTML=`<div class="empty">${records.length?'No matching site visits. Try another search or filter.':'No site visits yet. Tap “Add site visit” to save your first memory.'}</div>`;return;}
  if(groupMode==='date'){
    const by=new Map();
    for(const r of filtered){const k=visitDate(r).slice(0,7);if(!by.has(k))by.set(k,[]);by.get(k).push(r);}
    $('obsGrid').innerHTML=[...by.keys()].sort((a,b)=>!a?1:!b?-1:b.localeCompare(a)).map(k=>{
      const list=by.get(k).sort(siteNewest);
      const label=k?new Date(k+'-01T00:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'}):'Date not recorded';
      return `<details class="date-group" data-dkey="${escapeHTML(k)}"${closedDates.has(k)&&!filtering?'':' open'}><summary><span class="fam-name">${escapeHTML(label)}</span><span class="fam-count">${plural(list.length,'visit','visits')}</span></summary><div class="date-body">${siteItems(list)}</div></details>`;
    }).join('');
    return;
  }
  const byPlace=new Map();
  for(const r of filtered){const f=placeOf(r),t=(r.town||'').trim();if(!byPlace.has(f))byPlace.set(f,new Map());const tm=byPlace.get(f);if(!tm.has(t))tm.set(t,[]);tm.get(t).push(r);}
  $('obsGrid').innerHTML=[...byPlace.keys()].sort(emptyLast).map(f=>{
    const tm=byPlace.get(f),tkeys=[...tm.keys()].sort(emptyLast),count=[...tm.values()].reduce((n,a)=>n+a.length,0);
    const body=tkeys.map(t=>{const key=f+'|'+t,list=tm.get(t).sort(siteNewest);
      return `<details class="genus-group" data-gkey="${escapeHTML(key)}"${closedGenera.has(key)&&!filtering?'':' open'}><summary class="genus-title town-title"><span>${t?escapeHTML(t):'Town not specified'}</span><span class="fam-count">${plural(list.length,'visit','visits')}</span></summary>${siteItems(list)}</details>`;}).join('');
    return `<details class="family-group" data-family="${escapeHTML(f)}"${closedFamilies.has(f)&&!filtering?'':' open'}><summary><span class="fam-name">${escapeHTML(f)}</span><span class="fam-count">${plural(tkeys.length,'town','towns')} · ${plural(count,'visit','visits')}</span></summary><div class="family-body">${body}</div></details>`;
  }).join('');
}
function renderSitePhotos(){
  const n=sitePhotosCur.length;
  $('sitePhotoGrid').innerHTML=sitePhotosCur.map((src,i)=>`<div class="thumb"><img src="${src}" alt="Photograph ${i+1}" data-view="${i}"><button type="button" class="thumbdel" data-del="${i}" aria-label="Delete photograph ${i+1}">&times;</button></div>`).join('');
  $('sitePhotoEmpty').classList.toggle('hidden',n>0);
  $('sitePhotoCountLabel').textContent=n?`(${n})`:'';
}
$('sitePhotoGrid').addEventListener('click',e=>{
  const del=e.target.closest('[data-del]'),view=e.target.closest('[data-view]');
  if(del){if(confirm('Delete this photograph?')){sitePhotosCur.splice(+del.dataset.del,1);renderSitePhotos();}}
  else if(view){$('photoLarge').src=sitePhotosCur[+view.dataset.view];openModal($('photoDialog'));}
});
$('sitePhotos').onchange=async e=>{photoTarget='site';const fs=[...e.target.files];e.target.value='';await addFiles(fs);};
$('siteTakePhoto').onclick=()=>openCamera('site');
function getGps(){return new Promise((resolve,reject)=>{if(!navigator.geolocation){reject(new Error('unavailable'));return;}navigator.geolocation.getCurrentPosition(p=>resolve({lat:+p.coords.latitude.toFixed(6),lon:+p.coords.longitude.toFixed(6),acc:Math.round(p.coords.accuracy||0)}),reject,{enableHighAccuracy:true,timeout:15000,maximumAge:60000});});}
function showSiteGps(){$('siteGps').textContent=siteGpsData?gpsText(siteGpsData):(siteGpsState||'Not captured yet');}
async function captureSiteGps(){
  siteGpsState='Finding GPS position…';showSiteGps();
  try{siteGpsData=await getGps();siteGpsState='';}
  catch(err){siteGpsState=err&&err.code===1?'Location permission was blocked. You can still save without GPS.':'GPS not available right now. You can still save without it.';}
  showSiteGps();
}
$('siteGpsRetry').onclick=captureSiteGps;
function toggleCountry(){$('siteCountryWrap').classList.toggle('hidden',$('siteProvince').value!=='__outside');}
$('siteProvince').onchange=toggleCountry;
const autoGrow=t=>{t.style.height='auto';t.style.height=Math.min(t.scrollHeight+2,600)+'px';};
document.querySelectorAll('textarea.autogrow').forEach(t=>t.addEventListener('input',()=>autoGrow(t)));
function openSite(r){
  $('siteForm').reset();$('siteId').value=r?.id||'';
  $('siteHead').textContent=r?'Edit site visit':'Cultural or tourist site';
  $('deleteSite').classList.toggle('hidden',!r);
  $('siteTitle').value=r?.title||'';$('siteEra').value=r?.era||'';
  $('siteProvince').value=r?(r.province===PROVINCE_OUTSIDE?'__outside':(r.province||'')):'';
  $('siteTown').value=r?.town||'';$('siteCountry').value=r?.country||'';
  $('siteRoles').value=r?.roles||'';$('siteNotes').value=r?.notes||'';
  $('siteDate').value=r?visitDate(r):todayISO();
  $('sitePhotos').value='';sitePhotosCur=[...photosOf(r||{})];renderSitePhotos();
  siteGpsData=r?.gps||null;siteGpsState='';showSiteGps();
  $('siteStamp').textContent=r?('Saved to diary: '+fmtStamp(r.capturedAt)):('Will be saved with today’s date and time ('+fmtStamp(new Date())+') and your GPS position.');
  toggleCountry();
  openModal($('siteDialog'));
  autoGrow($('siteNotes'));
  if(!r)captureSiteGps();
}
$('closeSite').onclick=$('cancelSite').onclick=()=>$('siteDialog').close();
function readSite(){
  const province=$('siteProvince').value;
  return{title:$('siteTitle').value.trim(),era:$('siteEra').value.trim(),province:province==='__outside'?PROVINCE_OUTSIDE:province,town:$('siteTown').value.trim(),country:province==='__outside'?$('siteCountry').value.trim():'',roles:$('siteRoles').value.trim(),notes:$('siteNotes').value.trim(),visitDate:$('siteDate').value||todayISO(),gps:siteGpsData||null,photos:[...sitePhotosCur]};
}
$('siteForm').onsubmit=async e=>{
  e.preventDefault();
  const v=readSite();
  if(!v.province){alert('Please choose a province, or “Outside South Africa”.');$('siteProvince').focus();return;}
  if(!v.town){alert('Please fill in the town or city.');$('siteTown').focus();return;}
  if($('siteProvince').value==='__outside'&&!v.country){alert('Please fill in the country.');$('siteCountry').focus();return;}
  const id=$('siteId').value||crypto.randomUUID();
  const prev=data.culture.find(r=>r.id===id)||{};
  const rec={id,...v,capturedAt:prev.capturedAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  try{await saveRecord(rec,'culture');}catch{alert('Could not save. The device storage may be full.');return;}
  data.culture=await allRecords('culture');$('siteDialog').close();render();toast('Saved to diary');
};
$('deleteSite').onclick=async()=>{
  const id=$('siteId').value;if(!id||!confirm('Delete this site visit from this device?'))return;
  const old=data.culture.find(r=>r.id===id);
  await deleteRecord(id,'culture');data.culture=await allRecords('culture');$('siteDialog').close();render();
  toast('Site visit deleted',async()=>{await saveRecord(old,'culture');data.culture=await allRecords('culture');render();});
};
async function importCulture(rows){
  const st='culture',ids=new Set(data.culture.map(r=>r.id)),key=r=>norm((r.title||'')+' '+(r.town||''))+'|'+(r.capturedAt||r.visitDate||'');
  const have=new Set(data.culture.map(key));let added=0,updated=0,skipped=0;
  for(const r of rows){
    if(!r||(!(r.town||'').trim()&&!(r.title||'').trim()&&!(r.notes||'').trim())){skipped++;continue;}
    const rec={id:r.id||crypto.randomUUID(),title:r.title||'',era:r.era||'',province:r.province||'',town:r.town||'',country:r.country||'',roles:r.roles||'',notes:r.notes||'',visitDate:r.visitDate||'',gps:r.gps||null,photos:photosOf(r),capturedAt:r.capturedAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(ids.has(rec.id)){await saveRecord(rec,st);updated++;continue;}
    if(have.has(key(rec))){skipped++;continue;}
    await saveRecord(rec,st);have.add(key(rec));ids.add(rec.id);added++;
  }
  data.culture=await allRecords(st);return{added,updated,skipped};
}
function cultureFromCsv(r){
  const lat=parseFloat(r.latitude),lon=parseFloat(r.longitude);
  return{title:r.title||'',era:r.era||'',province:r.province||'',town:r.town||'',country:r.country||'',roles:r.roles||'',notes:r.notes||'',visitDate:r.visitDate||'',capturedAt:r.capturedAt||'',gps:(isFinite(lat)&&isFinite(lon))?{lat,lon,acc:0}:null};
}

/* ---------- day report: PDF and PowerPoint ---------- */
const KCOLOR={flora:'#2e7d5b',fauna:'#9a5b23',culture:'#7a2f1b'};
const KLABEL={flora:'Flora',fauna:'Fauna',culture:'Cultural & tourist sites'};
const _loaded={};
function loadScript(src){return _loaded[src]||(_loaded[src]=new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>{delete _loaded[src];rej(new Error('Could not load the report tools. Open the app once while online, then try again.'));};document.head.appendChild(s);}));}
const longDate=d=>{if(!d)return'';const dt=new Date(d+'T00:00:00');return isNaN(dt)?d:dt.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});};
function entryFromRecord(sec,r){
  if(sec==='culture'){
    const where=[r.town,r.province===PROVINCE_OUTSIDE?r.country:r.province].filter(Boolean).join(', ');
    return{kind:'culture',title:siteName(r),italic:false,sub:where,photos:photosOf(r),
      rows:[['Historical date / era',r.era],['Visited',longDate(visitDate(r))+(r.capturedAt?', '+new Date(r.capturedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'')],['GPS',gpsText(r.gps)],['Role players',r.roles],['Field notes / story',r.notes]]};
  }
  return{kind:sec,title:sciName(r),italic:!isUnid(r),sub:commonLine(r).replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"'),photos:photosOf(r),
    rows:[['Family',r.family],['Date observed',longDate(r.dateObserved)],['Locality / specimen',r.locality],...(sec==='flora'?[['Flowering season',r.floweringSeason],['Height of plant / tree',r.height]]:[['Tracks / spoor',r.tracks]]),['Research notes',r.notes]]};
}
function selectedEntries(){
  const from=$('reportFrom').value,to=$('reportTo').value,out=[];
  const inRange=d=>d?((!from||d>=from)&&(!to||d<=to)):(!from&&!to);
  if($('repFlora').checked)data.flora.filter(r=>inRange(r.dateObserved)).sort((a,b)=>sciName(a).localeCompare(sciName(b))).forEach(r=>out.push(entryFromRecord('flora',r)));
  if($('repFauna').checked)data.fauna.filter(r=>inRange(r.dateObserved)).sort((a,b)=>sciName(a).localeCompare(sciName(b))).forEach(r=>out.push(entryFromRecord('fauna',r)));
  if($('repCulture').checked)data.culture.filter(r=>inRange(visitDate(r))).sort((a,b)=>(a.capturedAt||'').localeCompare(b.capturedAt||'')).forEach(r=>out.push(entryFromRecord('culture',r)));
  return out;
}
function updateReportCount(){
  const e=selectedEntries(),n={flora:0,fauna:0,culture:0};e.forEach(x=>n[x.kind]++);
  $('reportCount').textContent=`${plural(e.length,'entry','entries')} selected (${n.flora} flora, ${n.fauna} fauna, ${n.culture} cultural sites)`;
  $('makePdf').disabled=$('makePptx').disabled=!e.length;
}
['reportFrom','reportTo','repFlora','repFauna','repCulture'].forEach(id=>$(id).addEventListener('input',updateReportCount));
$('reportToday').onclick=()=>{$('reportFrom').value=$('reportTo').value=todayISO();updateReportCount();};
$('reportAll').onclick=()=>{$('reportFrom').value=$('reportTo').value='';updateReportCount();};
function reportMeta(entries){
  const from=$('reportFrom').value,to=$('reportTo').value,n={flora:0,fauna:0,culture:0};entries.forEach(x=>n[x.kind]++);
  const range=!from&&!to?'All dates':from===to?longDate(from):`${longDate(from)||'Start'} to ${longDate(to)||'today'}`;
  return{title:from&&from===to?'My day in Southern Africa':'My Southern Africa field notes',subtitle:range,counts:`${n.flora} flora   ·   ${n.fauna} fauna   ·   ${n.culture} cultural sites`,slug:from&&from===to?from:(from||to?`${from||'start'}_to_${to||'now'}`:'all')};
}
const _imgCache=new Map();
function prepImage(src,max=900,q=.75){
  const k=max+'|'+q+'|'+src.length+'|'+src.slice(-40);
  if(_imgCache.has(k))return _imgCache.get(k);
  const pr=new Promise(resolve=>{const img=new Image();img.onload=()=>{const s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*s));c.height=Math.max(1,Math.round(img.height*s));const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);resolve({data:c.toDataURL('image/jpeg',q),w:c.width,h:c.height});};img.onerror=()=>resolve(null);img.src=src;});
  _imgCache.set(k,pr);return pr;
}
const dataToBytes=d=>Uint8Array.from(atob(d.split(',')[1]),c=>c.charCodeAt(0));
const WIN1252=new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.split(''));
function pdfText(s){let o='';for(const ch of String(s??'').replace(/\r/g,'').replace(/[\u00A0\u2007\u202F]/g,' ')){const c=ch.codePointAt(0);if(c===10||(c>=32&&c<=126)||(c>=161&&c<=255)||WIN1252.has(ch))o+=ch;else if(c<32)o+=' ';else{const base=ch.normalize('NFD').replace(/[\u0300-\u036f]/g,'');if(base!==ch&&base.charCodeAt(0)<128)o+=base;else if(/\p{L}/u.test(ch))o+='?';}}return o;}
async function buildPdf(entries,meta){
  await loadScript('pdf-lib.min.js');
  const {PDFDocument,StandardFonts,rgb}=PDFLib;
  const doc=await PDFDocument.create();
  doc.setTitle(meta.title);doc.setAuthor('Henry van der Schyff');doc.setCreator(APP_NAME);doc.setProducer(APP_NAME);
  const F=await doc.embedFont(StandardFonts.Helvetica),FB=await doc.embedFont(StandardFonts.HelveticaBold),FI=await doc.embedFont(StandardFonts.HelveticaOblique),FBI=await doc.embedFont(StandardFonts.HelveticaBoldOblique);
  const W=595.28,H=841.89,M=42,BOTTOM=50,cw=W-2*M;
  const hex=h=>{const n=parseInt(h.slice(1),16);return rgb((n>>16&255)/255,(n>>8&255)/255,(n&255)/255);};
  const GREEN=hex('#183d32'),GREY=rgb(.4,.45,.42),INK=rgb(.1,.13,.11),WHITE=rgb(1,1,1);
  let page,y;
  const newPage=()=>{page=doc.addPage([W,H]);y=H-M;};
  const ensure=h=>{if(y-h<BOTTOM)newPage();};
  const wrap=(text,font,size,maxW)=>{const out=[];for(const para of pdfText(text).split('\n')){if(!para.trim()){out.push('');continue;}let cur='';for(let w of para.split(/\s+/)){if(!w)continue;while(font.widthOfTextAtSize(w,size)>maxW){let k=w.length;while(k>1&&font.widthOfTextAtSize(w.slice(0,k),size)>maxW)k--;if(cur){out.push(cur);cur='';}out.push(w.slice(0,k));w=w.slice(k);}const t=cur?cur+' '+w:w;if(font.widthOfTextAtSize(t,size)<=maxW)cur=t;else{out.push(cur);cur=w;}}out.push(cur);}return out;};
  newPage();
  page.drawRectangle({x:0,y:H-112,width:W,height:112,color:GREEN});
  const title=pdfText(meta.title);let ts=22;const tw=FB.widthOfTextAtSize(title,ts);if(tw>cw)ts=Math.max(12,ts*cw/tw);
  page.drawText(title,{x:M,y:H-56,font:FB,size:ts,color:WHITE});
  page.drawText(pdfText(meta.subtitle),{x:M,y:H-79,font:F,size:11.5,color:rgb(.85,.92,.87)});
  page.drawText(pdfText(meta.counts),{x:M,y:H-97,font:F,size:9.5,color:rgb(.9,.8,.55)});
  y=H-112-24;
  let last=null;
  for(const e of entries){
    const imgs=[];for(const src of e.photos){const p=await prepImage(src);if(p)imgs.push(p);}
    const tf=e.italic?FBI:FB,titleLines=wrap(e.title,tf,14,cw),subLines=e.sub?wrap(e.sub,F,10.5,cw):[];
    const rowLines=e.rows.filter(([,v])=>v&&String(v).trim()).map(([lab,val])=>[lab,wrap(val,F,10,cw-112)]);
    const gap=8,cols=imgs.length===1?1:imgs.length===2?2:3,bw=(cw-gap*(cols-1))/cols,bh=Math.min(bw*.75,230);
    const textH=titleLines.length*19+subLines.length*15+4+rowLines.reduce((n,[,l])=>n+l.length*13.5+3,0);
    const needed=textH+(imgs.length?bh+gap+8:0);
    const barH=e.kind!==last?34:0;
    if(needed+barH<H-M-BOTTOM-40)ensure(needed+barH);else ensure(90+barH);   /* keep a whole entry (and its section heading) together when it fits on one page */
    if(barH){page.drawRectangle({x:M,y:y-20,width:cw,height:20,color:hex(KCOLOR[e.kind])});page.drawText(pdfText(KLABEL[e.kind]).toUpperCase(),{x:M+8,y:y-14,font:FB,size:10,color:WHITE});y-=34;last=e.kind;}
    for(const l of titleLines){ensure(19);page.drawText(l,{x:M,y:y-14,font:tf,size:14,color:GREEN});y-=19;}
    for(const l of subLines){ensure(15);page.drawText(l,{x:M,y:y-10.5,font:F,size:10.5,color:GREY});y-=15;}
    y-=4;
    for(const [lab,lines] of rowLines){
      ensure(15);
      page.drawText(pdfText(lab),{x:M,y:y-10,font:FB,size:9,color:GREY});
      lines.forEach((l,i)=>{if(i>0)ensure(14);page.drawText(l,{x:M+112,y:y-10,font:F,size:10,color:INK});y-=13.5;});
      y-=3;
    }
    if(imgs.length){
      y-=4;
      for(let i=0;i<imgs.length;i+=cols){
        ensure(bh+gap);
        const rowImgs=imgs.slice(i,i+cols);
        for(let j=0;j<rowImgs.length;j++){
          const p=rowImgs[j],emb=await doc.embedJpg(dataToBytes(p.data)),sc=Math.min(bw/p.w,bh/p.h),w=p.w*sc,h=p.h*sc;
          page.drawImage(emb,{x:M+j*(bw+gap)+(bw-w)/2,y:y-bh+(bh-h)/2,width:w,height:h});
        }
        y-=bh+gap;
      }
    }
    y-=4;ensure(14);page.drawLine({start:{x:M,y},end:{x:W-M,y},thickness:.5,color:rgb(.84,.87,.85)});y-=16;
  }
  const pages=doc.getPages();
  pages.forEach((p,i)=>{
    p.drawText(pdfText(CITE),{x:M,y:24,font:F,size:7.5,color:rgb(.5,.55,.52)});
    const t=`Page ${i+1} of ${pages.length}`;p.drawText(t,{x:W-M-F.widthOfTextAtSize(t,7.5),y:24,font:F,size:7.5,color:rgb(.5,.55,.52)});
  });
  return new Blob([await doc.save()],{type:'application/pdf'});
}
const blobToDataURL=b=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(b);});
async function buildPptx(entries,meta){
  await loadScript('pptxgen.bundle.js');
  const pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';pptx.author='Henry van der Schyff';pptx.company=APP_NAME;pptx.title=meta.title;
  const G='183D32',FONT='Calibri',SW=13.333;
  const footer=s=>{s.addText(CITE,{x:0.4,y:7.08,w:10.8,h:0.3,fontSize:9,color:'7A8A82',fontFace:FONT});s.slideNumber={x:12.3,y:7.08,w:0.7,h:0.3,fontSize:10,color:'7A8A82'};};
  const fit=(p,bx,by,bw,bh)=>{const s=Math.min(bw/p.w,bh/p.h),w=p.w*s,h=p.h*s;return{x:bx+(bw-w)/2,y:by+(bh-h)/2,w,h};};
  let s=pptx.addSlide();s.background={color:G};
  try{const ic=await fetch('icon-512.png').then(r=>r.blob()).then(blobToDataURL);s.addImage({data:ic,x:9.3,y:1.5,w:3.5,h:3.5});}catch{}
  s.addText(meta.title,{x:0.7,y:1.5,w:8.4,h:1.7,fontSize:40,bold:true,color:'FFFFFF',fontFace:'Georgia',valign:'top'});
  s.addText(meta.subtitle,{x:0.7,y:3.3,w:8.4,h:0.6,fontSize:20,color:'D6E4D9',fontFace:FONT});
  s.addText(meta.counts,{x:0.7,y:3.95,w:8.4,h:0.5,fontSize:16,color:'E6C98E',fontFace:FONT});
  s.addText(CITE,{x:0.7,y:6.6,w:11.8,h:0.4,fontSize:11,color:'B9CFC0',fontFace:FONT});
  for(const e of entries){
    const col=KCOLOR[e.kind].slice(1);
    const imgs=[];for(const src of e.photos){const p=await prepImage(src,1200,.78);if(p)imgs.push(p);}
    s=pptx.addSlide();s.background={color:'FFFFFF'};
    s.addShape(pptx.ShapeType.rect,{x:0,y:0,w:SW,h:0.45,fill:{color:col},line:{color:col}});
    s.addText(KLABEL[e.kind].toUpperCase(),{x:0.4,y:0.05,w:9,h:0.35,fontSize:12,bold:true,color:'FFFFFF',fontFace:FONT,charSpacing:2});
    s.addText(e.title,{x:0.4,y:0.62,w:12.5,h:0.85,fontSize:30,bold:true,italic:!!e.italic,color:G,fontFace:'Georgia',fit:'shrink',valign:'top'});
    if(e.sub)s.addText(e.sub,{x:0.4,y:1.42,w:12.5,h:0.4,fontSize:16,color:'55655C',fontFace:FONT});
    const rows=e.rows.filter(([,v])=>v&&String(v).trim());
    const full=rows.map(([l,v])=>l+': '+v).join('\n');
    const clip=(v)=>{v=String(v);return v.length>650?v.slice(0,650).trim()+'… (full text in the speaker notes)':v;};
    const total=rows.reduce((n,[,v])=>n+String(v).length,0);
    const fs=total>900?11:total>550?12:14;
    const runs=[];rows.forEach(([l,v])=>{runs.push({text:l+': ',options:{bold:true,color:'55655C'}});runs.push({text:clip(v),options:{color:'222222',breakLine:true}});});
    const hasImg=imgs.length>0;
    if(runs.length)s.addText(runs,{x:0.4,y:1.95,w:hasImg?6.6:12.5,h:4.95,fontSize:fs,valign:'top',fontFace:FONT,paraSpaceAfter:6});
    const X=7.3,Y=1.95,AW=5.6,AH=4.95,g=0.15,first=imgs.slice(0,4);
    if(first.length===1){const f=fit(first[0],X,Y,AW,AH);s.addImage({data:first[0].data,...f});}
    else if(first.length===2){const bh=(AH-g)/2;first.forEach((p,i)=>s.addImage({data:p.data,...fit(p,X,Y+i*(bh+g),AW,bh)}));}
    else if(first.length>=3){const bw=(AW-g)/2,bh=(AH-g)/2;first.forEach((p,i)=>s.addImage({data:p.data,...fit(p,X+(i%2)*(bw+g),Y+Math.floor(i/2)*(bh+g),bw,bh)}));}
    s.addNotes(e.title+'\n'+full);
    footer(s);
    for(let i=4;i<imgs.length;i+=6){
      const sl=pptx.addSlide();sl.background={color:'FFFFFF'};
      sl.addShape(pptx.ShapeType.rect,{x:0,y:0,w:SW,h:0.45,fill:{color:col},line:{color:col}});
      sl.addText(KLABEL[e.kind].toUpperCase()+'  ·  PHOTOGRAPHS',{x:0.4,y:0.05,w:12,h:0.35,fontSize:12,bold:true,color:'FFFFFF',fontFace:FONT,charSpacing:2});
      sl.addText(e.title+' (photographs)',{x:0.4,y:0.62,w:12.5,h:0.7,fontSize:24,bold:true,italic:!!e.italic,color:G,fontFace:'Georgia',fit:'shrink'});
      const grp=imgs.slice(i,i+6),bw=(12.5-2*g)/3,bh=(5.2-g)/2;
      grp.forEach((p,k)=>sl.addImage({data:p.data,...fit(p,0.4+(k%3)*(bw+g),1.55+Math.floor(k/3)*(bh+g),bw,bh)}));
      footer(sl);
    }
  }
  s=pptx.addSlide();s.background={color:G};
  s.addText('Created with',{x:0.7,y:2.2,w:12,h:0.5,fontSize:20,color:'B9CFC0',fontFace:FONT});
  s.addText(APP_NAME,{x:0.7,y:2.7,w:12,h:1.2,fontSize:34,bold:true,color:'FFFFFF',fontFace:'Georgia'});
  s.addText('© 2026 Henry van der Schyff. All rights reserved.',{x:0.7,y:4.1,w:12,h:0.5,fontSize:16,color:'E6C98E',fontFace:FONT});
  s.addText('Thank you for your support.',{x:0.7,y:4.7,w:12,h:0.5,fontSize:16,color:'D6E4D9',fontFace:FONT});
  return await pptx.write({outputType:'blob'});
}
async function deliverFile(blob,name,mime){
  download(blob,name);
  const file=new File([blob],name,{type:mime});
  if(navigator.canShare&&navigator.canShare({files:[file]}))toast(name+' created',()=>navigator.share({files:[file],title:name}).catch(()=>{}),'Share');
  else toast(name+' saved to your downloads');
}
async function runReport(kind,entries,meta,btn){
  const label=btn?btn.innerHTML:'';
  try{
    if(btn){btn.disabled=true;btn.textContent='Creating…';}
    toast('Creating '+(kind==='pdf'?'PDF':'PowerPoint')+'…');
    const blob=kind==='pdf'?await buildPdf(entries,meta):await buildPptx(entries,meta);
    await deliverFile(blob,`Field-notes-${meta.slug}.${kind==='pdf'?'pdf':'pptx'}`,kind==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  }catch(err){console.error(err);alert('The report could not be created. '+(err&&err.message?err.message:''));}
  finally{if(btn){btn.innerHTML=label;}updateReportCount();}
}
$('makePdf').onclick=()=>{const e=selectedEntries();if(e.length)runReport('pdf',e,reportMeta(e),$('makePdf'));};
$('makePptx').onclick=()=>{const e=selectedEntries();if(e.length)runReport('pptx',e,reportMeta(e),$('makePptx'));};
function singleReport(entry,btn){const meta={title:entry.title,subtitle:KLABEL[entry.kind],counts:'',slug:(entry.title||'entry').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'entry'};runReport('pdf',[entry],meta,btn);}
$('pdfOne').onclick=()=>{
  const genus=$('genus').value.trim(),species=$('species').value.trim(),cEn=$('commonNameEn').value.trim(),cAf=$('commonNameAf').value.trim();
  if(!genus&&!species&&!cEn&&!cAf&&!$('tracks').value.trim()){alert('Please enter a name first.');return;}
  const r={family:$('family').value.trim(),genus,species,commonNameEn:cEn,commonNameAf:cAf,dateObserved:$('dateObserved').value,locality:$('locality').value.trim(),floweringSeason:$('floweringSeason').value.trim(),height:$('plantHeight').value.trim(),tracks:$('tracks').value.trim(),notes:$('notes').value.trim(),photos:[...currentPhotos]};
  singleReport(entryFromRecord(cur,r),$('pdfOne'));
};
$('pdfSite').onclick=()=>{
  const v=readSite();if(!v.town&&!v.title&&!v.notes){alert('Please enter a title, town or notes first.');return;}
  singleReport(entryFromRecord('culture',{...v,capturedAt:data.culture.find(r=>r.id===$('siteId').value)?.capturedAt||new Date().toISOString()}),$('pdfSite'));
};

/* ---------- donate, field guides, user manual ---------- */
$('openDonate').onclick=()=>openModal($('donateDialog'));
$('openGuides').onclick=()=>{renderGuides();openModal($('guidesDialog'));};
$('openManual').onclick=()=>{renderManual();openModal($('manualDialog'));};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-copy]');if(!b)return;
  const t=b.dataset.copy;
  try{await navigator.clipboard.writeText(t);}catch{const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch{}ta.remove();}
  toast('Copied: '+t);
});
const GUIDES={
  wc:[['Field Guide to Fynbos Fauna','Cliff and Suretha Dorse','Frogs, reptiles, birds and mammals of the fynbos'],['Field Guide to Fynbos','John Manning','Wild flowers of the fynbos']],
  other:[
    ['Field Guide to Wild Flowers of South Africa','John Manning','Wild flowers'],
    ['Field Guide to the Mammals of Southern Africa','Chris and Tilde Stuart','Mammals'],
    ['A Guide to the Reptiles of Southern Africa','Graham Alexander and Johan Marais','Reptiles'],
    ['Field Guide to the Birds of Southern Africa','Ian Sinclair','Birds'],
    ['Complete Guide to the Frogs of Southern Africa','Louis du Preez and Vincent Carruthers','Frogs'],
    ['Field Guide to Insects of South Africa','Mike Picker, Charles Griffiths and Alan Weaving','Insects'],
    ['A Guide to the Freshwater Fishes of Southern Africa','Paul H. Skelton','Freshwater fish'],
    ['Coastal Fishes of Southern Africa','Elaine Heemstra and Phillip C. Heemstra','Coastal fish']
  ]
};
function renderGuides(){
  const item=g=>`<li><div><strong>${escapeHTML(g[0])}</strong><span>${escapeHTML(g[1])} · ${escapeHTML(g[2])}</span></div><a class="smallbtn" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(g[0]+' '+g[1]+' book')}">Find online</a></li>`;
  $('guidesBody').innerHTML=`<p class="muted">Handy books to take along. The links open your web browser and need an internet connection.</p>
  <h3>Western Cape</h3><ul class="guidelist">${GUIDES.wc.map(item).join('')}</ul>
  <h3>Other provinces and the rest of Southern Africa</h3><ul class="guidelist">${GUIDES.other.map(item).join('')}</ul>
  <p class="muted">The Western Cape guides above can also be useful in the Eastern Cape fynbos.</p>`;
}
function renderManual(){
  $('manualBody').innerHTML=`<details open><summary>Getting started</summary><p>Open the app link in Chrome (Android or laptop) and wait for it to load while you have internet. Tap <strong>Install app</strong> (or the browser menu, then <strong>Install app / Add to Home screen</strong>). After that the app works 100% offline: no signal is needed in the field.</p></details>
  <details><summary>Three sections</summary><p>Use the tabs <strong>Flora</strong>, <strong>Fauna</strong> and <strong>Culture &amp; sites</strong>. Each tab has its own list, search and filters. Tap <strong>Add</strong> to capture something new, or tap any card to edit it.</p></details>
  <details><summary>Flora and fauna entries</summary><p>You only need one name to save: a common name (English or Afrikaans) or a genus / species. Add the family, scientific name, date, locality, flowering time and research notes now or later. Observations without a scientific name show a yellow tag, and a button lists them. <strong>Flora</strong> also has a <em>Height of plant / tree</em> box (for example 1.5 m or about 8 m). <strong>Fauna</strong> has a <em>Tracks / spoor</em> box for describing tracks, with a photo of the spoor if you have one.</p></details>
  <details><summary>Cultural or tourist sites</summary><p>Tap <strong>Add site visit</strong>. Add photos with the camera or from your gallery (including pictures downloaded from the internet), then fill in what you know: title, historical date / era (free text such as 1854 or 19th century), the role players (one per line), and your field notes or story. Choose the <strong>province</strong> and fill in the <strong>town or city</strong>. For somewhere abroad, choose <em>Outside South Africa</em> and fill in the country. Tap <strong>Save to Diary</strong>: the entry is stored on your device with your GPS position and today's date and time.</p></details>
  <details><summary>Photographs</summary><p>Up to 12 photos per entry. <strong>Take photo</strong> opens a live camera (allow Camera access when asked; <em>Switch camera</em> changes between back and front). Tap a photo to enlarge it, or <strong>&times;</strong> to delete it. Photo changes are kept when you save.</p></details>
  <details><summary>GPS and time stamp</summary><p>For site visits the app asks for your location when you open a new entry. If you say no, you can still save without GPS. Use <strong>Update GPS</strong> to try again. Flora and fauna entries have an <em>Add my GPS position</em> button next to the locality.</p></details>
  <details><summary>Printable day report (PDF or PowerPoint)</summary><p>Scroll to <strong>Printable day report</strong>. Choose the dates (it starts with today), tick the sections you want, then tap <strong>Create PDF</strong> or <strong>Create PowerPoint</strong>. The file includes your photos and cites this app. On a phone, use <strong>Share</strong> to send it. Inside any entry, the <strong>PDF</strong> button makes a one-page report for just that entry.</p></details>
  <details><summary>Backup and moving to another device</summary><p>Your entries live only on this device. Tap <strong>Export JSON</strong> regularly and keep the file safe. To move to another phone or laptop, export on one and <strong>Import</strong> on the other. CSV files hold text only (no photos).</p></details>
  <details><summary>Field guides and support</summary><p><strong>Field guides</strong> lists books to take along. If the app is useful to you, the <strong>Donate</strong> button shows how to support its development. Thank you.</p></details>`;
}

/* ---------- install button (Chrome / Edge on laptop, Chrome on Android) ---------- */
let installEvt=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;$('installApp').classList.remove('hidden');});
addEventListener('appinstalled',()=>{installEvt=null;$('installApp').classList.add('hidden');toast('App installed');});
$('installApp').onclick=async()=>{if(!installEvt)return;installEvt.prompt();await installEvt.userChoice.catch(()=>{});installEvt=null;$('installApp').classList.add('hidden');};

/* ---------- offline support + updates ---------- */
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
  addEventListener('load',()=>navigator.serviceWorker.register('sw.js').then(reg=>{
    const offer=w=>{$('updateBar').classList.remove('hidden');$('updateNow').onclick=()=>w.postMessage('SKIP_WAITING');};
    if(reg.waiting&&navigator.serviceWorker.controller)offer(reg.waiting);
    reg.addEventListener('updatefound',()=>{const w=reg.installing;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)offer(w);});});
  }).catch(()=>{}));
  /* reload once after an update (not on the very first install) */
  const hadController=!!navigator.serviceWorker.controller;let reloaded=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloaded||!hadController)return;reloaded=true;location.reload();});
}

init().catch(err=>{console.error(err);$('notice').classList.remove('hidden');$('notice').textContent='This browser could not start local storage. Please use a current version of Chrome, Edge, Safari or Firefox (and avoid private browsing).';});
