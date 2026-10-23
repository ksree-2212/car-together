"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

type Vehicle = { make: string; model: string; variant: string; modelYear: number; fuel: string; transmission: string };
type Group = { id: string; name: string; city: string; vehicle: Vehicle; memberLimit: number; memberCount: number; offerCount: number; status: string };
type Offer = { offerId: string; dealerName: string; dealerCity: string; listedTotalPaise: number; rank?: number; validUntil: string | null; reasons: string[] };
type Comparison = { comparableOffers: Offer[]; otherOffers: Offer[] };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers as Record<string, string> | undefined) } });
  const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message || "The request could not be completed.");
  return body as T;
}
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    car: <><path d="m4 13 2-4.5A2.4 2.4 0 0 1 8.2 7h7.6a2.4 2.4 0 0 1 2.2 1.5L20 13" /><path d="M3 13h18v4a2 2 0 0 1-2 2h-2m-10 0H5a2 2 0 0 1-2-2zm4 6v-2m10 2v-2" /><circle cx="6.5" cy="15.5" r=".7" fill="currentColor" /><circle cx="17.5" cy="15.5" r=".7" fill="currentColor" /></>,
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20v-1.4A3.6 3.6 0 0 1 6 15h6a3.6 3.6 0 0 1 3.5 3.6V20m1-15a3.5 3.5 0 0 1 0 6.7m1 3.3a3.5 3.5 0 0 1 4 3.5V20" /></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    quote: <><path d="M5 4h14v16H5zM8 8h8M8 12h8m-8 4h4" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    plus: <path d="M12 5v14m-7-7h14" />,
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    shield: <><path d="m12 3 7 3v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
function money(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(paise) / 100);
}

function CreateDialog({ close, done }: { close: () => void; done: (group: Group) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const f = new FormData(event.currentTarget);
    try {
      const data = await api<{ group: Group }>("/api/groups", { method: "POST", body: JSON.stringify({
        name: f.get("name"), city: f.get("city"), memberLimit: Number(f.get("limit")),
        vehicle: { make: f.get("make"), model: f
.get("model"), variant: f.get("variant"), modelYear: Number(f.get("year")), fuel: f.get("fuel"), transmission: f.get("transmission") },
      }) });
      done(data.group);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create the group."); }
    finally { setBusy(false); }
  }
  return <div className="veil" onKeyDown={(e) => { if (e.key === "Escape") close(); }} onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="create-title">
    <button className="dialog-x" autoFocus onClick={close} aria-label="Close"><Icon name="close" /></button><div className="dialog-icon"><Icon name="users" size={21} /></div><p className="kicker">START TOGETHER</p><h2 id="create-title">Create a buying circle</h2><p className="dialog-sub">Choose your exact car and registration city.</p>
    <form className="form" onSubmit={submit}>
      <label className="field wide"><span>Group name</span><input autoFocus name="name" placeholder="Pune Nexon Creative+ buyers" minLength={3} required /></label>
      <label className="field"><span>City</span><input name="city" placeholder="Pune" minLength={2} required /></label>
      <label className="field"><span>Group size</span><select name="limit" defaultValue="30"><option value="10">10 buyers</option><option value="20">20 buyers</option><option value="30">30 buyers</option><option value="50">50 buyers</option></select></label>
      <div className="form-divider wide">VEHICLE DETAILS</div>
      <label className="field"><span>Make</span><input name="make" placeholder="Tata" required /></label><label className="field"><span>Model</span><input name="model" placeholder="Nexon" required /></label>
      <label className="field wide"><span>Variant</span><input name="variant" placeholder="Creative+ AMT" required /></label>
      <label className="field"><span>Model year</span><input name="year" type="number" min="2020" max="2035" defaultValue={new Date().getFullYear()} required /></label>
      <label className="field"><span>Fuel</span><select name="fuel" defaultValue="petrol"><option value="petrol">Petrol</option><option value="diesel">Diesel</option><option value="cng">CNG</option><option value="electric">Electric</option><option value="hybrid">Hybrid</option></select></label>
      <label className="field wide"><span>Transmission</span><select name="transmission" defaultValue="automatic"><option value="automatic">Automatic</option><option value="manual">Manual</option></select></label>
      {error ? <p className="error wide" role="alert">{error}</p> : null}
      <div className="form-actions wide"><span><Icon name="shield" size={15} />No phone number needed</span><button className="btn primary" disabled={busy}>{busy ? "Creating…" : "Create group"}<Icon name="arrow" size={16} /></button></div>
    </form>
  </section></div>;
}

function DetailDialog({ group, close, refresh, update }: { group: Group; close: () => void; refresh: () => Promise<void>; update: (g: Group) => void }) {
  const [data, setData] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [join, setJoin] = useState(false);
  const [add, setAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let alive = true; setLoading(true); setError("");
    api<Comparison>("/api/groups/" + group.id + "/compare").then((result) => { if (alive) setData(result); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Could not load offers."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [group.id, reload]);

  async function joinGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const f = new FormData(event.currentTarget);
    try {
      await api("/api/groups/" + group.id + "/members", { method: "POST", body: JSON.stringify({ alias: f.get("alias"), purchaseWindow: f.get("window") }) });
      setNotice("You’ve joined this buying circle."); setJoin(false); update({ ...group, memberCount: group.memberCount + 1 }); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not join this group."); }
    finally { setBusy(false); }
  }
  async function addOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const f = new FormData(event.currentTarget); const rupees = (key: string) => Math.round(Number(f.get(key) || 0) * 100);
    const lines: { category: string; label: string; amountPaise: number; kind: string; mandatory: boolean }[] = [
      { category: "ex_showroom", label: "Ex-showroom", amountPaise: rupees("showroom"), kind: "charge", mandatory: true },
      { category: "registration", label: "Registration and road tax", amountPaise: rupees("registration"), kind: "charge", mandatory: true },
      { category: "insurance", label: "Insurance", amountPaise: rupees("insurance"), kind: "charge", mandatory: true },
    ];
    if (rupees("accessories")) lines.push({ category: "accessories", label: "Accessories", amountPaise: rupees("accessories"), kind: "charge", mandatory: false });
    if (rupees("discount")) lines.push({ category: "other", label: "Dealer discount", amountPaise: rupees("discount"), kind: "discount", mandatory: false });
    try {
      await api("/api/groups/" + group.id + "/offers", { method: "POST", body: JSON.stringify({ dealerName: f.get("dealer"), dealerCity: f.get("dealerCity"), registrationCity: f.get("registrationCity"), vehicle: group.vehicle, lines }) });
      setNotice("Quote added. The comparison is up to date."); setAdd(false); setReload((n) => n + 1); update({ ...group, offerCount: group.offerCount + 1 }); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save this quote."); }
    finally { setBusy(false); }
  }
  const ranked = data?.comparableOffers || []; const other = data?.otherOffers || [];
  return <div className="veil" onKeyDown={(e) => { if (e.key === "Escape") close(); }} onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}><section className="dialog detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title">
    <button className="dialog-x" autoFocus onClick={close} aria-label="Close"><Icon name="close" /></button><div className="
detail-head"><span className="detail-car"><Icon name="car" size={23} /></span><div><p className="kicker">{group.city.toUpperCase()} · OPEN GROUP</p><h2 id="detail-title">{group.name}</h2><p className="dialog-sub">{group.vehicle.make} {group.vehicle.model} · {group.vehicle.variant} · {group.vehicle.modelYear}</p></div></div>
    <div className="detail-stats"><span><Icon name="users" size={16} />{group.memberCount}/{group.memberLimit} buyers</span><span><Icon name="quote" size={16} />{group.offerCount} quotes</span><span>{group.vehicle.fuel} · {group.vehicle.transmission}</span></div>
    {notice ? <p className="success" role="status">✓ {notice}</p> : null}
    <div className="compare-heading"><div><p className="kicker">LIKE-FOR-LIKE QUOTES</p><h3>Dealer offer comparison</h3></div><button className="btn soft small" onClick={() => { setAdd(!add); setJoin(false); }}><Icon name="plus" size={16} />Add quote</button></div>
    {add ? <form className="form inset-form" onSubmit={addOffer}>
      <label className="field"><span>Dealer name</span><input name="dealer" minLength={2} placeholder="Example Motors" required /></label><label className="field"><span>Dealer city</span><input name="dealerCity" defaultValue={group.city} required /></label><label className="field wide"><span>Registration city</span><input name="registrationCity" defaultValue={group.city} required /></label>
      <div className="form-divider wide">QUOTE AMOUNTS · RUPEES</div><label className="field"><span>Ex-showroom</span><input name="showroom" type="number" min="1" required placeholder="1050000" /></label><label className="field"><span>Registration & tax</span><input name="registration" type="number" min="1" required placeholder="125000" /></label><label className="field"><span>Insurance</span><input name="insurance" type="number" min="1" required placeholder="65000" /></label><label className="field"><span>Accessories <small>optional</small></span><input name="accessories" type="number" min="0" defaultValue="0" /></label><label className="field"><span>Discount <small>optional</small></span><input name="discount" type="number" min="0" defaultValue="0" /></label>
      {error ? <p className="error wide" role="alert">{error}</p> : null}<div className="form-actions wide"><span>Quotes stay itemized</span><button className="btn primary" disabled={busy}>{busy ? "Saving…" : "Save quote"}<Icon name="arrow" size={15} /></button></div>
    </form> : null}
    <div className="offer-results">{loading ? <p className="loading">Loading quotes…</p> : error && !add && !join ? <p className="error">{error}</p> : ranked.length ? ranked.map((offer) => <div className={"offer-row" + (offer.rank === 1 ? " best" : "")} key={offer.offerId}><span className="rank">{offer.rank === 1 ? "✦" : "#" + offer.rank}</span><div className="offer-name"><b>{offer.dealerName}</b><small>{offer.dealerCity}{offer.validUntil ? " · Valid until " + offer.validUntil : ""}</small></div><div className="offer-price"><b>{money(offer.listedTotalPaise)}</b><small>listed total</small></div></div>) : !loading ? <div className="no-offers"><span><Icon name="quote" size={21} /></span><b>No comparable quotes yet</b><p>Add quotes with ex-sho
wroom, registration and insurance to see a like-for-like comparison.</p></div> : null}
      {other.length ? <details className="other"><summary>{other.length} quote{other.length === 1 ? "" : "s"} need a closer look</summary>{other.map((o) => <p key={o.offerId}><b>{o.dealerName}</b> — {o.reasons.join(" ")}</p>)}</details> : null}<p className="fine"><Icon name="shield" size={15} />Totals reflect submitted items only. Check the dealer’s original quote.</p>
    </div>
    <div className="join-box"><div><b>Buying this car too?</b><p>Join with a display name. No account needed in this prototype.</p></div><button className="btn soft small" onClick={() => { setJoin(!join); setAdd(false); }}>Join group<Icon name="arrow" size={15} /></button></div>
    {join ? <form className="join-form" onSubmit={joinGroup}><label className="field"><span>Display name</span><input name="alias" minLength={2} maxLength={40} placeholder="e.g. GreenRoad" required /></label><label className="field"><span>Purchase timing</span><select name="window" defaultValue="1_to_3_months"><option value="under_1_month">Within a month</option><option value="1_to_3_months">1–3 months</option><option value="3_to_6_months">3–6 months</option><option value="flexible">Flexible</option></select></label>{error ? <p className="error wide" role="alert">{error}</p> : null}<button className="btn primary wide" disabled={busy}>{busy ? "Joining…" : "Join this group"}<Icon name="arrow" size={15} /></button></form> : null}
  </section></div>;
}

function GroupCard({ group, index, open }: { group: Group; index: number; open: () => void }) {
  const percent = Math.min(100, Math.round(group.memberCount / group.memberLimit * 100));
  return <article className={"group-card shade-" + (index % 3)}><div className="card-art"><span className="vehicle-label"><Icon name="car" size={14} />{group.vehicle.modelYear} · {group.vehicle.fuel}</span><svg viewBox="0 0 260 110" aria-hidden="true"><path d="m20 72 14-27c4-8 10-13 19-15l39-8c12-2 21-8 29-17l14-14c5-5 12-8 19-8h21c10 0 19 4 26 12l28 31 18 11c7 4 11 11 11 19v9c0 7-5 12-12 12h-17a25 25 0 0 0-49 0h-56a25 25 0 0 0-49 0H22c-7 0-12-5-12-12v-2c0-4 3-8 7-10l3-1Z" fill="currentColor"/><path d="m67 45 17-5 25-5 20-21a11 11 0 0 1 8-4h20c5 0 9 2 12 6l23 28-125 1Z" fill="#fff" opacity=".72"/><circle cx="67" cy="80" r="17" fill="#183536"/><circle cx="67" cy="80" r="9" fill="#e7eee4"/><circle cx="188" cy="80" r="17" fill="#183536"/><circle cx="188" cy="80" r="9" fill="#e7eee4"/></svg><span className="watermark">CT</span></div><div className="card-body"><div className="card-city"><span><Icon name="pin" size={14}/>{group.city}</span><span className="open"><i/>OPEN</span></div><h3>{group.name}</h3><p className="vehicle">{group.vehicle.make} {group.vehicle.model} <i>·</i> {group.vehicle.variant}</p><div className="progress"><span><i style={{ width: percent + "%" }}/></span><small>{group.memberCount}/{group.memberLimit}</small></div><div className="card-bottom"><span><Icon name="users" size={15}/>{group.memberCount} buyers</span><span><Icon name="quote" size={15}/>{group.offerCount} quotes</span><button onClick={open} aria-label={"View " + group.name}><Icon name="arrow" size={17}/>
</button></div></div></article>;
}

export default function Home() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Group | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { const d = await api<{ groups: Group[] }>("/api/groups?status=open"); setGroups(d.groups); setSelected((old) => old ? d.groups.find((g) => g.id === old.id) || old : null); }
    catch (e) { setError(e instanceof Error ? e.message : "The API is unavailable."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const cities = useMemo(() => Array.from(new Set(groups.map((g) => g.city))).sort(), [groups]);
  const visible = useMemo(() => groups.filter((g) => {
    const text = [g.name, g.city, g.vehicle.make, g.vehicle.model, g.vehicle.variant].join(" ").toLowerCase();
    return (city === "all" || g.city.toLowerCase() === city.toLowerCase()) && text.includes(search.trim().toLowerCase());
  }), [groups, city, search]);
  const quoteCount = groups.reduce((n, g) => n + g.offerCount, 0);
  const buyerCount = groups.reduce((n, g) => n + g.memberCount, 0);
  function created(g: Group) { setGroups((old) => [g, ...old]); setCreating(false); setSelected(g); }

  return <div className="site"><header className="header"><a href="#home" className="logo"><span className="logo-icon"><Icon name="car" size={19}/></span><b>car<span>together</span></b></a><nav><a className="active" href="#discover">Discover</a><a href="#how">How it works</a><a href="#promise">Our promise</a></nav><div className="header-actions"><span className="live"><i/>{loading ? "Syncing" : error ? "Offline" : "Live data"}</span><button className="btn primary" onClick={() => setCreating(true)}><Icon name="plus" size={16}/>Start a group</button></div></header>
    <main id="home"><section className="hero"><div className="hero-copy"><p className="hero-tag"><i/>THE SMARTER WAY TO BUY YOUR NEXT CAR</p><h1>Better deals happen <em>together.</em></h1><p className="hero-desc">Bring local buyers together, collect real dealer quotes and see every cost before you decide.</p><div className="hero-actions"><button className="btn lime" onClick={() => setCreating(true)}>Start a buying group<Icon name="arrow" size={17}/></button><a className="btn outline" href="#discover">Explore open groups</a></div><div className="hero-proof"><span className="avatars"><i>R</i><i>A</i><i>K</i></span><span>Local buyers. Clearer quotes. Better together.</span></div></div>
      <div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="float-card float-top"><span className="float-icon">✓</span><span><b>Every line in the open</b><small>Know what you’ll actually pay</small></span></div><svg className="hero-car" viewBox="0 0 520 250" fill="none" role="img" aria-label="Illustration of a modern car"><ellipse cx="260" cy="218" rx="205" ry="18"
 fill="#061c1d" opacity=".15"/><path d="m70 168 20-42c7-15 18-23 36-27l73-15c21-4 38-15 53-30l28-27c10-10 23-15 38-15h40c18 0 34 8 46 21l52 56 37 21c14 8 22 22 22 38v21c0 12-9 21-21 21h-34a49 49 0 0 0-98 0H183a49 49 0 0 0-98 0H64c-12 0-21-9-21-21v-12c0-9 6-17 15-21l12-5Z" fill="url(#paint)"/><path d="m134 123 32-26 39-8c18-4 32-13 47-26l24-22a29 29 0 0 1 21-9h36c12 0 22 5 31 14l46 51-276 26Z" fill="#e3eee4"/><path d="m295 63-26 26 91-1-29-32h-22c-5 0-10 2-14 7Zm82-7 30 32h-42l-29-32h41Z" fill="#a7c0b7"/><path d="m68 167 28-8 17-32 22-3" stroke="#efa47a" strokeWidth="5" strokeLinecap="round"/><path d="M423 151h40" stroke="#eff7e9" strokeWidth="8" strokeLinecap="round"/><circle cx="139" cy="193" r="31" fill="#153335"/><circle cx="139" cy="193" r="18" fill="#e2e9e0"/><circle cx="409" cy="193" r="31" fill="#153335"/><circle cx="409" cy="193" r="18" fill="#e2e9e0"/><defs><linearGradient id="paint" x1="50" y1="35" x2="460" y2="215"><stop stopColor="#d8ff7d"/><stop offset="1" stopColor="#98dfac"/></linearGradient></defs></svg><div className="float-card float-bottom"><span className="float-spark">✳</span><span><b>Power in numbers</b><small>One circle, more leverage</small></span></div><span className="hero-star">✦</span></div>
      <div className="hero-trust"><span><Icon name="shield" size={15}/>Buyer-first, always</span><span><Icon name="quote" size={15}/>Itemized comparisons</span><span><Icon name="users" size={16}/>Community-led buying</span></div></section>
    <section className="stats"><div className="stats-copy"><span className="kicker">THE COMMUNITY</span><b>Car buying,<br/>with more clarity.</b></div><div className="stat"><span className="stat-icon purple"><Icon name="users"/></span><div><b>{loading ? "—" : groups.length}</b><small>open circles</small></div></div><div className="stat"><span className="stat-icon orange"><Icon name="quote"/></span><div><b>{loading ? "—" : quoteCount}</b><small>dealer quotes</small></div></div><div className="stat"><span className="stat-icon green"><Icon name="pin"/></span><div><b>{loading ? "—" : buyerCount}</b><small>buyers together</small></div></div><div className="stat-note"><i/>Live local data</div></section>
    <section className="discover" id="discover"><div className="section-heading"><div><p className="kicker">FIND YOUR BUYING CIRCLE</p><h2>Good cars. Better together.</h2><p>Explore open groups or start one for the exact car you want.</p></div><button className="btn dark" onClick={() => setCreating(true)}><Icon name="plus" size={16}/>Create a group</button></div>
      <div className="toolbar"><label className="search-box"><Icon name="search" size={19}/><span className="sr-only">Search groups</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search a car, variant or city"/></label><label className="city-select"><Icon name="pin" size={16}/><span className="sr-only">Filter by city</span><select value={city} onChange={(e) => setCity(e.target.value)}><option value="all">All cities</option>{cities.map((c) => <option key={c}>{c}</option>)}</select></label><button className="refresh" onClick={() => void refresh()} disabled={loading}>↻ <span>{loading ? "Syncing" : "Refresh"}</span></button></div>
      {error ? <div className="alert" role="alert"><b>Couldn’t load groups.</b><span>{error}</span><button onClick={() => void refresh()}>Try again</button></div> : null}
      <div className="main-grid"><div className="group-column"><div className="list-meta"><span>{loading ? "Loading groups…" : visible.length + (visible.length === 1 ? " open group" : " open groups")}</span><span>Newest first <b>⌄</b></span></div>
        {loading ? <div className="cards"><div className="skeleton"/><div className="skeleton"/></div> : visible.length ? <div className="cards">{visible.map((g, i) => <GroupCard key={g.id} group={g} index={i} open={() => setSelected(g)}/>)}</div> : <div className="empty"><span className="empty-car"><Icon name="car" size={30}/></span><p className="kicker">{groups.length ? "NO MATCHES THIS TIME" : "THE FIRST MOVE IS YOURS"}</p><h3>{groups.length ? "No groups match that search." : "Start the first circle in your city."}</h3><p>{groups.length ? "Try another model or clear your city filter." : "Choose a car, invite local buyers and begin collecting quotes together."}</p>{groups.length ? <button className="text-link" onClick={() => { setSearch(""); setCity("all"); }}>Clear filters <Icon name="close" size={14}/></button> : <button className="btn primary" onClick={() => setCreating(true)}>Create the first group<Icon name="arrow" size={16}/></button>}</div>}
      </div><aside className="rail"><section className="how" id="how"><span className="how-icon"><Icon name="spark"/></span><p className="kicker">THE IDEA</p><h3>One buyer asks.<br/>A whole group negotiates.</h3><div className="steps"><div><i>01</i><section><b>Pick your exact car</b><small>Match the variant and city.</small></section></div><div><i>02</i><section><b>Bring buyers together</b><small>Share intent with an alias.</small></section></div><div><i>03</i><section><b>Compare every line</b><small>Spot missing costs before you decide.</small></section></div></div><a href="#promise">See our promise <Icon name="arrow" size={14}/></a></section><section className="promise" id="promise"><span><Icon name="shield"/></span><div><b>Built around buyer trust</b><p>Totals come from submitted lines. No “best price” claims.</p></div></section><div className="rail-note"><i/>{error ? "API connection issue" : "Connected to your local API"}<span>· Private to this device</span></div></aside></div>
    </section><footer><a className="logo" href="#home"><span className="logo-icon"><Icon name="car" size={17}/></span><b>car<span>together</span></b></a><span>Better decisions, made together.</span><a href="/api/health" target="_blank" rel="noreferrer">System status <Icon name="arrow" size={13}/></a></footer></main>
    {creating ? <CreateDialog close={() => setCreating(false)} done={(g) => { setGroups((old) => [g, ...old]); setCreating(false); setSelected(g); }}/> : null}
    {selected ? <DetailDialog group={selected} close={() => setSelected(null)} refresh={refresh} update={setSelected}/> : null}
  </div>;
}
