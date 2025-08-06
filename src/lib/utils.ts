import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { setSpace } from "./auth-store";
import { goto } from "$app/navigation";
import { toast } from "svelte-sonner";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };


export const goToSpace = async (spaceId: string) => {
  await setSpace(spaceId).then(() => {
    goto(`/space`)
   })
}

export const copyToClipboard = async (text: string) => {
	await navigator.clipboard.writeText(text).then(() => {
		toast.success('Copied to clipboard')
	})
}