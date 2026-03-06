export interface Material {
    uuid: string
    type: 'url' | 'file'
    name: string
    description?: string
    url?: string
    fileUrl?: string
    mimeType?: string
    viewCount?: number // PŘIDÁNO: počítadlo zobrazení/stažení
}

export interface Question {
    uuid: string
    type: 'singleChoice' | 'multipleChoice'
    question: string
    options: string[]
    correctIndex?: number
    correctIndices?: number[]
}

export interface Quiz {
    uuid: string
    title: string
    questions: Question[]
    attemptsCount?: number
}

export interface Module {
    uuid: string
    title: string
    description?: string
    content?: string 
    is_published?: boolean
    order_index?: number
    materials: Material[]
    quizzes: Quiz[]
    // PŘIDÁNO: UI stavy pro editaci textu
    isEditingContent?: boolean
    editContentText?: string
}

export interface Course {
    uuid: string
    name: string
    description: string
    difficulty?: string
    modules: Module[]
    isPaused?: boolean
    publishedAt?: string | null
    endsAt?: string | null
}

export interface FeedMessage {
    uuid: string
    type: 'message' | 'system'
    message: string
    author?: string
    createdAt: string
    updatedAt?: string
    edited?: boolean
}

export function getMaterialIcon(material: Material): string {
    if (material.type === 'url') return '🔗'
    if (material.mimeType?.includes('pdf')) return '📄'
    if (material.mimeType?.includes('image')) return '🖼️'
    if (material.mimeType?.includes('video')) return '🎥'
    if (material.mimeType?.includes('audio')) return '🔊'
    return '📁'
}

export function getDifficultyColor(difficulty?: string): string {
    if (difficulty === 'Jednoduchý') return '#91F5AD'
    if (difficulty === 'Střední') return '#FFD93D'
    if (difficulty === 'Těžký') return '#FF6B6B'
    if (difficulty === 'Extrém') return '#8B00FF'
    return '#F9F9F9'
}

export function transformMaterialFromBackend(material: any): Material {
    return {
        uuid: material.uuid,
        type: material.type as 'url' | 'file',
        name: material.name,
        description: material.description,
        url: material.type === 'url' ? material.url || material.content : undefined,
        fileUrl: material.type === 'file' ? material.fileUrl : undefined,
        mimeType: material.mimeType,
        viewCount: material.viewCount || 0, // PŘIDÁNO
    }
}

export function transformQuestionToFrontend(question: any): any {
    const options = (question.options || []).map((optText: string, idx: number) => ({
        text: optText,
        isCorrect: question.type === 'singleChoice'
            ? question.correctIndex === idx
            : (question.correctIndices || []).includes(idx),
    }))
    return {
        uuid: question.uuid,
        text: question.question,
        type: question.type === 'singleChoice' ? 'single' : 'multiple',
        options,
    }
}

export function transformQuestionToBackend(question: any): any {
    let correctIndex: number | undefined
    let correctIndices: number[] | undefined
    if (question.type === 'single') {
        correctIndex = question.options.findIndex((opt: any) => opt.isCorrect)
        if (correctIndex === -1) correctIndex = 0
    } else {
        correctIndices = question.options
            .map((opt: any, idx: number) => (opt.isCorrect ? idx : -1))
            .filter((idx: number) => idx !== -1)
    }
    return {
        type: question.type === 'single' ? 'singleChoice' : 'multipleChoice',
        question: question.text,
        options: question.options.map((opt: any) => opt.text),
        correctIndex,
        correctIndices,
    }
}