import type {
	Endpoint,
	EndpointContext,
	EndpointMetadata,
	EndpointRuntimeOptions,
	HTTPMethod,
	Middleware,
	StandardSchemaV1,
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

type BodyOption<M, B extends object | undefined = undefined> = M extends
	| "GET"
	| "HEAD"
	| ("GET" | "HEAD")[]
	? { body?: never }
	: { body?: B };

type AuthEndpointOptions<
	Method extends HTTPMethod | HTTPMethod[] | "*",
	BodySchema extends object | undefined,
	QuerySchema extends object | undefined,
	Use extends Middleware[],
	ReqHeaders extends boolean,
	ReqRequest extends boolean,
	Meta extends EndpointMetadata | undefined,
> = { method: Method } & BodyOption<Method, BodySchema> & {
		query?: QuerySchema;
		use?: [...Use];
		requireHeaders?: ReqHeaders;
		requireRequest?: ReqRequest;
		error?: StandardSchemaV1;
		cloneRequest?: boolean;
		disableBody?: boolean;
		metadata?: Meta;
		[key: string]: any;
	};

// Path + options + handler overload
export function createAuthEndpoint<
	Path extends string,
	Method extends HTTPMethod | HTTPMethod[] | "*",
	BodySchema extends object | undefined = undefined,
	QuerySchema extends object | undefined = undefined,
	Use extends Middleware[] = [],
	ReqHeaders extends boolean = false,
	ReqRequest extends boolean = false,
	R = unknown,
	Meta extends EndpointMetadata | undefined = undefined,
>(
	path: Path,
	options: AuthEndpointOptions<
		Method,
		BodySchema,
		QuerySchema,
		Use,
		ReqHeaders,
		ReqRequest,
		Meta
	>,
	handler: (
		ctx: EndpointContext<
			Path,
			Method,
			BodySchema,
			QuerySchema,
			Use,
			ReqHeaders,
			ReqRequest,
			AuthContext,
			Meta
		>,
	) => Promise<R>,
): Endpoint<Path, any, any, any, any, R>;

// Options-only (virtual/path-less) overload
export function createAuthEndpoint<
	Method extends HTTPMethod | HTTPMethod[] | "*",
	BodySchema extends object | undefined = undefined,
	QuerySchema extends object | undefined = undefined,
	Use extends Middleware[] = [],
	ReqHeaders extends boolean = false,
	ReqRequest extends boolean = false,
	R = unknown,
	Meta extends EndpointMetadata | undefined = undefined,
>(
	options: AuthEndpointOptions<
		Method,
		BodySchema,
		QuerySchema,
		Use,
		ReqHeaders,
		ReqRequest,
		Meta
	>,
	handler: (
		ctx: EndpointContext<
			string,
			Method,
			BodySchema,
			QuerySchema,
			Use,
			ReqHeaders,
			ReqRequest,
			AuthContext,
			Meta
		>,
	) => Promise<R>,
): Endpoint<string, any, any, any, any, R>;

// Implementation
export function createAuthEndpoint(
	pathOrOptions: any,
	handlerOrOptions: any,
	handlerOrNever?: any,
) {
	const path: string | undefined =
		typeof pathOrOptions === "string" ? pathOrOptions : undefined;
	const options: EndpointRuntimeOptions =
		typeof handlerOrOptions === "object" ? handlerOrOptions : pathOrOptions;
	const handler =
		typeof handlerOrOptions === "function" ? handlerOrOptions : handlerOrNever;

	if (path) {
		return createEndpoint(
			path,
			{
				...options,
				use: [...(options?.use || []), ...use],
			} as any,
			async (ctx: any) => runWithEndpointContext(ctx, () => handler(ctx)),
		);
	}

	return createEndpoint(
		{
			...options,
			use: [...(options?.use || []), ...use],
		} as any,
		async (ctx: any) => runWithEndpointContext(ctx, () => handler(ctx)),
	);
}

export type AuthEndpoint = ReturnType<typeof createAuthEndpoint>;
export type AuthMiddleware = ReturnType<typeof createAuthMiddleware>;
