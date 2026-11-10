"use client";
import { X } from "lucide-react";
import { useState } from "react";
export default function SentConnectionActions({ id }: { id: number }) { const [busy, setBusy] = useState(false); async function cancel() { setBusy(true); const response = await fetch(`/api/pokes/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "cancel" }) }); if (response.ok) window.location.reload(); else setBusy(false); } return <button type="button" onClick={cancel} disabled={busy} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#8a3f35] underline underline-offset-4 disabled:opacity-50"><X size={13} />{busy ? "Cancelando..." : "Cancelar conexão"}</button>; }
