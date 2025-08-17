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

export const formatBytes = (bytes: number) => {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

export const doNotAskExtOpen = () => {
	const status = window.localStorage.getItem('doNotAskExtOpen');
	return status === 'true';
}

export const setDoNotAskExtOpen = (status: boolean) => {
	window.localStorage.setItem('doNotAskExtOpen', status.toString());
}

// Add a small helper to open external URLs safely
export const openExternalUrl = (url: string) => {
	window.open(url, '_blank', 'noopener,noreferrer');
}