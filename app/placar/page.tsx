export const metadata = { title: "Placar de atividades — Praça" };
import SiteHeader from "../../components/site-header";
import Leaderboard from "./leaderboard";

export const dynamic = "force-dynamic";

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#14261b] text-[#f5f1e8]">
      <SiteHeader active="placar" dark />
      <Leaderboard />
    </main>
  );
}
