import { create } from 'zustand'

interface SelectionState {
    selectedIds: Set<string>
    isSelecting: boolean // Whether drag selection is currently active
    lastSelectedId: string | null // Anchor point for Shift+Click range selection

    // Actions
    toggleSelection: (id: string, multi: boolean) => void
    selectRange: (endId: string, allBlockIds: string[], fallbackAnchorId?: string | null) => void
    selectAll: (allBlockIds: string[]) => void
    clearSelection: () => void
    setSelection: (ids: string[]) => void
    setIsSelecting: (isSelecting: boolean) => void
    setLastSelectedId: (id: string | null) => void

    // Hack to prevent Shift+Click focus events from accidentally overwriting the range anchor
    ignoreNextAnchorSync: boolean
    setIgnoreNextAnchorSync: (val: boolean) => void
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
    selectedIds: new Set<string>(),
    isSelecting: false,
    lastSelectedId: null,

    toggleSelection: (id, multi) => set((state) => {
        const newSelected = new Set(multi ? Array.from(state.selectedIds) : [])
        let nextLastSelectedId = state.lastSelectedId

        if (newSelected.has(id)) {
            newSelected.delete(id)
            if (nextLastSelectedId === id) nextLastSelectedId = null
        } else {
            newSelected.add(id)
            nextLastSelectedId = id
        }
        return { selectedIds: newSelected, lastSelectedId: nextLastSelectedId }
    }),

    selectRange: (endId, allBlockIds, fallbackAnchorId = null) => set((state) => {
        const startId = state.lastSelectedId || fallbackAnchorId

        // If there's no anchor, just select the single block
        if (!startId) {
            return {
                selectedIds: new Set([endId]),
                lastSelectedId: endId
            }
        }

        const startIndex = allBlockIds.indexOf(startId)
        const endIndex = allBlockIds.indexOf(endId)

        if (startIndex === -1 || endIndex === -1) return state

        const start = Math.min(startIndex, endIndex)
        const end = Math.max(startIndex, endIndex)

        const newSelected = new Set(allBlockIds.slice(start, end + 1))

        // Do NOT change lastSelectedId, so consecutive Shift+Clicks keep radiating from the same anchor
        return { selectedIds: newSelected }
    }),

    selectAll: (allBlockIds) => set({
        selectedIds: new Set(allBlockIds),
        lastSelectedId: allBlockIds[allBlockIds.length - 1] || null
    }),

    clearSelection: () => set({
        selectedIds: new Set(),
        lastSelectedId: null
    }),

    setSelection: (ids) => set({
        selectedIds: new Set(ids),
        lastSelectedId: ids[ids.length - 1] || null
    }),

    setIsSelecting: (isSelecting) => set({ isSelecting }),

    setLastSelectedId: (id) => set({ lastSelectedId: id }),

    ignoreNextAnchorSync: false,
    setIgnoreNextAnchorSync: (val) => set({ ignoreNextAnchorSync: val })
}))
