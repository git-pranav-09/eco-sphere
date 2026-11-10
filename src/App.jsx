import React, { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import {
  Activity, ArrowDownRight, ArrowRight, AudioLines, Globe2, HeartHandshake,
  Languages, LockKeyhole, Menu, MessageCircle, Search, Send, ShieldCheck,
  Sparkles, X, Compass, Earth, CheckCircle2, LoaderCircle, LogOut, RefreshCw
} from "lucide-react";
import { isSupabaseConfigured, supabase, submitStory, translateStory } from "./supabase";

const SAMPLE_STORIES = [
  { id:"s1", story_text:"Today I helped a classmate understand something they had been struggling with. Their smile made my day.", ai_summary:"A small act of kindness created a meaningful connection.", themes:["Kindness","Connection"], country:"India", lat:26.85, lng:80.95, created_at:new Date().toISOString() },
  { id:"s2", story_text:"I moved to a new city and was nervous about starting over. A neighbour welcomed me and made it feel like home.", ai_summary:"A welcoming gesture helped someone feel they belong.", themes:["Belonging","Friendship"], country:"Japan", lat:35.68, lng:139.69, created_at:new Date().toISOString() },
  { id:"s3", story_text:"After many attempts, I finally completed a goal that mattered to me. I am proud that I kept going.", ai_summary:"Persistence and personal achievement after repeated effort.", themes:["Hope","Achievement"], country:"Brazil", lat:-23.55, lng:-46.63, created_at:new Date().toISOString() },
  { id:"s4", story_text:"My family listened to me today without rushing to give advice. I felt understood.", ai_summary:"Being heard created a sense of support and understanding.", themes:["Family","Understanding"], country:"Canada", lat:43.65, lng:-79.38, created_at:new Date().toISOString() },
  { id:"s5", story_text:"A stranger returned something I had lost. It reminded me that kindness can come from unexpected places.", ai_summary:"An unexpected act of honesty restored trust.", themes:["Kindness","Trust"], country:"Kenya", lat:-1.29, lng:36.82, created_at:new Date().toISOString() },
  { id:"s6", story_text:"I learned a new skill this month. I was not good at first, but every small improvement felt exciting.", ai_summary:"Learning and growth through patience and practice.", themes:["Growth","Hope"], country:"United Kingdom", lat:51.50, lng:-0.12, created_at:new Date().toISOString() }
];

const THEMES = ["All stories","Kindness","Hope","Friendship","Achievement","Belonging","Family","Growth","Gratitude","Courage","Connection"];
const COUNTRIES = ["India","Japan","Brazil","United States","United Kingdom","Canada","Kenya","Other / prefer not to say"];
const COORDS = {
  India:[22.5,79], Japan:[36.2,138.2], Brazil:[-10.8,-52.9], "United States":[39.8,-98.6],
  "United Kingdom":[54,-2.5], Canada:[56,-106], Kenya:[0.2,37.9], "Other / prefer not to say":[0,0]
};

function initials(s="Echo Sphere"){ return s.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase(); }
function shortDate(date){ return new Date(date).toLocaleDateString(undefined,{month:"short",day:"numeric"}); }

function StoryCard({story, onTranslate}) {
  const [translated,setTranslated] = useState("");
  const [busy,setBusy] = useState(false);
  async function translate(){
    if(translated){setTranslated("");return;}
    setBusy(true);
    try { setTranslated(await translateStory(story.story_text,"English")); }
    catch(e){ alert(e.message || "Translation could not be completed."); }
    finally {setBusy(false);}
  }
  const themes = Array.isArray(story.themes) ? story.themes : [];
  return <article className="story-card">
    <div className="story-top"><span className="story-orb"><AudioLines size={16}/></span><span className="eyebrow">{story.country || "A story from Earth"}</span><span className="story-date">{shortDate(story.created_at)}</span></div>
    <p className="story-copy">“{story.story_text}”</p>
    {translated && <p className="translation">{translated}</p>}
    <div className="story-bottom"><div className="tag-row">{themes.slice(0,3).map(t=><span className="tag" key={t}>{t}</span>)}</div>
      <button className="text-action" onClick={translate} disabled={busy}>{busy?<LoaderCircle className="spin" size={14}/>:<Languages size={14}/>} {translated?"Hide translation":"Translate"}</button>
    </div>
  </article>;
}

function GlobePanel({stories,onSelect}) {
  const globeRef = useRef();
  const points = useMemo(()=>stories.map((s,i)=>{
    const pair = COORDS[s.country] || [((i*37)%120)-60,((i*71)%300)-150];
    return { ...s, lat:Number(s.lat ?? pair[0]), lng:Number(s.lng ?? pair[1]), size:0.45 };
  }),[stories]);
  useEffect(()=>{
    const g=globeRef.current;
    if(g){g.pointOfView({lat:18,lng:8,altitude:2.35},1000);g.controls().autoRotate=true;g.controls().autoRotateSpeed=0.38;}
  },[]);
  return <div className="globe-stage">
    <div className="globe-label"><span className="live-dot"/><span>GLOBAL STORY FIELD</span><span className="globe-label-muted">· {stories.length} visible</span></div>
    <Globe ref={globeRef} width={Math.min(720,typeof window!=="undefined"?window.innerWidth-32:720)} height={500}
      backgroundColor="rgba(0,0,0,0)"
      globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
      bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
      showAtmosphere atmosphereColor="#6d8cff" atmosphereAltitude={0.2}
      pointsData={points} pointLat="lat" pointLng="lng" pointAltitude={0.018}
      pointRadius="size" pointColor={() => "#9c8cff"} pointResolution={12}
      pointsMerge={false} onPointClick={onSelect}
      ringsData={points} ringLat="lat" ringLng="lng" ringColor={() => "rgba(128,155,255,0.75)"}
      ringMaxRadius={3} ringPropagationSpeed={1.4} ringRepeatPeriod={1800}
    />
    <div className="globe-bottom"><span><i className="legend-dot violet"/> Shared experiences</span><span><i className="legend-dot cyan"/> Human connection</span><span className="globe-hint">Drag to explore · Scroll to zoom</span></div>
  </div>;
}

function AdminPanel({onClose}) {
  const [email,setEmail]=useState("");
  const [session,setSession]=useState(null);
  const [pending,setPending]=useState([]);
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");
  useEffect(()=>{
    if(!supabase)return;
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);
  async function signIn(e){
    e.preventDefault();setLoading(true);setMessage("");
    const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin}});
    setMessage(error?error.message:"Check your inbox for the secure sign-in link.");
    setLoading(false);
  }
  async function loadPending(){
    setLoading(true);setMessage("");
    const {data:profile}=await supabase.from("profiles").select("role").eq("id",session.user.id).maybeSingle();
    if(profile?.role!=="admin"){setMessage("This account is not listed as an administrator. Ask the project owner to grant admin access.");setLoading(false);return;}
    const {data,error}=await supabase.from("stories").select("*").eq("moderation_status","pending").order("created_at",{ascending:false});
    if(error)setMessage(error.message); else setPending(data||[]);
    setLoading(false);
  }
  useEffect(()=>{if(session)loadPending();},[session]);
  async function moderate(id,status){
    const {error}=await supabase.from("stories").update({moderation_status:status}).eq("id",id);
    if(error){setMessage(error.message);return;}
    setPending(p=>p.filter(s=>s.id!==id));
  }
  async function logout(){await supabase.auth.signOut();setSession(null);setPending([]);}
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="admin-modal">
      <div className="modal-head"><div><span className="eyebrow">PRIVATE WORKSPACE</span><h2>Story moderation</h2></div><button className="icon-button" onClick={onClose}><X/></button></div>
      {!isSupabaseConfigured?<div className="notice">Connect Supabase before using the admin workspace.</div>:
      !session?<form onSubmit={signIn} className="admin-login"><LockKeyhole size={28}/><p>Sign in using an administrator email address.</p><input type="email" required placeholder="Admin email" value={email} onChange={e=>setEmail(e.target.value)}/><button className="primary-button" disabled={loading}>{loading?"Sending…":"Send secure sign-in link"}</button>{message&&<small>{message}</small>}</form>:
      <><div className="admin-toolbar"><span>{session.user.email}</span><button className="text-action" onClick={logout}><LogOut size={14}/> Sign out</button></div>{message&&<div className="notice">{message}</div>}
        {loading?<p className="muted">Loading submissions…</p>:pending.length===0?<div className="empty-state"><ShieldCheck size={28}/><p>No pending stories. You're all caught up.</p></div>:pending.map(s=><div className="moderation-item" key={s.id}><p>{s.story_text}</p><small>{s.country} · {s.ai_summary}</small><div className="moderation-actions"><button className="approve" onClick={()=>moderate(s.id,"approved")}>Approve</button><button className="reject" onClick={()=>moderate(s.id,"rejected")}>Reject</button></div></div>)}
      </>}
    </div>
  </div>;
}

export default function App(){
  const [stories,setStories]=useState(SAMPLE_STORIES);
  const [isDemo,setIsDemo]=useState(true);
  const [activeTab,setActiveTab]=useState("Explore");
  const [selected,setSelected]=useState(null);
  const [theme,setTheme]=useState("All stories");
  const [search,setSearch]=useState("");
  const [showSubmit,setShowSubmit]=useState(false);
  const [showAdmin,setShowAdmin]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [form,setForm]=useState({story:"",country:"India",consent:false});
  const [notice,setNotice]=useState("");
  const [mobileMenu,setMobileMenu]=useState(false);

  async function loadStories(){
    if(!supabase)return;
    const {data,error}=await supabase.from("stories").select("id,story_text,ai_summary,themes,country,created_at").eq("moderation_status","approved").order("created_at",{ascending:false}).limit(100);
    if(!error){setStories(data||[]);setIsDemo(false);}
    else setNotice("Database connection issue: showing sample stories until Supabase is ready.");
  }
  useEffect(()=>{loadStories();},[]);
  const filtered=useMemo(()=>stories.filter(s=>{
    const themeMatch=theme==="All stories"||(s.themes||[]).some(t=>t.toLowerCase()===theme.toLowerCase());
    const q=search.toLowerCase();
    return themeMatch&&(!q||`${s.story_text} ${s.country} ${(s.themes||[]).join(" ")}`.toLowerCase().includes(q));
  }),[stories,theme,search]);
  const stats=useMemo(()=>({total:stories.length,places:new Set(stories.map(s=>s.country).filter(Boolean)).size,themes:new Set(stories.flatMap(s=>s.themes||[])).size}),[stories]);

  async function handleSubmit(e){
    e.preventDefault();
    if(!form.consent){setNotice("Please confirm that you have read the privacy note.");return;}
    setSubmitting(true);setNotice("");
    try{
      const coords=COORDS[form.country]||[0,0];
      await submitStory({story:form.story.trim(),country:form.country,lat:coords[0],lng:coords[1]});
      setNotice("Your story was sent for AI-assisted checks and human review. It will appear after approval.");
      setForm({story:"",country:"India",consent:false});setShowSubmit(false);
    }catch(err){setNotice(err.message||"Could not submit story.");}
    finally{setSubmitting(false);}
  }

  const navItems=[["Explore",Compass],["Stories",MessageCircle],["Insights",Activity]];
  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" onClick={()=>setActiveTab("Explore")}><span className="brand-mark"><Earth size={21}/></span><span>ECHO<span className="brand-light">SPHERE</span><small>HUMANITY, CONNECTED</small></span></a>
      <nav className={mobileMenu?"nav-links open":"nav-links"}>{navItems.map(([name,Icon])=><button key={name} className={activeTab===name?"nav-link active":"nav-link"} onClick={()=>{setActiveTab(name);setMobileMenu(false);}}><Icon size={15}/>{name}</button>)}</nav>
      <div className="top-actions"><span className="system-status"><i/> SYSTEM {isDemo?"PREVIEW":"LIVE"}</span><button className="outline-button" onClick={()=>setShowSubmit(true)}><Send size={14}/> Share a story</button><button className="icon-button mobile-toggle" onClick={()=>setMobileMenu(!mobileMenu)}><Menu/></button></div>
    </header>

    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="kicker"><span className="kicker-line"/> A LIVING MAP OF HUMANITY</div>
          <h1>One planet.<br/><span>Billions of stories.</span></h1>
          <p className="hero-sub">Every story is a signal. Every shared experience brings us closer. Explore the human moments connecting our world.</p>
          <div className="hero-actions"><button className="primary-button" onClick={()=>{setActiveTab("Explore");document.getElementById("main-experience")?.scrollIntoView({behavior:"smooth"});}}>Explore the sphere <ArrowRight size={16}/></button><button className="quiet-button" onClick={()=>setShowSubmit(true)}>Add your voice <ArrowDownRight size={16}/></button></div>
          <div className="hero-footnote"><span className="pulse-ring"/> BUILT ON STORIES, NOT BORDERS</div>
        </div>
        <div className="hero-visual"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-glow"/><div className="hero-planet"><div className="planet-grid"/><div className="planet-shine"/></div><div className="float-note note-one"><HeartHandshake size={15}/> Kindness travels</div><div className="float-note note-two"><Sparkles size={15}/> Stories connect us</div></div>
      </section>

      <section className="stats-strip">
        <div><span className="stat-number">{isDemo?"06":stats.total.toString().padStart(2,"0")}</span><span className="stat-label">VISIBLE STORIES</span></div>
        <div><span className="stat-number">{isDemo?"06":stats.places.toString().padStart(2,"0")}</span><span className="stat-label">REGIONS REPRESENTED</span></div>
        <div><span className="stat-number">{isDemo?"08":stats.themes.toString().padStart(2,"0")}</span><span className="stat-label">SHARED THEMES</span></div>
        <div className="stats-note"><span className="live-dot"/> {isDemo?"DEMO DATA · CONNECT TO GO LIVE":"LIVE APPROVED SUBMISSIONS"}</div>
      </section>

      <section id="main-experience" className="experience-section">
        <div className="section-heading"><div><div className="kicker">01 / THE GLOBAL PICTURE</div><h2>Explore the <em>human</em> experience.</h2><p>Move across the globe. Discover stories that cross borders.</p></div><button className="subtle-button" onClick={loadStories}><RefreshCw size={14}/> Refresh data</button></div>
        {activeTab==="Explore"&&<div className="globe-layout"><GlobePanel stories={filtered} onSelect={setSelected}/><aside className="side-panel"><div className="panel-heading"><span className="eyebrow">STORY SIGNALS</span><span className="signal-count">{filtered.length} FOUND</span></div><div className="search-box"><Search size={15}/><input placeholder="Search stories or themes…" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="theme-filters">{THEMES.map(t=><button key={t} className={theme===t?"filter-chip selected":"filter-chip"} onClick={()=>setTheme(t)}>{t}</button>)}</div><div className="signal-list">{filtered.slice(0,4).map(s=><button className="signal-item" key={s.id} onClick={()=>setSelected(s)}><span className="signal-icon"><MessageCircle size={15}/></span><span><b>{s.country}</b><small>{s.ai_summary||s.story_text}</small><i>{(s.themes||[]).slice(0,2).join(" · ")}</i></span><ArrowRight size={14}/></button>)}</div><button className="panel-link" onClick={()=>setActiveTab("Stories")}>View all stories <ArrowRight size={14}/></button></aside></div>}
        {activeTab==="Stories"&&<div className="stories-view"><div className="stories-toolbar"><span className="eyebrow">VOICES FROM AROUND THE WORLD</span><div className="search-box"><Search size={15}/><input placeholder="Search stories…" value={search} onChange={e=>setSearch(e.target.value)}/></div></div><div className="story-grid">{filtered.map(s=><StoryCard key={s.id} story={s}/>)}</div></div>}
        {activeTab==="Insights"&&<div className="insights-grid"><div className="insight-card insight-wide"><span className="eyebrow">A SHARED HUMAN LANGUAGE</span><h3>Experiences are universal.<br/><em>Every voice adds perspective.</em></h3><p>Echo Sphere groups approved stories into broad themes. These are descriptive signals from voluntary submissions, not scientific measures of public opinion.</p></div><div className="insight-card"><span className="eyebrow">VISIBLE STORIES</span><strong>{stats.total}</strong><small>Approved or sample stories currently displayed</small></div><div className="insight-card"><span className="eyebrow">REGIONS REPRESENTED</span><strong>{stats.places}</strong><small>Broad locations, never precise addresses</small></div><div className="insight-card"><span className="eyebrow">DISCOVERED THEMES</span><strong>{stats.themes}</strong><small>AI-assisted categories across visible stories</small></div></div>}
      </section>

      <section className="manifesto"><div className="manifesto-symbol"><Globe2 size={25}/></div><div><div className="kicker">02 / WHY ECHO SPHERE EXISTS</div><h2>Different lives. <em>Shared humanity.</em></h2><p>We believe technology should do more than connect devices. It can help people listen, understand and see the world through someone else's experience.</p></div><button className="outline-button" onClick={()=>setShowSubmit(true)}>Share your moment <ArrowRight size={14}/></button></section>
    </main>

    <footer><a className="brand footer-brand" href="#"><span className="brand-mark"><Earth size={18}/></span><span>ECHO<span className="brand-light">SPHERE</span><small>HUMANITY, CONNECTED</small></span></a><span>ONE PLANET · MANY PERSPECTIVES · SHARED HUMANITY</span><button className="footer-admin" onClick={()=>setShowAdmin(true)}><LockKeyhole size={13}/> Admin</button><span>© 2026 ECHO SPHERE</span></footer>

    {notice&&<div className="toast"><CheckCircle2 size={16}/>{notice}<button onClick={()=>setNotice("")}><X size={14}/></button></div>}
    {showSubmit&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowSubmit(false);}}><div className="submit-modal"><div className="modal-head"><div><span className="eyebrow">YOUR VOICE MATTERS</span><h2>Share a human moment.</h2><p>Your story can help someone, somewhere, feel less alone.</p></div><button className="icon-button" onClick={()=>setShowSubmit(false)}><X/></button></div><form onSubmit={handleSubmit}><label>Your story <span>30–500 characters</span></label><textarea required minLength={30} maxLength={500} placeholder="A moment, a lesson, a kindness, a hope…" value={form.story} onChange={e=>setForm({...form,story:e.target.value})}/><div className="form-meta">{form.story.length}/500 · Avoid names, contact details and identifying information.</div><label>Broad location</label><select value={form.country} onChange={e=>setForm({...form,country:e.target.value})}>{COUNTRIES.map(c=><option key={c}>{c}</option>)}</select><label className="consent-row"><input type="checkbox" checked={form.consent} onChange={e=>setForm({...form,consent:e.target.checked})}/><span>I confirm this story is mine to share, contains no personal identifying information, and may be reviewed before anonymous publication.</span></label><div className="privacy-note"><ShieldCheck size={16}/><span>Stories are submitted for AI-assisted checks and human moderation. Only approved stories appear publicly. Do not share sensitive or private information.</span></div><button className="primary-button submit-button" disabled={submitting}>{submitting?<><LoaderCircle className="spin" size={16}/> Sending…</>:<>Submit for review <Send size={15}/></>}</button></form></div></div>}
    {showAdmin&&<AdminPanel onClose={()=>setShowAdmin(false)}/>}
    {selected&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null);}}><div className="detail-modal"><div className="modal-head"><div><span className="eyebrow">A HUMAN SIGNAL · {selected.country}</span><h2>A moment from Earth.</h2></div><button className="icon-button" onClick={()=>setSelected(null)}><X/></button></div><p className="detail-story">“{selected.story_text}”</p><div className="ai-insight"><Sparkles size={16}/><span><b>AI-assisted theme summary</b>{selected.ai_summary||"A story shared by a member of the global community."}</span></div><div className="tag-row">{(selected.themes||[]).map(t=><span className="tag" key={t}>{t}</span>)}</div></div></div>}
  </div>;
}
