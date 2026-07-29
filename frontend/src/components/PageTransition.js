import React from "react";
import { motion } from "framer-motion";
import { pageVariants } from "../motion/variants";

/**
 * PageTransition — wraps a route's content so it fades/slides in on mount and
 * out on unmount. Pair with <AnimatePresence mode="wait"> in the router.
 */
const PageTransition = ({ children, className = "" }) => (
    <motion.div
        className={className}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
    >
        {children}
    </motion.div>
);

export default PageTransition;
