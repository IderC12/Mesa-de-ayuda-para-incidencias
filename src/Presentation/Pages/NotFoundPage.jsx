import { Link } from 'react-router-dom';
import { EmptyState } from '../Components/UI.jsx';
export default function NotFoundPage() {
  return (
    <EmptyState
      title="Esta página no existe"
      description="Puedes volver a tu espacio de trabajo y continuar desde allí."
      action={
        <Link className="button primary" to="/dashboard">
          Ir al resumen
        </Link>
      }
    />
  );
}
