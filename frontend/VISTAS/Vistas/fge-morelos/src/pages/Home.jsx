import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import "./Home.css";

export default function Home() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="home-hero">
        <h2>
          Hola {user?.nombre || "[Nombre]"}, rol: {user?.rol || "[el que tenga]"}.
          <br />
          ¡Nos alegra verte de nuevo!
        </h2>
      </div>
    </AppLayout>
  );
}
