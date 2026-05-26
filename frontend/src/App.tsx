import { useAuthStore } from "./stores/authStore";
import { Login } from "./components/Login/Login";
import { IdleAlertBanner } from "./components/IdleAlertBanner/IdleAlertBanner";

export function App() {
  const { isAuthenticated, logout } = useAuthStore();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", borderBottom: "1px solid #ddd" }}>
        <strong>Shop Floor Resource Allocation</strong>
        <button onClick={logout}>Sign out</button>
      </header>
      <IdleAlertBanner />
      <main style={{ padding: "1rem" }}>
        {/* Dashboard / Gantt board — Phase 2 */}
        <p>Dashboard coming in Phase 2.</p>
      </main>
    </div>
  );
}
