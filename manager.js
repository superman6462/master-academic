// ══ MANAGER / CHAIRMAN ════════════════════════════════════════════════════
function showManager(explicitRole){
  showScr('s-manager'); curRole='teacher';
  window.curTeacher=curTeacher;
  localStorage.setItem('maac_role','teacher');
  const liveT=(window.appData.teachers||[]).find(t=>t.name===curTeacher);
  // Determine role: explicit param > live Firestore > existing saved > safe default 'manager'
  const existingSavedRole=(()=>{try{return JSON.parse(localStorage.getItem('maac_data')||'{}').role;}catch(e){return null;}})();
  const role=explicitRole||liveT?.role||existingSavedRole||'manager';
  localStorage.setItem('maac_data',JSON.stringify({teacher:curTeacher,pinVersion:liveT?.pinVersion||null,role}));
  $('mgr-name').textContent=`👋 ${curTeacher}`;
  const badge=$('mgr-role-badge');
  if(badge){
    if(role==='chairman'){badge.textContent='👑 Chairman';badge.className='mgr-badge chairman';}
    else{badge.textContent='🏢 Manager';badge.className='mgr-badge manager';}
  }
  window._setupListeners&&window._setupListeners();
  // Show/hide mark-attendance section based on role (chairman = read-only)
  const markSec=$('mgr-att-mark-section');
  if(markSec) markSec.style.display=(role==='manager')?'block':'none';
  // Show/hide Finance tab based on role
  const financeNav=$('mgr-nav-finance');
  if(financeNav) financeNav.style.display=(role==='manager')?'flex':'none';
  mgrTab('teachers',$('mgr-nav-teachers'));
  startClk('mgrClk');
  window._updatePresence&&window._updatePresence('teacher',curTeacher,{name:curTeacher});
}

function mgrTab(name,el){
  document.querySelectorAll('.mgr-nav').forEach(b=>{
    b.style.background='rgba(255,255,255,.1)';b.style.color='rgba(255,255,255,.7)';
  });
  if(el){el.style.background='#1a73e8';el.style.color='#fff';}
  ['mgr-tab-dashboard','mgr-tab-teachers','mgr-tab-students','mgr-tab-attendance','mgr-tab-teacher-att','mgr-tab-homework','mgr-tab-finance','mgr-tab-scanner'].forEach(id=>{
    const t=$(id);if(t)t.style.display='none';
  });
  const tab=$('mgr-tab-'+name);if(tab)tab.style.display='block';
  if(name==='scanner'){ window._scannerOnTabOpen&&window._scannerOnTabOpen(); }
  else { window.stopQrScanner&&window.stopQrScanner(true); }
  if(name==='teachers')renderMgrTeachers();
  else if(name==='students')renderMgrStudents();
  else if(name==='attendance'){mgrInitAttDrops();renderMgrAttendance();}
  else if(name==='teacher-att')renderMgrTeacherAtt();
  else if(name==='homework')renderMgrHomework();
  else if(name==='finance')renderMgrFinance();
  else if(name==='dashboard')window.renderDashboard?.('dash-mgr','manager');
}

function renderMgrTeachers(){
  const el=$('mgr-teacher-list');if(!el)return;
  const teachers=window.appData.teachers||[];
  if(!teachers.length){el.innerHTML='<div style="text-align:center;padding:24px;color:rgba(255,255,255,.3);font-size:13px">No teachers yet.</div>';return;}
  el.innerHTML=teachers.map((t,i)=>{
    const role=t.role||'teacher';
    const roleLabel=role==='chairman'?'👑 Chairman':role==='manager'?'🏢 Manager':'👨‍🏫 Teacher';
    const roleColor=role==='chairman'?'#e84040':role==='manager'?'var(--y)':'var(--g)';
    return`<div class="mgr-card">
      <div class="mgr-row" style="border-bottom:none;padding:0;">
        <div>
          <div style="font-family:'Baloo 2',sans-serif;font-weight:800;font-size:15px;color:#fff;margin-bottom:3px;">
            ${i+1}. ${t.name}</div>
          <div class="mgr-label">📱 ${t.phone||'—'} &nbsp;•&nbsp; ${t.subject||'—'}</div>
        </div>
        <span style="font-size:11px;font-weight:700;color:${roleColor};background:rgba(255,255,255,.08);
          padding:3px 10px;border-radius:14px;border:1px solid ${roleColor}33">${roleLabel}</span>
      </div>
    </div>`;
  }).join('');
}

function renderMgrStudents(){
  const el=$('mgr-student-list');if(!el)return;
  const clsF=$('mgr-stu-cls')?.value||'';
  const q=($('mgr-stu-search')?.value||'').trim().toLowerCase();
  let list=[...window.appData.students||[]];
  if(clsF) list=list.filter(s=>s.class===clsF);
  if(q) list=list.filter(s=>s.name.toLowerCase().includes(q)||(s.phone||'').includes(q));
  list.sort((a,b)=>a.name.localeCompare(b.name));
  const cntEl=$('mgr-stu-count');
  if(cntEl)cntEl.textContent=`Showing ${list.length} student${list.length!==1?'s':''}`;
  if(!list.length){
    el.innerHTML='<div style="text-align:center;padding:24px;color:rgba(255,255,255,.3);font-size:13px">No students found.</div>';return;
  }
  const now=new Date(), curMonthName=ATT_MONTHS[now.getMonth()], curYear=now.getFullYear();
  const savedRole=(()=>{try{return JSON.parse(localStorage.getItem('maac_data')||'{}').role;}catch(e){return 'manager';}})();
  const isManager=savedRole==='manager';
  el.innerHTML=list.map((s,i)=>{
    const sid=s.id||s.phone;
    const paid=isFeesPaid(sid,curMonthName,curYear);
    const overlay=paid
      ?'background:rgba(0,200,120,.12);border:1.5px solid rgba(0,200,120,.35);'
      :'background:rgba(232,64,64,.1);border:1.5px solid rgba(232,64,64,.3);';
    const badge=paid
      ?`<span style="font-size:10px;font-weight:700;color:rgba(0,200,120,.9);background:rgba(0,200,120,.15);
          padding:2px 8px;border-radius:12px;border:1px solid rgba(0,200,120,.3)">✅ Paid</span>`
      :`<span style="font-size:10px;font-weight:700;color:#ff8080;background:rgba(232,64,64,.15);
          padding:2px 8px;border-radius:12px;border:1px solid rgba(232,64,64,.3)">⚠️ Due</span>`;
    const payBtn=isManager&&!paid
      ?`<button onclick="mgrMarkStudentPaid(${JSON.stringify(s.phone)})"
          style="margin-top:8px;width:100%;padding:7px;border:none;border-radius:9px;
          background:linear-gradient(135deg,rgba(0,200,120,.7),rgba(0,150,80,.7));
          color:#fff;font-family:'Baloo 2',sans-serif;font-size:12px;font-weight:700;cursor:pointer;">
          💰 Mark as Paid (${curMonthName})</button>`:'';
    // ── Payment History ──────────────────────────────────────────────────────
    const history=getStudentFeeHistory(sid);
    const histId='fh-'+sid.replace(/[^a-z0-9]/gi,'_');
    const histSection=history.length===0
      ?`<div style="font-size:11px;color:rgba(255,255,255,.28);margin-top:8px;padding:4px 2px;">
          📋 No payment history yet.</div>`
      :`<button onclick="(function(){const d=document.getElementById('${histId}');d.style.display=d.style.display==='none'?'block':'none';})()"
          style="margin-top:8px;width:100%;padding:6px 10px;border:1px solid rgba(255,255,255,.15);border-radius:9px;
          background:rgba(255,255,255,.06);color:rgba(255,255,255,.65);font-family:'Baloo 2',sans-serif;
          font-size:11px;font-weight:700;cursor:pointer;text-align:left;">
          📋 Payment History (${history.length} record${history.length!==1?'s':''}) ▾
        </button>
        <div id="${histId}" style="display:none;margin-top:6px;max-height:220px;overflow-y:auto;">
          ${history.map(f=>`
            <div style="display:flex;justify-content:space-between;align-items:center;
              padding:5px 8px;margin-bottom:3px;border-radius:8px;
              background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);">
              <div>
                <span style="font-size:11px;font-weight:700;color:#fff;">${f.month||'?'} ${f.year||''}</span>
                <span style="font-size:10px;color:rgba(255,255,255,.4);margin-left:6px;">${f.feeType||'Monthly Fee'}</span>
              </div>
              <div style="text-align:right;">
                ${f.amount>0?`<span style="font-size:11px;color:#6af0b0;font-weight:700;">৳${f.amount}</span>`:
                  `<span style="font-size:10px;color:rgba(255,255,255,.4);">✅ Paid</span>`}
                <span style="font-size:10px;color:rgba(255,255,255,.3);display:block;">${f.date||''}</span>
              </div>
            </div>`).join('')}
        </div>`;
    return`<div class="mgr-card" style="${overlay}margin-bottom:10px;border-radius:14px;padding:12px 14px;">
      <div class="mgr-row" style="border-bottom:none;padding:0;align-items:flex-start;">
        <div style="flex:1;">
          <div style="font-family:'Baloo 2',sans-serif;font-weight:800;font-size:14px;color:#fff;margin-bottom:4px;">${i+1}. ${s.name}</div>
          <div class="mgr-label" style="margin-bottom:4px;">📱 ${s.phone||'—'} &nbsp;•&nbsp; ${s.group||''}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <span style="background:rgba(26,115,232,.25);color:#6ab4ff;font-size:11px;font-weight:700;
              padding:2px 9px;border-radius:14px;border:1px solid rgba(26,115,232,.4)">${s.class}</span>
            ${badge}
          </div>
          ${payBtn}
          ${histSection}
        </div>
      </div>
    </div>`;
  }).join('');
}

function isFeesPaid(studentId, month, year){
  const fees=window.appData.fees||[];
  return fees.some(f=>
    (f.studentId===studentId||f.studentPhone===studentId)&&
    f.month===month&&
    (f.year===year||f.year===String(year))
  );
}

function getStudentFeeHistory(studentId){
  const fees=window.appData.fees||[];
  return fees
    .filter(f=>f.studentId===studentId||f.studentPhone===studentId)
    .sort((a,b)=>{
      const ay=parseInt(a.year)||0, by2=parseInt(b.year)||0;
      if(ay!==by2) return by2-ay;
      return ATT_MONTHS.indexOf(b.month)-ATT_MONTHS.indexOf(a.month);
    });
}

async function mgrMarkStudentPaid(studentPhone){
  const savedRole=(()=>{try{return JSON.parse(localStorage.getItem('maac_data')||'{}').role;}catch(e){return '';}})();
  if(savedRole!=='manager'){showToast('Only manager can record payments!');return;}
  const stu=(window.appData.students||[]).find(s=>s.phone===studentPhone||s.id===studentPhone);
  if(!stu){showToast('❌ Student not found!');return;}
  const now=new Date();
  const month=ATT_MONTHS[now.getMonth()], year=now.getFullYear();
  const timeStr=now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  const dateStr=now.toISOString().split('T')[0];
  // Check already paid (avoid duplicate)
  if(isFeesPaid(stu.id||stu.phone, month, year)){
    showToast(`ℹ️ ${stu.name} is already marked Paid for ${month}.`);
    return;
  }
  try{
    if(!window._fb||!window._db) throw new Error('Firebase not ready. Please reload.');
    const {collection,addDoc}=window._fb;
    const newFee={
      studentId: stu.id||stu.phone,
      studentPhone: stu.phone||stu.id,
      studentName: stu.name,
      studentClass: stu.class||'',
      feeType:'Monthly Fee', month, year: String(year), amount:0,
      date:dateStr, time:timeStr,
      recordedBy: curTeacher||window.curTeacher||'Manager',
      createdAt:Date.now()
    };
    const docRef=await addDoc(collection(window._db,'fees'),newFee);
    // ── Optimistic local update so UI reflects change immediately ──────────
    if(!window.appData.fees) window.appData.fees=[];
    window.appData.fees.push({id:docRef.id,...newFee});
    showToast(`✅ ${stu.name} — Paid (${month}) recorded!`);
    renderMgrStudents();
  }catch(e){
    console.error('mgrMarkStudentPaid error:',e);
    showToast('❌ Error: '+e.message);
  }
}

function renderMgrAttendance(){
  const el=$('mgr-attendance-list');if(!el)return;
  let data=[...window.appData.attendance||[]];
  const clsf=$('mgr-att-cls')?.value, monf=$('mgr-att-month')?.value;
  if(clsf) data=data.filter(a=>a.class===clsf);
  if(monf) data=data.filter(a=>a.month===monf);
  if(!clsf||!monf){
    el.innerHTML='<div style="text-align:center;padding:24px;color:rgba(255,255,255,.3);font-size:13px">📋 Class ও Month বেছে নিন।</div>';return;
  }
  data.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  if(!data.length){el.innerHTML='<div style="text-align:center;padding:24px;color:rgba(255,255,255,.3);font-size:13px">No attendance records found.</div>';return;}
  const students=(window.appData.students||[]).filter(s=>!clsf||s.class===clsf);
  if(!students.length){el.innerHTML='<div style="text-align:center;padding:24px;color:rgba(255,255,255,.3);font-size:13px">No students in this class.</div>';return;}
  const dayNumbers=[...new Set(data.map(a=>{const d=parseInt((a.date||'').split('-')[2]||'0');return d||0;}))].filter(d=>d>0).sort((a,b)=>a-b);
  const dateMap={};data.forEach(a=>{dateMap[a.date]=a;});
  function dayToDate(d){const sample=data[0]?.date;if(!sample)return'';const[yr,mo]=sample.split('-');return`${yr}-${mo}-${String(d).padStart(2,'0')}`;}
  el.innerHTML=`
    <div style="overflow-x:auto;border-radius:12px;margin-top:8px;">
      <table style="border-collapse:collapse;min-width:100%;font-size:12px;background:rgba(255,255,255,.04);">
        <thead>
          <tr style="background:rgba(0,0,0,.4);">
            <th style="padding:9px 12px;text-align:left;white-space:nowrap;position:sticky;left:0;background:rgba(20,30,55,.98);z-index:2;min-width:130px;color:rgba(255,255,255,.8);border-bottom:1px solid rgba(255,255,255,.1);">Student</th>
            ${dayNumbers.map(d=>`<th style="padding:9px 7px;text-align:center;min-width:36px;color:rgba(255,255,255,.6);border-bottom:1px solid rgba(255,255,255,.1);">${d}</th>`).join('')}
            <th style="padding:9px 10px;text-align:center;white-space:nowrap;background:rgba(200,40,40,.4);min-width:60px;color:#ffaaaa;border-bottom:1px solid rgba(255,255,255,.1);">Absent</th>
          </tr>
        </thead>
        <tbody>
          ${students.map((stu,i)=>{
            let absentCount=0;
            const cells=dayNumbers.map(d=>{
              const dateStr=dayToDate(d);const rec=dateMap[dateStr];
              const mark=rec&&rec.records?rec.records[stu.phone]:'';
              if(mark==='A')absentCount++;
              const bg=mark==='P'?'rgba(0,200,120,.18)':mark==='A'?'rgba(232,64,64,.18)':'rgba(255,255,255,.04)';
              const color=mark==='P'?'rgba(0,220,140,.9)':mark==='A'?'#ff8080':'rgba(255,255,255,.25)';
              const lbl=mark==='P'?'P':mark==='A'?'A':'—';
              return`<td style="padding:7px 5px;text-align:center;background:${bg};color:${color};font-weight:700;border:1px solid rgba(255,255,255,.06);">${lbl}</td>`;
            }).join('');
            return`<tr style="background:${i%2===0?'rgba(255,255,255,.03)':'rgba(0,0,0,.1)'};">
              <td style="padding:8px 12px;font-weight:700;white-space:nowrap;position:sticky;left:0;background:rgba(20,30,55,.98);border-right:1px solid rgba(255,255,255,.1);z-index:1;color:#fff;">
                ${stu.name}<div style="font-size:10px;color:rgba(255,255,255,.35);font-weight:400;">${stu.phone}</div>
              </td>
              ${cells}
              <td style="padding:7px 10px;text-align:center;font-weight:800;color:${absentCount>0?'#ff8080':'rgba(0,220,140,.9)'};background:${absentCount>0?'rgba(232,64,64,.15)':'rgba(0,200,120,.12)'};border:1px solid rgba(255,255,255,.06);">${absentCount}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderMgrHomework(){
  const el=$('mgr-homework-list');if(!el)return;
  let data=[...window.appData.homework||[]];
  const clsf=$('mgr-hw-cls')?.value, subjf=$('mgr-hw-subj')?.value;
  if(clsf) data=data.filter(h=>h.class===clsf);
  if(subjf) data=data.filter(h=>h.subject===subjf);
  data.sort((a,b)=>b.createdAt-a.createdAt);
  // Populate subject filter
  const subjects=[...new Set((window.appData.homework||[]).map(h=>h.subject).filter(Boolean))];
  const sel=$('mgr-hw-subj');
  if(sel){const cur=sel.value;sel.innerHTML='<option value="">All Subjects</option>'+subjects.map(s=>`<option>${s}</option>`).join('');if(cur)sel.value=cur;}
  if(!data.length){el.innerHTML='<div style="text-align:center;padding:24px;color:rgba(255,255,255,.3);font-size:13px">No homework reports found.</div>';return;}
  el.innerHTML=data.map(h=>`
    <div class="mgr-card" style="border-left:3px solid #e84040;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
        <div style="font-family:'Baloo 2',sans-serif;font-weight:800;color:#e84040;font-size:14px;">❌ ${h.subject}</div>
        <span style="background:rgba(26,115,232,.25);color:#6ab4ff;font-size:11px;font-weight:700;padding:2px 9px;border-radius:14px;">${h.class}</span>
      </div>
      <div style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:5px;">
        ${h.teacher||'Teacher'} • ${fmtDue(h.date)||fmtDate(h.createdAt)}</div>
      <div style="font-size:12px;font-weight:700;color:rgba(255,100,100,.8);margin-bottom:3px;">
        ${h.defaulterCount||0} did not submit:</div>
      <div style="font-size:12px;color:rgba(255,255,255,.6);">
        ${(h.defaulterNames||[]).join(' • ')||'—'}</div>
    </div>`).join('');
}

// ── MANAGER: STUDENT ATTENDANCE MARKING ──────────────────────────────────────

function mgrInitAttDrops(){
  const ySel=$('mgr-att-mark-year'); if(!ySel)return;
  if(!ySel.children.length){
    const yr=new Date().getFullYear();
    for(let y=yr+1;y>=yr-2;y--){const o=document.createElement('option');o.value=y;o.textContent=y;ySel.appendChild(o);}
  }
  if(!ySel.value){
    ySel.value=new Date().getFullYear();
    const mSel=$('mgr-att-mark-month');if(mSel)mSel.value=new Date().getMonth();
    mgrPopAttDays();
  }
}

function mgrPopAttDays(){
  const sel=$('mgr-att-mark-date'); if(!sel)return;
  const yr=parseInt($('mgr-att-mark-year')?.value||new Date().getFullYear());
  const mo=parseInt($('mgr-att-mark-month')?.value||0);
  const count=daysInMonth(yr,mo);
  const cur=parseInt(sel.value||1);
  sel.innerHTML='';
  for(let d=1;d<=count;d++){
    const dt=new Date(yr,mo,d);
    const dow=dt.getDay();
    const o=document.createElement('option');
    o.value=d;o.textContent=`${d} (${ATT_DAYS[dow]})`;
    if(dow===5)o.style.color='#e84040';
    sel.appendChild(o);
  }
  sel.value=(cur>0&&cur<=count)?cur:1;
  mgrOnAttDateChange();
}

function mgrOnAttDateChange(){
  const statusEl=$('mgr-att-day-status'); if(!statusEl)return;
  const yr=parseInt($('mgr-att-mark-year')?.value||new Date().getFullYear());
  const mo=parseInt($('mgr-att-mark-month')?.value||0);
  const d=parseInt($('mgr-att-mark-date')?.value||1);
  const dow=new Date(yr,mo,d).getDay();
  const dateStr=`${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const holiday=(window.appData.holidays||[]).find(h=>h.date===dateStr);
  if(dow===5){statusEl.style.color='#e84040';statusEl.textContent='⛔ শুক্রবার — ছুটির দিন';}
  else if(holiday){statusEl.style.color='#ff9800';statusEl.textContent=`🏖️ ${holiday.name} — ছুটির দিন`;}
  else{statusEl.style.color='rgba(0,200,150,.9)';statusEl.textContent=`✅ ${ATT_DAYS[dow]}`;}
}

function loadMgrAttStudents(){
  const cls=$('mgr-att-mark-cls')?.value;
  if(!cls){showToast('প্রথমে Class বেছে নিন!');return;}
  const yr=parseInt($('mgr-att-mark-year')?.value||new Date().getFullYear());
  const mo=parseInt($('mgr-att-mark-month')?.value||0);
  const d=parseInt($('mgr-att-mark-date')?.value||1);
  const dow=new Date(yr,mo,d).getDay();
  if(dow===5){showToast('⛔ শুক্রবার ছুটি! Attendance নেওয়া যাবে না।');return;}
  const dateStr=`${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const holiday=(window.appData.holidays||[]).find(h=>h.date===dateStr);
  if(holiday){showToast(`⛔ ${holiday.name} — ছুটির দিন! Attendance নেওয়া যাবে না।`);return;}
  const students=(window.appData.students||[]).filter(s=>s.class===cls);
  if(!students.length){showToast('এই class-এ কোনো student নেই!');return;}
  const docId=`${cls.replace(/\s+/g,'_')}_${dateStr}`;
  const existing=(window.appData.attendance||[]).find(a=>a.id===docId);
  const existingRec=existing?.records||{};
  const monthName=ATT_MONTHS[mo], dayName2=ATT_DAYS[dow];
  window._mgrAttDateInfo={cls,date:dateStr,month:monthName,dayName:dayName2,docId};
  window._mgrAttMarks={...existingRec};
  const card=$('mgr-att-mark-card');
  if(card)card.style.display='block';
  $('mgr-att-mark-title').textContent=`📝 ${cls} — ${d} ${monthName} ${yr} (${dayName2})`;
  $('mgr-att-student-list').innerHTML=students.map(s=>{
    const prev=existingRec[s.phone];
    return`<div style="display:flex;align-items:center;justify-content:space-between;
      padding:9px 0;border-bottom:1px solid rgba(255,255,255,.08);">
      <div style="font-weight:700;font-size:13px;color:#fff;">👤 ${s.name}</div>
      <div style="display:flex;gap:7px;">
        <button id="mgr-p-${s.phone}" onclick="setMgrAttMark('${s.phone}','P')"
          style="padding:6px 14px;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;
          background:${prev==='P'?'var(--g)':'rgba(0,200,150,.15)'};color:${prev==='P'?'#fff':'rgba(0,200,150,.9)'}">✅ P</button>
        <button id="mgr-a-${s.phone}" onclick="setMgrAttMark('${s.phone}','A')"
          style="padding:6px 14px;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;
          background:${prev==='A'?'#e84040':'rgba(232,64,64,.15)'};color:${prev==='A'?'#fff':'#e84040'}">❌ A</button>
      </div>
    </div>`;
  }).join('');
}

function setMgrAttMark(phone,mark){
  window._mgrAttMarks=window._mgrAttMarks||{};
  window._mgrAttMarks[phone]=mark;
  const pBtn=$('mgr-p-'+phone),aBtn=$('mgr-a-'+phone);
  if(pBtn){pBtn.style.background=mark==='P'?'var(--g)':'rgba(0,200,150,.15)';pBtn.style.color=mark==='P'?'#fff':'rgba(0,200,150,.9)';}
  if(aBtn){aBtn.style.background=mark==='A'?'#e84040':'rgba(232,64,64,.15)';aBtn.style.color=mark==='A'?'#fff':'#e84040';}
}

async function saveMgrAttendance(){
  const info=window._mgrAttDateInfo||{};
  const records=window._mgrAttMarks||{};
  if(!Object.keys(records).length){showToast('কোনো attendance mark করা হয়নি!');return;}
  if(!info.docId){showToast('আগে student load করুন!');return;}
  const {doc,setDoc}=window._fb;
  try{
    await setDoc(doc(window._db,'attendance',info.docId),{
      class:info.cls, date:info.date, month:info.month, dayName:info.dayName,
      records, updatedAt:Date.now()
    });
    showToast('✅ Attendance saved!');
    const card=$('mgr-att-mark-card');if(card)card.style.display='none';
    window._mgrAttMarks={};
    renderMgrAttendance();
  }catch(e){
    showToast('❌ Error: '+e.message);
  }
}

// ── MANAGER: FINANCE (FEE COLLECTION + EXPENSES) ─────────────────────────────

function finInitYears(){
  const sel=$('fin-fee-year'); if(!sel||sel.children.length) return;
  const yr=new Date().getFullYear();
  for(let y=yr+1;y>=yr-2;y--){const o=document.createElement('option');o.value=y;o.textContent=y;sel.appendChild(o);}
  sel.value=yr;
  const mSel=$('fin-fee-month');
  if(mSel) mSel.value=['January','February','March','April','May','June','July','August','September','October','November','December'][new Date().getMonth()];
}

function finLoadStudents(){
  const cls=$('fin-fee-cls')?.value;
  const sel=$('fin-fee-student'); if(!sel)return;
  let students=[...window.appData.students||[]];
  if(cls) students=students.filter(s=>s.class===cls);
  students.sort((a,b)=>a.name.localeCompare(b.name));
  sel.innerHTML='<option value="">— Select Student —</option>'+
    students.map(s=>`<option value="${s.id}|${s.phone}|${s.name.replace(/"/g,'&quot;')}|${s.class}">${s.name}${cls?'':' ('+s.class+')'}</option>`).join('');
}

async function mgrRecordFee(){
  const savedRole=(()=>{try{return JSON.parse(localStorage.getItem('maac_data')||'{}').role;}catch(e){return '';}})();
  if(savedRole!=='manager'){showToast('Only manager can record fee payments!');return;}
  finInitYears();
  const stuVal=$('fin-fee-student')?.value;
  if(!stuVal){showToast('Student বেছে নিন!');return;}
  const[studentId,studentPhone,studentName,studentClass]=stuVal.split('|');
  const feeType=$('fin-fee-type')?.value||'Monthly Fee';
  const amount=parseFloat($('fin-fee-amount')?.value||'0');
  const month=$('fin-fee-month')?.value||ATT_MONTHS[new Date().getMonth()];
  const year=parseInt($('fin-fee-year')?.value||new Date().getFullYear());
  if(!studentId){showToast('Student বেছে নিন!');return;}
  const now=new Date();
  const timeStr=now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  const dateStr=now.toISOString().split('T')[0];
  try{
    if(!window._fb||!window._db) throw new Error('Firebase not ready. Please reload.');
    const {collection,addDoc}=window._fb;
    const newFee={
      studentId: studentId||studentPhone,
      studentPhone, studentName, studentClass,
      feeType, month, year: String(year), amount,
      date:dateStr, time:timeStr,
      recordedBy: curTeacher||window.curTeacher||'Manager',
      createdAt:Date.now()
    };
    const docRef=await addDoc(collection(window._db,'fees'),newFee);
    // Optimistic local update
    if(!window.appData.fees) window.appData.fees=[];
    window.appData.fees.push({id:docRef.id,...newFee});
    if($('fin-fee-amount')) $('fin-fee-amount').value='';
    $('fin-fee-student').value='';
    showToast(`✅ Fee recorded: ${studentName} — ${feeType} (${month})`);
    renderMgrFinance();
    renderMgrStudents();
  }catch(e){
    console.error('mgrRecordFee error:',e);
    showToast('❌ Error: '+e.message);
  }
}

async function mgrRecordExpense(){
  const savedRole=(()=>{try{return JSON.parse(localStorage.getItem('maac_data')||'{}').role;}catch(e){return '';}})();
  if(savedRole!=='manager'){showToast('Only manager can record expenses!');return;}
  const purpose=($('fin-exp-purpose')?.value||'').trim();
  const amount=parseFloat($('fin-exp-amount')?.value||'0');
  if(!purpose){showToast('Purpose লিখুন!');return;}
  if(!amount||amount<=0){showToast('Amount দিন!');return;}
  const now=new Date();
  const timeStr=now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  const dateStr=now.toISOString().split('T')[0];
  try{
    if(!window._fb||!window._db) throw new Error('Firebase not ready. Please reload.');
    const {collection,addDoc}=window._fb;
    const newExp={
      purpose, amount,
      date:dateStr, time:timeStr,
      recordedBy: curTeacher||window.curTeacher||'Manager',
      createdAt:Date.now()
    };
    const docRef=await addDoc(collection(window._db,'expenses'),newExp);
    // Optimistic local update
    if(!window.appData.expenses) window.appData.expenses=[];
    window.appData.expenses.push({id:docRef.id,...newExp});
    $('fin-exp-purpose').value='';$('fin-exp-amount').value='';
    showToast(`✅ Expense recorded: ${purpose} — ৳${amount}`);
    renderMgrFinance();
  }catch(e){
    console.error('mgrRecordExpense error:',e);
    showToast('❌ Error: '+e.message);
  }
}

function renderMgrFinance(){
  finInitYears();
  finLoadStudents();
  const el=$('mgr-finance-list'); if(!el)return;
  const fees=[...(window.appData.fees||[])].sort((a,b)=>b.createdAt-a.createdAt);
  const expenses=[...(window.appData.expenses||[])].sort((a,b)=>b.createdAt-a.createdAt);

  // Group fees by date
  const feeByDate={};
  fees.forEach(f=>{if(!feeByDate[f.date])feeByDate[f.date]=[];feeByDate[f.date].push(f);});
  const expByDate={};
  expenses.forEach(e=>{if(!expByDate[e.date])expByDate[e.date]=[];expByDate[e.date].push(e);});

  const allDates=[...new Set([...Object.keys(feeByDate),...Object.keys(expByDate)])].sort((a,b)=>b.localeCompare(a));

  if(!allDates.length){
    el.innerHTML='<div style="text-align:center;padding:24px;color:rgba(255,255,255,.3);font-size:13px">কোনো record নেই।</div>';return;
  }

  let totalFees=0, totalExp=0;
  fees.forEach(f=>totalFees+=(f.amount||0));
  expenses.forEach(e=>totalExp+=(e.amount||0));

  el.innerHTML=`
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
      <div style="flex:1;background:rgba(0,200,120,.15);border:1px solid rgba(0,200,120,.3);border-radius:12px;padding:12px;">
        <div style="font-size:11px;color:rgba(0,200,120,.8);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Total Collections</div>
        <div style="font-family:'Baloo 2',sans-serif;font-size:20px;font-weight:800;color:rgba(0,220,140,.9);">৳${totalFees.toFixed(0)}</div>
      </div>
      <div style="flex:1;background:rgba(232,64,64,.12);border:1px solid rgba(232,64,64,.3);border-radius:12px;padding:12px;">
        <div style="font-size:11px;color:#ff8080;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Total Expenses</div>
        <div style="font-family:'Baloo 2',sans-serif;font-size:20px;font-weight:800;color:#ff8080;">৳${totalExp.toFixed(0)}</div>
      </div>
      <div style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px;">
        <div style="font-size:11px;color:rgba(255,255,255,.5);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Net Balance</div>
        <div style="font-family:'Baloo 2',sans-serif;font-size:20px;font-weight:800;color:${(totalFees-totalExp)>=0?'rgba(0,220,140,.9)':'#ff8080'};">৳${(totalFees-totalExp).toFixed(0)}</div>
      </div>
    </div>
    ${allDates.map(date=>{
      const dayFees=feeByDate[date]||[];
      const dayExp=expByDate[date]||[];
      const dayTotal=dayFees.reduce((s,f)=>s+(f.amount||0),0);
      const dayExpTotal=dayExp.reduce((s,e)=>s+(e.amount||0),0);
      return`<div class="mgr-card" style="margin-bottom:12px;padding:0;overflow:hidden;">
        <div style="padding:10px 14px;background:rgba(0,0,0,.2);display:flex;align-items:center;justify-content:space-between;">
          <div style="font-family:'Baloo 2',sans-serif;font-weight:800;color:#fff;font-size:13px;">📅 ${date}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${dayTotal>0?`<span style="font-size:11px;font-weight:700;color:rgba(0,220,140,.9);background:rgba(0,200,120,.15);padding:2px 9px;border-radius:12px;">+৳${dayTotal}</span>`:''}
            ${dayExpTotal>0?`<span style="font-size:11px;font-weight:700;color:#ff8080;background:rgba(232,64,64,.12);padding:2px 9px;border-radius:12px;">-৳${dayExpTotal}</span>`:''}
          </div>
        </div>
        <div style="padding:10px 14px;">
          ${dayFees.map(f=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.07);">
            <div>
              <div style="font-size:13px;font-weight:700;color:#fff;">💰 ${f.studentName||'—'}</div>
              <div style="font-size:11px;color:rgba(255,255,255,.4);">${f.feeType} • ${f.month} ${f.year} • ${f.time||''}</div>
              <div style="font-size:10px;color:rgba(255,255,255,.3);">${f.studentClass} • by ${f.recordedBy||'—'}</div>
            </div>
            <span style="font-family:'Baloo 2',sans-serif;font-weight:800;font-size:15px;color:rgba(0,220,140,.9);">৳${f.amount||0}</span>
          </div>`).join('')}
          ${dayExp.map(e=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.07);">
            <div>
              <div style="font-size:13px;font-weight:700;color:#ffaaaa;">💸 ${e.purpose}</div>
              <div style="font-size:11px;color:rgba(255,255,255,.4);">${e.time||''} • by ${e.recordedBy||'—'}</div>
            </div>
            <span style="font-family:'Baloo 2',sans-serif;font-weight:800;font-size:15px;color:#ff8080;">-৳${e.amount||0}</span>
          </div>`).join('')}
        </div>
      </div>`;
    }).join('')}`;
}

// ── MANAGER/CHAIRMAN: TEACHER ATTENDANCE VIEW ─────────────────────────────────

function renderMgrTeacherAtt(){
  const listEl=$('mgr-teacher-att-list');
  const summaryEl=$('mgr-teacher-leave-summary');
  if(!listEl)return;
  let data=[...window.appData.teacherAttendance||[]];
  const monf=$('mgr-tatt-month')?.value;
  if(monf) data=data.filter(a=>a.month===monf);
  data.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const teachers=window.appData.teachers||[];

  if(!data.length){
    const empty='<div style="text-align:center;padding:24px;color:rgba(255,255,255,.3);font-size:13px">No teacher attendance records found.</div>';
    if(summaryEl)summaryEl.innerHTML=empty;
    listEl.innerHTML='';
    return;
  }

  // ── Per-teacher leave summary ──
  const absentMap={};
  data.forEach(r=>{
    Object.entries(r.records||{}).forEach(([tid,mark])=>{
      if(mark==='A'){
        if(!absentMap[tid])absentMap[tid]=[];
        absentMap[tid].push({date:r.date,dayName:r.dayName});
      }
    });
  });

  if(summaryEl){
    const teachersWithAbsence=teachers.filter(t=>absentMap[t.id]&&absentMap[t.id].length>0);
    if(!teachersWithAbsence.length){
      summaryEl.innerHTML=`<div style="text-align:center;padding:12px;color:rgba(0,200,150,.7);font-size:13px;font-weight:700;">✅ ${monf||'All months'}: সব teacher present!</div>`;
    } else {
      summaryEl.innerHTML=`
        <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">🏖️ Teacher-wise Leave Details</div>
        ${teachersWithAbsence.map(t=>{
          const leaves=absentMap[t.id]||[];
          return`<div class="mgr-card" style="border-left:3px solid #e84040;margin-bottom:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <div>
                <div style="font-family:'Baloo 2',sans-serif;font-weight:800;color:#fff;font-size:14px;">👨‍🏫 ${t.name}</div>
                ${t.subject?`<div style="font-size:11px;color:rgba(255,255,255,.4);">${t.subject}</div>`:''}
              </div>
              <span style="background:rgba(232,64,64,.2);color:#e84040;font-weight:700;font-size:12px;
                padding:3px 11px;border-radius:20px;border:1px solid rgba(232,64,64,.3);">
                🏖️ ${leaves.length} day${leaves.length!==1?'s':''} absent</span>
            </div>
            <div style="font-size:11px;color:rgba(255,100,100,.8);font-weight:700;margin-bottom:5px;">Leave dates:</div>
            <div>${leaves.map(l=>`<span style="display:inline-block;margin:2px;padding:3px 10px;border-radius:14px;
              font-size:11px;font-weight:700;background:rgba(232,64,64,.15);
              color:#ff8080;border:1px solid rgba(232,64,64,.25)">
              📅 ${l.date}${l.dayName?` (${l.dayName})`:''}</span>`).join('')}
            </div>
          </div>`;
        }).join('')}`;
    }
  }

  // ── Teacher × Day grid table (matches Admin panel format) ──
  // Build day numbers (columns) from records
  const dayNumbersMgr=[...new Set(data.map(a=>{
    const d=parseInt((a.date||'').split('-')[2]||'0');
    return d||0;
  }))].filter(d=>d>0).sort((a,b)=>a-b);

  const dateMapMgr={};
  data.forEach(a=>{ dateMapMgr[a.date]=a; });

  function dayToDateMgr(d){
    const sample=data[0]?.date;
    if(!sample) return '';
    const [yr,mo]=sample.split('-');
    return `${yr}-${mo}-${String(d).padStart(2,'0')}`;
  }

  // CSV export for manager
  window._exportMgrTAttCSV=function(){
    const headers=['Teacher','Subject',...dayNumbersMgr.map(d=>`Day ${d}`),'Total Present','Total Absent'];
    const rows=teachers.map(t=>{
      const cells=dayNumbersMgr.map(d=>{
        const dateStr=dayToDateMgr(d);
        const rec=dateMapMgr[dateStr];
        return rec&&rec.records&&rec.records[t.id]?rec.records[t.id]:'—';
      });
      const present=cells.filter(c=>c==='P').length;
      const absent=cells.filter(c=>c==='A').length;
      return[t.name,t.subject||'',...cells,present,absent];
    });
    const csv=[headers,...rows].map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`TeacherAttendance_${monf||'All'}.csv`;
    a.click();
    showToast('📥 CSV exported!');
  };

  listEl.innerHTML=`
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
      <button onclick="window._exportMgrTAttCSV()"
        style="padding:7px 16px;border:none;border-radius:9px;background:linear-gradient(135deg,#1a73e8,#0d47a1);
        color:#fff;font-family:'Baloo 2',sans-serif;font-size:12px;font-weight:700;cursor:pointer;">
        📥 Export CSV
      </button>
    </div>
    <div style="overflow-x:auto;border-radius:12px;">
      <table style="border-collapse:collapse;min-width:100%;font-size:12px;background:rgba(255,255,255,.04);">
        <thead>
          <tr style="background:rgba(0,0,0,.4);">
            <th style="padding:9px 12px;text-align:left;white-space:nowrap;position:sticky;left:0;background:rgba(20,30,55,.98);z-index:2;min-width:130px;color:rgba(255,255,255,.8);border-bottom:1px solid rgba(255,255,255,.1);">Teacher</th>
            ${dayNumbersMgr.map(d=>`<th style="padding:9px 7px;text-align:center;min-width:36px;color:rgba(255,255,255,.6);border-bottom:1px solid rgba(255,255,255,.1);">${d}</th>`).join('')}
            <th style="padding:9px 10px;text-align:center;white-space:nowrap;background:rgba(21,101,192,.5);min-width:80px;color:#90caf9;border-bottom:1px solid rgba(255,255,255,.1);">Present</th>
            <th style="padding:9px 10px;text-align:center;white-space:nowrap;background:rgba(200,40,40,.4);min-width:60px;color:#ffaaaa;border-bottom:1px solid rgba(255,255,255,.1);">Absent</th>
          </tr>
        </thead>
        <tbody>
          ${teachers.map((t,i)=>{
            let absentCount=0; let presentCount=0;
            const cells=dayNumbersMgr.map(d=>{
              const dateStr=dayToDateMgr(d);
              const rec=dateMapMgr[dateStr];
              const mark=rec&&rec.records?rec.records[t.id]:'';
              if(mark==='A') absentCount++;
              if(mark==='P') presentCount++;
              const bg=mark==='P'?'rgba(0,200,150,.18)':mark==='A'?'rgba(232,64,64,.18)':'rgba(255,255,255,.03)';
              const color=mark==='P'?'rgba(0,200,150,.9)':mark==='A'?'#ff8080':'rgba(255,255,255,.25)';
              const lbl=mark==='P'?'P':mark==='A'?'A':'—';
              return`<td style="padding:7px 5px;text-align:center;background:${bg};color:${color};font-weight:700;border:1px solid rgba(255,255,255,.06);">${lbl}</td>`;
            }).join('');
            const rowBg=i%2===0?'rgba(255,255,255,.03)':'rgba(255,255,255,.06)';
            return`<tr style="background:${rowBg};">
              <td style="padding:8px 12px;font-weight:700;white-space:nowrap;position:sticky;left:0;background:rgba(20,30,55,.95);border-right:2px solid rgba(255,255,255,.12);z-index:1;color:#fff;">
                ${t.name}<div style="font-size:10px;color:rgba(255,255,255,.35);font-weight:400;">${t.subject||''}</div>
              </td>
              ${cells}
              <td style="padding:7px 10px;text-align:center;font-weight:800;color:#90caf9;background:rgba(21,101,192,.25);border:1px solid rgba(255,255,255,.06);">${presentCount}</td>
              <td style="padding:7px 10px;text-align:center;font-weight:800;color:${absentCount>0?'#ff8080':'rgba(0,200,150,.7)'};background:${absentCount>0?'rgba(232,64,64,.18)':'rgba(0,200,150,.08)'};border:1px solid rgba(255,255,255,.06);">${absentCount}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

