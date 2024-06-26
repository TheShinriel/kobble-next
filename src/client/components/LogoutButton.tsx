'use client';

import React, { PropsWithChildren } from 'react';
import { defaultButtonIfNoChild } from './utils/defaultButtonIfNoChild';
import { useAssertWrappedByKobbleProvider, useAuth } from '../context/hooks';
import { assertSingleChild } from './utils/assertSingleChild';
import { executeFunctionSafely } from './utils/executeFunctionSafely';

export const LogoutButton: React.FC<PropsWithChildren> = ({ children, ...rest }) => {
	useAssertWrappedByKobbleProvider(LogoutButton.name);

	const { logout } = useAuth();
	const defaultChildren = defaultButtonIfNoChild(children, 'Logout');
	const child = assertSingleChild(LogoutButton.name, defaultChildren);

	const ourClickHandler = async () => {
		await executeFunctionSafely((child as any).props.onClick);

		logout();
	};

	const childProps = { ...rest, onClick: ourClickHandler };

	return React.cloneElement(child as React.ReactElement<unknown>, childProps);
};
