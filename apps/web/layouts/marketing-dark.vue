<template>
  <div class="min-h-screen bg-[#0f172a] text-slate-200 antialiased selection:bg-emerald-500/30 selection:text-white">
    <DarkMarketingNav />
    <main>
      <slot />
    </main>
    <DarkMarketingFooter />
  </div>
</template>

<style>
:root {
  --wrr-navy: #071f57;
  --wrr-blue: #38bdf8;
  --wrr-green: #34d399;
}
</style>
