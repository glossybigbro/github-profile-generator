import { useCanvasLogic } from '../../model/useCanvasLogic'
import { GlassCanvas } from '../GlassCanvas/GlassCanvas'
import { SlashMenu } from '@/features/slash-command/ui/SlashMenu/SlashMenu'
import styles from './CanvasEditor.module.css'

export function CanvasEditor() {
    // Rule 1: View Diet & Headless UI
    // All business logic, state management, and side effects are encapsulated in this hook.
    const {
        blocks,
        activeBlockId,
        mode,
        slashMenu,
        slashItems,
        toggleMode,
        handleBlockUpdate,
        setActiveBlock,
        insertBlockAfter,
        addBlock,
        removeBlock,
        removeBlocks,
        duplicateBlocks,
        turnIntoBlock,
        reorderBlocks,
        handleOpenSlashMenu,
        handleCloseSlashMenu,
        handleSlashItemHover,
        handleBackgroundClick
    } = useCanvasLogic()

    // Mode: Preview (Read-only)
    if (mode === 'preview') {
        return (
            <div className={styles.container}>
                <div className={styles.previewMode}>
                    <h2>Preview Mode (준비 중)</h2>
                    <button onClick={toggleMode} type="button">편집 모드로 돌아가기</button>
                </div>
            </div>
        )
    }

    // Mode: Edit (Interactive)
    return (
        <div className={styles.container}>
            <GlassCanvas
                blocks={blocks}
                activeBlockId={activeBlockId}
                onUpdateBlock={handleBlockUpdate}
                onSetActiveBlock={setActiveBlock}
                onInsertBlockAfter={insertBlockAfter}
                onAddBlock={addBlock}
                onRemoveBlock={removeBlock}
                onRemoveBlocks={removeBlocks}
                onDuplicateBlocks={duplicateBlocks}
                onTurnIntoBlock={turnIntoBlock}
                onOpenSlashMenu={handleOpenSlashMenu}
                onBackgroundClick={handleBackgroundClick}
                onReorderBlocks={reorderBlocks}
                isScrollLocked={slashMenu.isOpen}
            />

            {/* Conditional Rendering: Slash Command Menu */}
            {slashMenu.isOpen && slashMenu.triggerRect && (
                <SlashMenu
                    triggerRect={slashMenu.triggerRect}
                    items={slashItems}
                    onClose={handleCloseSlashMenu}
                    selectedIndex={slashMenu.selectedIndex}
                    onItemHover={handleSlashItemHover}
                />
            )}
        </div>
    )
}
