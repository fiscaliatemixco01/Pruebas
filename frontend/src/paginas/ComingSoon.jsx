import AppLayout from "../components/AppLayout";
import "./Home.css";

export default function ComingSoon({ title }) {
  return (
    <AppLayout title={title}>
      <div className="home-hero">
        <h2>{title}</h2>
        <p className="home-hero-sub">Este módulo está en construcción y estará disponible próximamente.</p>
      </div>
    </AppLayout>
  );
}
