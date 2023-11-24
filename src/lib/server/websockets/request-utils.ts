import type { IncomingMessage } from 'http';
import { auth } from '../lucia';

export function channelFrom(request: IncomingMessage) {
	const url = new URL(`${request.headers.origin}${request.url}`);
	return url.searchParams.get('channel');
}

export function streamFrom(request: IncomingMessage) {
	const url = new URL(`${request.headers.origin}${request.url}`);
	return url.searchParams.get('stream');
}

export async function sessionFrom(request: IncomingMessage) {
	const sessionId = auth.readSessionCookie(request.headers.cookie);
	return sessionId ? await auth.validateSession(sessionId) : null; // note: `validateSession()` throws an error if session is invalid
}
