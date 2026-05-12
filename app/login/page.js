"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Hit din egen Next.js route -> den kalder FastAPI og sætter httpOnly cookie (auth_token)
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        let msg = "Login mislykkedes";
        try {
          const err = await res.json();
          msg = err?.detail || err?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      // (Valgfrit) Hvis API svarer med JSON, kan du læse det her:
      // const data = await res.json();

      // Cookie er sat server-side; bare navigér videre
      window.location.assign(from); // full reload så middleware ser cookien med det samme
      // Alternativt: router.replace(from)
    } catch (err) {
      setError(err.message || "Noget gik galt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="wrapper">
      <div id="page">
        <div className="wrap-login-page">
          <div className="flex-grow flex flex-column justify-center gap30">
            <Link href="/" id="site-logo-inner"></Link>

            <div className="login-box">
              <div>
                <h3>Log ind på konto</h3>
                <div className="body-text">
                  Indtast din e-mail og adgangskode for at logge ind
                </div>
              </div>

              <form onSubmit={handleLogin} className="form-login flex flex-column gap24">
                <fieldset className="email">
                  <div className="body-title mb-10">
                    E-mailadresse <span className="tf-color-1">*</span>
                  </div>
                  <input
                    className="flex-grow"
                    type="email"
                    placeholder="Indtast din e-mailadresse"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </fieldset>

                <fieldset className="password">
                  <div className="body-title mb-10">
                    Adgangskode <span className="tf-color-1">*</span>
                  </div>
                  <input
                    className="password-input"
                    type="password"
                    placeholder="Indtast din adgangskode"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </fieldset>

                {error && <p style={{ color: "red" }}>{error}</p>}

                <div className="flex justify-between items-center">
                  <label className="flex gap10 items-center">
                    <input type="checkbox" id="signed" />
                    <span className="body-text">Hold mig logget ind</span>
                  </label>
                  <Link href="#" className="body-text tf-color">
                    Glemt adgangskode?
                  </Link>
                </div>

                <button type="submit" className="tf-button w-full" disabled={loading}>
                  {loading ? "Logger ind..." : "Log ind"}
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
