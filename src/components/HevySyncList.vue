<template>
  <div class="glass-card p-5 rounded-3xl max-w-2xl mx-auto shadow-xl">
    <div class="flex items-center gap-2 mb-2">
      <Copy class="w-4.5 h-4.5 text-violet-400" />
      <h3 class="text-sm font-bold text-white">{{ $t('hevy.syncHelperTitle') }}</h3>
    </div>
    <p class="text-xs text-gray-400 mb-4">
      {{ $t('hevy.syncHelperDesc', { period: periodType === 'weekly' ? $t('hevy.weekly') : $t('hevy.monthly') }) }}
    </p>

    <!-- Averages List -->
    <div class="space-y-2.5">
      <div
        v-for="item in items"
        :key="item.id"
        class="flex items-center justify-between p-3 rounded-xl bg-gray-900/60 border border-gray-800/40 hover:border-gray-700/60 transition-colors duration-200"
      >
        <div>
          <div class="text-xs font-semibold text-white flex items-center gap-1.5">
            <span>{{ item.label }}</span>
          </div>
          <div class="text-[10px] text-gray-500 mt-0.5">{{ item.logs.length > 1 ? $t('hevy.recordsCountPlural', { count: item.logs.length }) : $t('hevy.recordsCount', { count: item.logs.length }) }}</div>
        </div>

        <div class="flex items-center gap-5 sm:gap-6 flex-wrap sm:flex-nowrap">
          <div class="text-right">
            <span class="text-[10px] text-gray-400 block leading-none">{{ $t('hevy.medWeight') }}</span>
            <span class="text-sm font-bold text-white mt-0.5 block">{{ item.medianMass.toFixed(2) }} {{ $t('common.kg') }}</span>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-blue-400 block leading-none">{{ $t('hevy.medLean') }}</span>
            <span class="text-sm font-bold text-blue-400 mt-0.5 block">{{ item.medianLeanMass.toFixed(2) }} {{ $t('common.kg') }}</span>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-emerald-400 block leading-none">{{ $t('hevy.medFatPercent') }}</span>
            <span class="text-sm font-bold text-emerald-400 mt-0.5 block">{{ item.medianFat.toFixed(1) }}%</span>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-amber-400 block leading-none">{{ $t('hevy.medFatKg') }}</span>
            <span class="text-sm font-bold text-amber-400 mt-0.5 block">{{ item.medianFatMass.toFixed(2) }} {{ $t('common.kg') }}</span>
          </div>

          <!-- Copy trigger -->
          <button
            @click="copyItem(item)"
            class="p-2 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer border border-gray-700/30 flex-shrink-0"
            :title="$t('hevy.copyPeriodMedians', { period: periodType })"
            :aria-label="$t('hevy.copyPeriodMedians', { period: periodType })"
          >
            <Check v-if="copiedId === item.id" class="w-4 h-4 text-emerald-400 animate-pulse" />
            <Copy v-else class="w-4 h-4 text-violet-400" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Copy, Check } from 'lucide-vue-next';

defineProps({
  items: {
    type: Array,
    required: true
  },
  periodType: {
    type: String,
    default: 'monthly' // 'monthly' | 'weekly'
  }
});

const copiedId = ref(null);

const copyItem = (item) => {
  const text = `Weight: ${item.medianMass.toFixed(2)}kg, Fat: ${item.medianFat.toFixed(1)}%`;
  navigator.clipboard.writeText(text).then(() => {
    copiedId.value = item.id;
    setTimeout(() => {
      copiedId.value = null;
    }, 2000);
  });
};
</script>
