import { useNavigate } from "react-router-dom";
import AppLayout from "../reutilizables/AppLayout";
import PeticionWizard from "./PeticionWizard";

export default function NuevaPeticion() {
  const navigate = useNavigate();

  return (
    <AppLayout title="Registro de petición">
      <div className="page-heading">
        <p>Captura los datos del llamado y asigna al perito.</p>
      </div>
      <PeticionWizard mode="nueva" onSaved={() => navigate("/peticiones/buscar")} />
    </AppLayout>
  );
}