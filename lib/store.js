import { initial, change, fail } from './core.js';
export const schema = `CREATE TABLE IF NOT EXISTS raffle (id integer PRIMARY KEY CHECK(id=1), data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS attempts (key text PRIMARY KEY, count integer NOT NULL, expires bigint NOT NULL);`;
export async function init(db){ for(const statement of schema.split(';').filter(x=>x.trim())) await db.query(statement); await db.query('INSERT INTO raffle VALUES (1,$1) ON CONFLICT DO NOTHING',[JSON.stringify(initial())]); }
export function store(db) {
  return {
    async read(){return (await db.query('SELECT data FROM raffle WHERE id=1')).rows[0].data;},
    async act(action,data){return db.transaction(async tx=>{
      const s=(await tx.query('SELECT data FROM raffle WHERE id=1 FOR UPDATE')).rows[0].data;
      const next=change(s,action,data);
      await tx.query('UPDATE raffle SET data=$1 WHERE id=1',[JSON.stringify(next)]);
      return next;
    });},
    async limit(key,max){
      const now=Date.now();
      const {rows}=await db.query(`INSERT INTO attempts VALUES ($1,1,$2) ON CONFLICT (key) DO UPDATE SET count=CASE WHEN attempts.expires<$3 THEN 1 ELSE attempts.count+1 END, expires=CASE WHEN attempts.expires<$3 THEN $2 ELSE attempts.expires END RETURNING count`,[key,now+900000,now]);
      if(rows[0].count>max) fail('Demasiados intentos. Espera 15 minutos.',429);
    }
  };
}
