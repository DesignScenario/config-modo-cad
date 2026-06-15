import { useRef, useState } from 'react'

const MAX_HISTORY = 50

export function useUndoRedo() {
  const undoStack = useRef([])
  const redoStack = useRef([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const pushSnapshot = (snapshot) => {
    undoStack.current = [
      ...undoStack.current.slice(-(MAX_HISTORY - 1)),
      JSON.parse(JSON.stringify(snapshot)),
    ]
    redoStack.current = []
    setCanUndo(true)
    setCanRedo(false)
  }

  const undo = (currentSnapshot) => {
    if (!undoStack.current.length) return null
    const past = undoStack.current.pop()
    redoStack.current.push(JSON.parse(JSON.stringify(currentSnapshot)))
    setCanUndo(undoStack.current.length > 0)
    setCanRedo(true)
    return past
  }

  const redo = (currentSnapshot) => {
    if (!redoStack.current.length) return null
    const future = redoStack.current.pop()
    undoStack.current = [
      ...undoStack.current.slice(-(MAX_HISTORY - 1)),
      JSON.parse(JSON.stringify(currentSnapshot)),
    ]
    setCanRedo(redoStack.current.length > 0)
    setCanUndo(true)
    return future
  }

  const clearHistory = () => {
    undoStack.current = []
    redoStack.current = []
    setCanUndo(false)
    setCanRedo(false)
  }

  return { pushSnapshot, undo, redo, canUndo, canRedo, clearHistory }
}
