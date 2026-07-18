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
  let db=load(), view='dashboard', query='', cloudHydrated=false, cloudSaving=false;
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
  function renderTable(type){const c=configs[type],arr=db[type]||[],filtered=arr.filter(r=>JSON.stringify(r).toLowerCase().includes(query.toLowerCase()));$('#content').innerHTML=`<div class="toolbar"><div class="search"><input id="searchInput" placeholder="Buscar en ${c.title.toLowerCase()}..." value="${esc(query)}"></div><button class="secondary-btn" data-action="exportCsv" data-type="${type}">Exportar CSV</button>${type==='quotes'?'<button class="primary-btn" data-view="quotes">＋ Nueva cotización</button>':`<button class="primary-btn" data-action="new" data-type="${type}">＋ Nuevo</button>`}</div><div class="card"><div class="table-wrap"><table class="data-table"><thead><tr>${c.cols.map(x=>`<th>${x[1]}</th>`).join('')}<th>Acciones</th></tr></thead><tbody>${filtered.map(r=>`<tr>${c.cols.map(([k])=>`<td>${['status','stage','priority','severity'].includes(k)?`<span class="badge ${statusClass(r[k])}">${displayValue(k,r[k])}</span>`:displayValue(k,r[k])}</td>`).join('')}<td><div class="row-actions"><button class="mini-btn" data-action="view" data-type="${type}" data-id="${r.id}">Ver</button>${type==='quotes'?`<button class="mini-btn" data-action="pdfOptions" data-id="${r.id}">PDF</button>`:`<button class="mini-btn" data-action="edit" data-type="${type}" data-id="${r.id}">Editar</button>`}<button class="mini-btn" data-action="archive" data-type="${type}" data-id="${r.id}">Anular</button><button class="mini-btn danger" data-action="delete" data-type="${type}" data-id="${r.id}">Eliminar</button></div></td></tr>`).join('')||`<tr><td colspan="${c.cols.length+1}" class="empty">No hay registros</td></tr>`}</tbody></table></div></div>`; $('#searchInput')?.addEventListener('input',e=>{query=e.target.value;renderTable(type)});}
  function renderProjects(){renderTableCustom('projects',{title:'Proyecto',cols:[['id','Proyecto'],['client','Cliente'],['service','Servicio'],['status','Estado'],['progress','Avance'],['incomePlan','Ingreso plan']],fields:[['quoteId','Cotización','text'],['client','Cliente','text',1],['service','Servicio','text'],['start','Inicio','date'],['end','Fin plan','date'],['status','Estado','select',['Planificación','Preparación','En ejecución','Pausado','Completado','Anulado']],['owner','Responsable','text'],['costPlan','Costo plan','number'],['costReal','Costo real','number'],['incomePlan','Ingreso plan','number'],['incomeReal','Ingreso real','number'],['progress','Avance %','number'],['notes','Observaciones','textarea']]});}
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
    quoteForm.onsubmit=e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.target)),calc=quoteCalc(true),client=db.clients.find(x=>x.id===fd.clientId);const year=new Date().getFullYear(),count=db.quotes.filter(x=>x.id.startsWith(`COT-${year}`)).length+1;db.quotes.push({id:`COT-${year}-${String(count).padStart(4,'0')}`,version:1,clientId:fd.clientId,client:client?.business||'',date:today(),expires:new Date(Date.now()+db.settings.validDays*86400000).toISOString().slice(0,10),service:fd.service,quantity:Number(fd.quantity),cost:calc.cost,subtotal:calc.subtotal,igv:calc.igv,total:calc.total,status:'Borrador',margin:calc.appliedMargin,pricingStrategy:fd.pricingStrategy,clientSegment:fd.clientSegment,businessType:fd.businessType,companyStage:fd.companyStage,recurrence:fd.recurrence,strategicValue:fd.strategicValue,commercialMode:fd.commercialMode,grossProfit:calc.grossProfit,estimatedHours:calc.operationalHours,estimatedWorkdays:calc.estimatedWorkdays,secondsPerProduct:calc.secondsPerProduct,productivePeople:calc.productivePeople,days:Number(fd.days),operators:Number(fd.operators),supervisors:Number(fd.supervisors),coordinators:Number(fd.coordinators),pdas:Number(fd.pdas),shift:fd.shift,complexity:fd.complexity,urgency:fd.urgency,sites:Number(fd.sites),workdayHours:Number(fd.workdayHours),operationalEfficiencyPct:Number(fd.operationalEfficiencyPct),requiredOperators:calc.requiredOperators,scope:fd.scope||db.services.find(s=>s.id===fd.service)?.scope,items:[{description:db.services.find(s=>s.id===fd.service)?.name,qty:1,price:calc.subtotal}]});save('Cotización registrada');setView('quoteHistory')};quoteCalc();}
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
  function openDrawer(type,id){const r=(db[type]||[]).find(x=>x.id===id);if(!r)return;$('#drawerTitle').textContent=r.id||r.name||'Detalle';$('#drawerBody').innerHTML=`<div class="detail-grid">${Object.entries(r).filter(([,v])=>typeof v!=='object').map(([k,v])=>`<div class="detail-item"><span>${k.replace(/([A-Z])/g,' $1')}</span><strong>${displayValue(k,v)}</strong></div>`).join('')}</div>${type==='quotes'?`<div class="form-actions"><button class="secondary-btn" data-action="pdfOptions" data-id="${r.id}">Generar PDF</button><button class="primary-btn" data-action="quoteProject" data-id="${r.id}">Convertir en proyecto</button><button class="danger-btn" data-action="delete" data-type="${type}" data-id="${r.id}">Eliminar</button></div>`:`<div class="form-actions"><button class="danger-btn" data-action="delete" data-type="${type}" data-id="${r.id}">Eliminar registro</button></div>`}`;$('#drawer').classList.add('show');$('#overlay').classList.add('show')}
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

  function quoteToProject(id){const q=db.quotes.find(x=>x.id===id);if(!q||db.projects.some(p=>p.quoteId===id)){toast('La cotización ya tiene proyecto');return}db.projects.push({id:`PRO-${new Date().getFullYear()}-${String(db.projects.length+1).padStart(4,'0')}`,quoteId:q.id,client:q.client,service:db.services.find(s=>s.id===q.service)?.name||q.service,start:today(),end:today(),status:'Planificación',owner:'Augusto',costPlan:q.cost,costReal:0,incomePlan:q.subtotal,incomeReal:0,progress:0,notes:'Creado desde cotización'});q.status='Aceptada';closePanels();save('Proyecto creado desde la cotización');setView('projects')}
  function pdfOptions(id){
    const q=db.quotes.find(x=>x.id===id);
    if(!q)return;
    openModal('Generar propuesta comercial','Elige el formato según el tipo de cliente.',`
      <div class="pdf-template-grid">
        <button type="button" class="pdf-template-card recommended" data-action="pdfGenerate" data-id="${q.id}" data-template="premium">
          <span class="pdf-template-tag">Recomendada</span><strong>Premium</strong>
          <small>Propuesta completa con portada, metodología, equipo, inversión y cierre.</small>
        </button>
        <button type="button" class="pdf-template-card" data-action="pdfGenerate" data-id="${q.id}" data-template="corporate">
          <strong>Corporativa</strong><small>Diseño ejecutivo y sobrio para empresas medianas y grandes.</small>
        </button>
        <button type="button" class="pdf-template-card" data-action="pdfGenerate" data-id="${q.id}" data-template="commercial">
          <strong>Comercial</strong><small>Versión más corta y directa para pequeños negocios.</small>
        </button>
      </div>`);
  }

  function printQuote(id,template='premium'){
    const q=db.quotes.find(x=>x.id===id),c=db.clients.find(x=>x.id===q?.clientId);
    if(!q)return;
    const s=db.services.find(x=>x.id===q.service)||{};
    const logo=new URL('logo-agp.svg',location.href).href;
    const corporate=template==='corporate', commercial=template==='commercial';
    const colors=corporate
      ?['#0D1B2A','#FF8A00','#F4F6F8','#08131F']
      :commercial?['#153A5C','#FF8A00','#F5F6F8','#0D1B2A']
      :['#0D1B2A','#FF8A00','#F4F6F8','#08131F'];
    const safe=(v,f='—')=>esc(v===undefined||v===null||v===''?f:v);
    const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
    const service=safe(s.name||q.service,'Servicio profesional');
    const client=safe(q.client,'Cliente');
    const qty=num(q.quantity);
    const days=Math.max(1,num(q.days,Math.ceil(num(q.estimatedWorkdays,1))));
    const operators=Math.max(1,num(q.operators||q.productivePeople,1));
    const supervisors=Math.max(0,num(q.supervisors,1));
    const coordinators=Math.max(0,num(q.coordinators,0));
    const pdas=Math.max(0,num(q.pdas,operators));
    const sites=Math.max(1,num(q.sites,1));
    const mins=Math.round(num(q.estimatedHours)*60);
    const duration=mins>=60?`${Math.floor(mins/60)} h ${mins%60?`${mins%60} min`:''}`:`${mins} min`;
    const scope=safe(q.scope||s.scope);
    const methodologies=[
      ['01','Planeamiento','Validación del alcance, responsables, horarios y condiciones de ejecución.'],
      ['02','Preparación','Organización del equipo, herramientas, base maestra y zonas de trabajo.'],
      ['03','Ejecución','Conteo físico con controles de avance, trazabilidad e incidencias.'],
      ['04','Validación','Revisión de diferencias, reconteos y controles de consistencia.'],
      ['05','Entrega','Consolidación de resultados, informe final y recomendaciones.']
    ];
    const extraPages=commercial?'':`
      <section class="page">
        <header><img src="${logo}"><span>${safe(q.id)}</span></header>
        <div class="kicker">Alcance del servicio</div><h2>Entregables claros y verificables</h2>
        <p class="lead">${scope}</p>
        <div class="deliverables">
          ${['Base consolidada en formato digital','Reporte de diferencias y observaciones','Control de calidad y validación','Informe final del servicio'].map((x,i)=>`<div><b>0${i+1}</b><strong>${x}</strong><small>Incluido dentro del alcance propuesto.</small></div>`).join('')}
        </div>
        <div class="project-grid">
          <div><span>Volumen</span><strong>${qty.toLocaleString('es-PE')} ${safe(s.unit,'ítems')}</strong></div>
          <div><span>Sedes</span><strong>${sites}</strong></div>
          <div><span>Horario</span><strong>${safe(q.shift,'Por coordinar')}</strong></div>
          <div><span>Complejidad</span><strong>${safe(q.complexity,'Media')}</strong></div>
          <div><span>Duración</span><strong>${days} jornada(s)</strong></div>
          <div><span>Tiempo estimado</span><strong>${duration}</strong></div>
        </div><i class="page-no">02</i>
      </section>
      <section class="page">
        <header><img src="${logo}"><span>Metodología AGP</span></header>
        <div class="kicker">Cómo trabajaremos</div><h2>Un proceso organizado y trazable</h2>
        <div class="methodology">${methodologies.map(m=>`<div><b>${m[0]}</b><section><strong>${m[1]}</strong><p>${m[2]}</p></section></div>`).join('')}</div>
        <div class="team">
          <div><span>Operarios</span><strong>${operators}</strong></div>
          <div><span>Supervisores</span><strong>${supervisors}</strong></div>
          <div><span>Coordinadores</span><strong>${coordinators}</strong></div>
          <div><span>Equipos PDA</span><strong>${pdas}</strong></div>
        </div>
        <div class="quality"><strong>Control de calidad</strong><p>Seguimiento del avance, gestión de incidencias y validación previa a la consolidación final.</p></div>
        <i class="page-no">03</i>
      </section>`;
    const finalPage=commercial?'':`
      <section class="page final">
        <div class="watermark">AGP</div><div class="kicker">Siguiente paso</div>
        <h2>Estamos listos para acompañar su operación.</h2>
        <p class="lead">Será un gusto coordinar el alcance final, resolver consultas y programar la ejecución del servicio.</p>
        <div class="contact-card">
          <div><span>Correo</span><strong>${safe(db.settings.email)}</strong></div>
          <div><span>WhatsApp</span><strong>${safe(db.settings.phone)}</strong></div>
          <div><span>Empresa</span><strong>${safe(db.settings.company)}</strong></div>
        </div>
        <div class="signatures"><span>Representante AGP</span><span>Aceptación del cliente</span></div>
        <small class="confidential">Propuesta confidencial preparada exclusivamente para ${client}.</small><i class="page-no">05</i>
      </section>`;

    const html=`<!doctype html><html><head><meta charset="utf-8"><title>${safe(q.id)} - Propuesta</title>
    <style>
      :root{--p:${colors[0]};--a:${colors[1]};--soft:${colors[2]};--cover:${colors[3]}}
      *{box-sizing:border-box}body{margin:0;background:#d8dde2;font-family:Arial,Helvetica,sans-serif;color:#172438;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .page{width:210mm;min-height:297mm;margin:9mm auto;background:#fff;position:relative;padding:18mm;overflow:hidden;page-break-after:always;box-shadow:0 10px 30px #0002}
      .cover{padding:0;background:linear-gradient(145deg,var(--cover),var(--p));color:#fff}
      .cover:after{content:"";position:absolute;width:150mm;height:150mm;border-radius:50%;right:-55mm;top:-40mm;background:radial-gradient(circle,#fff2,transparent 66%)}
      .goldbar{height:7mm;background:var(--a)}.cover-content{min-height:290mm;padding:23mm 20mm;display:flex;flex-direction:column}
      .cover-logo{width:58mm;filter:brightness(0) invert(1);margin-bottom:34mm}.kicker{text-transform:uppercase;letter-spacing:2px;font-size:8pt;font-weight:800;color:var(--a)}
      .cover h1{font-size:34pt;line-height:1.05;margin:7mm 0}.subtitle{font-size:15pt;line-height:1.5;color:#d9e4ed;max-width:150mm}
      .client{margin-top:auto;border-left:3px solid var(--a);padding-left:7mm}.client small,.meta span{display:block;color:#b8c7d4;font-size:8pt;text-transform:uppercase;letter-spacing:1px}.client strong{display:block;font-size:20pt;margin-top:2mm}
      .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:7mm;margin-top:12mm;padding-top:8mm;border-top:1px solid #fff3}.meta strong{display:block;margin-top:2mm;font-size:10pt}
      header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #dce3e8;padding-bottom:6mm;margin-bottom:12mm;font-size:8pt;color:#718091;text-transform:uppercase;letter-spacing:1px}header img{width:42mm}
      h2{font-size:25pt;color:var(--p);line-height:1.12;margin:4mm 0 7mm}.lead{font-size:11.5pt;line-height:1.7;color:#59697a}
      .executive{background:var(--soft);border-left:4px solid var(--a);padding:8mm;border-radius:0 4mm 4mm 0;margin-top:11mm}.executive p{margin-bottom:0;line-height:1.7;color:#586879}
      .highlights{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-top:11mm}.highlights div{border:1px solid #dce3e8;border-radius:4mm;padding:6mm}.highlights span,.project-grid span,.team span,.contact-card span{display:block;font-size:7.5pt;text-transform:uppercase;color:#758496}.highlights strong{display:block;color:var(--p);font-size:14pt;margin-top:2mm}
      .deliverables{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:10mm}.deliverables>div{position:relative;border:1px solid #dce3e8;border-radius:4mm;padding:6mm}.deliverables b{position:absolute;right:5mm;top:4mm;color:#d8e0e6;font-size:18pt}.deliverables strong,.deliverables small{display:block}.deliverables strong{color:var(--p);padding-right:13mm}.deliverables small{font-size:8pt;color:#788697;margin-top:3mm}
      .project-grid,.team{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;background:var(--p);color:#fff;border-radius:5mm;padding:7mm;margin-top:10mm}.project-grid strong,.team strong{display:block;margin-top:2mm;font-size:11pt}.team{grid-template-columns:repeat(4,1fr)}
      .methodology{margin-top:9mm}.methodology>div{display:grid;grid-template-columns:14mm 1fr;gap:5mm;padding:4mm 0;border-bottom:1px solid #e1e7eb}.methodology b{width:11mm;height:11mm;border-radius:50%;display:grid;place-items:center;background:var(--a);color:#fff;font-size:8pt}.methodology strong{color:var(--p)}.methodology p{margin:1.5mm 0 0;color:#687789;font-size:9pt;line-height:1.5}
      .quality{background:var(--soft);padding:6mm;border-radius:4mm;margin-top:8mm}.quality p{font-size:9pt;color:#637284;margin-bottom:0}
      .investment{border:1px solid #dce3e8;border-radius:5mm;overflow:hidden;margin-top:10mm}.money-row{display:flex;justify-content:space-between;padding:5mm 7mm;border-bottom:1px solid #e2e8ec}.money-row span{color:#657487}.total{display:flex;justify-content:space-between;align-items:center;background:var(--p);color:#fff;padding:8mm 7mm}.total strong{font-size:25pt}
      .conditions{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:9mm}.conditions div{background:var(--soft);border-radius:4mm;padding:5mm}.conditions span{display:block;font-size:7.5pt;text-transform:uppercase;color:#728294}.conditions strong{display:block;color:var(--p);font-size:10pt;margin-top:2mm}
      .note{font-size:8pt;color:#768493;line-height:1.5;margin-top:8mm}.final{background:linear-gradient(145deg,#fff,var(--soft))}.watermark{position:absolute;right:15mm;top:10mm;font-size:80pt;font-weight:900;color:#0b20370d}.final h2{font-size:31pt;max-width:155mm;margin-top:18mm}
      .contact-card{display:grid;gap:6mm;background:var(--p);color:#fff;border-radius:6mm;padding:10mm;margin-top:18mm}.contact-card strong{display:block;margin-top:2mm}
      .signatures{display:grid;grid-template-columns:1fr 1fr;gap:15mm;margin-top:35mm}.signatures span{border-top:1px solid #84909c;text-align:center;padding-top:3mm;font-size:8pt;color:#667483}.confidential{position:absolute;left:18mm;bottom:17mm;color:#83909d}
      .page-no{position:absolute;right:18mm;bottom:12mm;font-style:normal;font-size:8pt;color:#9ca7b2}
      @page{size:A4;margin:0}@media print{body{background:#fff}.page{margin:0;box-shadow:none}}
    </style></head><body>
      <section class="page cover"><div class="goldbar"></div><div class="cover-content">
        <img class="cover-logo" src="${logo}"><div class="kicker">Propuesta comercial</div><h1>${service}</h1>
        <div class="subtitle">Solución operativa diseñada para entregar información confiable, organizada y útil para la toma de decisiones.</div>
        <div class="client"><small>Preparado para</small><strong>${client}</strong></div>
        <div class="meta"><div><span>Cotización</span><strong>${safe(q.id)}</strong></div><div><span>Fecha</span><strong>${safe(q.date)}</strong></div><div><span>Vigencia</span><strong>${safe(q.expires)}</strong></div></div>
      </div></section>
      <section class="page"><header><img src="${logo}"><span>Resumen ejecutivo</span></header>
        <div class="kicker">Propuesta para ${client}</div><h2>Control, precisión y resultados claros.</h2>
        <p class="lead">AGP Control Integral agradece la oportunidad de presentar esta propuesta. Hemos preparado una solución considerando el volumen referencial, el equipo requerido y las condiciones operativas informadas.</p>
        <div class="executive"><strong>Objetivo del servicio</strong><p>${scope}</p></div>
        <div class="highlights"><div><span>Volumen</span><strong>${qty.toLocaleString('es-PE')}</strong></div><div><span>Duración</span><strong>${days} jornada(s)</strong></div><div><span>Equipo</span><strong>${operators} persona(s)</strong></div></div><i class="page-no">01</i>
      </section>
      ${extraPages}
      <section class="page"><header><img src="${logo}"><span>Propuesta económica</span></header>
        <div class="kicker">Inversión</div><h2>Propuesta económica</h2>
        <p class="lead">La inversión considera los recursos operativos, equipos y controles necesarios para ejecutar el alcance descrito.</p>
        <div class="investment"><div class="money-row"><span>${service}</span><strong>${money(q.subtotal)}</strong></div><div class="money-row"><span>IGV (${num(db.settings.igv,18)}%)</span><strong>${money(q.igv)}</strong></div><div class="total"><span>Inversión total</span><strong>${money(q.total)}</strong></div></div>
        <div class="conditions"><div><span>Forma de pago</span><strong>50% inicio / 50% entrega</strong></div><div><span>Vigencia</span><strong>Hasta ${safe(q.expires)}</strong></div><div><span>Moneda</span><strong>Soles peruanos</strong></div><div><span>Inicio</span><strong>Sujeto a coordinación</strong></div></div>
        <p class="note">Las actividades o recursos no incluidos expresamente en el alcance serán comunicados y cotizados antes de su ejecución.</p><i class="page-no">${commercial?'02':'04'}</i>
      </section>
      ${finalPage}
      <script>window.onload=()=>setTimeout(()=>window.print(),700)<\/script>
    </body></html>`;
    const w=window.open('','_blank');
    if(!w){alert('Habilita las ventanas emergentes para generar el PDF.');return}
    w.document.open();w.document.write(html);w.document.close();closePanels();
  }

  function exportCsv(type){const arr=db[type]||[];if(!arr.length)return toast('No hay datos');const keys=[...new Set(arr.flatMap(Object.keys))].filter(k=>typeof arr[0][k]!=='object'),csv=[keys.join(','),...arr.map(r=>keys.map(k=>`"${String(r[k]??'').replace(/"/g,'""')}"`).join(','))].join('\n');download(`${type}.csv`,new Blob(['\ufeff'+csv],{type:'text/csv'}))}
  function download(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  function backup(){openModal('Datos y respaldo','Exporta, importa o restablece la aplicación',`<div class="grid"><button class="primary-btn" data-action="backupExport">Exportar respaldo JSON</button><button class="secondary-btn" data-action="backupImport">Importar respaldo JSON</button><button class="danger-btn" data-action="resetData">Restablecer datos demo</button><p style="color:var(--muted);font-size:12px">Esta edición guarda los datos en el navegador actual. Para trabajo multiusuario se conecta posteriormente a Firebase.</p></div>`)}
  function serviceForm(id){const r=id?db.services.find(x=>x.id===id):null;openModal(`${r?'Editar':'Nuevo'} servicio`,'Configura la lógica base del cotizador',`<form id="serviceForm"><div class="form-grid">${[['name','Nombre','text'],['unit','Unidad','text'],['base','Tarifa base por unidad','number'],['min','Precio mínimo del servicio','number'],['marketMin','Banda referencial mínima','number'],['marketMax','Banda referencial máxima','number'],['scope','Alcance sugerido','textarea']].map(fieldHtml).join('')}</div><div class="form-actions"><button class="primary-btn">Guardar</button></div></form>`);if(r)for(const [k,v] of Object.entries(r)){const el=$(`[name="${k}"]`);if(el)el.value=v}$('#serviceForm').onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));['base','min','marketMin','marketMax'].forEach(k=>d[k]=Number(d[k]));if(r)Object.assign(r,d);else db.services.push({id:`SER-${String(db.services.length+1).padStart(3,'0')}`,...d});closePanels();save('Servicio guardado')}}

  document.addEventListener('click',e=>{const b=e.target.closest('[data-view],[data-action]');if(!b)return;if(b.dataset.view)return setView(b.dataset.view);const a=b.dataset.action,t=b.dataset.type,id=b.dataset.id;if(a==='new')openForm(t);if(a==='edit')openForm(t,id);if(a==='view')openDrawer(t,id);if(a==='archive')archive(t,id);if(a==='delete')deleteRecord(t,id);if(a==='pdfOptions')pdfOptions(id);if(a==='pdfGenerate')printQuote(id,b.dataset.template||'premium');if(a==='quoteProject')quoteToProject(id);if(a==='close')closePanels();if(a==='backup')backup();if(a==='exportCsv')exportCsv(t);if(a==='serviceNew')serviceForm();if(a==='serviceEdit')serviceForm(id);if(a==='backupExport')download(`AGP_ERP_respaldo_${today()}.json`,new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));if(a==='backupImport')$('#importFile').click();if(a==='resetData'&&confirm('¿Restablecer todos los datos?')){db=structuredClone(initial);save('Datos restablecidos');closePanels()}if(a==='quoteReset')renderQuoteBuilder()});
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
