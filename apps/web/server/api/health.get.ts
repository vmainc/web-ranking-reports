/** No-auth health check: returns 200 if the server is up. Use to verify deployment. */
export default defineEventHandler(() => ({ ok: true }))
