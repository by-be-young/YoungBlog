/**
 * 显示设置 Store
 * 管理沉浸模式、习题显示模式、代码块折叠状态
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
    const isImmersive = ref(false)
    const isWide = ref(false)
    const exerciseMode = ref('collapse')   // 'hide' | 'collapse' | 'practice' | 'expand'
    const codeMode = ref('expand')         // 'collapse' | 'expand'

    function toggleImmersive() {
        isImmersive.value = !isImmersive.value
        if (isImmersive.value) {
            isWide.value = true
        }
    }

    function setExerciseMode(mode) {
        exerciseMode.value = mode
    }

    function setCodeMode(mode) {
        codeMode.value = mode
    }

    return { isImmersive, isWide, exerciseMode, codeMode, toggleImmersive, setExerciseMode, setCodeMode }
})