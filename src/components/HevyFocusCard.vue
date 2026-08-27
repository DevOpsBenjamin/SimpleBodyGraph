<template>
  <div
    v-if="item"
    class="glass-card p-4 rounded-3xl max-w-md mx-auto shadow-lg flex items-center justify-between border border-gray-800/40 hover:border-gray-700/60 transition-all duration-300"
  >
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-xl bg-violet-600/10 border border-violet-500/15 flex-shrink-0">
        <Copy class="w-4 h-4 text-violet-400" />
      </div>
      <div>
        <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <span>{{ $t('hevy.helper') }}</span>
        </h4>
        <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-[11px] text-gray-400">
          <span class="flex items-center gap-0.5">{{ $t('hevy.weightAbbr') }}: <strong class="text-white">{{ item.medianMass.toFixed(2) }} {{ $t('common.kg') }}</strong></span>
          <span class="text-gray-700">|</span>
          <span class="flex items-center gap-0.5">{{ $t('hevy.leanAbbr') }}: <strong class="text-blue-400">{{ item.medianLeanMass.toFixed(2) }} {{ $t('common.kg') }}</strong></span>
          <span class="text-gray-700">|</span>
          <span class="flex items-center gap-0.5">{{ $t('hevy.fatAbbr') }}: <strong class="text-emerald-400">{{ item.medianFat.toFixed(1) }}%</strong></span>
          <span class="text-gray-700">|</span>
          <span class="flex items-center gap-0.5">{{ $t('hevy.fatKgAbbr') }}: <strong class="text-amber-400">{{ item.medianFatMass.toFixed(2) }} {{ $t('common.kg') }}</strong></span>
        </div>
      </div>
    </div>

    <button
      @click="handleCopy"
      class="p-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer border border-gray-700/30 flex-shrink-0 flex items-center gap-1.5 text-xs font-medium"
      :title="$t('hevy.copyPeriodMedians', { period: periodLabel })"
    >
      <Check v-if="copied" class="w-4 h-4 text-emerald-400 animate-bounce" />
      <Copy v-else class="w-4 h-4 text-violet-400" />
      <span>{{ copied ? $t('hevy.copied') : $t('hevy.copy') }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Copy, Check } from 'lucide-vue-next';
import { useI18n } from '../i18n';

const props = defineProps({
  item: {
    type: Object,
    default: null
  },
  periodLabel: {
    type: String,
    default: 'Period'
  }
});

const emit = defineEmits(['copied']);
const { t } = useI18n();
const copied = ref(false);

const handleCopy = () => {
  if (!props.item) return;
  const text = `Weight: ${props.item.medianMass.toFixed(2)}kg, Fat: ${props.item.medianFat.toFixed(1)}%`;
  navigator.clipboard.writeText(text).then(() => {
    copied.value = true;
    emit('copied', props.item.id);
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  });
};
</script>
