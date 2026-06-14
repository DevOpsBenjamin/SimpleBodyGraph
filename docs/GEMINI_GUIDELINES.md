# SimpleBodyGraph: Gemini & Developer Guidelines

This document outlines key programming guidelines, reactivity constraints, calculations, and visual patterns in SimpleBodyGraph. Refer to this to avoid common regressions when modifying frontend or graphing logic.

---

## 1. Vue 3 & Pinia Reactivity Guidelines

### ⚠️ DO NOT Mutate State Inside Computed Getters (CRITICAL)
In Vue 3 and Pinia, computed properties (getters) must be **pure functions**. Modifying reactive state properties during getter evaluation corrupts Vue's reactivity dependency tracking.
* **The Bug:** Historically, the `activeWeek` getter performed bounds-checking and corrected `this.selectedWeekIndex = ...` during execution. This broke the reactivity chain, preventing charts and history list views from refreshing on deletes/saves until a manual page refresh.
* **The Fix:** Getters must only *read* the state and return clamped calculations. Actual state mutations must be isolated inside **actions** (e.g. `loadLogs()`, `setEditingLog()`, `goToPreviousWeek()`).

```javascript
// BAD - Mutation inside getter (breaks reactivity!)
activeWeek() {
  if (this.selectedWeekIndex >= weeks.length) {
    this.selectedWeekIndex = weeks.length - 1; // Mutating state!
  }
  return weeks[this.selectedWeekIndex];
}

// GOOD - Pure getter + mutation in action
activeWeek() {
  const safeIndex = Math.max(0, Math.min(this.selectedWeekIndex, weeks.length - 1));
  return weeks[safeIndex];
}
```

---

## 2. Sick Day Outlier Dampening Logic

Outliers (such as weight spikes caused by water retention during sickness) are marked with the `is_sick` boolean flag. We damp their influence rather than discarding the log entirely.

### Weighted Weekly Average Calculation
In `groupedWeeks`, normal entries have a weight of `1.0`, while sick outliers have a weight of `0.25`:
$$\text{Weighted Average} = \frac{\sum (\text{Metric}_i \times \text{Weight}_i)}{\sum \text{Weight}_i}$$

* **Normal Week (7 logs: 6 healthy, 1 sick):** Outlier weight reduces the sick day's influence from `14.3%` down to `4.0%` (~72% reduction).
* **Gym Routine (4 logs: 3 healthy, 1 sick):** Outlier weight reduces the sick day's influence from `25.0%` down to `7.7%` (~69% reduction).

---

## 3. Daily Chart Dual-Dataset Visualization

To show outliers visually without distorting the trend line curve, we plot two datasets on daily weight/fat charts inside `src/components/ProgressCharts.vue`:

1. **Dataset 0 (Trend Line):**
   * Plots estimated trend values on sick days (obtained via linear interpolation from surrounding healthy days) and raw values on healthy days.
   * Rendered as a connected curve.
2. **Dataset 1 (Raw Outliers):**
   * Plots the actual logged outlier values on sick days, and `null` on healthy days.
   * Rendered as floating individual markers.
3. **Connecting Line segments (`sickLinkLine` custom plugin):**
   * A custom plugin draws vertical dashed lines linking Dataset 0's trend points to Dataset 1's raw outlier points.
4. **Tooltips (`mode: 'index', intersect: false`):**
   * Unified to display both trend estimate and raw outlier weight side-by-side on hover.
   * Uses the `filter` callback to hide empty dataset entries on normal days.

---

## 4. Sick Day Badges & Weighted Labels

* **Header/Helper summaries:** When `hasSickLogs` is true in `store.activeWeek`, display the `Thermometer` icon and label the averages as `Weighted` (warning theme) to alert the user that some outliers have been dampened.
* **Logs History:** List both the actual logged metric and the trend-based interpolation (e.g. `82.00 kg (est. 80.10 kg)`) along with a warning badge.
