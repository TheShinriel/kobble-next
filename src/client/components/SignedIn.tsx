'use client';

import { FC, PropsWithChildren } from 'react';
import { useAssertWrappedByKobbleProvider, useAuth } from '../context/hooks';

export const SignedIn: FC<PropsWithChildren> = ({ children }) => {
	useAssertWrappedByKobbleProvider(SignedIn.name);

	const { user } = useAuth();

	if (!user) {
		return null;
	}

	return <>{children}</>;
};
