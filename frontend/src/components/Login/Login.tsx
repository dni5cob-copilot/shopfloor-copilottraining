import React, { useState } from "react";
import { useAuthStore } from "../../stores/authStore";

export function Login() {
  const { login, isLoading, error } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div style={{ maxWidth: 360, margin: "10vh auto", padding: "2rem", border: "1px solid #ddd", borderRadius: 8 }}>
      <h2>Shop Floor — Sign In</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </div>
        {error && (
          <p role="alert" style={{ color: "red", marginBottom: "0.5rem" }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={isLoading} style={{ width: "100%" }}>
          {isLoading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
