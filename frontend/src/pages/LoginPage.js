import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { Zap, ArrowRight } from "lucide-react";
import axiosInstance from "../api/axiosInstance";

const LoginPage = () => {
    const { login } = useAuth();
    const navigate  = useNavigate();

    const [form, setForm]     = useState({ email: "", password: "" });
    const [error, setError]   = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) {
            setError("All fields are required.");
            return;
        }

        setLoading(true);
        try {
            const res = await axiosInstance.post("/auth/login", form);
            const { user } = res.data.data;

            login(user);
            navigate("/problems");
        } catch (err) {
            setError(
                err.response?.data?.message || "Login failed. Please try again."
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

                <h1 className="auth-title">Welcome back</h1>
                <p className="auth-sub">Sign in to continue competing</p>

                {error && <div className="alert alert-error mb-4">{error}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
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
                            placeholder="••••••••"
                            value={form.password}
                            onChange={handleChange}
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-full"
                        style={{ marginTop: 4 }}
                        disabled={loading}
                    >
                        {loading ? "Signing in..." : <>Sign in <ArrowRight /></>}
                    </button>
                </form>

                <p className="auth-footer">
                    Don't have an account?{" "}
                    <Link to="/register">Create one</Link>
                </p>
            </motion.div>
        </div>
    );
};

export default LoginPage;
