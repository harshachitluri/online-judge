import React, { forwardRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

/*
 |==========================================================================
 | Button
 |==========================================================================
 | One component covers <button>, <a> and react-router <Link> so that a
 | "primary action" looks identical whether it submits a form or navigates.
 |
 | Loading state hides the label rather than replacing it, which keeps the
 | button's width stable — swapping "Submit" for a spinner makes the whole
 | toolbar jump.
 */

const Button = forwardRef(function Button(
    {
        as,
        to,
        href,
        variant = "secondary",
        size = "md",
        icon: Icon,
        trailingIcon: TrailingIcon,
        iconOnly = false,
        loading = false,
        block = false,
        disabled = false,
        className = "",
        children,
        ...rest
    },
    ref
) {
    const classes = [
        "btn",
        `btn--${variant}`,
        size !== "md" && `btn--${size}`,
        iconOnly && "btn--icon",
        block && "btn--block",
        loading && "btn--loading",
        className
    ]
        .filter(Boolean)
        .join(" ");

    const spinnerSize = size === "lg" ? 18 : size === "xs" ? 12 : 15;

    const content = (
        <>
            <span className="btn__inner">
                {Icon && (
                    <span className="btn__icon" aria-hidden="true">
                        <Icon />
                    </span>
                )}
                {!iconOnly && children}
                {TrailingIcon && (
                    <span className="btn__icon" aria-hidden="true">
                        <TrailingIcon />
                    </span>
                )}
            </span>

            {loading && (
                <span className="btn__spinner">
                    <span
                        className="spinner"
                        style={{ width: spinnerSize, height: spinnerSize }}
                    />
                </span>
            )}
        </>
    );

    // A disabled state must be communicated to assistive tech even when the
    // element is an anchor, which has no `disabled` attribute.
    const isInert = disabled || loading;

    const shared = {
        ref,
        className: classes,
        "aria-disabled": isInert || undefined,
        "aria-busy": loading || undefined,
        ...rest
    };

    if (to) {
        return (
            <Link
                to={to}
                {...shared}
                // Blocks activation without removing the link from the tab
                // order, so focus doesn't silently vanish.
                onClick={(e) => {
                    if (isInert) e.preventDefault();
                    else rest.onClick?.(e);
                }}
            >
                {content}
            </Link>
        );
    }

    if (href) {
        return (
            <a href={href} {...shared}>
                {content}
            </a>
        );
    }

    const Component = as || "button";

    return (
        <Component type={Component === "button" ? "button" : undefined} disabled={isInert} {...shared}>
            {content}
        </Component>
    );
});

export default Button;

/*
 | A button that reacts to the pointer with a subtle magnetic pull. Reserved
 | for hero CTAs — used everywhere it would be noise, and it costs a
 | re-render per pointermove.
 */
export const MagneticButton = ({ strength = 0.28, children, ...props }) => {
    const [offset, setOffset] = React.useState({ x: 0, y: 0 });

    const onPointerMove = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setOffset({
            x: (event.clientX - (rect.left + rect.width / 2)) * strength,
            y: (event.clientY - (rect.top + rect.height / 2)) * strength
        });
    };

    return (
        <motion.span
            style={{ display: "inline-flex" }}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setOffset({ x: 0, y: 0 })}
            animate={offset}
            transition={{ type: "spring", stiffness: 260, damping: 20, mass: 0.5 }}
        >
            <Button {...props}>{children}</Button>
        </motion.span>
    );
};
