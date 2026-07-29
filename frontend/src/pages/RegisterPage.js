import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { Zap, ArrowRight } from "lucide-react";
import axiosInstance from "../api/axiosInstance";

const RegisterPage = () => {
    const { login } = useAuth();
    const navigate  = useNavigate();

    const [form, setForm]     = useState({ username: "", email: "", password: "" });
    const [error, setError]   = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.username || !form.email || !form.password) {
            setError("All fields are required.");
            return;
        }
        if (form.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            // Register already sets the session cookie and returns the user,
            // so the follow-up login round-trip was redundant.
            const res = await axiosInstance.post("/auth/register", form);

            const { user } = res.data.data;
            login(user);
            navigate("/problems");
        } catch (err) {
            setError(
                err.response?.data?.message || "Registration failed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <motion.div
                className="auth-card"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className="auth-logo">
                    <span className="logo-text">
                        <span className="brand-icon"><Zap /></span>
                        Code<span className="brand-accent">Judge</span>
                    </span>
                </div>

                <h1 className="auth-title">Create account</h1>
                <p className="auth-sub">Join thousands of competitive programmers</p>

                {error && <div className="alert alert-error mb-4">{error}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            className="form-input"
                            type="text"
                            name="username"
                            placeholder="yourhandle"
                            value={form.username}
                            onChange={handleChange}
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            className="form-input"
                            type="email"
                            name="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={handleChange}
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            className="form-input"
                            type="password"
                            name="password"
                            placeholder="Min. 6 characters"
                            value={form.password}
                            onChange={handleChange}
                            autoComplete="new-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-full"
                        style={{ marginTop: 4 }}
                        disabled={loading}
                    >
                        {loading ? "Creating account..." : <>Create account <ArrowRight /></>}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account?{" "}
                    <Link to="/login">Sign in</Link>
                </p>
            </motion.div>
        </div>
    );
};

export default RegisterPage;
