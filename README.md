# Next SDK

A SDK to seamlessly integrate Kobble with your Next.js project.

## Installation

```bash
npm i @kobbleio/next

# or
pnpm i @kobbleio/next
```

## Working with the app router

This SDK only supports the app router which is available since Next.js 13 and is now considered to be Next's default router.

- `@kobbleio/next/server` => utilities to work on the server side (usable in server side components and route handlers)
- `@kobbleio/next/client` => utilities to work on the client side (browser)
- `@kobbleio/next` => utilities that can safely be used on both sides

## Getting started

### Setup the middleware

Create a `middleware.ts` file in your project and add the following code:

```ts
import { authMiddleware } from '@kobbleio/next/server'

export default authMiddleware({
	publicRoutes: ['/'],
});

export const config = {
  matcher: [
    // exclude internal Next.js routes
    "/((?!.+\\.[\\w]+$|_next).*)",
    // reinclude api routes
    "/(api|trpc)(.*)"
  ]
};
```

This middleware will automatically expose various routes to handle authentication.

### Setup client side provider

To leverage kobble utilities inside client side components, you need to wrap your app with the `KobbleProvider` component.
This is commonly done in the top level `layout.tsx` file as shown below:

```ts
import { KobbleProvider } from "@kobbleio/next/server";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
	  	<KobbleProvider>
	  		{children}
		</KobbleProvider>
	  </body>
    </html>
  );
}
```

Note that `KobbleProvider` itself is a server side component, and as such should not be rendered by a client component directly.

## Basic usage

Only basic usage is documented here. For an exhaustive list of available functions, please check the [official documentation](https://docs.kobble.io).

### Access user session on the server

You can access the user session on the server by calling the `getAuth` function from `@kobbleio/next/server`:

```ts
import { getAuth } from '@kobbleio/next/server'

export default async function handler(req, res) {
  const { session } = await getAuth();

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // An active session was found. User and tokens can be accessed from the session object. 
  // <further logic here...>
}
```

### Access user session on the client

You can access the user session on the client by calling the `useAuth` hook from `@kobbleio/next/client`:

Note that `useAuth` will first have to fetch the user session from the server, so you need to check for the loading
state to know when the session information (if any) is available.

If your use case allows it, it is recommended to fetch the session on the server instead and pass it to the client side as a prop.

```ts
import { useAuth } from '@kobbleio/next/client'

export default function ExampleProfile() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return <div>Hello, {user.email}</div>;
}
```

### Use kobble client SDK

You can use the lower level client SDK Kobble by calling `getKobble` if on the server, or `useKobble` if on the client:

```ts
import { getKobble } from '@kobbleio/next/server'

export default async function handler(req, res) {
  const kobble = await getKobble();

  // Use the kobble SDK here
}
```

```ts
import { useKobble } from '@kobbleio/next/client'

export default function ExampleComponent() {
  const { kobble } = useKobble();

  // Use the kobble SDK here
}
```

The usage is exactly the same whether you are on the server or on the client.

A working client SDK is always returned, even if the user is not authenticated. In such scenario though, most functions will throw an error if called.
It is your responsability to make sure the user is authenticated before calling any function that requires it.
