import { useState } from "react";
import { apiRequest } from "./lib/api";
import "./Auth.css";

export default function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (loading) return;

    if (isRegister) {
      const normalizedUsername = username.trim().toLowerCase();
      const normalizedEmail = email.trim().toLowerCase();

      if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
        setError(
          "Username must be 3–30 characters and contain only letters, numbers, and underscores.",
        );
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        setError("Please enter a valid email address.");
        return;
      }

      if (password.length < 8 || password.length > 72) {
        setError("Your password must be between 8 and 72 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Your passwords do not match.");
        return;
      }
    } else if (!usernameOrEmail.trim() || !password) {
      setError("Please enter your username/email and password.");
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        await apiRequest("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            username: username.trim(),
            email: email.trim(),
            password,
          }),
        });

        setUsernameOrEmail(username.trim().toLowerCase());
        setPassword("");
        setConfirmPassword("");
        setSuccess("Account created successfully! You can now log in.");
        setMode("login");
      } else {
        const data = await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            usernameOrEmail,
            password,
          }),
        });

        if (!data?.token || !data?.user) {
          throw new Error("The server returned an unexpected login response.");
        }

        sessionStorage.setItem("gather_token", data.token);
        onAuthenticated(data.user);
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <a className="auth-brand" href="/" aria-label="Gather home">
          gather<span>.</span>
        </a>

        <div className="auth-brand-content">
          <span className="auth-eyebrow">YOUR PEOPLE. YOUR SPACE.</span>
          <h1>
            Good things
            <br />
            happen when
            <br />
            we <em>gather.</em>
          </h1>
          <p>
            Find your community, share what matters, and make room for
            meaningful connections.
          </p>
          <div className="auth-decoration" aria-hidden="true">
            <span>g</span>
            <span>+</span>
            <span>g</span>
          </div>
        </div>

        <p className="auth-brand-footer">
          A little more connection. A little more community.
        </p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            gather<span>.</span>
          </div>

          <div className="auth-heading">
            <span className="auth-eyebrow">
              {isRegister ? "START YOUR JOURNEY" : "WELCOME BACK"}
            </span>
            <h2>
              {isRegister ? "Find your people." : "Your community awaits."}
            </h2>
            <p>
              {isRegister
                ? "Create your account and find where you belong."
                : "Sign in to catch up with your community."}
            </p>
          </div>

          <div className="auth-tabs" aria-label="Authentication mode">
            <button
              type="button"
              className={!isRegister ? "active" : ""}
              onClick={() => switchMode("login")}
              aria-pressed={!isRegister}
            >
              Log in
            </button>
            <button
              type="button"
              className={isRegister ? "active" : ""}
              onClick={() => switchMode("register")}
              aria-pressed={isRegister}
            >
              Sign up
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {isRegister ? (
              <>
                <label htmlFor="auth-username">Username</label>
                <input
                  id="auth-username"
                  type="text"
                  autoComplete="username"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  minLength={3}
                  maxLength={30}
                  required
                  disabled={loading}
                />

                <label htmlFor="auth-email">Email address</label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={loading}
                />
              </>
            ) : (
              <>
                <label htmlFor="auth-identifier">Username or email</label>
                <input
                  id="auth-identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your username or email"
                  value={usernameOrEmail}
                  onChange={(event) =>
                    setUsernameOrEmail(event.target.value)
                  }
                  required
                  disabled={loading}
                />
              </>
            )}

            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder={isRegister ? "At least 8 characters" : "Enter your password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={isRegister ? 8 : undefined}
              maxLength={isRegister ? 72 : undefined}
              required
              disabled={loading}
            />

            {isRegister && (
              <>
                <label htmlFor="auth-confirm-password">Confirm password</label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Enter your password again"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  required
                  disabled={loading}
                />
              </>
            )}

            {error && (
              <p className="auth-message auth-error" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p className="auth-message auth-success" role="status">
                {success}
              </p>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isRegister
                  ? "Create account"
                  : "Log in to Gather"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="auth-switch-copy">
            {isRegister ? "Already part of Gather?" : "New to Gather?"}{" "}
            <button
              type="button"
              onClick={() =>
                switchMode(isRegister ? "login" : "register")
              }
              disabled={loading}
            >
              {isRegister ? "Log in" : "Create an account"}
            </button>
          </p>

          <p className="auth-legal">
            Be kind. Be curious. Make this community a better place.
          </p>
        </div>
      </section>
    </main>
  );
}
