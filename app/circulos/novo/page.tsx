import { redirect } from "next/navigation";
import SiteHeader from "../../../components/site-header";
import CircleControls from "../../../components/circle-controls";
import { getPracaUser } from "../../../lib/praca-auth";
import { connectedPeople } from "../../../lib/connections";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{invite?:string}>}){const query=await searchParams;const user=await getPracaUser();if(!user)redirect("/entrar");return <main className="min-h-screen bg-[#f5f1e8] text-[#14261b]"><SiteHeader active="conexoes"/><section className="mx-auto max-w-2xl space-y-8 px-5 py-14"><a href="/conexoes?view=circles">← Círculos</a><h1 className="font-serif text-5xl">Criar círculo</h1><CircleControls initialInvite={query.invite} userId={user.id} people={await connectedPeople(user.id)}/></section></main>;}
