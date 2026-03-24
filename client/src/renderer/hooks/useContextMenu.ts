import { useState, useCallback, useEffect } from 'react'

export interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  disabled?: boolean
  separator?: boolean
  submenu?: ContextMenuItem[]
}

export function useContextMenu() {
  const [menu, setMenu] = useState<{ items: ContextMenuItem[]; x: number; y: number } | null>(null)

  const showMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setMenu({ items: [], x: e.clientX, y: e.clientY })
  }, [])

  const showMenuAt = useCallback((items: ContextMenuItem[], x: number, y: number) => {
    setMenu({ items, x, y })
  }, [])

  const closeMenu = useCallback(() => setMenu(null), [])

  useEffect(() => {
    const handleClick = () => closeMenu()
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [closeMenu])

  return { menu, showMenu, showMenuAt, closeMenu }
}
