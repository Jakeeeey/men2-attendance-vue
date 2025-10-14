
<template>
  <div class="w-full max-w-sm mx-auto">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" role="img">
      <g>
        <path v-if="total>0" :d="pathA" :fill="aColor"></path>
        <path v-if="total>0" :d="pathB" :fill="bColor"></path>
        <circle v-if="total===0" :cx="half" :cy="half" :r="radius" :fill="bgColor"></circle>
      </g>
      <text :x="half" :y="half-6" text-anchor="middle" dominant-baseline="middle" class="fill-gray-900" style="font-size:18px;font-weight:700">
        {{ centerTop }}
      </text>
      <text :x="half" :y="half+14" text-anchor="middle" dominant-baseline="middle" class="fill-gray-600" style="font-size:12px;font-weight:600">
        {{ centerBottom }}
      </text>
    </svg>
    <div v-if="legend" class="flex justify-center gap-4 mt-2 text-xs">
      <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full inline-block" :style="{background:aColor}"></span><span>{{ aLabel }}</span></div>
      <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full inline-block" :style="{background:bColor}"></span><span>{{ bLabel }}</span></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  a: { type: Number, default: 0 },
  b: { type: Number, default: 0 },
  aLabel: { type: String, default: 'A' },
  bLabel: { type: String, default: 'B' },
  aColor: { type: String, default: '#22c55e' },
  bColor: { type: String, default: '#ef4444' },
  bgColor: { type: String, default: '#e5e7eb' },
  centerTop: { type: String, default: '' },
  centerBottom: { type: String, default: '' },
  size: { type: Number, default: 180 },
  legend: { type: Boolean, default: true }
})

const half = computed(()=> props.size/2)
const radius = computed(()=> props.size/2 - 4)
const total = computed(()=> Math.max(0, props.a) + Math.max(0, props.b))

function polarToCartesian(cx, cy, r, angleDeg){
  const rad = (angleDeg-90) * Math.PI / 180.0
  return { x: cx + (r * Math.cos(rad)), y: cy + (r * Math.sin(rad)) }
}

function describeWedge(cx, cy, r, startAngle, endAngle){
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return [
    'M', cx, cy,
    'L', end.x, end.y,
    'A', r, r, 0, largeArcFlag, 0, start.x, start.y,
    'Z'
  ].join(' ')
}

const aAngle = computed(()=> total.value ? (props.a / total.value) * 360 : 0)
const pathA = computed(()=> total.value ? describeWedge(half.value, half.value, radius.value, 0, aAngle.value) : '')
const pathB = computed(()=> total.value ? describeWedge(half.value, half.value, radius.value, aAngle.value, 360) : '')
</script>
