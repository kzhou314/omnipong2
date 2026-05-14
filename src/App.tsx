import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { DirectorsPage } from "@/pages/DirectorsPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { PlayersPage } from "@/pages/PlayersPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { RegisterPage } from "@/pages/RegisterPage";
import { TournamentsPage } from "@/pages/TournamentsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/activities" element={<TournamentsPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/directors" element={<DirectorsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
