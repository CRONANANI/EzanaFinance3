'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, MotionConfig, AnimatePresence } from 'framer-motion';

export function AnimatedNav({ items, accentColor = '#10b981' }) {
  const [hovered, setHovered] = useState(null);

  return (
    <MotionConfig transition={{ bounce: 0, type: 'tween', duration: 0.2 }}>
      <nav className="animated-nav">
        <ul className="animated-nav-list">
          {items.map((item) => (
            <li
              key={item.id}
              className="animated-nav-item"
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {item.dropdown ? (
                <button
                  className={`animated-nav-link ${item.isActive ? 'active' : ''} ${hovered === item.id ? 'hovered' : ''}`}
                  style={{ '--accent': accentColor }}
                >
                  <i className={`bi ${item.icon}`} />
                  <span>{item.title}</span>
                  <i className="bi bi-chevron-down animated-nav-chevron" />
                </button>
              ) : (
                <Link
                  href={item.url}
                  className={`animated-nav-link ${item.isActive ? 'active' : ''} ${hovered === item.id ? 'hovered' : ''}`}
                  style={{ '--accent': accentColor }}
                >
                  <i className={`bi ${item.icon}`} />
                  <span>{item.title}</span>
                </Link>
              )}

              {hovered === item.id && !item.dropdown && (
                <motion.div
                  layoutId="nav-cursor"
                  className="animated-nav-underline"
                  style={{ background: accentColor }}
                />
              )}

              <AnimatePresence>
                {item.dropdown && hovered === item.id && (
                  <div
                    className="animated-nav-dropdown-zone"
                    onMouseEnter={() => setHovered(item.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <motion.div
                      layoutId="nav-cursor"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="animated-nav-dropdown"
                      style={{ '--accent': accentColor }}
                    >
                      {item.items?.map((sub) => (
                        <Link
                          key={sub.id}
                          href={sub.url}
                          className="animated-nav-dropdown-item"
                        >
                          {sub.icon && <i className={`bi ${sub.icon}`} />}
                          <div className="animated-nav-dropdown-text">
                            <span className="animated-nav-dropdown-title">{sub.title}</span>
                            {sub.description && (
                              <span className="animated-nav-dropdown-desc">{sub.description}</span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      </nav>
    </MotionConfig>
  );
}
