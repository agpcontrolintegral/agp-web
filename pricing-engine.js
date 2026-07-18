(function(){
const defaults={
  igv:18,
  minMargin:10,
  targetMargin:18,
  operatorRate:110,
  supervisorRate:220,
  coordinatorRate:300,
  pdaRate:110,
  acquisitionMargin:10,
  launchMargin:18,
  sustainableMargin:25,
  premiumMargin:32,
  neighborhoodMargin:6,
  launchMargin:12
};
function calculate(i,settings={},service={base:.12,min:950,marketMin:.10,marketMax:.20,unit:'producto'}){
 const s={...defaults,...settings}, n=k=>Number(i[k]||0);
 const complexity={Baja:.95,Media:1.08,Alta:1.22,Crítica:1.4}[i.complexity]||1;
 const shift={Diurno:1,Nocturno:1.18,Mixto:1.1}[i.shift]||1;
 const urgency={Normal:1,Prioritaria:1.08,Urgente:1.18}[i.urgency]||1;
 const sites=1+Math.max(0,n('sites')-1)*.06;
 const neighborhood=i.commercialMode==='neighborhood';
 const hourlyService=neighborhood && n('quantity')<=3000 && n('sites')===1;
 const billableHours=hourlyService?Math.max(3,Number(i.minimumServiceHours||3),Number(i.operationalHoursOverride||0)):Math.max(1,n('days'))*8;
 const laborDaily=n('operators')*s.operatorRate+n('supervisors')*s.supervisorRate+n('coordinators')*s.coordinatorRate;
 const labor=hourlyService?(laborDaily/8)*billableHours: laborDaily*Math.max(1,n('days'));
 const equipment=hourlyService?n('pdas')*(s.pdaRate/8)*billableHours:n('pdas')*s.pdaRate*Math.max(1,n('days'));
 const direct=n('mobility')+n('food')+n('lodging')+n('materials')+n('other');
 const neighborhoodDiscount=hourlyService?.78:1;
 const volume=Math.max(Number(service.min||0),n('quantity')*Number(service.base||0));
 const raw=hourlyService?Math.max(220,(labor+equipment+direct)*neighborhoodDiscount):Math.max(volume,labor+equipment+direct);
 const cost=raw*complexity*shift*urgency*sites;
 const requestedMargin=Math.max(0,n('margin')||Number(s.targetMargin||0));
 const minimumMargin=Math.max(0,Number(s.minMargin||10));
 const appliedMargin=Math.max(minimumMargin,requestedMargin);
 const margin=appliedMargin/100;
 const subtotal=cost/(1-margin), igv=subtotal*Number(s.igv||18)/100, total=subtotal+igv, unit=subtotal/Math.max(1,n('quantity'));
 const makePrice=(marginPct)=>{
   const pct=Math.max(minimumMargin,Number(marginPct||minimumMargin))/100;
   const price=cost/(1-pct);
   return {
     marginPct:pct*100,
     subtotal:price,
     igv:price*Number(s.igv||18)/100,
     total:price*(1+Number(s.igv||18)/100),
     profit:price-cost,
     unit:price/Math.max(1,n('quantity'))
   };
 };
 const scenarios={
   acquisition:makePrice(s.acquisitionMargin),
   launch:makePrice(s.launchMargin),
   sustainable:makePrice(s.sustainableMargin),
   premium:makePrice(s.premiumMargin),
   neighborhood:makePrice(s.neighborhoodMargin)
 };
 const grossProfit=subtotal-cost;
 const productivePeople=Math.max(1,n('operators'));
 const secondsPerProduct=Math.max(.1,Number(i.secondsPerProduct||1));
 const theoreticalSeconds=n('quantity')*secondsPerProduct/productivePeople;
 const theoreticalHours=theoreticalSeconds/3600;
 const operationalEfficiency=Math.min(1,Math.max(.35,Number(i.operationalEfficiency||.75)));
 const operationalHours=theoreticalHours/operationalEfficiency;
 const workdayHours=Math.max(1,Number(i.workdayHours||8));
 const estimatedWorkdays=operationalHours/workdayHours;
 const plannedDays=Math.max(1,n('days'));
 const requiredOperators=Math.max(1,Math.ceil((n('quantity')*secondsPerProduct)/(operationalEfficiency*3600*workdayHours*plannedDays)));
 const plannedCapacity=productivePeople*operationalEfficiency*3600*workdayHours*plannedDays/secondsPerProduct;
 const capacityCoverage=Math.min(999,plannedCapacity/Math.max(1,n('quantity'))*100);
 const planIsFeasible=productivePeople>=requiredOperators;
 return {cost,subtotal,igv,total,unit,grossProfit,hourlyService,billableHours,requestedMargin,appliedMargin,minimumMargin,scenarios,labor,equipment,direct,volume,factor:complexity*shift*urgency*sites,theoreticalSeconds,theoreticalHours,operationalHours,estimatedWorkdays,productivePeople,secondsPerProduct,operationalEfficiency,workdayHours,plannedDays,requiredOperators,plannedCapacity,capacityCoverage,planIsFeasible};
}
function inferPublic({quantity=3000,sites=1,shift='Diurno',complexity='Media',service='SER-001'}){
 const q=Number(quantity),days=Math.max(1,Math.ceil(q/8000)),operators=Math.max(2,Math.ceil(q/(3500*days))),supervisors=Math.max(1,Math.ceil(operators/8)),coordinators=sites>=4?1:0,pdas=operators+supervisors;
 const catalog={
 'SER-001':{base:.12,min:950,marketMin:.10,marketMax:.20,unit:'producto',name:'Inventario físico de mercadería'},
 'SER-002':{base:.18,min:1400,marketMin:.15,marketMax:.28,unit:'producto',name:'Auditoría de inventarios'},
 'SER-003':{base:.65,min:1800,marketMin:.50,marketMax:1.10,unit:'activo',name:'Inventario de activos fijos'}
 };
 const input={quantity:q,sites,shift,complexity,urgency:'Normal',days,operators,supervisors,coordinators,pdas,mobility:300*sites,food:(operators+supervisors+coordinators)*25*days,lodging:0,materials:0,other:100,margin:18};
 return {...calculate(input,{},catalog[service]),...input,serviceData:catalog[service]};
}
window.AGPPricing={calculate,inferPublic};
})();