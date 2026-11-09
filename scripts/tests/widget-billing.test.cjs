const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const picker=fs.readFileSync('crates/ui/ui/widget-billing-picker.js','utf8');
const context=vm.createContext({});
vm.runInContext(picker.slice(picker.indexOf('function parseAmount('),picker.indexOf('function selectorFor(')),context);
test('Billing picker parses one selected USD amount without guessing between multiple figures',()=>{
 for(const [text,expected]of [['$1,234.56','1234.56'],['USD 1.234,56','1234.56'],['US$ 1 234,50','1234.50'],['-$0.25','-0.25'],['$-0.25','-0.25'],['$0','0.00'],['$1,234','1234.00'],['Credit balance: $12.34','12.34']])assert.equal(context.parseAmount(text),expected,text);
 for(const text of ['$12.34 and $56.78','12.34','€12.34','$NaN','$1e3','$1234567890123.00','$1.23456'])assert.equal(context.parseAmount(text),null,text);
});
test('Billing picker leaves sign-in clicks alone and captures only an explicitly selected amount',()=>{
 class ElementMock{constructor(text=''){this.innerText=text;this.textContent=text;this.style={};this.children=[];this.id=''}append(...values){this.children.push(...values)}attachShadow(){this.shadow=new ElementMock();return this.shadow}getAttribute(){return null}}
 const pageEvents={},windowEvents={},body=new ElementMock(),amount=new ElementMock('$12.34');amount.id='balance';amount.parentElement=body;
 const doc={body,documentElement:new ElementMock(),createElement:()=>new ElementMock(),addEventListener:(name,fn)=>pageEvents[name]=fn,querySelectorAll:s=>s==='#balance'?[amount]:[],querySelector:s=>s==='#balance'?amount:null};
 const win={addEventListener:(name,fn)=>windowEvents[name]=fn};win.top=win;
 const location={protocol:'https:',hostname:'platform.openai.com',pathname:'/settings/organization/billing/overview',origin:'https://platform.openai.com'};
 const c=vm.createContext({window:win,document:doc,Element:ElementMock,CSS:{escape:s=>s},location,config:{provider:'openai',selector:'',nonce:'test-connection',bridgePath:'/__atelier_billing_sample'},setInterval(){},Date,encodeURIComponent});vm.runInContext(picker,c);windowEvents.DOMContentLoaded();
 let intercepted=false;const click=target=>({target,preventDefault(){intercepted=true},stopImmediatePropagation(){}});
 pageEvents.click(click(new ElementMock('Sign in')));assert.equal(intercepted,false);
 const button=body.children[0].shadow.children[0].children[2];button.onclick();pageEvents.click(click(amount));assert.equal(intercepted,true);
 const posted=new URL(location.href);assert.equal(posted.pathname,'/__atelier_billing_sample');const data=JSON.parse(posted.searchParams.get('data'));assert.equal(data.amount,'12.34');assert.equal(data.selector,'#balance');assert.equal(data.nonce,'test-connection');
 intercepted=false;pageEvents.click(click(new ElementMock('Sign in')));assert.equal(intercepted,false);
});
test('prepaid balances use Billing page snapshots and flag stale readings',async()=>{
 const calls=[];const c=vm.createContext({window:{__TAURI__:{core:{invoke:async(name,args)=>{calls.push({name,args});return {amount:'123.45',currency:'USD',sampled_at:1800000000,stale:args.provider==='anthropic'}}}}},location:{search:''},URLSearchParams,URL,Date,Intl,setTimeout,clearTimeout});
 vm.runInContext(fs.readFileSync('crates/ui/ui/widget-metrics.js','utf8'),c);
 let value=await c.window.WidgetMetrics.resolveMetric({id:'ai_openai_balance'},{custom:{metric:'Prepaid balance'}});
 assert.equal(calls[0].name,'widget_billing_snapshot');assert.equal(calls[0].args.provider,'openai');assert.equal(value.title,'OpenAI Billing balance');assert.match(value.value,/123[,.]45/);assert.equal(value.badge,'Billing page');
 value=await c.window.WidgetMetrics.resolveMetric({id:'ai_anthropic_balance'},{custom:{metric:'Prepaid balance'}});assert.equal(value.badge,'Stale reading');assert.equal(value.error,true);
 await assert.rejects(c.window.WidgetMetrics.verifyServiceKey('ai_openai_balance','api-key',{metric:'Prepaid balance'}),/Billing page/);
});
test('Billing page mode requires a selected connection instead of an API key',()=>{
 const source=fs.readFileSync('crates/ui/ui/studio-widgets.js','utf8'),c=vm.createContext({});vm.runInContext(source.slice(source.indexOf('  function widgetAuthInfo('),source.indexOf('  let configs =')),c);
 const entry={id:'ai_openai_balance',fields:[]};
 assert.equal(c.widgetAuthInfo(entry,{custom:{metric:'Prepaid balance',api_key:'admin',credential_verified:true}}).authorized,false);
 const connected=c.widgetAuthInfo(entry,{custom:{metric:'Prepaid balance',billing_verified:true}});assert.equal(connected.authorized,true);assert.equal(connected.provider,'billing');
 const stripe=c.widgetAuthInfo({id:'rev_stripe_mrr',fields:[]},{custom:{auth_mode:'Billing page',billing_verified:true}});assert.equal(stripe.authorized,true);assert.equal(stripe.sourceProvider,'stripe_mrr');
});
