'use client'

import * as React from 'react'

/**
 * Warns the user before navigating away (tab close, refresh, link click)
 * when there are unsaved form changes. Returns `markDirty` and `markClean`
 * to control the guard state.
 *
 * Usage:
 *   const { isDirty, markDirty, markClean } = useUnsavedChangesGuard()
 *   // Call markDirty() when the form has unsaved changes
 *   // Call markClean() after successful save
 */
export function useUnsavedChangesGuard() {
  const [isDirty, setIsDirty] = React.useState(false)
  const isDirtyRef = React.useRef(false)

  // Keep ref in sync with state
  React.useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

  // beforeunload handler
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault()
        // Chrome requires returnValue to be set
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const markDirty = React.useCallback(() => setIsDirty(true), [])
  const markClean = React.useCallback(() => setIsDirty(false), [])

  return { isDirty, markDirty, markClean }
}
