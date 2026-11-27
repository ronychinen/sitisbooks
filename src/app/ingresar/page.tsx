import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "Ingresa o crea tu cuenta", description: "Entra a Sitisbooks o crea tu cuenta gratis y recibe 1 crédito de bienvenida para pedir tu primer libro.", alternates: { canonical: "/ingresar" } };

export default function Page() {
  return (
    <div className="panel stack" style={{ maxWidth: 460, margin: "24px auto" }}>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
