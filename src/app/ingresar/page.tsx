import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function Page() {
  return (
    <div className="panel stack" style={{ maxWidth: 460, margin: "24px auto" }}>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
