import { useCallback, useRef, useState } from 'react'

/**
 * Makes a floating panel draggable by its handle (header).
 *
 * The panel starts centered by CSS (no inline style).
 * On the first drag the panel's current rendered position is captured and
 * converted to absolute coords within the backdrop, then tracked via state.
 *
 * Returns:
 *  - panelRef   – attach to the panel element
 *  - panelStyle – spread onto the panel element's style prop
 *  - onHandlePointerDown – attach to the drag handle (header)
 */
export function useDraggable() {
  const [offset, setOffset] = useState(null) // null = centered by CSS
  const panelRef = useRef(null)
  const dragOriginRef = useRef(null)

  const onHandlePointerDown = useCallback((event) => {
    // Only primary button
    if (event.button !== 0) return

    const panel = panelRef.current
    if (!panel) return

    event.preventDefault()

    // Compute panel position relative to its offset-parent (the backdrop).
    const parent = panel.offsetParent || panel.parentElement
    const parentRect = parent.getBoundingClientRect()
    const panelRect = panel.getBoundingClientRect()

    const startLeft = panelRect.left - parentRect.left
    const startTop = panelRect.top - parentRect.top

    dragOriginRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      panelLeft: startLeft,
      panelTop: startTop,
    }

    document.body.classList.add('is-dragging-overlay')

    const onMove = (moveEvent) => {
      const { pointerX, pointerY, panelLeft, panelTop } = dragOriginRef.current
      setOffset({
        x: panelLeft + moveEvent.clientX - pointerX,
        y: panelTop + moveEvent.clientY - pointerY,
      })
    }

    const onUp = () => {
      dragOriginRef.current = null
      document.body.classList.remove('is-dragging-overlay')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [])

  const panelStyle = offset
    ? { position: 'absolute', left: offset.x, top: offset.y, transform: 'none' }
    : {}

  return { panelRef, panelStyle, onHandlePointerDown }
}
