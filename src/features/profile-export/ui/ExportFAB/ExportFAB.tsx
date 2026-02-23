import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ExportFAB.module.css';

interface ExportFABProps {
    onClick: () => void;
}

export const ExportFAB: React.FC<ExportFABProps> = ({ onClick }) => {
    return (
        <AnimatePresence>
            <motion.div
                className={styles.fabContainer}
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                    delay: 0.5
                }}
            >
                <button
                    className={styles.fab}
                    onClick={onClick}
                    aria-label="Export Profile and Deploy"
                >
                    <span className={styles.icon}>🚀</span>
                    <span className={styles.label}>Export & Deploy</span>
                </button>
            </motion.div>
        </AnimatePresence>
    );
};
