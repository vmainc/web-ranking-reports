import type { Ref } from 'vue'
import type { ReportBuilderModel } from '~/types/reportBuilder'
import type { DateRangePreset } from '~/utils/dateRange'
import { DEFAULT_REPORT_DATE_RANGE } from '~/utils/reportBuilderFactory'

/**
 * Report-wide date range for builder preview/PDF. All dated modules read from here.
 */
export function useReportDateRange() {
  const model = inject<Ref<ReportBuilderModel | null>>('reportBuilderModel', ref(null))

  const rangePreset = computed<DateRangePreset>(
    () => model.value?.dateRange?.rangePreset ?? DEFAULT_REPORT_DATE_RANGE.rangePreset,
  )
  const compareToPrevious = computed(
    () => model.value?.dateRange?.compareToPrevious ?? DEFAULT_REPORT_DATE_RANGE.compareToPrevious,
  )

  return { rangePreset, compareToPrevious }
}
