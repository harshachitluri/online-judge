import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import * as Icons from "react-icons/lu";

import { MODULE, sidebarSections } from "../../config/brand";
import { useAuth } from "../../context/AuthContext";
import Logo from "./Logo";

/*
 |==========================================================================
 | Sidebar
 |==========================================================================
 | The persistent left navigation for every signed-in page. Grouped into
 | Overview / Practice / Compete / Workspace / Account (+ Admin, for
 | Architects), so fourteen destinations read as a structured menu rather
 | than a wall of links.
 |
 | Hidden below 900px — the mobile drawer (rendered by TopNav) covers the
 | same destinations there.
 */

const SidebarItem = ({ module }) => {
    const Icon = Icons[module.icon] || Icons.LuCircleDot;

    return (
        <NavLink
            to={module.path}
            className={({ isActive }) => `sidebar__item ${isActive ? "sidebar__item--active" : ""}`}
            title={module.blurb}
        >
            {({ isActive }) => (
                <>
                    {isActive && (
                        <motion.span
                            layoutId="sidebar-active"
                            className="sidebar__item-bar"
                            transition={{ type: "spring", stiffness: 420, damping: 38 }}
                        />
                    )}
                    <span className="sidebar__item-icon" aria-hidden="true">
                        <Icon size={17} />
                    </span>
                    <span className="sidebar__item-label">{module.label}</span>
                </>
            )}
        </NavLink>
    );
};

const Sidebar = () => {
    const { isAdmin } = useAuth();
    const sections = sidebarSections({ isAdmin });

    return (
        <aside className="sidebar" aria-label="Main navigation">
            <div className="sidebar__brand">
                <Logo to={MODULE.deck.path} />
            </div>

            <nav className="sidebar__nav">
                {sections.map((section) => (
                    <div className="sidebar__group" key={section.group}>
                        <span className="sidebar__group-label">{section.group}</span>
                        <div className="sidebar__group-items">
                            {section.items.map((module) => (
                                <SidebarItem key={module.id} module={module} />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
