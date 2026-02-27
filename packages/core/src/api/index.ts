import type {
	Endpoint,
	EndpointContext,
	EndpointRuntimeOptions,
} from "better-call";
import { createEndpoint, createMiddleware } from "better-call";
import { runWithEndpointContext } from "../context";
import type { AuthContext } from "../types";

export const optionsMiddleware = createMiddleware(async () => {
	/**
	 * This will be passed on the instance of
	 * the context. Used to infer the type
	 * here.
	 */
	return {} as AuthContext;
});

export const createAuthMiddleware = createMiddleware.create({
	use: [
		optionsMiddleware,
		/**
		 * Only use for post hooks
		 */
		createMiddleware(async () => {
			return {} as {
				returned?: unknown | undefined;
				responseHeaders?: Headers | undefined;
			};
		}),
	],
});

const use = [optionsMiddleware];

type EndpointHandler<
	Path extends string,
	Options extends EndpointRuntimeOptions,
	R,
> = (
	context: EndpointContext<
		Path,
		any,
		any,
		any,
		any,
		any,
		any,
		AuthContext
	>,
) => Promise<R>;

export function createAuthEndpoint<
	Path extends string,
	Options extends EndpointRuntimeOptions,
	R,
>(
	path: Path,
	options: Options,
	handler: EndpointHandler<Path, Options, R>,
): Endpoint<Path, any, any, any, any, R>;

export function createAuthEndpoint<
	Path extends string,
	Options extends EndpointRuntimeOptions,
	R,
>(
	options: Options,
	handler: EndpointHandler<Path, Options, R>,
): Endpoint<Path, any, any, any, any, R>;

export function createAuthEndpoint<
	Path extends string,
	Opts extends EndpointRuntimeOptions,
	R,
>(
	pathOrOptions: Path | Opts,
	handlerOrOptions: EndpointHandler<Path, Opts, R> | Opts,
	handlerOrNever?: any,
) {
	const path: Path | undefined =
		typeof pathOrOptions === "string" ? pathOrOptions : undefined;
	const options: Opts =
		typeof handlerOrOptions === "object"
			? handlerOrOptions
			: (pathOrOptions as Opts);
	const handler: EndpointHandler<Path, Opts, R> =
		typeof handlerOrOptions === "function" ? handlerOrOptions : handlerOrNever;

	const mergedOptions = {
		...options,
		use: [...(options?.use || []), ...use],
	} as any;

	if (path) {
		return createEndpoint(
			path,
			mergedOptions,
			async (ctx: any) => runWithEndpointContext(ctx, () => handler(ctx)),
		);
	}

	return createEndpoint(
		mergedOptions,
		async (ctx: any) => runWithEndpointContext(ctx, () => handler(ctx)),
	);
}

export type AuthEndpoint<
	Path extends string,
	Opts extends EndpointRuntimeOptions,
	R,
> = ReturnType<typeof createAuthEndpoint<Path, Opts, R>>;
export type AuthMiddleware = ReturnType<typeof createAuthMiddleware>;
