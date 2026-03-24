/**
 * ContextMenu - Global right-click context menu component
 * Supports keyboard navigation (up/down/enter/esc), submenus, and dark theme
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, ChevronRight } from 'lucide-react'
import { type ContextMenuItem, useContextMenu } from '../hooks/useContextMenu'

interface MenuPosition {
  x: number
  y: number
  items: ContextMenuItem[]
}

function MenuItem({
  item,
  isSubmenuOpen,
  onHover,
  onLeave,
  onSelect,
  depth = 0,
}: {
  item: ContextMenuItem
  isSubmenuOpen: boolean
  onHover: () => void
  onLeave: () => void
  onSelect: (item: ContextMenuItem) => void
  depth?: number
}) {
  const [copied, setCopied] = useState(false)
  const isCopyAction = item.label === '复制' || item.label === 'Copy'
  const isSelectAll = item.label === '全选' || item.label === 'Select All'

  const handleCopyFeedback = async () => {
    if (isCopyAction) {
      item.onClick()
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } else if (isSelectAll) {
      item.onClick()
    } else {
      onSelect(item)
    }
  }

  if (item.separator) {
    return (
      <div
        className="h-px mx-2 my-1"
        style={{ background: 'rgba(255, 255, 255, 0.08)' }}
      />
    )
  }

  return (
    <button
      type="button"
      role="menuitem"
      onClick={handleCopyFeedback}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      disabled={item.disabled}
      className={`
        w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed
        ${isSubmenuOpen ? 'bg-[#2d2d4a]' : ''}
      `}
      style={{
        color: 'var(--text-primary)',
        borderRadius: depth > 0 ? 6 : undefined,
      }}
    >
      {isCopyAction ? (
        <span className="w-4 h-4 flex items-center justify-center">
          {copied ? (
            <Check className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </span>
      ) : item.icon ? (
        <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>
      ) : (
        <span className="w-4" />
      )}
      <span className="flex-1">{item.label}</span>
      {item.submenu && (
        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
      )}
    </button>
  )
}

function Submenu({
  items,
  position,
  onSelect,
  onClose,
}: {
  items: ContextMenuItem[]
  position: { x: number; y: number }
  onSelect: (item: ContextMenuItem) => void
  onClose: () => void
}) {
  return (
    <div
      className="absolute min-w-[160px] py-1 rounded-lg z-[1000]"
      style={{
        left: position.x,
        top: position.y,
        background: '#1a1a2e',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
      }}
      onMouseLeave={onClose}
    >
      {items.map((item, index) => (
        <MenuItem
          key={index}
          item={item}
          isSubmenuOpen={false}
          onHover={() => {}}
          onLeave={() => {}}
          onSelect={onSelect}
          depth={1}
        />
      ))}
    </div>
  )
}

function ContextMenuContent({
  position,
  onSelect,
}: {
  position: MenuPosition
  onSelect: (item: ContextMenuItem) => void
}) {
  const [hoveredIndex, setHoveredIndex] = useState(-1)
  const [activeSubmenu, setActiveSubmenu] = useState<{
    items: ContextMenuItem[]
    position: { x: number; y: number }
  } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const submenuTimerRef = useRef<NodeJS.Timeout | null>(null)

  const selectableItems = position.items.filter((item) => !item.separator && !item.disabled)
  const currentIndex = hoveredIndex >= 0 ? hoveredIndex : selectableItems.length - 1

  const openSubmenu = useCallback(
    (item: ContextMenuItem, index: number) => {
      if (!item.submenu) return

      const menuRect = menuRef.current?.getBoundingClientRect()
      if (menuRect) {
        setActiveSubmenu({
          items: item.submenu,
          position: {
            x: menuRect.right + 4,
            y: menuRect.top + index * 36,
          },
        })
      }
    },
    []
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeSubmenu) {
        if (e.key === 'Escape') {
          setActiveSubmenu(null)
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHoveredIndex((prev) => {
            const next = prev + 1
            return next >= selectableItems.length ? 0 : next
          })
          break
        case 'ArrowUp':
          e.preventDefault()
          setHoveredIndex((prev) => {
            const next = prev - 1
            return next < 0 ? selectableItems.length - 1 : next
          })
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (currentIndex >= 0 && currentIndex < selectableItems.length) {
            const item = selectableItems[currentIndex]
            if (item.submenu) {
              openSubmenu(item, currentIndex)
            } else {
              onSelect(item)
            }
          }
          break
        case 'Escape':
          e.preventDefault()
          onSelect({ label: '', onClick: () => {} } as ContextMenuItem)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectableItems, currentIndex, onSelect, activeSubmenu, openSubmenu])

  const handleMouseLeave = () => {
    submenuTimerRef.current = setTimeout(() => {
      setHoveredIndex(-1)
    }, 100)
  }

  useEffect(() => {
    return () => {
      if (submenuTimerRef.current) {
        clearTimeout(submenuTimerRef.current)
      }
    }
  }, [])

  return (
    <>
      <div
        ref={menuRef}
        role="menu"
        className="fixed py-1 rounded-lg z-[1000] min-w-[180px]"
        style={{
          left: position.x,
          top: position.y,
          background: '#1a1a2e',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        }}
        onMouseLeave={handleMouseLeave}
      >
        {position.items.map((item, index) => {
          const selectableIndex = selectableItems.indexOf(item)
          const isHighlighted = selectableIndex === hoveredIndex

          if (item.separator) {
            return (
              <div
                key={`sep-${index}`}
                className="h-px mx-2 my-1"
                style={{ background: 'rgba(255, 255, 255, 0.08)' }}
              />
            )
          }

          return (
            <div
              key={index}
              className="relative"
              onMouseEnter={() => {
                setHoveredIndex(selectableIndex)
                if (item.submenu) {
                  submenuTimerRef.current = setTimeout(() => {
                    if (item.submenu) {
                      const menuRect = menuRef.current?.getBoundingClientRect()
                      if (menuRect) {
                        setActiveSubmenu({
                          items: item.submenu,
                          position: {
                            x: menuRect.right + 4,
                            y: menuRect.top + selectableIndex * 36,
                          },
                        })
                      }
                    }
                  }, 150)
                }
              }}
              onMouseLeave={() => {
                if (submenuTimerRef.current) {
                  clearTimeout(submenuTimerRef.current)
                }
                submenuTimerRef.current = setTimeout(() => {
                  if (!activeSubmenu) {
                    setHoveredIndex(-1)
                  }
                }, 150)
              }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (item.disabled) return
                  if (item.submenu) {
                    openSubmenu(item, selectableIndex)
                  } else {
                    onSelect(item)
                  }
                }}
                disabled={item.disabled}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors cursor-pointer
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${isHighlighted ? 'bg-[#2d2d4a]' : ''}
                `}
                style={{ color: 'var(--text-primary)' }}
              >
                {item.icon ? (
                  <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>
                ) : (
                  <span className="w-4" />
                )}
                <span className="flex-1">{item.label}</span>
                {item.submenu && (
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                )}
              </button>
            </div>
          )
        })}
      </div>

      <AnimatePresence>
        {activeSubmenu && (
          <Submenu
            items={activeSubmenu.items}
            position={activeSubmenu.position}
            onSelect={onSelect}
            onClose={() => setActiveSubmenu(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export function ContextMenu({
  menu,
  onSelect,
}: {
  menu: MenuPosition | null
  onSelect: (item: ContextMenuItem) => void
}) {
  if (!menu) return null

  const { x, y, items } = menu

  let adjustedX = x
  let adjustedY = y

  if (typeof window !== 'undefined') {
    const menuWidth = 200
    const menuHeight = items.length * 36 + 16

    if (adjustedX + menuWidth > window.innerWidth) {
      adjustedX = window.innerWidth - menuWidth - 8
    }

    if (adjustedY + menuHeight > window.innerHeight) {
      adjustedY = window.innerHeight - menuHeight - 8
    }

    if (adjustedX < 8) adjustedX = 8
    if (adjustedY < 8) adjustedY = 8
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      style={{ position: 'fixed', left: adjustedX, top: adjustedY }}
    >
      <ContextMenuContent
        position={{ x: 0, y: 0, items }}
        onSelect={onSelect}
      />
    </motion.div>,
    document.body
  )
}

export { useContextMenu }
