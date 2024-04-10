import { cookies } from "next/headers"
import { jwtParseClaims } from '../utils/jwt';
import { NextRequest, NextResponse } from "next/server";

export type KobbleAuth = {
	user: User | null;
	accessToken: string | null;
	idToken: string | null;
}

export type OAuthState = {
	origin: string;
}

export type RouteHandler = (req: NextRequest, options: AuthMiddlewareOptions) => Promise<NextResponse> | NextResponse;

export type AuthMiddlewareOptions = {
	publicRoutes?: string[];
	unauthenticatedRedirectPath?: string;
	kobbleRoutesBasePath?: string;
	loggedOutRedirectPath?: string;
	loggedInRedirectPath?: string;
}

export type IdTokenPayload = {
	sub: string;
	id: string;
	email: string;
	name: string | null;
	picture_url: string | null;
	is_verified: boolean;
	stripe_id: string | null;
	updated_at: string;
	created_at: string;
	iat: number;
	exp: number;
	iss: string;
	aud: string;
}

export type User = {
	id: string;
	email: string;
	name: string | null;
	pictureUrl: string | null;
	isVerified: boolean;
	stripeId: string | null;
	updatedAt: Date;
	createdAt: Date;
};

const ACCESS_TOKEN_COOKIE_NAME = 'kobble.access-token';
const ID_TOKEN_COOKIE_NAME = 'kobble.id-token';


export const auth = (): KobbleAuth => {
	const ck = cookies();
	const accessToken = ck.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
	const idToken = ck.get(ID_TOKEN_COOKIE_NAME)?.value;

	if (!accessToken || !idToken) {
		return { user: null, accessToken: null, idToken: null };
	}
	
	const idTokenPayload = jwtParseClaims<IdTokenPayload>(idToken);
	const user: User = {
		id: idTokenPayload.id,
		email: idTokenPayload.email,
		name: idTokenPayload.name,
		pictureUrl: idTokenPayload.picture_url,
		isVerified: idTokenPayload.is_verified,
		stripeId: idTokenPayload.stripe_id,
		createdAt: new Date(idTokenPayload.created_at),
		updatedAt: new Date(idTokenPayload.updated_at),
	}

	console.log(idTokenPayload);


	return { user, idToken, accessToken };
}

const serializeState = (state: OAuthState) => {
	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(state)) {
		params.append(key, value);
	}

	return btoa(params.toString());
}


const deserializeState = (state: string): OAuthState => {
	const params = new URLSearchParams(atob(state));

	return Object.fromEntries(params.entries()) as OAuthState;
}

const createAuthorizationUrl = (state: OAuthState): URL => {
	const url = new URL('/oauth/authorize', process.env.KOBBLE_DOMAIN);
	const serializedState = serializeState(state);

	url.searchParams.set('response_type', 'code');
	url.searchParams.set('client_id', process.env.KOBBLE_CLIENT_ID!);
	url.searchParams.set('client_secret', process.env.KOBBLE_CLIENT_SECRET!);
	url.searchParams.set('redirect_uri', process.env.KOBBLE_REDIRECT_URI!);
	url.searchParams.set('state', serializedState);
	url.searchParams.set('scope', 'openid email profile');

	return url;
}

const handleLogin = async (request: NextRequest, options: AuthMiddlewareOptions) => {
	const url = request.nextUrl.clone();

	url.pathname = options.loggedInRedirectPath ?? '/';

	const authorizationUrl = createAuthorizationUrl(
		{ origin: url.toString() }	
	);

	return NextResponse.redirect(authorizationUrl);
}

const handleOAuthCallback = async (request: NextRequest, _: AuthMiddlewareOptions) => {
	const code = request.nextUrl.searchParams.get('code');

	if (!code) {
		return NextResponse.json({ message: 'missing code' });
	}

	const serializedState = request.nextUrl.searchParams.get('state');

	if (!serializedState) {
		return NextResponse.json({ message: 'missing state' });
	}

	const state = deserializeState(serializedState);
	const tokenUrl = new URL('/api/oauth/token', process.env.KOBBLE_DOMAIN);
	const payload = new URLSearchParams({
		code,
		client_id: process.env.KOBBLE_CLIENT_ID!,
		client_secret: process.env.KOBBLE_CLIENT_SECRET!,
		redirect_uri: process.env.KOBBLE_REDIRECT_URI!,
		grant_type: 'authorization_code',
	});

	const res = await fetch(tokenUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: payload.toString()
	});

	if (!res.ok) {
		const text = await res.text();
		console.error('Failed to exchange code for token', res.status, text);

		return NextResponse.json({ 
			message: 'failed to exchange code for token', 
			error: {
				status: res.status,
				data: text,
			}
		});
	}

	const { access_token, id_token } = await res.json();
	const nextRes = NextResponse.redirect(state.origin);

	nextRes.cookies.set(ACCESS_TOKEN_COOKIE_NAME, access_token, {
		httpOnly: true,
		secure: true,
		sameSite: 'strict',
	});
	nextRes.cookies.set(ID_TOKEN_COOKIE_NAME, id_token, {
		httpOnly: true,
		secure: true,
		sameSite: 'strict',
	});

	return nextRes;
}

const handleLogout = (request: NextRequest, options: AuthMiddlewareOptions) => {
	const resUrl = request.nextUrl.clone();

	resUrl.pathname = options.loggedOutRedirectPath ?? '/';

	const nextRes = NextResponse.redirect(resUrl);

	nextRes.cookies.delete(ACCESS_TOKEN_COOKIE_NAME);
	nextRes.cookies.delete(ID_TOKEN_COOKIE_NAME);

	return nextRes;
}

const kobblePath = (base: string, path: string) => {
	return `${base}${path}`;
}

export const authMiddleware = (options: AuthMiddlewareOptions = {}) => {
	const { publicRoutes = [], unauthenticatedRedirectPath, kobbleRoutesBasePath = '/' } = options;
	const kobbleRoutes = {
		[kobblePath(kobbleRoutesBasePath, 'logout')]: handleLogout,
		[kobblePath(kobbleRoutesBasePath, 'login')]: handleLogin,
		[kobblePath(kobbleRoutesBasePath, 'oauth/callback')]: handleOAuthCallback,
	};

	return (request: NextRequest) => {
		console.debug('authMiddleware', request.nextUrl.pathname);
		const currentPath = request.nextUrl.pathname;

		if (publicRoutes.includes(currentPath)) {
			console.info(`${currentPath} is a public route, skipping auth check.`);

			return NextResponse.next();
		}

		if (kobbleRoutes[currentPath]) {
			return kobbleRoutes[currentPath](request, options);
		}

		const { user } = auth();

		if (user) {
			return NextResponse.next();
		}

		if (unauthenticatedRedirectPath) {
			const url = request.nextUrl.clone();

			url.pathname = unauthenticatedRedirectPath;

			return NextResponse.redirect(url);
		}


		return handleLogin(request, options);
	}
}