/**
 * Doctor color palette for schedule views.
 * Each doctor gets a unique color based on their index.
 * Colors are designed to work as appointment card backgrounds.
 */

const DOCTOR_COLORS = [
  { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', dot: '#3b82f6' },  // Blue
  { bg: '#dcfce7', border: '#86efac', text: '#166534', dot: '#22c55e' },  // Green
  { bg: '#fce7f3', border: '#f9a8d4', text: '#9d174d', dot: '#ec4899' },  // Pink
  { bg: '#e0e7ff', border: '#a5b4fc', text: '#3730a3', dot: '#6366f1' },  // Indigo
  { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', dot: '#f59e0b' },  // Amber
  { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46', dot: '#10b981' },  // Emerald
  { bg: '#ede9fe', border: '#c4b5fd', text: '#5b21b6', dot: '#8b5cf6' },  // Violet
  { bg: '#ffedd5', border: '#fdba74', text: '#9a3412', dot: '#f97316' },  // Orange
  { bg: '#cffafe', border: '#67e8f9', text: '#155e75', dot: '#06b6d4' },  // Cyan
  { bg: '#fecdd3', border: '#fda4af', text: '#9f1239', dot: '#f43f5e' },  // Rose
];

// Status override colors (take priority over doctor colors)
export const STATUS_COLORS = {
  // "Пришёл" — beige
  in_progress: { bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
  // "Завершён" — gray
  completed: { bg: '#f3f4f6', border: '#d1d5db', text: '#6b7280' },
  // "Отменён" / "Не пришёл" — light red
  cancelled: { bg: '#fee2e2', border: '#fecaca', text: '#991b1b' },
  no_show: { bg: '#fee2e2', border: '#fecaca', text: '#991b1b' },
};

/**
 * Get doctor's color by their index in the doctor list.
 * Uses modulo to wrap around if more doctors than colors.
 */
export function getDoctorColor(index: number) {
  return DOCTOR_COLORS[index % DOCTOR_COLORS.length];
}

/**
 * Get appointment card style based on doctor color + status override.
 * Status overrides doctor color for: in_progress, completed, cancelled, no_show.
 */
export function getAppointmentStyle(
  doctorIndex: number,
  status: string
): { bg: string; border: string; text: string } {
  // Status overrides
  const override = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
  if (override) return override;

  // Doctor color for scheduled/confirmed
  return getDoctorColor(doctorIndex);
}

/**
 * Build a map of doctorId -> index for consistent color assignment.
 */
export function buildDoctorColorMap(doctorIds: string[]): Map<string, number> {
  const map = new Map<string, number>();
  doctorIds.forEach((id, index) => {
    map.set(id, index);
  });
  return map;
}
