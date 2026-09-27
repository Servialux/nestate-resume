import { base } from '$app/paths';
import { getSiteConfig } from '$lib/server/site';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => ({ site: { ...getSiteConfig(), basePath: base } });
