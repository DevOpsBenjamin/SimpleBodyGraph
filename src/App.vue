<template>
  <div class="min-h-screen bg-gray-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
    <!-- Ambient glowing backgrounds -->
    <div class="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse-slow"></div>
    <div class="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>

    <!-- Glassmorphic Card -->
    <div class="glass-card-violet p-8 rounded-3xl max-w-md w-full text-center relative z-10">
      <div class="w-20 h-20 mx-auto mb-6 bg-violet-500/10 rounded-2xl flex items-center justify-center border border-violet-500/20">
        <svg class="w-12 h-12 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      </div>

      <h1 class="text-3xl font-bold tracking-tight text-white mb-2 font-sans">
        SimpleBodyGraph
      </h1>
      
      <p class="text-gray-400 text-sm mb-6 leading-relaxed">
        Premium, mobile-first, offline-first personal body metrics tracker. Ready for deployment configuration.
      </p>

      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
        Ready to Build
      </div>
    </div>
  </div>
</template>

<script setup>
// Minimal script for build setup
</script>
