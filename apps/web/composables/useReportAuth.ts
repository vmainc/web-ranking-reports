/** Auth headers for dashboard/report API calls. Uses pdf_token from route when present (for PDF export). */
export function useReportAuth(): { getHeaders: () => Record<string, string> } {
  const route = useRoute()
  const pb = usePocketbase()
  function getHeaders(): Record<string, string> {
    const pdf = route.query.pdf_token as string | undefined
    const t = pdf ?? pb.authStore.token ?? ''
    return t ? { Authorization: `Bearer ${t}` } : {}
  }
  return { getHeaders }
}
