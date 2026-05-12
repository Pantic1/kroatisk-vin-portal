// lib/useUser.js
"use client";
import { useEffect, useState } from "react";

export function useUser() {
  const [state, setState] = useState({ loading: true, id: null, name: null });

  useEffect(() => {
    let alive = true;
    fetch("/api/me", { headers: { "Cache-Control": "no-store" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) =>
        alive &&
        setState(d.authenticated
          ? { loading: false, id: d.id, name: d.name }
          : { loading: false, id: null, name: null })
      )
      .catch(() => alive && setState({ loading: false, id: null, name: null }));
    return () => { alive = false; };
  }, []);

  return state;
}
