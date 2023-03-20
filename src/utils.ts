export function isPromise<T>(value: any): value is Promise<T> {
	return !!value && typeof value.then === "function"
}

export function isFunction<T>(value: any): value is () => Promise<T> {
	return typeof value === "function"
}
