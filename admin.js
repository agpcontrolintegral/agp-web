(() => {
  'use strict';
  const VERSION='5.0.1', STORAGE='agp-erp-v3-data', SETTINGS='agp-erp-v3-settings';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const money=n=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(Number(n||0));
  const formatDuration=seconds=>{seconds=Math.max(0,Number(seconds||0));const h=Math.floor(seconds/3600),m=Math.round((seconds%3600)/60);if(h===0)return `${Math.max(1,m)} min`;if(m===60)return `${h+1} h`;return m?`${h} h ${m} min`:`${h} h`;};
  const today=()=>new Date().toISOString().slice(0,10);
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const uid=(prefix,arr=[])=>`${prefix}-${String(Math.max(0,...arr.map(x=>Number(String(x.id||'').match(/\d+$/)?.[0]||0)))+1).padStart(6,'0')}`;

  const services=[
    {id:'SER-001',name:'Inventario físico de mercadería',unit:'producto',base:0.12,min:950,marketMin:0.10,marketMax:0.20,scope:'Conteo físico, consolidación, validación de diferencias y reporte ejecutivo.'},
    {id:'SER-002',name:'Auditoría de inventarios',unit:'producto',base:0.18,min:1400,marketMin:0.15,marketMax:0.28,scope:'Muestreo, trazabilidad, revisión documental, cruces y hallazgos.'},
    {id:'SER-003',name:'Inventario de activos fijos',unit:'activo',base:0.65,min:1800,marketMin:0.50,marketMax:1.10,scope:'Levantamiento, codificación, ubicación, estado y base patrimonial.'},
    {id:'SER-004',name:'Etiquetado y codificación',unit:'activo',base:0.85,min:1600,marketMin:0.65,marketMax:1.30,scope:'Impresión, colocación, evidencia y padrón de etiquetas.'},
    {id:'SER-005',name:'Digitalización y depuración de datos',unit:'registro',base:0.30,min:900,marketMin:0.22,marketMax:0.48,scope:'Digitación, normalización, control de calidad y entrega estructurada.'},
    {id:'SER-006',name:'Supervisión operativa',unit:'jornada',base:650,min:650,marketMin:550,marketMax:900,scope:'Supervisión en campo, control de avance, incidencias y cierre.'}
  ];
  const initial={
    clients:[{id:'CLI-000001',business:'Empresa Demo Retail SAC',trade:'Demo Retail',ruc:'20123456789',sector:'Retail',city:'Lima',contact:'Ana Torres',phone:'999111222',email:'ana@demo.pe',status:'Prospecto',origin:'Facebook',created:today(),notes:'Registro de demostración'}],
    leads:[{id:'LEA-000001',date:today(),company:'Empresa Demo Retail SAC',contact:'Ana Torres',phone:'999111222',service:'SER-001',origin:'Facebook',status:'Contactado',owner:'Augusto',next:today(),notes:'Solicitó propuesta'}],
    opportunities:[{id:'OPO-000001',clientId:'CLI-000001',service:'SER-001',stage:'Cotizado',probability:60,amount:3500,close:today(),owner:'Augusto',nextAction:'Revisar propuesta',notes:'Demo'}],
    quotes:[{id:'COT-2026-0001',version:1,clientId:'CLI-000001',client:'Empresa Demo Retail SAC',date:today(),expires:today(),service:'SER-001',quantity:15000,cost:2100,subtotal:3500,igv:630,total:4130,status:'Borrador',margin:40,scope:'Conteo físico, consolidación, validación y reporte final.',items:[{description:'Inventario físico de mercadería',qty:1,price:3500}]}],
    projects:[{id:'PRO-2026-0001',quoteId:'COT-2026-0001',client:'Empresa Demo Retail SAC',service:'Inventario físico de mercadería',start:today(),end:today(),status:'Planificación',owner:'Augusto',costPlan:2100,costReal:0,incomePlan:3500,incomeReal:0,progress:15,notes:'Proyecto demo'}],
    tasks:[{id:'TAR-000001',date:today(),due:today(),area:'Comercial',related:'COT-2026-0001',task:'Dar seguimiento a propuesta',owner:'Augusto',priority:'Alta',status:'Pendiente',notes:''}],
    staff:[{id:'PER-000001',name:'Augusto',dni:'00000001',role:'Coordinador',type:'Fundador',phone:'992898514',rate:250,status:'Activo',available:'Sí'}],
    suppliers:[{id:'PRV-000001',company:'Proveedor Demo',contact:'Luis',service:'Alquiler de PDA',phone:'999000111',email:'proveedor@demo.pe',status:'Activo'}],
    movements:[{id:'MOV-000001',date:today(),type:'Ingreso',category:'Adelanto',project:'PRO-2026-0001',description:'Adelanto proyecto demo',amount:1000,method:'Transferencia',status:'Confirmado'}],
    invoices:[], payments:[], incidents:[], documents:[], services,
    settings:{company:'AGP Control Integral',ruc:'',email:'agpcontrolintegral@gmail.com',phone:'992898514',address:'Lima, Perú',igv:18,minMargin:28,targetMargin:40,operatorRate:110,supervisorRate:220,coordinatorRate:300,pdaRate:110,validDays:15}
  };
  let db=load(), view='dashboard', query='', cloudHydrated=false, cloudSaving=false, pendingQuoteContext=null;
  function load(){
    try{
      return {...structuredClone(initial),...JSON.parse(localStorage.getItem(STORAGE)||'{}')}
    }catch{
      return structuredClone(initial)
    }
  }
  function cacheLocal(){
    localStorage.setItem(STORAGE,JSON.stringify(db));
  }
  function save(msg){
    cacheLocal();
    if(msg) toast(msg);
    render();
    if(window.AGPCloud){
      cloudSaving=true;
      window.AGPCloud.saveWorkspace(db)
        .then(()=>{cloudSaving=false})
        .catch(error=>{
          cloudSaving=false;
          console.error('Error guardando en Firestore:',error);
          toast('Guardado local; Firestore no respondió');
        });
    }
  }
  function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200)}
  function statusClass(s=''){s=s.toLowerCase();return /ganad|acept|activo|confirm|complet|pagad/.test(s)?'success':/perdid|anulad|vencid|crític/.test(s)?'danger':/pend|borrador|plan|proceso|enviado|contact/.test(s)?'warning':'neutral'}
  const navGroups=[['General',[['dashboard','⌂','Dashboard'],['quotes','▤','Cotizador Pro']]],['Comercial',[['clients','◉','Clientes'],['leads','◎','Leads'],['opportunities','◇','Oportunidades'],['quoteHistory','▧','Cotizaciones']]],['Operaciones',[['projects','▣','Proyectos'],['tasks','✓','Tareas'],['incidents','!','Incidencias'],['staff','♙','Personal']]],['Finanzas',[['finance','$','Finanzas'],['invoices','▥','Facturas'],['payments','◫','Pagos']]],['Catálogos',[['suppliers','◌','Proveedores'],['services','≡','Servicios'],['documents','⌁','Documentos'],['settings','⚙','Configuración']]]];
  const meta={dashboard:['Dashboard','Resumen ejecutivo del negocio'],quotes:['Cotizador Pro','Calcula costos, margen y precio comercial'],clients:['Clientes','Base maestra de empresas'],leads:['Leads','Consultas y prospectos comerciales'],opportunities:['Oportunidades','Embudo y pronóstico de ventas'],quoteHistory:['Cotizaciones','Historial de propuestas comerciales'],projects:['Proyectos','Planificación, ejecución y rentabilidad'],tasks:['Tareas','Seguimientos comerciales y operativos'],incidents:['Incidencias','Desviaciones, bloqueos y acciones'],staff:['Personal','Colaboradores, terceros y tarifas'],finance:['Finanzas','Ingresos, egresos y caja'],invoices:['Facturas','Comprobantes y vencimientos'],payments:['Pagos','Cobros y saldos pendientes'],suppliers:['Proveedores','Servicios y recursos externos'],services:['Servicios','Catálogo y tarifas referenciales'],documents:['Documentos','Contratos, informes y enlaces'],settings:['Configuración','Empresa, precios y parámetros']};
  function renderNav(){ $('#nav').innerHTML=navGroups.map(([g,items])=>`<div class="nav-group">${g}</div>${items.map(([id,ic,l])=>`<button class="nav-btn ${view===id?'active':''}" data-view="${id}"><span>${ic}</span>${l}</button>`).join('')}`).join(''); }
  function setView(v){view=v;query='';$('#pageTitle').textContent=meta[v][0];$('#pageSubtitle').textContent=meta[v][1];renderNav();render();$('#sidebar').classList.remove('show');}
  function render(){const f={dashboard:renderDashboard,quotes:renderQuoteBuilder,clients:()=>renderTable('clients'),leads:()=>renderTable('leads'),opportunities:()=>renderTable('opportunities'),quoteHistory:()=>renderTable('quotes'),projects:()=>renderProjects(),tasks:()=>renderTable('tasks'),incidents:()=>renderTable('incidents'),staff:()=>renderTable('staff'),finance:renderFinance,invoices:()=>renderTable('invoices'),payments:()=>renderTable('payments'),suppliers:()=>renderTable('suppliers'),services:renderServices,documents:()=>renderTable('documents'),settings:renderSettings}[view]; f();}
  function renderDashboard(){
    const income=db.movements.filter(x=>x.type==='Ingreso').reduce((a,b)=>a+Number(b.amount),0),expense=db.movements.filter(x=>x.type==='Egreso').reduce((a,b)=>a+Number(b.amount),0),pipeline=db.opportunities.reduce((a,b)=>a+Number(b.amount)*Number(b.probability)/100,0),active=db.projects.filter(x=>!['Completado','Anulado'].includes(x.status)).length;
    const stages=['Nuevo','Contactado','Diagnóstico','Cotizado','Negociación','Ganado'];
    $('#content').innerHTML=`<div class="grid kpis"><div class="card kpi"><div class="label">Pipeline ponderado</div><div class="value">${money(pipeline)}</div><div class="delta">${db.opportunities.length} oportunidades</div></div><div class="card kpi"><div class="label">Cotizaciones</div><div class="value">${money(db.quotes.reduce((a,b)=>a+Number(b.total),0))}</div><div class="delta">${db.quotes.length} propuestas</div></div><div class="card kpi"><div class="label">Proyectos activos</div><div class="value">${active}</div><div class="delta">${db.projects.length} totales</div></div><div class="card kpi"><div class="label">Caja</div><div class="value">${money(income-expense)}</div><div class="delta">Ingresos ${money(income)}</div></div></div>
    <div class="grid two" style="margin-top:18px"><div class="card"><div class="section-head"><h3>Embudo comercial</h3><button class="mini-btn" data-view="opportunities">Ver todo</button></div><div class="pipeline">${stages.map(s=>{const arr=db.opportunities.filter(x=>x.stage===s),amt=arr.reduce((a,b)=>a+Number(b.amount),0),max=Math.max(1,...stages.map(st=>db.opportunities.filter(x=>x.stage===st).reduce((a,b)=>a+Number(b.amount),0)));return `<div class="pipeline-row"><span>${s}</span><div class="progress"><span style="width:${amt/max*100}%"></span></div><strong>${money(amt)}</strong></div>`}).join('')}</div></div>
    <div class="card"><div class="section-head"><h3>Próximas tareas</h3><button class="mini-btn" data-view="tasks">Ver agenda</button></div>${db.tasks.slice(0,6).map(t=>`<div class="section-head"><div><strong style="font-size:13px">${esc(t.task)}</strong><div style="font-size:11px;color:var(--muted);margin-top:4px">${esc(t.owner)} · ${esc(t.due)}</div></div><span class="badge ${statusClass(t.status)}">${esc(t.status)}</span></div>`).join('')||'<div class="empty">Sin tareas</div>'}</div></div>
    <div class="card" style="margin-top:18px"><div class="section-head"><h3>Proyectos recientes</h3><button class="mini-btn" data-view="projects">Gestionar</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Proyecto</th><th>Cliente</th><th>Estado</th><th>Avance</th><th>Margen plan</th></tr></thead><tbody>${db.projects.map(p=>`<tr><td><strong>${p.id}</strong><br><small>${esc(p.service)}</small></td><td>${esc(p.client)}</td><td><span class="badge ${statusClass(p.status)}">${esc(p.status)}</span></td><td><div class="progress"><span style="width:${Number(p.progress||0)}%"></span></div></td><td>${Number(p.incomePlan)?((Number(p.incomePlan)-Number(p.costPlan))/Number(p.incomePlan)*100).toFixed(1):0}%</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  const configs={
    clients:{title:'Cliente',prefix:'CLI',cols:[['business','Razón social'],['ruc','RUC'],['contact','Contacto'],['phone','Celular'],['status','Estado']],fields:[['business','Razón social','text',1],['trade','Nombre comercial','text'],['ruc','RUC','text'],['sector','Sector','text'],['city','Ciudad','text'],['contact','Contacto principal','text'],['phone','Celular','tel'],['email','Correo','email'],['status','Estado','select',['Prospecto','Activo','Inactivo']],['origin','Origen','select',['Facebook','WhatsApp','Web','Referido','Otro']],['notes','Observaciones','textarea']]},
    leads:{title:'Lead',prefix:'LEA',cols:[['company','Empresa'],['contact','Contacto'],['origin','Origen'],['status','Estado'],['owner','Responsable']],fields:[['date','Fecha','date'],['company','Empresa','text',1],['contact','Contacto','text'],['phone','Celular','tel'],['service','Servicio','service'],['origin','Origen','select',['Facebook','WhatsApp','Web','Referido','Otro']],['status','Estado','select',['Nuevo','Contactado','Calificado','Descartado']],['owner','Responsable','text'],['next','Próximo contacto','date'],['notes','Observaciones','textarea']]},
    opportunities:{title:'Oportunidad',prefix:'OPO',cols:[['clientId','Cliente'],['service','Servicio'],['stage','Etapa'],['probability','Probabilidad'],['amount','Monto']],fields:[['clientId','Cliente','client',1],['service','Servicio','service'],['stage','Etapa','select',['Nuevo','Contactado','Diagnóstico','Cotizado','Negociación','Ganado','Perdido']],['probability','Probabilidad %','number'],['amount','Monto estimado','number'],['close','Cierre estimado','date'],['owner','Responsable','text'],['nextAction','Próxima acción','text'],['notes','Observaciones','textarea']]},
    quotes:{title:'Cotización',prefix:'COT',cols:[['id','Código'],['client','Cliente'],['date','Fecha'],['total','Total'],['status','Estado']],fields:[]},
    tasks:{title:'Tarea',prefix:'TAR',cols:[['task','Tarea'],['area','Área'],['due','Vence'],['priority','Prioridad'],['status','Estado']],fields:[['date','Fecha creación','date'],['due','Fecha límite','date'],['area','Área','select',['Comercial','Operaciones','Finanzas','Administración','Marketing']],['related','Relacionado con','text'],['task','Tarea','text',1],['owner','Responsable','text'],['priority','Prioridad','select',['Alta','Media','Baja']],['status','Estado','select',['Pendiente','En proceso','Completada','Anulada']],['notes','Observaciones','textarea']]},
    incidents:{title:'Incidencia',prefix:'INC',cols:[['project','Proyecto'],['date','Fecha'],['type','Tipo'],['severity','Severidad'],['status','Estado']],fields:[['project','Proyecto','project'],['date','Fecha','date'],['type','Tipo','select',['Operativa','Calidad','Seguridad','Cliente','Tecnología']],['severity','Severidad','select',['Baja','Media','Alta','Crítica']],['description','Descripción','textarea',1],['owner','Responsable','text'],['status','Estado','select',['Abierta','En análisis','Resuelta','Cerrada']],['action','Acción inmediata','textarea']]},
    staff:{title:'Personal',prefix:'PER',cols:[['name','Nombre'],['role','Cargo'],['type','Vínculo'],['rate','Tarifa jornada'],['status','Estado']],fields:[['name','Nombre','text',1],['dni','DNI','text'],['role','Cargo','text'],['type','Vínculo','select',['Planilla','Tercero','Freelance','Fundador']],['phone','Celular','tel'],['rate','Tarifa por jornada','number'],['status','Estado','select',['Activo','Inactivo']],['available','Disponible','select',['Sí','No']]]},
    suppliers:{title:'Proveedor',prefix:'PRV',cols:[['company','Empresa'],['contact','Contacto'],['service','Servicio'],['phone','Celular'],['status','Estado']],fields:[['company','Empresa','text',1],['contact','Contacto','text'],['service','Servicio','text'],['phone','Celular','tel'],['email','Correo','email'],['status','Estado','select',['Activo','Inactivo']],['notes','Observaciones','textarea']]},
    movements:{title:'Movimiento',prefix:'MOV',cols:[['date','Fecha'],['type','Tipo'],['category','Categoría'],['description','Descripción'],['amount','Monto']],fields:[['date','Fecha','date'],['type','Tipo','select',['Ingreso','Egreso']],['category','Categoría','text'],['project','Proyecto','project'],['description','Descripción','text',1],['amount','Monto','number',1],['method','Medio','select',['Transferencia','Efectivo','Yape/Plin','Tarjeta','Otro']],['status','Estado','select',['Pendiente','Confirmado','Anulado']]]},
    invoices:{title:'Factura',prefix:'FAC',cols:[['number','Comprobante'],['client','Cliente'],['issue','Emisión'],['due','Vence'],['total','Total'],['status','Estado']],fields:[['number','Serie y número','text',1],['client','Cliente','text'],['issue','Fecha emisión','date'],['due','Fecha vencimiento','date'],['subtotal','Subtotal','number'],['igv','IGV','number'],['total','Total','number'],['status','Estado','select',['Emitida','Pendiente','Pagada','Vencida','Anulada']],['notes','Observaciones','textarea']]},
    payments:{title:'Pago',prefix:'PAG',cols:[['date','Fecha'],['invoice','Factura'],['client','Cliente'],['amount','Monto'],['status','Estado']],fields:[['date','Fecha','date'],['invoice','Factura','text'],['client','Cliente','text'],['amount','Monto','number',1],['method','Medio','select',['Transferencia','Efectivo','Yape/Plin','Tarjeta','Otro']],['status','Estado','select',['Confirmado','Pendiente','Anulado']],['notes','Observaciones','textarea']]},
    documents:{title:'Documento',prefix:'DOC',cols:[['name','Nombre'],['type','Tipo'],['related','Relacionado'],['version','Versión'],['status','Estado']],fields:[['name','Nombre','text',1],['type','Tipo','select',['Cotización','Contrato','Informe','Acta','Factura','Otro']],['related','Código relacionado','text'],['version','Versión','text'],['status','Estado','select',['Borrador','Vigente','Archivado','Anulado']],['link','Enlace','url'],['notes','Observaciones','textarea']]}
  };
  function displayValue(key,v){if(key==='amount'||key==='total'||key==='rate')return money(v);if(key==='probability')return `${v||0}%`;if(key==='clientId')return db.clients.find(x=>x.id===v)?.business||v;if(key==='service')return db.services.find(x=>x.id===v)?.name||v;return esc(v||'—')}
  const commercialFlow=[['lead','Lead'],['contacted','Contactado'],['qualified','Calificado'],['client','Cliente'],['quote','Cotización'],['decision','Decisión'],['project','Proyecto'],['closed','Cierre']];
  function workflowStepFor(type,r){if(type==='leads')return r.linkedClientId?3:r.status==='Calificado'?2:r.status==='Contactado'?1:0;if(type==='clients')return 3;if(type==='opportunities')return {Nuevo:1,Contactado:1,Diagnóstico:2,Cotizado:4,Negociación:5,Ganado:6,Perdido:5}[r.stage]??3;if(type==='quotes')return {Borrador:4,Enviada:4,Aceptada:5,Rechazada:5,Anulada:5}[r.status]??4;if(type==='projects')return ['Completado','Finalizado','Cerrado'].includes(r.status)?7:6;return 0}
  function workflowBar(active){return `<div class="commercial-flow">${commercialFlow.map(([,label],i)=>`<div class="flow-step ${i<active?'done':i===active?'active':''}"><span>${i<active?'✓':String(i+1).padStart(2,'0')}</span><small>${label}</small></div>`).join('')}</div>`}
  function leadActions(r){let x=[`<button class="mini-btn" data-action="view" data-type="leads" data-id="${r.id}">Ver</button>`,`<button class="mini-btn" data-action="edit" data-type="leads" data-id="${r.id}">Editar</button>`];if(r.status==='Nuevo')x.push(`<button class="mini-btn primary-action" data-action="leadStatus" data-status="Contactado" data-id="${r.id}">Contactado</button>`);if(['Nuevo','Contactado'].includes(r.status))x.push(`<button class="mini-btn primary-action" data-action="leadStatus" data-status="Calificado" data-id="${r.id}">Calificar</button>`);if(!r.linkedClientId&&r.status!=='Descartado')x.push(`<button class="mini-btn convert-action" data-action="leadToClient" data-id="${r.id}">Convertir en cliente</button>`);if(r.linkedClientId)x.push(`<button class="mini-btn convert-action" data-action="startQuote" data-client-id="${r.linkedClientId}" data-lead-id="${r.id}">Crear cotización</button>`);x.push(`<button class="mini-btn danger" data-action="delete" data-type="leads" data-id="${r.id}">Eliminar</button>`);return x.join('')}
  function opportunityActions(r){let x=[`<button class="mini-btn" data-action="view" data-type="opportunities" data-id="${r.id}">Ver</button>`,`<button class="mini-btn" data-action="edit" data-type="opportunities" data-id="${r.id}">Editar</button>`];if(!['Ganado','Perdido'].includes(r.stage)){x.push(`<button class="mini-btn primary-action" data-action="opportunityNext" data-id="${r.id}">Siguiente etapa</button>`);x.push(`<button class="mini-btn convert-action" data-action="startQuote" data-client-id="${r.clientId}" data-opportunity-id="${r.id}">Cotizar</button>`)}x.push(`<button class="mini-btn danger" data-action="delete" data-type="opportunities" data-id="${r.id}">Eliminar</button>`);return x.join('')}
  function quoteActions(r){let x=[`<button class="mini-btn" data-action="view" data-type="quotes" data-id="${r.id}">Ver</button>`,`<button class="mini-btn" data-action="pdfOptions" data-id="${r.id}">PDF</button>`];if(r.status==='Borrador')x.push(`<button class="mini-btn primary-action" data-action="quoteStatus" data-status="Enviada" data-id="${r.id}">Enviada</button>`);if(['Borrador','Enviada'].includes(r.status)){x.push(`<button class="mini-btn accept-action" data-action="quoteStatus" data-status="Aceptada" data-id="${r.id}">Aceptar</button>`);x.push(`<button class="mini-btn danger" data-action="quoteStatus" data-status="Rechazada" data-id="${r.id}">Rechazar</button>`)}if(r.status==='Aceptada'&&!db.projects.some(p=>p.quoteId===r.id))x.push(`<button class="mini-btn convert-action" data-action="quoteProject" data-id="${r.id}">Crear proyecto</button>`);x.push(`<button class="mini-btn danger" data-action="delete" data-type="quotes" data-id="${r.id}">Eliminar</button>`);return x.join('')}
  function projectActions(r){let x=[`<button class="mini-btn" data-action="view" data-type="projects" data-id="${r.id}">Ver</button>`,`<button class="mini-btn" data-action="edit" data-type="projects" data-id="${r.id}">Editar</button>`];if(!['Completado','Anulado'].includes(r.status)){x.push(`<button class="mini-btn primary-action" data-action="projectAdvance" data-id="${r.id}">Avanzar etapa</button>`);x.push(`<button class="mini-btn accept-action" data-action="projectClose" data-id="${r.id}">Cerrar proyecto</button>`)}x.push(`<button class="mini-btn danger" data-action="delete" data-type="projects" data-id="${r.id}">Eliminar</button>`);return x.join('')}
  function renderTable(type){const c=configs[type],arr=db[type]||[],filtered=arr.filter(r=>JSON.stringify(r).toLowerCase().includes(query.toLowerCase()));const showFlow=['leads','clients','opportunities','quotes','projects'].includes(type),active={leads:0,clients:3,opportunities:2,quotes:4,projects:6}[type]??0;$('#content').innerHTML=`${showFlow?workflowBar(active):''}<div class="toolbar"><div class="search"><input id="searchInput" placeholder="Buscar en ${c.title.toLowerCase()}..." value="${esc(query)}"></div><button class="secondary-btn" data-action="exportCsv" data-type="${type}">Exportar CSV</button>${type==='quotes'?'<button class="primary-btn" data-view="quotes">＋ Nueva cotización</button>':`<button class="primary-btn" data-action="new" data-type="${type}">＋ Nuevo</button>`}</div><div class="card"><div class="table-wrap"><table class="data-table"><thead><tr>${c.cols.map(x=>`<th>${x[1]}</th>`).join('')}<th>Acciones</th></tr></thead><tbody>${filtered.map(r=>`<tr>${c.cols.map(([k])=>`<td>${['status','stage','priority','severity'].includes(k)?`<span class="badge ${statusClass(r[k])}">${displayValue(k,r[k])}</span>`:displayValue(k,r[k])}</td>`).join('')}<td><div class="row-actions">${type==='leads'?leadActions(r):type==='opportunities'?opportunityActions(r):type==='quotes'?quoteActions(r):type==='projects'?projectActions(r):`<button class="mini-btn" data-action="view" data-type="${type}" data-id="${r.id}">Ver</button><button class="mini-btn" data-action="edit" data-type="${type}" data-id="${r.id}">Editar</button><button class="mini-btn" data-action="archive" data-type="${type}" data-id="${r.id}">Anular</button><button class="mini-btn danger" data-action="delete" data-type="${type}" data-id="${r.id}">Eliminar</button>`}</div></td></tr>`).join('')||`<tr><td colspan="${c.cols.length+1}" class="empty">No hay registros</td></tr>`}</tbody></table></div></div>`;$('#searchInput')?.addEventListener('input',e=>{query=e.target.value;renderTable(type)});}

  function renderTableCustom(type,c){configs[type]=c;renderTable(type)}
  function renderFinance(){const income=db.movements.filter(x=>x.type==='Ingreso'&&x.status!=='Anulado').reduce((a,b)=>a+Number(b.amount),0),expense=db.movements.filter(x=>x.type==='Egreso'&&x.status!=='Anulado').reduce((a,b)=>a+Number(b.amount),0);$('#content').innerHTML=`<div class="grid kpis"><div class="card kpi"><div class="label">Ingresos</div><div class="value">${money(income)}</div></div><div class="card kpi"><div class="label">Egresos</div><div class="value">${money(expense)}</div></div><div class="card kpi"><div class="label">Caja</div><div class="value">${money(income-expense)}</div></div><div class="card kpi"><div class="label">Cuentas por cobrar</div><div class="value">${money(db.invoices.filter(x=>!['Pagada','Anulada'].includes(x.status)).reduce((a,b)=>a+Number(b.total),0))}</div></div></div><div style="margin-top:18px" id="financeTable"></div>`;const old=$('#content').innerHTML;configs.movements=configs.movements;const temp=$('#financeTable');temp.innerHTML=`<div class="toolbar"><button class="primary-btn" data-action="new" data-type="movements">＋ Movimiento</button></div><div class="card"><div class="table-wrap"><table class="data-table"><thead><tr>${configs.movements.cols.map(x=>`<th>${x[1]}</th>`).join('')}<th>Acciones</th></tr></thead><tbody>${db.movements.map(r=>`<tr>${configs.movements.cols.map(([k])=>`<td>${displayValue(k,r[k])}</td>`).join('')}<td><div class="row-actions"><button class="mini-btn" data-action="edit" data-type="movements" data-id="${r.id}">Editar</button><button class="mini-btn danger" data-action="delete" data-type="movements" data-id="${r.id}">Eliminar</button></div></td></tr>`).join('')}</tbody></table></div></div>`;}
  function renderServices(){const arr=db.services;$('#content').innerHTML=`<div class="toolbar"><button class="primary-btn" data-action="serviceNew">＋ Servicio</button></div><div class="grid two">${arr.map(s=>`<div class="card card-pad"><div style="display:flex;justify-content:space-between;gap:12px"><div><span class="badge">${s.id}</span><h3>${esc(s.name)}</h3></div><div class="row-actions"><button class="mini-btn" data-action="serviceEdit" data-id="${s.id}">Editar</button><button class="mini-btn danger" data-action="delete" data-type="services" data-id="${s.id}">Eliminar</button></div></div><p style="color:var(--muted);font-size:13px">${esc(s.scope)}</p><div class="detail-grid"><div class="detail-item"><span>Tarifa base</span><strong>${money(s.base)} / ${s.unit}</strong></div><div class="detail-item"><span>Mínimo</span><strong>${money(s.min)}</strong></div><div class="detail-item"><span>Banda referencial</span><strong>${money(s.marketMin)} – ${money(s.marketMax)}</strong></div></div></div>`).join('')}</div>`}
  function renderSettings(){const s=db.settings;$('#content').innerHTML=`<div class="card card-pad"><form id="settingsForm" class="form-grid">${[['company','Empresa','text'],['ruc','RUC','text'],['email','Correo','email'],['phone','Celular','tel'],['address','Dirección','text'],['igv','IGV %','number'],['minMargin','Margen mínimo %','number'],['targetMargin','Margen objetivo %','number'],['operatorRate','Tarifa operario/jornada','number'],['supervisorRate','Tarifa supervisor/jornada','number'],['coordinatorRate','Tarifa coordinador/jornada','number'],['pdaRate','Tarifa PDA/jornada','number'],['validDays','Vigencia cotización (días)','number']].map(([k,l,t])=>`<div class="field"><label>${l}</label><input name="${k}" type="${t}" value="${esc(s[k])}"></div>`).join('')}<div class="field full form-actions"><a class="secondary-btn" href="migration.html">Migrar datos locales</a><button type="button" class="secondary-btn" data-action="backup">Respaldar</button><button class="primary-btn">Guardar configuración</button></div></form></div>`;$('#settingsForm').onsubmit=e=>{e.preventDefault();Object.fromEntries(new FormData(e.target)).constructor;for(const [k,v] of new FormData(e.target))db.settings[k]=['igv','minMargin','targetMargin','operatorRate','supervisorRate','coordinatorRate','pdaRate','validDays'].includes(k)?Number(v):v;save('Configuración actualizada')};}

  function renderQuoteBuilder(){const clients=db.clients,svc=db.services;$('#content').innerHTML=`<div class="quote-layout"><div class="card card-pad"><form id="quoteForm" class="form-grid"><div class="field"><label>Cliente</label><select name="clientId" required>${clients.map(c=>`<option value="${c.id}">${esc(c.business)}</option>`).join('')}</select></div><div class="field"><label>Servicio</label><select name="service" id="qService">${svc.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>Cantidad estimada</label><input name="quantity" id="qQuantity" type="number" value="15000" min="1"></div><div class="field"><label>Jornadas</label><input name="days" id="qDays" type="number" value="2" min="1"></div><div class="field"><label>Operarios que cuentan</label><input name="operators" id="qOperators" type="number" value="5" min="1"></div><div class="field"><label>Segundos por producto</label><input name="secondsPerProduct" id="qSecondsPerProduct" type="number" value="1" min="0.1" step="0.1"></div><div class="field"><label>Eficiencia operativa %</label><input name="operationalEfficiencyPct" id="qEfficiency" type="number" value="75" min="35" max="100"></div><div class="field"><label>Horas por jornada</label><input name="workdayHours" id="qWorkdayHours" type="number" value="8" min="1" max="24"></div><div class="field"><label>Supervisores</label><input name="supervisors" id="qSupervisors" type="number" value="1" min="0"></div><div class="field"><label>Coordinadores</label><input name="coordinators" id="qCoordinators" type="number" value="0" min="0"></div><div class="field"><label>PDAs</label><input name="pdas" id="qPdas" type="number" value="6" min="0"></div><div class="field"><label>Horario</label><select name="shift" id="qShift"><option>Diurno</option><option>Nocturno</option><option>Mixto</option></select></div><div class="field"><label>Complejidad</label><select name="complexity" id="qComplexity"><option>Baja</option><option selected>Media</option><option>Alta</option><option>Crítica</option></select></div><div class="field"><label>Urgencia</label><select name="urgency" id="qUrgency"><option>Normal</option><option>Prioritaria</option><option>Urgente</option></select></div><div class="field"><label>Número de sedes</label><input name="sites" id="qSites" type="number" value="1" min="1"></div><div class="field"><label>Movilidad</label><input name="mobility" id="qMobility" type="number" value="300"></div><div class="field"><label>Alimentación</label><input name="food" id="qFood" type="number" value="300"></div><div class="field"><label>Hospedaje</label><input name="lodging" id="qLodging" type="number" value="0"></div><div class="field"><label>Materiales / etiquetas</label><input name="materials" id="qMaterials" type="number" value="0"></div><div class="field"><label>Otros costos</label><input name="other" id="qOther" type="number" value="100"></div>
<div class="field"><label>Tipo de cliente</label><select name="clientSegment" id="qClientSegment"><option value="micro">Pequeño comercio / farmacia independiente</option><option value="small" selected>Pequeña empresa</option><option value="medium">Mediana empresa</option><option value="corporate">Corporación</option></select></div>
<div class="field"><label>Rubro del negocio</label><select name="businessType" id="qBusinessType"><option value="farmacia">Farmacia independiente</option><option value="bodega">Bodega</option><option value="minimarket">Minimarket</option><option value="ferreteria">Ferretería</option><option value="retail">Retail</option><option value="otro">Otro</option></select></div>
<div class="field"><label>Etapa comercial de AGP</label><select name="companyStage" id="qCompanyStage"><option value="launch" selected>Lanzamiento — ganar mercado</option><option value="growth">Crecimiento</option><option value="consolidated">Consolidada</option></select></div>
<div class="field"><label>Potencial de recurrencia</label><select name="recurrence" id="qRecurrence"><option value="high">Alto — podría contratar regularmente</option><option value="medium" selected>Medio</option><option value="low">Bajo — servicio puntual</option></select></div>
<div class="field"><label>Valor estratégico</label><select name="strategicValue" id="qStrategicValue"><option value="reference">Primera referencia / testimonio</option><option value="network">Puede recomendar otros negocios</option><option value="normal" selected>Cliente normal</option></select></div>
<div class="field"><label>Modalidad comercial</label><select name="commercialMode" id="qCommercialMode"><option value="neighborhood">Plan Esencial — precio mínimo</option><option value="launch" selected>Lanzamiento competitivo</option><option value="growth">Crecimiento sostenible</option><option value="corporate">Corporativo</option></select></div>
<div class="field"><label>Estrategia comercial</label><select name="pricingStrategy" id="qPricingStrategy"><option value="neighborhood">Plan Esencial — mínimo viable</option><option value="acquisition">Captación estratégica</option><option value="launch" selected>Lanzamiento competitivo</option><option value="sustainable">Crecimiento sostenible</option><option value="premium">Premium / corporativo</option></select></div>
<div class="field"><label>Margen aplicado %</label><input name="margin" id="qMargin" type="number" value="18" min="10" max="80"></div>
<div class="field full"><div class="commercial-help"><strong>Política para AGP en etapa inicial</strong><span>Captación se usa solo para conseguir referencias o contratos recurrentes. Competitivo para iniciar es la opción recomendada. Nunca se permite cotizar por debajo del costo operativo.</span></div></div>
<div class="field full"><label>Alcance</label><textarea name="scope" id="qScope" rows="4"></textarea></div><div class="field full form-actions"><button type="button" class="secondary-btn" data-action="quoteReset">Restablecer</button><button class="primary-btn">Registrar cotización</button></div></form></div><aside class="quote-summary"><div class="summary-box"><div class="eyebrow" style="color:#a9b9d4">Resultado comercial</div><h2 id="qServiceName" style="margin:8px 0 18px">—</h2><div class="summary-line"><span>Costo operativo</span><strong id="qCost">S/ 0</strong></div>
<div class="pricing-scenarios">
  <button type="button" class="scenario-card" data-price-strategy="neighborhood"><span>Plan Esencial</span><strong id="qPriceNeighborhood">—</strong><small>Precio mínimo viable</small></button><button type="button" class="scenario-card" data-price-strategy="acquisition"><span>Captación</span><strong id="qPriceAcquisition">—</strong><small>Ganancia mínima</small></button>
  <button type="button" class="scenario-card active" data-price-strategy="launch"><span>Inicio competitivo</span><strong id="qPriceLaunch">—</strong><small>Recomendado</small></button>
  <button type="button" class="scenario-card" data-price-strategy="sustainable"><span>Sostenible</span><strong id="qPriceSustainable">—</strong><small>Mayor respaldo</small></button>
</div>
<div class="summary-line"><span>Precio seleccionado sin IGV</span><strong id="qSubtotal">S/ 0</strong></div>
<div class="summary-line"><span>Ganancia estimada</span><strong id="qProfit">S/ 0</strong></div>
<div class="summary-line"><span>Margen aplicado</span><strong id="qAppliedMargin">0%</strong></div><div class="summary-line"><span>IGV</span><strong id="qIgv">S/ 0</strong></div><div class="summary-line"><span>Tiempo teórico</span><strong id="qTimeTheory">—</strong></div><div class="summary-line"><span>Tiempo operativo estimado</span><strong id="qTimeOperational">—</strong></div><div class="summary-line"><span>Jornadas requeridas</span><strong id="qWorkdays">—</strong></div><div class="summary-line"><span>Operarios mínimos para el plazo</span><strong id="qRequiredOperators">—</strong></div><div class="plan-status" id="qPlanStatus"></div><div class="summary-total"><span>Total</span><strong id="qTotal">S/ 0</strong></div><div class="price-meter"><span style="width:65%"></span></div><div id="qCompetitive" style="font-size:12px;margin-top:10px;color:#cbd5e1"></div></div><div class="card card-pad" style="margin-top:14px"><h3 style="margin-top:0">Desglose de costos</h3><div id="qBreakdown"></div><p style="font-size:11px;color:var(--muted)">La banda competitiva es configurable y orientativa; debe validarse con alcance, ciudad, riesgos y condiciones reales.</p></div></aside></div>`;const quoteForm=$('#quoteForm');
    let quoteCalcTimer;
    const scheduleQuoteCalc=()=>{clearTimeout(quoteCalcTimer);quoteCalcTimer=setTimeout(()=>quoteCalc(),30)};
    quoteForm.addEventListener('input',scheduleQuoteCalc);
    quoteForm.addEventListener('change',quoteCalc);
    quoteForm.addEventListener('keyup',scheduleQuoteCalc);
    quoteForm.addEventListener('click',e=>{
      const card=e.target.closest('[data-price-strategy]');
      if(!card)return;
      document.getElementById('qPricingStrategy').value=card.dataset.priceStrategy;
      quoteCalc();
    });
    document.getElementById('qMargin').addEventListener('input',()=>{
      document.getElementById('qPricingStrategy').value='custom';
    });
    quoteForm.onsubmit=e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.target)),calc=quoteCalc(true),client=db.clients.find(x=>x.id===fd.clientId);const year=new Date().getFullYear(),count=db.quotes.filter(x=>x.id.startsWith(`COT-${year}`)).length+1;const quoteRecord={id:`COT-${year}-${String(count).padStart(4,'0')}`,version:1,leadId:pendingQuoteContext?.leadId||'',opportunityId:pendingQuoteContext?.opportunityId||'',clientId:fd.clientId,client:client?.business||'',date:today(),expires:new Date(Date.now()+db.settings.validDays*86400000).toISOString().slice(0,10),service:fd.service,quantity:Number(fd.quantity),cost:calc.cost,subtotal:calc.subtotal,igv:calc.igv,total:calc.total,status:'Borrador',margin:calc.appliedMargin,pricingStrategy:fd.pricingStrategy,clientSegment:fd.clientSegment,businessType:fd.businessType,companyStage:fd.companyStage,recurrence:fd.recurrence,strategicValue:fd.strategicValue,commercialMode:fd.commercialMode,grossProfit:calc.grossProfit,estimatedHours:calc.operationalHours,estimatedWorkdays:calc.estimatedWorkdays,secondsPerProduct:calc.secondsPerProduct,productivePeople:calc.productivePeople,days:Number(fd.days),operators:Number(fd.operators),supervisors:Number(fd.supervisors),coordinators:Number(fd.coordinators),pdas:Number(fd.pdas),shift:fd.shift,complexity:fd.complexity,urgency:fd.urgency,sites:Number(fd.sites),workdayHours:Number(fd.workdayHours),operationalEfficiencyPct:Number(fd.operationalEfficiencyPct),requiredOperators:calc.requiredOperators,scope:fd.scope||db.services.find(s=>s.id===fd.service)?.scope,items:[{description:db.services.find(s=>s.id===fd.service)?.name,qty:1,price:calc.subtotal}]};db.quotes.push(quoteRecord);const opportunity=db.opportunities.find(o=>o.id===quoteRecord.opportunityId);if(opportunity){opportunity.stage='Cotizado';opportunity.probability=60;opportunity.amount=quoteRecord.subtotal;opportunity.quoteId=quoteRecord.id;opportunity.nextAction='Dar seguimiento a la propuesta';opportunity.updated=new Date().toISOString()}const lead=db.leads.find(l=>l.id===quoteRecord.leadId);if(lead){lead.status='Convertido';lead.quoteId=quoteRecord.id}pendingQuoteContext=null;save('Cotización registrada y flujo actualizado');setView('quoteHistory')};quoteCalc();}
  function quoteCalc(returnOnly=false){
    const form=$('#quoteForm');
    if(!form)return;
    const read=(id,fallback='')=>document.getElementById(id)?.value ?? fallback;
    const f={
      clientId: form.elements.clientId?.value || '',
      clientSegment: read('qClientSegment','small'),
      businessType: read('qBusinessType','farmacia'),
      companyStage: read('qCompanyStage','launch'),
      recurrence: read('qRecurrence','medium'),
      strategicValue: read('qStrategicValue','normal'),
      commercialMode: read('qCommercialMode','launch'),
      minimumServiceHours: 3,
      pricingStrategy: read('qPricingStrategy','launch'),
      service: read('qService','SER-001'),
      quantity: Number(read('qQuantity',0)),
      days: Number(read('qDays',1)),
      operators: Number(read('qOperators',1)),
      secondsPerProduct: Number(read('qSecondsPerProduct',1)),
      operationalEfficiencyPct: Number(read('qEfficiency',75)),
      workdayHours: Number(read('qWorkdayHours',8)),
      supervisors: Number(read('qSupervisors',0)),
      coordinators: Number(read('qCoordinators',0)),
      pdas: Number(read('qPdas',0)),
      shift: read('qShift','Diurno'),
      complexity: read('qComplexity','Media'),
      urgency: read('qUrgency','Normal'),
      sites: Number(read('qSites',1)),
      mobility: Number(form.elements.mobility?.value || 0),
      food: Number(form.elements.food?.value || 0),
      lodging: Number(form.elements.lodging?.value || 0),
      materials: Number(form.elements.materials?.value || 0),
      other: Number(form.elements.other?.value || 0),
      margin: Number(read('qMargin',db.settings.targetMargin)),
      scope: read('qScope','')
    };
    f.operationalEfficiency=Math.min(1,Math.max(.35,(f.operationalEfficiencyPct||75)/100));
    const s=db.services.find(x=>x.id===f.service)||db.services[0];
    const strategyMargins={
      neighborhood:Number(db.settings.neighborhoodMargin||6),
      acquisition:Number(db.settings.acquisitionMargin||8),
      launch:Number(db.settings.launchMargin||12),
      sustainable:Number(db.settings.sustainableMargin||22),
      premium:Number(db.settings.premiumMargin||32)
    };
    const isNeighborhood=['farmacia','bodega'].includes(f.businessType)&&f.quantity<=3000&&f.sites===1;
    if(isNeighborhood && f.companyStage==='launch' && document.activeElement!==document.getElementById('qPricingStrategy')){
      f.pricingStrategy='neighborhood';
      document.getElementById('qPricingStrategy').value='neighborhood';
      document.getElementById('qCommercialMode').value='neighborhood';
      f.commercialMode='neighborhood';
      if(Number(document.getElementById('qMobility').value)>100) document.getElementById('qMobility').value=80;
      if(Number(document.getElementById('qFood').value)>80) document.getElementById('qFood').value=60;
      if(Number(document.getElementById('qOther').value)>50) document.getElementById('qOther').value=30;
      if(Number(document.getElementById('qPdas').value)>3) document.getElementById('qPdas').value=Math.min(3,f.operators);
      f.mobility=Number(document.getElementById('qMobility').value);
      f.food=Number(document.getElementById('qFood').value);
      f.other=Number(document.getElementById('qOther').value);
      f.pdas=Number(document.getElementById('qPdas').value);
    }
    const strategySelect=document.getElementById('qPricingStrategy');
    const marginInput=document.getElementById('qMargin');
    if(document.activeElement!==marginInput){
      f.margin=strategyMargins[f.pricingStrategy] ?? 18;
      marginInput.value=f.margin;
    }
    const calc=window.AGPPricing.calculate(f,db.settings,s);
    const competitiveness=calc.unit<s.marketMin?'Muy agresivo: revisa que cubra riesgos':calc.unit<=s.marketMax?'Dentro de la banda competitiva':'Precio premium: sustenta alcance y valor';
    if(returnOnly)return calc;

    $('#qServiceName').textContent=s.name;
    if(!$('#qScope').value)$('#qScope').value=s.scope;
    $('#qCost').textContent=money(calc.cost);
    $('#qPriceNeighborhood').textContent=money(calc.scenarios.neighborhood.subtotal);
    $('#qPriceAcquisition').textContent=money(calc.scenarios.acquisition.subtotal);
    $('#qPriceLaunch').textContent=money(calc.scenarios.launch.subtotal);
    $('#qPriceSustainable').textContent=money(calc.scenarios.sustainable.subtotal);
    $('#qSubtotal').textContent=money(calc.subtotal);
    $('#qProfit').textContent=money(calc.grossProfit);
    $('#qAppliedMargin').textContent=calc.appliedMargin.toFixed(1)+'%';
    $('#qIgv').textContent=money(calc.igv);
    document.querySelectorAll('[data-price-strategy]').forEach(btn=>btn.classList.toggle('active',btn.dataset.priceStrategy===f.pricingStrategy));
    $('#qTimeTheory').textContent=formatDuration(calc.theoreticalSeconds);
    $('#qTimeOperational').textContent=formatDuration(calc.operationalHours*3600);
    $('#qWorkdays').textContent=calc.estimatedWorkdays.toFixed(2)+' jornadas';
    $('#qRequiredOperators').textContent=calc.requiredOperators+' operarios';
    $('#qTotal').textContent=money(calc.total);
    const segmentAdvice={
      micro:'Para una bodega o farmacia, prioriza un alcance simple, una sola jornada y precio cerrado.',
      small:'Precio recomendado para ganar experiencia sin regalar el servicio.',
      medium:'Sustenta supervisión, conciliación y reporte para proteger el margen.',
      corporate:'Usa precio sostenible o premium por exigencias, riesgo y tiempos de pago.'
    }[f.clientSegment];
    const strategyAdvice={
      neighborhood:'Precio especial para pequeños comercios y farmacias independientes. Alcance básico, una sede y hasta 3,000 productos.',
      acquisition:'Úsalo solo si obtendrás referencia, recurrencia o acceso a un cliente estratégico.',
      launch:'Recomendado para AGP al iniciar: competitivo, pero mantiene una reserva mínima.',
      sustainable:'Adecuado cuando el alcance incluye más control, supervisión o riesgo.',
      premium:'Para operaciones corporativas, urgentes o con entregables avanzados.'
    }[f.pricingStrategy];
    $('#qCompetitive').innerHTML=`<strong>${strategyAdvice}</strong><br>${segmentAdvice}<br>${money(calc.unit)} por ${s.unit} sin IGV.`;

    const status=$('#qPlanStatus');
    status.className='plan-status '+(calc.planIsFeasible?'is-ok':'is-warning');
    const modalityText=calc.hourlyService?` Modalidad compacta de ${calc.billableHours.toFixed(1)} horas facturables.`:'';
    status.innerHTML=calc.planIsFeasible
      ? `<strong>Plan viable</strong><span>Con ${calc.productivePeople} operarios se cubre aproximadamente ${Math.round(calc.capacityCoverage)}% del volumen en ${calc.plannedDays} jornada(s).${modalityText}</span>`
      : `<strong>Plazo insuficiente</strong><span>Con ${calc.productivePeople} operarios solo se cubriría cerca del ${Math.round(calc.capacityCoverage)}%. Se requieren aproximadamente ${calc.requiredOperators} operarios o ${calc.estimatedWorkdays.toFixed(1)} jornadas.</span>`;

    $('#qBreakdown').innerHTML=[
      ['Personal',calc.labor],
      ['Equipos',calc.equipment],
      ['Logística y otros',calc.direct],
      ['Base por volumen',calc.volume],
      ['Factores operativos',calc.factor]
    ].map(([a,b])=>`<div class="summary-line"><span>${a}</span><strong>${typeof b==='number'&&a!=='Factores operativos'?money(b):Number(b).toFixed(2)+'×'}</strong></div>`).join('');
  }

  function fieldHtml([k,l,t,req]){let input;if(t==='textarea')input=`<textarea name="${k}" rows="3" ${req?'required':''}></textarea>`;else if(t==='select')input=`<select name="${k}">${req.map(v=>`<option>${v}</option>`).join('')}</select>`;else if(t==='client')input=`<select name="${k}">${db.clients.map(c=>`<option value="${c.id}">${esc(c.business)}</option>`).join('')}</select>`;else if(t==='service')input=`<select name="${k}">${db.services.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>`;else if(t==='project')input=`<select name="${k}"><option value="">—</option>${db.projects.map(p=>`<option value="${p.id}">${p.id} · ${esc(p.client)}</option>`).join('')}</select>`;else input=`<input name="${k}" type="${t}" ${req?'required':''}>`;return `<div class="field ${t==='textarea'?'full':''}"><label>${l}</label>${input}</div>`}
  function openForm(type,id){const c=configs[type],r=id?(db[type]||[]).find(x=>x.id===id):null;openModal(`${r?'Editar':'Nuevo'} ${c.title}`,r?'Actualiza los datos del registro':'Completa los campos obligatorios',`<form id="crudForm"><div class="form-grid">${c.fields.map(fieldHtml).join('')}</div><div class="form-actions"><button type="button" class="secondary-btn" data-action="close">Cancelar</button><button class="primary-btn">Guardar</button></div></form>`);if(r)for(const [k,v] of Object.entries(r)){const el=$(`[name="${k}"]`);if(el)el.value=v}$('#crudForm').onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));for(const [k,v] of Object.entries(data))if(['number','amount','rate','probability','progress','costPlan','costReal','incomePlan','incomeReal','subtotal','igv','total'].includes(k))data[k]=Number(v);if(r)Object.assign(r,data,{updated:new Date().toISOString()});else{data.id=uid(c.prefix,db[type]);data.created=today();db[type].push(data)}closePanels();save(`${c.title} guardado`)};}
  function openModal(title,sub,html){$('#modalTitle').textContent=title;$('#modalSubtitle').textContent=sub||'';$('#modalBody').innerHTML=html;$('#modal').classList.add('show');$('#overlay').classList.add('show')}
  function openDrawer(type,id){const r=(db[type]||[]).find(x=>x.id===id);if(!r)return;$('#drawerTitle').textContent=r.id||r.name||'Detalle';let actions='';if(type==='leads')actions=`<button class="secondary-btn" data-action="edit" data-type="leads" data-id="${r.id}">Editar</button>${!r.linkedClientId?`<button class="primary-btn" data-action="leadToClient" data-id="${r.id}">Convertir en cliente</button>`:`<button class="primary-btn" data-action="startQuote" data-client-id="${r.linkedClientId}" data-lead-id="${r.id}">Crear cotización</button>`}<button class="danger-btn" data-action="delete" data-type="leads" data-id="${r.id}">Eliminar</button>`;else if(type==='opportunities')actions=`<button class="secondary-btn" data-action="opportunityNext" data-id="${r.id}">Siguiente etapa</button><button class="primary-btn" data-action="startQuote" data-client-id="${r.clientId}" data-opportunity-id="${r.id}">Crear cotización</button><button class="danger-btn" data-action="delete" data-type="opportunities" data-id="${r.id}">Eliminar</button>`;else if(type==='quotes')actions=`<button class="secondary-btn" data-action="pdfOptions" data-id="${r.id}">Generar PDF</button>${r.status==='Borrador'?`<button class="secondary-btn" data-action="quoteStatus" data-status="Enviada" data-id="${r.id}">Marcar enviada</button>`:''}${['Borrador','Enviada'].includes(r.status)?`<button class="primary-btn" data-action="quoteStatus" data-status="Aceptada" data-id="${r.id}">Aceptar</button><button class="danger-btn" data-action="quoteStatus" data-status="Rechazada" data-id="${r.id}">Rechazar</button>`:''}${r.status==='Aceptada'&&!db.projects.some(p=>p.quoteId===r.id)?`<button class="primary-btn" data-action="quoteProject" data-id="${r.id}">Crear proyecto</button>`:''}<button class="danger-btn" data-action="delete" data-type="quotes" data-id="${r.id}">Eliminar</button>`;else if(type==='projects')actions=`${!['Completado','Anulado'].includes(r.status)?`<button class="secondary-btn" data-action="projectAdvance" data-id="${r.id}">Avanzar etapa</button><button class="primary-btn" data-action="projectClose" data-id="${r.id}">Cerrar proyecto</button>`:''}<button class="danger-btn" data-action="delete" data-type="projects" data-id="${r.id}">Eliminar</button>`;else actions=`<button class="secondary-btn" data-action="edit" data-type="${type}" data-id="${r.id}">Editar</button><button class="danger-btn" data-action="delete" data-type="${type}" data-id="${r.id}">Eliminar registro</button>`;$('#drawerBody').innerHTML=`${['leads','clients','opportunities','quotes','projects'].includes(type)?workflowBar(workflowStepFor(type,r)):''}<div class="detail-grid">${Object.entries(r).filter(([,v])=>typeof v!=='object').map(([k,v])=>`<div class="detail-item"><span>${k.replace(/([A-Z])/g,' $1')}</span><strong>${displayValue(k,v)}</strong></div>`).join('')}</div><div class="form-actions">${actions}</div>`;$('#drawer').classList.add('show');$('#overlay').classList.add('show')}

  function closePanels(){
    $('#modal').classList.remove('show');
    $('#drawer').classList.remove('show');
    $('#sidebar').classList.remove('show');
    $('#overlay').classList.remove('show');
  }
  function archive(type,id){const r=db[type].find(x=>x.id===id);if(!r)return;if(confirm('¿Anular o archivar este registro? Se conservará para trazabilidad.')){r.status='Anulado';r.updated=new Date().toISOString();save('Registro anulado')}}
  function deleteRecord(type,id){
    const collection=db[type];
    if(!Array.isArray(collection))return;
    const record=collection.find(x=>x.id===id);
    if(!record)return;
    const label=record.business||record.company||record.client||record.name||record.id;
    if(!confirm(`¿Eliminar definitivamente “${label}”?\n\nEsta acción borrará el registro y no se puede deshacer.`))return;
    db[type]=collection.filter(x=>x.id!==id);
    closePanels();
    save('Registro eliminado definitivamente');
  }

  function convertLeadToClient(id){const lead=db.leads.find(x=>x.id===id);if(!lead)return;if(lead.linkedClientId){toast('Este lead ya fue convertido');setView('clients');return}const existing=db.clients.find(c=>(lead.email&&c.email&&c.email.toLowerCase()===lead.email.toLowerCase())||(lead.phone&&c.phone===lead.phone)||(lead.company&&c.business&&c.business.toLowerCase()===lead.company.toLowerCase()));const client=existing||{id:uid('CLI',db.clients),business:lead.company||'Cliente sin razón social',trade:lead.company||'',ruc:'',sector:lead.diagnosis?.businessType||'',city:'Lima',contact:lead.contact||'',phone:lead.phone||'',email:lead.email||'',status:'Prospecto',origin:lead.origin||'Web',created:today(),notes:`Convertido desde ${lead.id}. ${lead.notes||''}`};if(!existing)db.clients.push(client);lead.linkedClientId=client.id;lead.status='Convertido';lead.convertedAt=new Date().toISOString();let opp=db.opportunities.find(o=>o.leadId===lead.id);if(!opp){opp={id:uid('OPO',db.opportunities),leadId:lead.id,clientId:client.id,service:lead.service||'SER-001',stage:'Diagnóstico',probability:35,amount:0,close:lead.next||today(),owner:lead.owner||'Sin asignar',nextAction:'Preparar cotización',notes:`Creada desde ${lead.id}`};db.opportunities.push(opp)}lead.opportunityId=opp.id;closePanels();save('Lead convertido en cliente y oportunidad');setView('clients')}
  function setLeadStatus(id,status){const r=db.leads.find(x=>x.id===id);if(!r)return;r.status=status;r.updated=new Date().toISOString();save(`Lead marcado como ${status}`)}
  function advanceOpportunity(id){const r=db.opportunities.find(x=>x.id===id);if(!r)return;const s=['Nuevo','Contactado','Diagnóstico','Cotizado','Negociación','Ganado'],i=Math.max(0,s.indexOf(r.stage));r.stage=s[Math.min(s.length-1,i+1)];r.probability={Nuevo:10,Contactado:20,Diagnóstico:35,Cotizado:60,Negociación:80,Ganado:100}[r.stage]||r.probability;r.updated=new Date().toISOString();save(`Oportunidad movida a ${r.stage}`)}
  function startQuote(clientId,opportunityId=null,leadId=null){const client=db.clients.find(x=>x.id===clientId);if(!client){toast('Primero convierte el lead en cliente');return}pendingQuoteContext={clientId,opportunityId,leadId};setView('quotes');requestAnimationFrame(()=>{const form=$('#quoteForm');if(!form)return;form.elements.clientId.value=clientId;const o=db.opportunities.find(x=>x.id===opportunityId),l=db.leads.find(x=>x.id===leadId)||db.leads.find(x=>x.linkedClientId===clientId);if(o?.service)form.elements.service.value=o.service;if(l?.service)form.elements.service.value=l.service;if(l?.diagnosis?.quantity)form.elements.quantity.value=l.diagnosis.quantity;if(l?.diagnosis?.sites)form.elements.sites.value=l.diagnosis.sites;if(l?.diagnosis?.complexity)form.elements.complexity.value=l.diagnosis.complexity;form.dispatchEvent(new Event('change',{bubbles:true}));toast(`Cotización iniciada para ${client.business}`)})}
  function setQuoteStatus(id,status){const q=db.quotes.find(x=>x.id===id);if(!q)return;q.status=status;q.updated=new Date().toISOString();const o=db.opportunities.find(x=>x.id===q.opportunityId||x.quoteId===q.id);if(o){if(status==='Enviada'){o.stage='Cotizado';o.probability=60}if(status==='Aceptada'){o.stage='Ganado';o.probability=100}if(status==='Rechazada'){o.stage='Perdido';o.probability=0}o.amount=q.subtotal;o.quoteId=q.id;o.updated=new Date().toISOString()}save(`Cotización marcada como ${status}`)}
  function advanceProject(id){const p=db.projects.find(x=>x.id===id);if(!p)return;const s=['Planificación','Preparación','En ejecución','Validación','Completado'],i=Math.max(0,s.indexOf(p.status));p.status=s[Math.min(s.length-1,i+1)];p.progress={Planificación:10,Preparación:25,'En ejecución':60,Validación:85,Completado:100}[p.status]||p.progress;p.updated=new Date().toISOString();save(`Proyecto movido a ${p.status}`)}
  function closeProject(id){const p=db.projects.find(x=>x.id===id);if(!p||!confirm('¿Cerrar este proyecto como completado?'))return;p.status='Completado';p.progress=100;p.incomeReal=p.incomeReal||p.incomePlan||0;p.closedAt=new Date().toISOString();const q=db.quotes.find(x=>x.id===p.quoteId);if(q){q.status='Aceptada';q.projectId=p.id}const o=db.opportunities.find(x=>x.quoteId===p.quoteId);if(o){o.stage='Ganado';o.probability=100;o.projectId=p.id}save('Proyecto cerrado correctamente')}
  function quoteToProject(id){const q=db.quotes.find(x=>x.id===id);if(!q||db.projects.some(p=>p.quoteId===id)){toast('La cotización ya tiene proyecto');return}if(q.status!=='Aceptada'&&!confirm('La cotización aún no figura como aceptada. ¿Marcarla como aceptada y crear el proyecto?'))return;const project={id:`PRO-${new Date().getFullYear()}-${String(db.projects.length+1).padStart(4,'0')}`,quoteId:q.id,clientId:q.clientId,opportunityId:q.opportunityId||'',client:q.client,service:db.services.find(s=>s.id===q.service)?.name||q.service,start:today(),end:today(),status:'Planificación',owner:'Augusto',costPlan:q.cost,costReal:0,incomePlan:q.subtotal,incomeReal:0,progress:10,notes:'Creado desde cotización'};db.projects.push(project);q.status='Aceptada';q.projectId=project.id;const o=db.opportunities.find(x=>x.id===q.opportunityId||x.quoteId===q.id);if(o){o.stage='Ganado';o.probability=100;o.projectId=project.id}closePanels();save('Proyecto creado desde la cotización');setView('projects')}

  function exportCsv(type){const arr=db[type]||[];if(!arr.length)return toast('No hay datos');const keys=[...new Set(arr.flatMap(Object.keys))].filter(k=>typeof arr[0][k]!=='object'),csv=[keys.join(','),...arr.map(r=>keys.map(k=>`"${String(r[k]??'').replace(/"/g,'""')}"`).join(','))].join('\n');download(`${type}.csv`,new Blob(['\ufeff'+csv],{type:'text/csv'}))}
  function download(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  function backup(){openModal('Datos y respaldo','Exporta, importa o restablece la aplicación',`<div class="grid"><button class="primary-btn" data-action="backupExport">Exportar respaldo JSON</button><button class="secondary-btn" data-action="backupImport">Importar respaldo JSON</button><button class="danger-btn" data-action="resetData">Restablecer datos demo</button><p style="color:var(--muted);font-size:12px">Esta edición guarda los datos en el navegador actual. Para trabajo multiusuario se conecta posteriormente a Firebase.</p></div>`)}
  function serviceForm(id){const r=id?db.services.find(x=>x.id===id):null;openModal(`${r?'Editar':'Nuevo'} servicio`,'Configura la lógica base del cotizador',`<form id="serviceForm"><div class="form-grid">${[['name','Nombre','text'],['unit','Unidad','text'],['base','Tarifa base por unidad','number'],['min','Precio mínimo del servicio','number'],['marketMin','Banda referencial mínima','number'],['marketMax','Banda referencial máxima','number'],['scope','Alcance sugerido','textarea']].map(fieldHtml).join('')}</div><div class="form-actions"><button class="primary-btn">Guardar</button></div></form>`);if(r)for(const [k,v] of Object.entries(r)){const el=$(`[name="${k}"]`);if(el)el.value=v}$('#serviceForm').onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));['base','min','marketMin','marketMax'].forEach(k=>d[k]=Number(d[k]));if(r)Object.assign(r,d);else db.services.push({id:`SER-${String(db.services.length+1).padStart(3,'0')}`,...d});closePanels();save('Servicio guardado')}}

  document.addEventListener('click',e=>{const b=e.target.closest('[data-view],[data-action]');if(!b)return;if(b.dataset.view)return setView(b.dataset.view);const a=b.dataset.action,t=b.dataset.type,id=b.dataset.id;if(a==='new')openForm(t);if(a==='edit')openForm(t,id);if(a==='view')openDrawer(t,id);if(a==='archive')archive(t,id);if(a==='delete')deleteRecord(t,id);if(a==='pdfOptions')pdfOptions(id);if(a==='pdfGenerate')printQuote(id,b.dataset.template||'premium');if(a==='quoteProject')quoteToProject(id);if(a==='leadStatus')setLeadStatus(id,b.dataset.status);if(a==='leadToClient')convertLeadToClient(id);if(a==='opportunityNext')advanceOpportunity(id);if(a==='startQuote')startQuote(b.dataset.clientId,b.dataset.opportunityId||null,b.dataset.leadId||null);if(a==='quoteStatus')setQuoteStatus(id,b.dataset.status);if(a==='projectAdvance')advanceProject(id);if(a==='projectClose')closeProject(id);if(a==='close')closePanels();if(a==='backup')backup();if(a==='exportCsv')exportCsv(t);if(a==='serviceNew')serviceForm();if(a==='serviceEdit')serviceForm(id);if(a==='backupExport')download(`AGP_ERP_respaldo_${today()}.json`,new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));if(a==='backupImport')$('#importFile').click();if(a==='resetData'&&confirm('¿Restablecer todos los datos?')){db=structuredClone(initial);save('Datos restablecidos');closePanels()}if(a==='quoteReset')renderQuoteBuilder()});
  $('#importFile').onchange=async e=>{try{db=JSON.parse(await e.target.files[0].text());save('Respaldo importado');closePanels()}catch{toast('Archivo no válido')}};
  $('#quickAddBtn').onclick=()=>view==='quotes'?$('#quoteForm')?.scrollIntoView():openForm(view==='dashboard'?'clients':view==='quoteHistory'?'quotes':view==='finance'?'movements':view);
  $('#menuBtn').onclick=()=>{
    const opening=!$('#sidebar').classList.contains('show');
    closePanels();
    $('#sidebar').classList.toggle('show',opening);
    $('#overlay').classList.toggle('show',opening);
  };
  $('#closeModal').onclick=closePanels;
  $('#closeDrawer').onclick=closePanels;
  $('#overlay').onclick=closePanels;
  $('#themeBtn').onclick=()=>{const dark=document.documentElement.dataset.theme==='dark';document.documentElement.dataset.theme=dark?'light':'dark';localStorage.setItem(SETTINGS,dark?'light':'dark')};document.documentElement.dataset.theme=localStorage.getItem(SETTINGS)||'light';
  
  if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));

  function mergeRemote(remote){
    if(!remote || typeof remote!=='object') return;
    db={...structuredClone(initial),...remote};
    cacheLocal();
    cloudHydrated=true;
    const status=document.getElementById('cloudStatus');
    if(status)status.textContent='v2.0 · Firebase conectado';
    renderNav();
    render();
  }

  function normalizePublicLead(item){
    const generatedId=`LEA-WEB-${String(item.firestoreId||Date.now()).slice(0,10).toUpperCase()}`;
    return {
      id:generatedId,
      date:item.date||today(),
      company:item.company||'Sin empresa',
      contact:item.contact||'Sin contacto',
      phone:item.phone||'',
      email:item.email||'',
      service:item.service||'SER-001',
      origin:'Diagnóstico web',
      status:'Nuevo',
      owner:'Sin asignar',
      next:today(),
      notes:item.notes||'Solicitud recibida desde AGP Web',
      diagnosis:item.diagnosis||item,
      firestoreSourceId:item.firestoreId
    };
  }

  async function initializeFirebaseSync(){
    if(!window.AGPCloud)return;
    const status=document.getElementById('cloudStatus');
    if(status)status.textContent='v2.0 · Sincronizando…';

    window.AGPCloud.subscribeWorkspace(remote=>{
      if(remote){
        mergeRemote(remote);
      }else if(!cloudHydrated){
        cloudHydrated=true;
        window.AGPCloud.saveWorkspace(db).then(()=>{
          if(status)status.textContent='v2.0 · Firebase conectado';
          toast('Base inicial sincronizada con Firebase');
        }).catch(error=>{
          console.error(error);
          if(status)status.textContent='v2.0 · Error de sincronización';
        });
      }
    },error=>{
      console.error(error);
      if(status)status.textContent='v2.0 · Sin conexión a Firestore';
      toast('No se pudo leer Firestore');
    });

    window.AGPCloud.subscribePublicLeads(async publicLeads=>{
      let imported=0;
      for(const item of publicLeads){
        const alreadyExists=db.leads.some(lead=>lead.firestoreSourceId===item.firestoreId);
        if(alreadyExists)continue;
        db.leads.unshift(normalizePublicLead(item));
        imported++;
      }
      if(imported){
        cacheLocal();
        render();
        try{
          await window.AGPCloud.saveWorkspace(db);
          for(const item of publicLeads){
            if(db.leads.some(lead=>lead.firestoreSourceId===item.firestoreId)){
              await window.AGPCloud.deletePublicLead(item.firestoreId);
            }
          }
          toast(`${imported} lead(s) recibido(s) desde la web`);
        }catch(error){
          console.error('No se pudieron consolidar los leads:',error);
        }
      }
    });

    document.getElementById('logoutBtn')?.addEventListener('click',async()=>{
      await window.AGPCloud.logout();
      location.replace('login.html');
    });
  }

  renderNav();render();initializeFirebaseSync();
})();
