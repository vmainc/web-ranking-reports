export default defineNuxtPlugin(() => {
  const { initTheme } = useAppTheme()
  initTheme()
})
