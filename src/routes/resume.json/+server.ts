import { json } from '@sveltejs/kit';
import resume from '$lib/resume.json';

export const prerender = true;
export function GET() {
  return json(resume);
}
