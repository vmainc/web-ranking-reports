/**
 * Resolves an `<img src>` for `/api/agency/logo`: PDF capture uses `pdf_token` query (no Authorization on img),
 * signed-in sessions use a blob URL from an authenticated fetch.
 */
export function useAgencyLogoImgSrc() {
  const route = useRoute()
  const pb = usePocketbase()
  const agencyLogoImgSrc = ref('/api/agency/logo')
  let blobUrl: string | null = null

  function revokeBlob() {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      blobUrl = null
    }
  }

  async function refreshAgencyLogoImg() {
    const pdfRaw = route.query.pdf_token
    const pdf = typeof pdfRaw === 'string' && pdfRaw.trim() ? pdfRaw.trim() : ''
    if (pdf) {
      revokeBlob()
      agencyLogoImgSrc.value = `/api/agency/logo?pdf_token=${encodeURIComponent(pdf)}`
      return
    }
    const token = String(pb.authStore.token || '').trim()
    if (!token) {
      revokeBlob()
      agencyLogoImgSrc.value = '/api/agency/logo'
      return
    }
    revokeBlob()
    try {
      const blob = await $fetch<Blob>('/api/agency/logo', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      })
      if (blob?.size) {
        blobUrl = URL.createObjectURL(blob)
        agencyLogoImgSrc.value = blobUrl
      } else {
        agencyLogoImgSrc.value = '/api/agency/logo'
      }
    } catch {
      agencyLogoImgSrc.value = '/api/agency/logo'
    }
  }

  onMounted(() => void refreshAgencyLogoImg())
  watch(() => route.query.pdf_token, () => void refreshAgencyLogoImg())
  watch(() => pb.authStore.token, () => void refreshAgencyLogoImg())
  onBeforeUnmount(() => revokeBlob())

  return { agencyLogoImgSrc, refreshAgencyLogoImg }
}
