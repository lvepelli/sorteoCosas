import {db} from './db.js';
import {init} from './store.js';
try{await init(db);console.log('Base de datos preparada.');}finally{await db.close();}
