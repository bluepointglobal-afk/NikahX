export const validateRequest = async <T>(req: Request): Promise<T> => {
    try {
        const body = await req.json()
        return body as T
    } catch (e) {
        throw new Error('Invalid JSON body')
    }
}
