"use client";

import { useSyncExternalStore } from "react";

type Item = { id: string; title: string; label: string; price?: number; available?: number };
type Saved = { id: string; title: string; price: number; quantity: number };
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const eventName = "loxada-bag-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(eventName, callback);
  };
}

function entries(raw: string): Saved[] {
  try {
    const decoded: unknown = JSON.parse(raw);
    if (!Array.isArray(decoded)) return [];
    return decoded.filter(item => item && typeof item.id === "string" && typeof item.title === "string"
      && Number.isSafeInteger(item.price) && item.price > 0 && Number.isSafeInteger(item.quantity) && item.quantity > 0);
  } catch {
    return [];
  }
}

export default function CustomerBag({ user, items }: { user: string; items: Item[] }) {
  const key = "loxada-merch-bag:" + user;
  const read = () => {
    try { return localStorage.getItem(key) ?? "[]"; } catch { return "[]"; }
  };
  const saved = entries(useSyncExternalStore(subscribe, read, () => "[]"));

  function update(next: Saved[]) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event(eventName));
    } catch { /* Storage may be disabled by the browser. */ }
  }

  return <>
    {items.length ? <ul className="sr-list">{items.map(item => {
      const old = saved.find(row => row.id === item.id);
      const quantity = old?.quantity ?? 0;
      return <li className="sr-list-item" key={item.id}>
        <div><strong>{item.title}</strong><small>{item.label} · {peso.format((item.price ?? 0) / 100)}</small></div>
        <button type="button" disabled={!item.price || quantity >= (item.available ?? 0)} onClick={() => {
          const current = entries(read());
          const amount = current.find(row => row.id === item.id)?.quantity ?? 0;
          if (!item.price || amount >= (item.available ?? 0)) return;
          update([...current.filter(row => row.id !== item.id), { id:item.id, title:item.title, price:item.price, quantity:amount + 1 }]);
        }}>Add to bag<span className="sr-only"> {item.title}</span></button>
      </li>;
    })}</ul> : null}
    <section className="sr-card" aria-labelledby="bag">
      <h2 id="bag">Your bag</h2>
      <p className="sr-note">Saved in this browser. Stock and prices will be checked at checkout.</p>
      {saved.length ? <ul className="sr-list">{saved.map(row => <li className="sr-list-item" key={row.id}>
        <div><strong>{row.title}</strong><small>{row.quantity} × {peso.format(row.price / 100)} at selection</small></div>
        <button type="button" onClick={() => update(entries(read()).filter(item => item.id !== row.id))}>Remove<span className="sr-only"> {row.title}</span></button>
      </li>)}</ul> : <p>Your bag is empty.</p>}
    </section>
  </>;
}
