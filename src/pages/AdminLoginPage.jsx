import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Eye, EyeOff } from "lucide-react";
import "./AdminLoginPage.css";
import { loadAdminAuth, loginErrorMessage } from "../firebase/adminAuth";
import { navigateTo } from "../lib/navigation";

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [invalidField, setInvalidField] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    document.title = "Admin Access — 1999";
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting.current) return;
    const email = event.currentTarget.elements.namedItem("email");
    const password = event.currentTarget.elements.namedItem("password");
    if (!email.value.trim() || !email.validity.valid) {
      setInvalidField("email");
      setMessage("Enter a valid email address.");
      email.focus();
      return;
    }
    if (!password.value) {
      setInvalidField("password");
      setMessage("Enter your password.");
      password.focus();
      return;
    }
    setInvalidField("");
    setMessage("");
    const emailValue = email.value.trim();
    const passwordValue = password.value;
    submitting.current = true;
    setSigningIn(true);
    try {
      const { auth, signInWithEmailAndPassword } = await loadAdminAuth();
      await signInWithEmailAndPassword(auth, emailValue, passwordValue);
      password.value = "";
      navigateTo("/admin/dashboard");
    } catch (error) {
      // Log only the error code, never credentials or authentication tokens.
      console.error("[1999 admin login] Firebase Auth error code:", error.code || "unknown");
      setMessage(loginErrorMessage(error));
    } finally {
      submitting.current = false;
      setSigningIn(false);
    }
  }

  return (
    <main className="admin-login" aria-labelledby="admin-title">
      <section className="admin-login-brand" aria-label="1999">
        <p className="admin-login-kicker">NOT A YEAR. A FEELING.</p>
        <div className="admin-login-wordmark" aria-hidden="true">1999</div>
        <p className="admin-login-statement">SAME PEOPLE.<br />DIFFERENT TIME.</p>
      </section>
      <section className="admin-login-panel">
        <div className="admin-login-content">
          <a className="admin-back-to-store" href="/">← BACK TO STORE</a>
          <p className="admin-login-kicker">1999 / PRIVATE AREA</p>
          <h1 id="admin-title">ADMIN ACCESS</h1>
          <form noValidate aria-busy={signingIn} onSubmit={handleSubmit} onChange={() => {
            setMessage("");
            setInvalidField("");
          }}>
            <label htmlFor="admin-email">EMAIL</label>
            <input
              id="admin-email"
              disabled={signingIn}
              name="email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Email address"
              required
              aria-invalid={invalidField === "email"}
              aria-describedby={invalidField === "email" ? "admin-login-error" : undefined}
            />
            <label htmlFor="admin-password">PASSWORD</label>
            <div className="admin-login-password">
              <input
                id="admin-password"
                disabled={signingIn}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Password"
                required
                aria-invalid={invalidField === "password"}
                aria-describedby={invalidField === "password" ? "admin-login-error" : undefined}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-controls="admin-password"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
            <p id="admin-login-error" className="admin-login-error" role="alert">{message}</p>
            <button className="admin-login-submit" type="submit" disabled={signingIn}>
              {signingIn ? "SIGNING IN..." : "LOGIN"} <ArrowUpRight size={19} aria-hidden="true" />
            </button>
          </form>
        </div>
        <p className="admin-login-footer">© 2026 1999. ALL RIGHTS RESERVED.</p>
      </section>
    </main>
  );
}
