
<template>
  <div class="w-full max-w-sm mx-auto">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" role="img" aria-label="Late/Overtime chart">
      <g :transform="`rotate(-90 ${half} ${half})`">
        <circle :cx="half" :cy="half" :r="radius" :stroke-width="thickness" stroke="#e5e7eb" fill="none"/>
        <circle v-if="total>0"
                :cx="half" :cy="half" :r="radius"
                :stroke-width="thickness"
                :stroke-dasharray="`${lateArc} ${circumference-lateArc}`"
                stroke-linecap="round"
                stroke="currentColor"
                fill="none"
                class="text-red-500"/>
        <circle v-if="total>0"
                :cx="half" :cy="half" :r="radius"
                :stroke-width="thickness"
                :stroke-dasharray="`${otArc} ${circumference-otArc}`"
                :stroke-dashoffset="lateArc"
                stroke-linecap="round"
                stroke="currentColor"
                fill="none"
                class="text-green-600"/>
      </g>
      <text :x="half" :y="half" text-anchor="middle" dominant-baseline="middle" class="fill-gray-800" style="font-size:14px;font-weight:600">
        {{ lateLabel }} / {{ otLabel }}
      </text>
    </svg>
    <div class="flex justify-center gap-4 mt-2 text-sm">
      <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full inline-block bg-red-500"></span><span>Late</span></div>
      <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full inline-block bg-green-600"></span><span>Overtime</span></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  lateMinutes: { type: Number, default: 0 },
  overtimeMinutes: { type: Number, default: 0 },
  size: { type: Number, default: 180 },
  thickness: { type: Number, default: 18 }
})

const half = computed(()=> props.size/2)
const radius = computed(()=> props.size/2 - props.thickness/2)
const circumference = computed(()=> 2 * Math.PI * radius.value)
const total = computed(()=> Math.max(0, props.lateMinutes) + Math.max(0, props.overtimeMinutes))
const lateArc = computed(()=> total.value ? (props.lateMinutes / total.value) * circumference.value : 0)
const otArc = computed(()=> total.value ? (props.overtimeMinutes / total.value) * circumference.value : 0)

function minutesPretty(m){
  const h = Math.floor(m/60), mm = Math.floor(m%60)
  return `${h}h ${mm}m`
}
const lateLabel = computed(()=> minutesPretty(props.lateMinutes||0))
const otLabel = computed(()=> minutesPretty(props.overtimeMinutes||0))
</script>
