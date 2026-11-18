import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useBackgroundStore = defineStore('background', () => {
    const images = ref([])
    const currentIndex = ref(0)
    let interval = null

    const setImages = (newImages) => {
        images.value = newImages
        if (images.value.length > 0) {
            startSlideshow()
        }
    }

    const startSlideshow = () => {
        if (interval) clearInterval(interval)
        if (images.value.length <= 1) return

        interval = setInterval(() => {
            currentIndex.value = (currentIndex.value + 1) % images.value.length
        }, 5000)
    }

    const stopSlideshow = () => {
        if (interval) {
            clearInterval(interval)
            interval = null
        }
    }

    const getCurrentImage = () => {
        return images.value[currentIndex.value] || ''
    }

    return {
        images,
        currentIndex,
        setImages,
        startSlideshow,
        stopSlideshow,
        getCurrentImage
    }
})