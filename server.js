import express from 'express';
import {createApp} from './lib/http.js';
import {store} from './lib/store.js';
import {db} from './lib/db.js';
const app=createApp(store(db),{origin:process.env.APP_ORIGIN,password:process.env.ADMIN_PASSWORD,secret:process.env.SESSION_SECRET,vercel:!!process.env.VERCEL});
export default app;
if(!process.env.VERCEL) app.listen(process.env.PORT??3000,()=>console.log('Sorteo disponible en http://localhost:3000'));
