export const success = (data?: any) => ({ success: true, data });
export const error = (message: string) => ({ success: false, message });
