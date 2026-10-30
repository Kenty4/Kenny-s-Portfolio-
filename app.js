let state={};
const $=s=>document.querySelector(s);
function toast(t){const x=$("#toast");x.textContent=t;x.style.opacity=1;x.style.transform="translateY(0)";setTimeout(()=>{x.style.opacity=0;x.style.transform="translateY(10px)"},2500)}
function show(view){
  document.querySelectorAll(".view").forEach(x=>x.classList.add("hidden"));
  $("#"+view).classList.remove("hidden");
  document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===view));
  $("#pageTitle").textContent=view[0].toUpperCase()+view.slice(1);
}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>show(b.dataset.view));
document.querySelectorAll("[data-view-target]").forEach(b=>b.onclick=()=>show(b.dataset.viewTarget));

async function api(url,opt){const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opt});const j=await r.json();if(!r.ok)throw Error(j.error||"Request failed");return j}
async function load(){
  state=await api("/api/status"); render();
}
function render(){
  const c=state.latest, ps=state.prospects||[], aps=state.approvals||[];
  $("#status").textContent=c?.status?.replaceAll("_"," ")||"idle";
  $("#cycleTime").textContent=c?new Date(c.started_at).toLocaleString():"No cycle yet";
  $("#prospectsCount").textContent=c?.prospects||0;
  $("#qualifiedCount").textContent=c?.qualified||0;
  $("#approvalCount").textContent=aps.length;
  $("#cycleTitle").textContent=c?`Cycle ${c.id.slice(-7)}`:"No cycle";
  $("#objective").textContent=c?.objective||"Set a business objective and run your first cycle.";
  $("#statusPill").textContent=c?.status?.replaceAll("_"," ")||"Idle";
  $("#statusPill").className="pill "+(c?.status==="awaiting_approval"?"orange":c?.status==="done"?"green":"");
  const pct=c?({researching:15,qualifying:45,awaiting_approval:82,approved_for_sending:100,done:100}[c.status]||55):0;
  $("#progressBar").style.width=pct+"%";
  const names=["research","qualify","outreach","sales","delivery","analytics"];
  $("#steps").innerHTML=names.map((n,i)=>`<div class="step ${i < Math.ceil(pct/17)?"done":""}"><b></b>${n}</div>`).join("");
  $("#nextAction").textContent=aps.length?aps[0].text:"Run a cycle to discover and qualify prospects.";
  $("#history").innerHTML=(state.cycles||[]).map(x=>`<div class="history-row"><b>${x.id.slice(-7)}</b><span>${x.status.replaceAll("_"," ")}</span><span>${x.qualified||0} qualified</span></div>`).join("")||"<p class='muted'>No cycles yet.</p>";
  $("#prospectTable").innerHTML=`<div class="prospect-row head"><div>Prospect</div><div>Note</div><div>Score</div><div>Stage</div></div>`+
    ps.map(p=>`<div class="prospect-row"><div><b>${esc(p.name)}</b><br><a class="link" href="${esc(p.url)}" target="_blank">website</a></div><div>${esc(p.note)}</div><div class="score">${p.score}</div><div class="${p.stage}">${p.stage}</div></div>`).join("");
  $("#approvalList").innerHTML=aps.length?aps.map(a=>`<div class="card approval"><div><span class="eyebrow">APPROVAL REQUIRED</span><h2>${esc(a.text)}</h2><p class="muted">Review the generated outreach drafts before anything is sent.</p></div><div class="approval-actions"><button class="danger" onclick="decide('${a.id}',false)">Reject</button><button class="primary" onclick="decide('${a.id}',true)">Approve</button></div></div>`).join(""):"<div class='card'><h2>No approvals waiting</h2><p class='muted'>The operator will place outreach batches here when human review is required.</p></div>";
}
function esc(x){return String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
async function decide(id,approved){try{await api("/api/approvals/"+id,{method:"POST",body:JSON.stringify({approved})});toast(approved?"Outreach approved.":"Outreach rejected.");await load()}catch(e){toast(e.message)}}
$("#runBtn").onclick=async()=>{try{$("#runBtn").disabled=true;$("#runBtn").textContent="Running…";toast("Manager cycle started");const r=await api("/api/run",{method:"POST"});toast(r.skipped?"An open cycle already exists.":"Cycle completed to approval stage.");await load()}catch(e){toast(e.message)}finally{$("#runBtn").disabled=false;$("#runBtn").textContent="Run manager cycle"}};
$("#saveObjective").onclick=async()=>{try{const v=$("#objectiveInput").value.trim();if(!v)return toast("Enter an objective first");await api("/api/cycles",{method:"POST",body:JSON.stringify({objective:v})});toast("Objective saved.");}catch(e){toast(e.message)}};
$("#resetBtn").onclick=async()=>{if(confirm("Reset all local operator data?")){await api("/api/reset",{method:"POST"});await load();toast("Reset complete.")}};
load();
setInterval(load,15000);
