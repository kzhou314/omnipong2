import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { DirectorsPage } from "@/pages/DirectorsPage";
import { HomePage } from "@/pages/HomePage";
import { PlayersPage } from "@/pages/PlayersPage";
import { TournamentsPage } from "@/pages/TournamentsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/activities" element={<TournamentsPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/directors" element={<DirectorsPage />} />
      </Route>
    </Routes>
  );
}
