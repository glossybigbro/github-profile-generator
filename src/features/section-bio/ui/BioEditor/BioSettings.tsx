'use client'

import {
    DndContext,
    closestCenter,
} from '@dnd-kit/core'
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useBioEditor } from '@/features/section-bio/model/useBioEditor'
import { autoResizeTextarea } from '@/shared/lib/utils/styleUtils'
import styles from '@/shared/styles/SectionSettings.module.css'
import {
    BIO_UI_LABELS,
    BIO_PLACEHOLDERS,
} from '@/features/section-bio/config/bioConstants'
import { SortableBulletItem } from './SortableBulletItem'
import { memo } from 'react'
import { useProfileStore } from '@/entities/profile/model/useProfileStore'

/**
 * 심플 바이오 설정 컴포넌트
 * 
 * @description
 * 사용자의 자기소개(Bio) 섹션을 설정하는 UI입니다.
 * - 제목 및 소개글 설정 (자동 조절 텍스트 영역)
 * - 불렛 포인트 리스트 관리 (추가, 삭제, 드래그 앤 드롭 정렬)
 * - 테마 색상에 따른 동적 스타일링
 */
export const SimpleBioSettings = memo(function SimpleBioSettings() {
    // Headless UI Hook: Logic is separated from View
    const {
        bio,
        setBio,
        updateBullet,
        addBullet,
        removeBullet,
        handleDragEnd,
        refs,
        sensors
    } = useBioEditor()

    if (!bio) {
        return (
            <div className={styles.popOverContent}>
                <div style={{ padding: '20px', color: '#ff4d4d', textAlign: 'center' }}>
                    Bio data is missing. Please check ProfileStore.
                </div>
            </div>
        )
    }

    return (
        <div className={styles.popOverContent}>
            {/* Section 0: Header/Title */}
            <div className={styles.settingsSection}>
                <div className={styles.settingsGroup}>
                    <div className={styles.labelRow} style={{ marginBottom: 'var(--spacing-sm)' }}>
                        <span className={styles.sectionTitle} style={{ marginBottom: 0 }}>{BIO_UI_LABELS.HEADING}</span>
                        <label className={styles.switch}>
                            <input
                                type="checkbox"
                                checked={bio.showHeading !== false}
                                onChange={(e) => setBio({ showHeading: e.target.checked })}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>

                    {/* Heading Input */}
                    {bio.showHeading !== false && (
                        <textarea
                            ref={refs.heading}
                            value={bio.heading}
                            onChange={(e) => setBio({ heading: e.target.value })}
                            className={`${styles.settingsInput} ${styles.textareaInput} ${styles.headingTextarea}`}
                            placeholder={BIO_PLACEHOLDERS.HEADING}
                            rows={1}
                            onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                        />
                    )}
                </div>
            </div>

            {/* Section 1: Introduction */}
            <div className={styles.settingsSection}>
                <div className={styles.settingsGroup}>
                    <div className={styles.labelRow} style={{ marginBottom: 'var(--spacing-sm)' }}>
                        <span className={styles.sectionTitle} style={{ marginBottom: 0 }}>{BIO_UI_LABELS.INTRODUCTION}</span>
                        <label className={styles.switch}>
                            <input
                                type="checkbox"
                                checked={bio.showDescription !== false}
                                onChange={(e) => setBio({ showDescription: e.target.checked })}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>

                    {/* Description Input */}
                    {bio.showDescription !== false && (
                        <textarea
                            ref={refs.description}
                            value={bio.description}
                            onChange={(e) => setBio({ description: e.target.value })}
                            className={`${styles.settingsInput} ${styles.textareaInput} ${styles.introTextarea}`}
                            placeholder={BIO_PLACEHOLDERS.INTRODUCTION}
                            rows={3}
                            onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                        />
                    )}
                </div>
            </div>

            {/* Section 2: Bullets */}
            <div className={styles.settingsSection}>
                <div className={styles.settingsGroup}>
                    <div className={styles.labelRow} style={{ marginBottom: 'var(--spacing-sm)' }}>
                        <span className={`${styles.sectionTitle} ${styles.detailsLabel}`} style={{ marginBottom: 0 }}>{BIO_UI_LABELS.DETAILS}</span>
                        <label className={styles.switch}>
                            <input
                                type="checkbox"
                                checked={bio.showBullets !== false}
                                onChange={(e) => setBio({ showBullets: e.target.checked })}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>

                    {bio.showBullets !== false && (
                        <div className={`${styles.list} ${styles.detailsList}`}>
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={bio.bullets.map((b) => b.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {bio.bullets.map((bullet: { id: string; text: string }, index: number) => (
                                        <SortableBulletItem
                                            key={bullet.id}
                                            id={bullet.id}
                                            value={bullet.text}
                                            index={index}
                                            onChange={updateBullet}
                                            onRemove={removeBullet}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>

                            <button
                                onClick={addBullet}
                                className={`${styles.settingsButton} ${styles.addBulletButton}`}
                            >
                                {BIO_UI_LABELS.ADD_BULLET}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {/* Section 3: Add to Canvas Button */}
            <div className={styles.settingsSection}>
                <button
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('bio-add'))
                    }}
                    className={styles.addToCanvasButton}
                    style={{
                        backgroundColor: useProfileStore.getState().accentColor,
                        borderColor: useProfileStore.getState().accentColor,
                        color: 'white'
                    }}
                >
                    {BIO_UI_LABELS.ADD_TO_CANVAS}
                </button>
            </div>
        </div>
    )
})
