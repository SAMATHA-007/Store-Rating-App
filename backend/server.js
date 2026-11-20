require('dotenv').config();
const express=require('express'), cors=require('cors'), bcrypt=require('bcryptjs'), jwt=require('jsonwebtoken');
const db=require('./db'), app=express();
app.use(cors({origin:'http://localhost:5173'})); app.use(express.json());
const validName=s=>typeof s==='string'&&s.trim().length>=20&&s.trim().length<=60;
const validPass=s=>typeof s==='string'&&s.length>=8&&s.length<=16&&/[A-Z]/.test(s)&&/[^A-Za-z0-9]/.test(s);
const token=u=>jwt.sign({id:u.id,email:u.email,role:u.role},process.env.JWT_SECRET,{expiresIn:'1d'});
function auth(req,res,next){try{const t=(req.headers.authorization||'').replace(/^Bearer /,'');if(!t)throw 0;req.user=jwt.verify(t,process.env.JWT_SECRET);next()}catch{return res.status(401).json({message:'Please login again.'})}}
const roles=(...r)=>(req,res,next)=>r.includes(req.user.role)?next():res.status(403).json({message:'Access denied.'});
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);

app.post('/api/auth/register',wrap(async(req,res)=>{
 const {name,email,address,password}=req.body;
 if(!validName(name))return res.status(400).json({message:'Name must be 20-60 characters.'});
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email||''))return res.status(400).json({message:'Valid email required.'});
 if((address||'').length>400)return res.status(400).json({message:'Address max 400 characters.'});
 if(!validPass(password))return res.status(400).json({message:'Password must be 8-16 chars with uppercase and special character.'});
 const [x]=await db.execute('SELECT id FROM users WHERE email=?',[email.toLowerCase()]);
 if(x.length)return res.status(409).json({message:'Email already registered.'});
 const hash=await bcrypt.hash(password,12),[r]=await db.execute('INSERT INTO users(name,email,address,password_hash,role) VALUES(?,?,?,?,?)',[name.trim(),email.toLowerCase(),address||'',hash,'USER']);
 const u={id:r.insertId,name:name.trim(),email:email.toLowerCase(),address,role:'USER'};
 res.status(201).json({token:token(u),user:u});
}));
app.post('/api/auth/login',wrap(async(req,res)=>{
 const [a]=await db.execute('SELECT * FROM users WHERE email=?',[String(req.body.email||'').toLowerCase()]);
 if(!a.length||!await bcrypt.compare(req.body.password||'',a[0].password_hash))return res.status(401).json({message:'Invalid email or password.'});
 const x=a[0],u={id:x.id,name:x.name,email:x.email,address:x.address,role:x.role};res.json({token:token(u),user:u});
}));
app.get('/api/auth/me',auth,wrap(async(req,res)=>{const [a]=await db.execute('SELECT id,name,email,address,role FROM users WHERE id=?',[req.user.id]);res.json({user:a[0]})}));
app.put('/api/auth/password',auth,wrap(async(req,res)=>{
 const {currentPassword,newPassword}=req.body;if(!validPass(newPassword))return res.status(400).json({message:'New password must be 8-16 chars with uppercase and special character.'});
 const [a]=await db.execute('SELECT password_hash FROM users WHERE id=?',[req.user.id]);
 if(!a.length||!await bcrypt.compare(currentPassword||'',a[0].password_hash))return res.status(400).json({message:'Current password is incorrect.'});
 await db.execute('UPDATE users SET password_hash=? WHERE id=?',[await bcrypt.hash(newPassword,12),req.user.id]);res.json({message:'Password updated.'});
}));
app.get('/api/stores',auth,wrap(async(req,res)=>{
 const q='%'+(req.query.search||'')+'%',sort=['name','address'].includes(req.query.sort)?req.query.sort:'name',dir=req.query.direction==='DESC'?'DESC':'ASC';
 const [a]=await db.execute(`SELECT s.id,s.name,s.email,s.address,ROUND(AVG(r.rating),2) overallRating,MAX(CASE WHEN r.user_id=? THEN r.rating END) myRating FROM stores s LEFT JOIN ratings r ON r.store_id=s.id WHERE s.name LIKE ? OR s.address LIKE ? GROUP BY s.id ORDER BY s.${sort} ${dir}`,[req.user.id,q,q]);res.json({stores:a});
}));
app.post('/api/ratings',auth,roles('USER'),wrap(async(req,res)=>{
 const {storeId,rating}=req.body;if(!Number.isInteger(Number(rating))||rating<1||rating>5)return res.status(400).json({message:'Rating must be 1 to 5.'});
 const [s]=await db.execute('SELECT id FROM stores WHERE id=?',[storeId]);if(!s.length)return res.status(404).json({message:'Store not found.'});
 await db.execute('INSERT INTO ratings(store_id,user_id,rating) VALUES(?,?,?) ON DUPLICATE KEY UPDATE rating=VALUES(rating),updated_at=CURRENT_TIMESTAMP',[storeId,req.user.id,rating]);res.json({message:'Rating saved.'});
}));
app.get('/api/admin/stats',auth,roles('ADMIN'),wrap(async(req,res)=>{
 const [[u]]=await db.query('SELECT COUNT(*) n FROM users'),[[s]]=await db.query('SELECT COUNT(*) n FROM stores'),[[r]]=await db.query('SELECT COUNT(*) n FROM ratings');res.json({users:u.n,stores:s.n,ratings:r.n});
}));
app.post('/api/admin/users',auth,roles('ADMIN'),wrap(async(req,res)=>{
 const {name,email,address,password,role}=req.body;if(!validName(name)||!validPass(password)||!['ADMIN','USER','OWNER'].includes(role)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email||''))return res.status(400).json({message:'Check name, email, password and role.'});
 const [r]=await db.execute('INSERT INTO users(name,email,address,password_hash,role) VALUES(?,?,?,?,?)',[name.trim(),email.toLowerCase(),address||'',await bcrypt.hash(password,12),role]);res.status(201).json({id:r.insertId,message:'User created.'});
}));
app.get('/api/admin/users',auth,roles('ADMIN'),wrap(async(req,res)=>{
 const q='%'+(req.query.search||'')+'%';const [a]=await db.execute('SELECT id,name,email,address,role FROM users WHERE name LIKE ? OR email LIKE ? OR address LIKE ? ORDER BY name',[q,q,q]);res.json({users:a});
}));
app.post('/api/admin/stores',auth,roles('ADMIN'),wrap(async(req,res)=>{
 const {name,email,address,ownerUserId}=req.body;if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email||'')||(address||'').length>400)return res.status(400).json({message:'Check store details.'});
 if(ownerUserId){const [o]=await db.execute("SELECT id FROM users WHERE id=? AND role='OWNER'",[ownerUserId]);if(!o.length)return res.status(400).json({message:'Owner ID must belong to an OWNER.'})}
 const [r]=await db.execute('INSERT INTO stores(name,email,address,owner_user_id) VALUES(?,?,?,?)',[name,email.toLowerCase(),address||'',ownerUserId||null]);res.status(201).json({id:r.insertId,message:'Store created.'});
}));
app.get('/api/admin/stores',auth,roles('ADMIN'),wrap(async(req,res)=>{
 const q='%'+(req.query.search||'')+'%';const [a]=await db.execute('SELECT s.id,s.name,s.email,s.address,s.owner_user_id ownerUserId,ROUND(AVG(r.rating),2) rating FROM stores s LEFT JOIN ratings r ON r.store_id=s.id WHERE s.name LIKE ? OR s.email LIKE ? OR s.address LIKE ? GROUP BY s.id ORDER BY s.name',[q,q,q]);res.json({stores:a});
}));
app.get('/api/owner/dashboard',auth,roles('OWNER'),wrap(async(req,res)=>{
 const [stores]=await db.execute('SELECT s.id,s.name,ROUND(AVG(r.rating),2) averageRating,COUNT(r.id) ratingCount FROM stores s LEFT JOIN ratings r ON r.store_id=s.id WHERE s.owner_user_id=? GROUP BY s.id',[req.user.id]);
 const [ratings]=await db.execute('SELECT s.name storeName,u.name userName,u.email,r.rating,r.updated_at submittedAt FROM ratings r JOIN stores s ON s.id=r.store_id JOIN users u ON u.id=r.user_id WHERE s.owner_user_id=? ORDER BY r.updated_at DESC',[req.user.id]);res.json({stores,ratings});
}));
app.use((err,req,res,next)=>{console.error(err);if(err.code==='ER_DUP_ENTRY')return res.status(409).json({message:'Email already exists.'});res.status(500).json({message:'Server error. Check backend console.'})});
app.listen(process.env.PORT||5000,()=>console.log('API running on port '+(process.env.PORT||5000)));
