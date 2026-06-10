<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans relative overflow-x-hidden">
    <!-- Neon Ambient Glows -->
    <div class="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
    <div class="absolute bottom-10 right-1/4 translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

    <!-- Header component -->
    <HeaderSection />

    <!-- Main Content -->
    <main class="flex-grow max-w-6xl w-full mx-auto p-4 sm:p-6 pb-24 z-10">
      
      <!-- Stats summary cards -->
      <StatsOverview />

      <!-- Tab navigation controller -->
      <section class="mb-6">
        <div class="flex p-1 rounded-xl bg-gray-900/80 border border-gray-800/60 max-w-sm">
          <button 
            @click="store.activeTab = 'charts'"
            :class="[
              'flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 cursor-pointer',
              store.activeTab === 'charts' 
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20 shadow-md' 
                : 'text-gray-400 hover:text-gray-200'
            ]"
          >
            Dashboard
          </button>
          <button 
            @click="store.activeTab = 'history'"
            :class="[
              'flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 cursor-pointer',
              store.activeTab === 'history' 
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20 shadow-md' 
                : 'text-gray-400 hover:text-gray-200'
            ]"
          >
            Logs History
          </button>
        </div>
      </section>

      <!-- Tabs content panel -->
      <section>
        <!-- Charts view -->
        <ProgressCharts v-show="store.activeTab === 'charts'" />

        <!-- History entries list -->
        <HistoryList v-show="store.activeTab === 'history'" />
      </section>
    </main>

    <!-- FAB Button -->
    <div class="fixed bottom-6 right-6 z-20">
      <button 
        @click="store.showAddModal = true"
        class="w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white flex items-center justify-center shadow-lg shadow-violet-600/30 hover:scale-105 transition-all duration-300 select-none cursor-pointer"
        title="Add Log Entry"
      >
        <Plus class="w-8 h-8" />
      </button>
    </div>

    <!-- Modal Form overlay -->
    <LogForm />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { Plus } from 'lucide-vue-next';
import { useBodyGraphStore } from './stores/bodyGraph';

// Import subcomponents
import HeaderSection from './components/HeaderSection.vue';
import StatsOverview from './components/StatsOverview.vue';
import ProgressCharts from './components/ProgressCharts.vue';
import HistoryList from './components/HistoryList.vue';
import LogForm from './components/LogForm.vue';

const store = useBodyGraphStore();

onMounted(async () => {
  // Read local database entries
  await store.loadLogs();

  // Attach online/offline check triggers
  window.addEventListener('online', () => {
    store.setOnlineStatus(true);
  });
  
  window.addEventListener('offline', () => {
    store.setOnlineStatus(false);
  });

  // Attempt initial background synchronization
  store.triggerSync();
});
</script>
