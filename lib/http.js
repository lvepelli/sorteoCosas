import express from 'express';
import helmet from 'helmet';
import {createHmac,timingSafeEqual,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {fail,publicState,csv} from './core.js';
const equal=(a,b)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
export function createApp(store,config) {
 const app=express(); app.disable('x-powered-by');
 app.use(helmet({contentSecurityPolicy:{directives:{'script-src':["'self'"],'style-src':["'self'"],'img-src':["'self'",'data:']}}}));
 app.use(express.json({limit:'48kb'}));
 const sign=value=>createHmac('sha256',config.secret).update(value).digest('hex');
 const authorized=req=>{
   const cookie=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('admin='))?.slice(6)??'';
   const [expires,signature]=cookie.split('.');
   return signature&&/^\d+$/.test(expires)&&Number(expires)>Date.now()&&equal(signature,sign(expires));
 };
 app.use('/api',(req,res,next)=>{
   res.set('Cache-Control','no-store');
   if(!config.origin||typeof config.password!=='string'||config.password.length<16||typeof config.secret!=='string'||config.secret.length<32) return res.status(503).json({error:'La organización está preparando el sorteo. Vuelve más tarde.'});
   if(req.method!=='GET'&&req.headers.origin!==config.origin) return res.status(403).json({error:'Origen no permitido.'});
   next();
 });
 const identity=req=>createHmac('sha256',config.secret).update(config.vercel?(req.headers['x-vercel-forwarded-for']??'unknown'):req.socket.remoteAddress??'unknown').digest('hex');
 app.get('/api/state',async(req,res)=>res.json(publicState(await store.read())));
 app.get('/api/results.csv',async(req,res)=>res.type('text/csv').attachment('resultados.csv').send(csv(publicState(await store.read()))));
 app.post('/api/register',async(req,res)=>{
   await store.limit('register:'+identity(req),60);
   if(req.body?.consent!==true) fail('Confirma las condiciones de participación.');
   await store.act('register',req.body); res.status(201).json({ok:true});
 });
 app.post('/api/login',async(req,res)=>{
   await store.limit('login:'+identity(req),10);
   if(typeof req.body?.password!=='string'||!equal(req.body.password,config.password)) fail('Contraseña incorrecta.',401);
   const expires=String(Date.now()+8*3600000);
   res.cookie('admin',expires+'.'+sign(expires),{httpOnly:true,secure:config.origin.startsWith('https:'),sameSite:'strict',path:'/',maxAge:8*3600000});res.json({ok:true});
 });
 app.post('/api/logout',(req,res)=>{res.clearCookie('admin',{path:'/'});res.json({ok:true});});
 app.use('/api/admin',(req,res,next)=>authorized(req)?next():res.status(401).json({error:'Inicia sesión para administrar el sorteo.'}));
 app.get('/api/admin',async(req,res)=>{const s=await store.read();res.json({...publicState(s),people:s.people.map(p=>({name:p.name}))});});
 app.post('/api/admin/:action',async(req,res)=>{
   if(!['items','close','start'].includes(req.params.action)) fail('Acción desconocida.',404);
   res.json(publicState(await store.act(req.params.action,req.body)));
 });
 app.use(express.static(fileURLToPath(new URL('../public',import.meta.url))));
 app.use((error,req,res,next)=>{if(!error.status) console.error('Request failed:',error.code??error.name);res.status(error.status??500).json({error:error.status?error.message:'No se pudo completar la operación. Inténtalo de nuevo.'});});
 return app;
}
