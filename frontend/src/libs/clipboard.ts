let timer: ReturnType<typeof setTimeout> | null = null;

export const copyWithAutoClear = async (
    text: string,
    seconds = 15,
): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        return false;
    }

    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
        try {
            const current = await navigator.clipboard.readText();
            if (current === text) await navigator.clipboard.writeText("");
        } catch {
            try {
                await navigator.clipboard.writeText("");
            } catch {
                /* bỏ qua */
            }
        }
    }, seconds * 1000);

    return true;
};
