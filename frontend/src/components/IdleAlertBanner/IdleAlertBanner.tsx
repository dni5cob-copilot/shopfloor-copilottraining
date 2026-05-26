import { apiClient } from "../../api/client";
import { useWsStore, type IdleAlert } from "../../stores/wsStore";
import { useAuthStore } from "../../stores/authStore";

export function IdleAlertBanner() {
  const { idleAlerts, dismissAlert } = useWsStore();
  const { accessToken } = useAuthStore();

  const handleSuggest = async (alert: IdleAlert) => {
    try {
      const { data } = await apiClient.get(
        `/api/v1/suggestions?resource_id=${alert.resource_id}`
      );
      // TODO: open suggestion modal with data.items
      console.info("Suggestions:", data);
    } catch (err) {
      console.error("Failed to fetch suggestions", err);
    }
  };

  if (!idleAlerts.length) return null;

  return (
    <div role="alert" aria-live="polite" style={{ background: "#fff3cd", padding: "0.75rem 1rem", borderBottom: "1px solid #ffc107" }}>
      {idleAlerts.map((alert) => (
        <div key={alert.resource_id} style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: 4 }}>
          <span>
            <strong>{alert.resource_type === "machine" ? "Machine" : "Operator"}</strong>{" "}
            idle since {new Date(alert.idle_since).toLocaleTimeString()}
          </span>
          <button onClick={() => handleSuggest(alert)}>Suggest Reallocation</button>
          <button onClick={() => dismissAlert(alert.resource_id)}>Dismiss</button>
        </div>
      ))}
    </div>
  );
}
