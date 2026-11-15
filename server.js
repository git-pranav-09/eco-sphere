import express from "express";
import helmet from "helmet";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import rateLimit from "express-rate-limit";
import fs from "node:fs/promises";

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) throw new Error("Google OAuth credentials are required.");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "disable" ? false : (isProduction ? { rejectUnauthorized: false } : undefined),
  max: 10,
  idleTimeoutMillis: 30000
});
await pool.query((await fs.readFile(path.join(__dirname,"db/schema.sql"),"utf8")).toString());
const bootstrapEmail = String(process.env.INITIAL_SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
if (bootstrapEmail) {
  await pool.query(
    "INSERT INTO admin_roles(email,role,created_by) VALUES($1,'super_admin','initial-setup') ON CONFLICT(email) DO NOTHING",
    [bootstrapEmail]
  );
}

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({limit:"20kb"}));
app.use(session({
  store: new (connectPgSimple(session))({pool,tableName:"user_sessions",createTableIfMissing:true}),
  name:"echo.sid",
  secret:process.env.SESSION_SECRET,
  resave:false,
  saveUninitialized:false,
  cookie:{httpOnly:true,secure:isProduction,sameSite:"lax",maxAge:8*60*60*1000}
}));
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((user,done)=>done(null,user));
passport.deserializeUser((user,done)=>done(null,user));
const callbackURL = process.env.GOOGLE_CALLBACK_URL || (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/,"") + "/auth/google/callback";
passport.use(new GoogleStrategy({
  clientID:process.env.GOOGLE_CLIENT_ID,
  clientSecret:process.env.GOOGLE_CLIENT_SECRET,
  callbackURL
},(_accessToken,_refreshToken,profile,done)=>{
  const email=String(profile.emails?.[0]?.value || "").trim().toLowerCase();
  const verified=Boolean(profile._json?.email_verified);
  if(!email || !verified) return done(null,false,{message:"Google did not provide a verified email address."});
  return done(null,{email,name:profile.displayName || email,photo:profile.photos?.[0]?.value || null});
}));

const limiter=rateLimit({windowMs:15*60*1000,limit:100,standardHeaders:"draft-7",legacyHeaders:false});
app.use("/api",limiter);
const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const requireLogin=(req,res,next)=>req.isAuthenticated()?next():res.status(401).json({error:"Please sign in first."});
const roleOf=async email=>{
  const {rows}=await pool.query("SELECT email,role FROM admin_roles WHERE lower(email)=lower($1)",[email]);
  return rows[0]||null;
};
const requireRoles=(...roles)=>asyncRoute(async(req,res,next)=>{
  const role=await roleOf(req.user.email);
  if(!role || !roles.includes(role.role)) return res.status(403).json({error:"You do not have permission for this action."});
  req.admin=role; next();
});

app.get("/auth/google",passport.authenticate("google",{scope:["email","profile"],prompt:"select_account"}));
app.get("/auth/google/callback",passport.authenticate("google",{failureRedirect:"/admin/login?error=google"}),asyncRoute(async(req,res)=>{
  const role=await roleOf(req.user.email);
  if(!role){req.logout(()=>res.redirect("/admin/login?error=not_admin"));return;}
  res.redirect("/admin/");
}));
app.post("/auth/logout",(req,res)=>req.logout(err=>{if(err)return res.status(500).json({error:"Could not sign out."});req.session.destroy(()=>{res.clearCookie("echo.sid");res.json({ok:true});});}));
app.get("/api/admin-session",requireLogin,asyncRoute(async(req,res)=>{
  const role=await roleOf(req.user.email);
  if(!role)return res.status(403).json({error:"This account is not an Echo Sphere administrator."});
  res.json({email:req.user.email,name:req.user.name,role:role.role});
}));
app.get("/api/admin-dashboard",requireLogin,requireRoles("super_admin","moderator","analyst"),asyncRoute(async(req,res)=>{
  const {rows:[counts]}=await pool.query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER(WHERE status='pending')::int AS pending, COUNT(*) FILTER(WHERE status='approved')::int AS published, COUNT(*) FILTER(WHERE status='rejected')::int AS rejected FROM stories");
  const {rows:themes}=await pool.query("SELECT theme,COUNT(*)::int AS count FROM stories WHERE status='approved' GROUP BY theme ORDER BY count DESC LIMIT 8");
  const {rows:countries}=await pool.query("SELECT country,COUNT(*)::int AS count FROM stories WHERE status='approved' GROUP BY country ORDER BY count DESC LIMIT 8");
  const {rows:recent}=await pool.query("SELECT id,theme,country,status,created_at FROM stories ORDER BY created_at DESC LIMIT 6");
  res.json({email:req.user.email,role:req.admin.role,counts,themes,countries,recent});
}));
app.get("/api/admin-stories",requireLogin,requireRoles("super_admin","moderator"),asyncRoute(async(req,res)=>{
  const status=["pending","approved","rejected","all"].includes(req.query.status)?req.query.status:"pending";
  const {rows}=status==="all"
    ?await pool.query("SELECT id,body,country,country_code,theme,status,created_at,approved_at,moderation_note FROM stories ORDER BY created_at DESC LIMIT 100")
    :await pool.query("SELECT id,body,country,country_code,theme,status,created_at,approved_at,moderation_note FROM stories WHERE status=$1 ORDER BY created_at DESC LIMIT 100",[status]);
  res.json({stories:rows,role:req.admin.role});
}));
app.post("/api/admin-moderate",requireLogin,requireRoles("super_admin","moderator"),asyncRoute(async(req,res)=>{
  const id=Number(req.body?.id),action=req.body?.action,note=typeof req.body?.note==="string"?req.body.note.trim().slice(0,300):"";
  if(!Number.isSafeInteger(id)||id<1||!["approve","reject"].includes(action))return res.status(400).json({error:"Invalid moderation request."});
  const status=action==="approve"?"approved":"rejected";
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const {rows}=await client.query("UPDATE stories SET status=$1,updated_at=now(),approved_at=CASE WHEN $1='approved' THEN now() ELSE NULL END,moderation_note=$2 WHERE id=$3 RETURNING id",[status,note,id]);
    if(!rows.length){await client.query("ROLLBACK");return res.status(404).json({error:"Story not found."});}
    await client.query("INSERT INTO moderation_logs(story_id,actor_email,action,note) VALUES($1,$2,$3,$4)",[id,req.user.email,status,note]);
    await client.query("COMMIT");res.json({ok:true,status});
  }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
}));
app.get("/api/admin-team",requireLogin,requireRoles("super_admin"),asyncRoute(async(_req,res)=>{
  const {rows}=await pool.query("SELECT email,role,created_at FROM admin_roles ORDER BY created_at ASC");res.json({admins:rows});
}));
app.post("/api/admin-team",requireLogin,requireRoles("super_admin"),asyncRoute(async(req,res)=>{
  const target=String(req.body?.email||"").trim().toLowerCase(),role=String(req.body?.role||"moderator");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)||target.length>254)return res.status(400).json({error:"Enter a valid email address."});
  if(!["moderator","analyst","super_admin"].includes(role))return res.status(400).json({error:"Invalid administrator role."});
  await pool.query("INSERT INTO admin_roles(email,role,created_by) VALUES($1,$2,$3) ON CONFLICT(email) DO UPDATE SET role=EXCLUDED.role",[target,role,req.user.email]);
  await pool.query("INSERT INTO moderation_logs(actor_email,action,note) VALUES($1,'admin_added',$2)",[req.user.email,target+" · "+role]);
  res.json({ok:true});
}));
app.delete("/api/admin-team",requireLogin,requireRoles("super_admin"),asyncRoute(async(req,res)=>{
  const target=String(req.body?.email||"").trim().toLowerCase();
  if(target===req.user.email)return res.status(400).json({error:"You cannot remove your own administrator access here."});
  const {rows}=await pool.query("DELETE FROM admin_roles WHERE lower(email)=$1 RETURNING email",[target]);
  if(!rows.length)return res.status(404).json({error:"Administrator not found."});
  await pool.query("INSERT INTO moderation_logs(actor_email,action,note) VALUES($1,'admin_removed',$2)",[req.user.email,target]);res.json({ok:true});
}));
app.get("/api/admin-audit",requireLogin,requireRoles("super_admin"),asyncRoute(async(_req,res)=>{
  const {rows}=await pool.query("SELECT id,story_id,actor_email,action,note,created_at FROM moderation_logs ORDER BY created_at DESC LIMIT 100");res.json({logs:rows});
}));
app.get("/api/public-stories",asyncRoute(async(_req,res)=>{
  const {rows:stories}=await pool.query("SELECT id,body,country,country_code,theme,approved_at,created_at FROM stories WHERE status='approved' ORDER BY approved_at DESC NULLS LAST,created_at DESC LIMIT 30");
  const {rows:regions}=await pool.query("SELECT country,country_code,COUNT(*)::int AS count FROM stories WHERE status='approved' AND country_code<>'OT' GROUP BY country,country_code ORDER BY count DESC LIMIT 12");
  res.set("Cache-Control","public,max-age=30");res.json({stories,regions});
}));
app.post("/api/submit-story",rateLimit({windowMs:60*60*1000,limit:5,standardHeaders:"draft-7",legacyHeaders:false}),asyncRoute(async(req,res)=>{
  const b=req.body||{},body=typeof b.body==="string"?b.body.trim():"",country=typeof b.country==="string"?b.country.trim():"",country_code=typeof b.country_code==="string"?b.country_code.trim().toUpperCase():"",theme=typeof b.theme==="string"?b.theme.trim():"";
  const themes=["Hope","Kindness","Education","Friendship","Family","Community","Creativity","Dreams","Belonging","Challenges"];
  if(b.consent!==true)return res.status(400).json({error:"Please confirm the community guidelines."});
  if(body.length<40||body.length>800)return res.status(400).json({error:"Stories must be 40–800 characters."});
  if(!themes.includes(theme))return res.status(400).json({error:"Choose a valid story theme."});
  if(!country||country.length>80||! /^[A-Z]{2}$/.test(country_code))return res.status(400).json({error:"Choose a valid country option or prefer not to say."});
  const blocked=/(?:\b\+?\d[\d\s().-]{7,}\d\b|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|https?:\/\/|www\.)/i;
  if(blocked.test(body))return res.status(400).json({error:"Please remove phone numbers, email addresses and links before submitting."});
  const {rows}=await pool.query("INSERT INTO stories(body,country,country_code,theme,status) VALUES($1,$2,$3,$4,'pending') RETURNING id",[body,country,country_code,theme]);
  res.status(201).json({ok:true,id:rows[0].id,status:"pending"});
}));

app.get("/admin/login",(req,res)=>res.sendFile(path.join(__dirname,"dist/admin/login.html")));
app.get("/admin",(req,res)=>res.redirect("/admin/"));
const serveAdminDashboard=asyncRoute(async(req,res)=>{
  if(!req.isAuthenticated())return res.redirect("/admin/login");
  const role=await roleOf(req.user.email);
  if(!role)return res.redirect("/admin/login?error=not_admin");
  res.sendFile(path.join(__dirname,"dist/admin/index.html"));
});
app.get("/admin/",serveAdminDashboard);
app.get("/admin/index.html",serveAdminDashboard);
app.use(express.static(path.join(__dirname,"dist"),{index:"index.html",maxAge:isProduction?"1h":0}));
app.get("/healthz",(_req,res)=>res.json({ok:true,service:"echo-sphere"}));
app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({error:"An unexpected server error occurred."});});
app.listen(port,"0.0.0.0",()=>console.log("Echo Sphere listening on",port));
