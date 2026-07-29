import React from "react";

/**
 * Loader — reusable loading spinner.
 * @param {boolean} fullPage - centers in full viewport
 * @param {string}  text     - optional label below the spinner
 */
const Loader = ({ fullPage = false, text = "Loading..." }) => {

    const style = fullPage
        ? {
            position: "fixed", inset: 0, zIndex: 200,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "rgba(13,13,20,0.85)", backdropFilter: "blur(4px)"
          }
        : {};

    return (
        <div className="loader-wrap" style={style}>
            <div className="spinner" />
            {text && (
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                    {text}
                </p>
            )}
        </div>
    );
};

export default Loader;
