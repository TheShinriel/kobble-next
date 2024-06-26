import { User } from "../types";
import { LogLevel } from "../utils/logger";

export type KobbleServerAuthSession = {
	user: User;
	accessToken: string;
	refreshToken: string;
	idToken: string;
}

export type KobbleAuth = {
	session: KobbleServerAuthSession | null;
}

export type AuthMiddlewareOptions = {
	publicRoutes?: string[];
	unauthenticatedRedirectPath?: string;
	loggedOutRedirectPath?: string;
	loggedInRedirectPath?: string;
	logLevel?: LogLevel;
}
