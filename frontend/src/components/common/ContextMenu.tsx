import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'warning' | 'primary';
  disabled?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  triggerIcon?: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  ariaLabel?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  items,
  triggerIcon = <MoreVertical size={16} />,
  align = 'right',
  className = '',
  ariaLabel = 'More options'
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleItemClick = (e: React.MouseEvent, item: ContextMenuItem) => {
    e.stopPropagation();
    if (item.disabled) return;
    setIsOpen(false);
    item.onClick();
  };

  return (
    <div
      ref={containerRef}
      className={`context-menu-container ${className}`}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      <button
        type="button"
        className="context-menu-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '6px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.15s ease, color 0.15s ease'
        }}
      >
        {triggerIcon}
      </button>

      {isOpen && (
        <div
          className="context-menu-dropdown"
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            [align === 'right' ? 'right' : 'left']: 0,
            zIndex: 1000,
            minWidth: '160px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35), 0 8px 10px -6px rgba(0, 0, 0, 0.25)',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
        >
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {item.divider && (
                <div
                  style={{
                    height: '1px',
                    backgroundColor: 'var(--border-card)',
                    margin: '4px 0'
                  }}
                />
              )}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => handleItemClick(e, item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'none',
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  textAlign: 'left',
                  color: item.disabled
                    ? 'var(--text-muted)'
                    : item.variant === 'danger'
                    ? 'var(--danger, #ef4444)'
                    : item.variant === 'warning'
                    ? 'var(--warning, #f59e0b)'
                    : item.variant === 'primary'
                    ? 'var(--primary, #6366f1)'
                    : 'var(--text-main)',
                  opacity: item.disabled ? 0.5 : 1,
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!item.disabled) {
                    e.currentTarget.style.backgroundColor =
                      item.variant === 'danger'
                        ? 'rgba(239, 68, 68, 0.1)'
                        : 'var(--bg-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {item.icon && (
                  <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
