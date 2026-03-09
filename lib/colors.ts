export interface ColorOption {
  key: string;
  nameHe: string;
  nameAr: string;
  hex: string;
}

export const PRODUCT_COLORS: ColorOption[] = [
  { key: 'black',  nameHe: 'שחור',  nameAr: 'أسود',  hex: '#000000' },
  { key: 'white',  nameHe: 'לבן',   nameAr: 'أبيض',  hex: '#FFFFFF' },
  { key: 'gray',   nameHe: 'אפור',  nameAr: 'رمادي', hex: '#808080' },
  { key: 'blue',   nameHe: 'כחול',  nameAr: 'أزرق',  hex: '#2563EB' },
  { key: 'red',    nameHe: 'אדום',  nameAr: 'أحمر',  hex: '#DC2626' },
  { key: 'green',  nameHe: 'ירוק',  nameAr: 'أخضر',  hex: '#16A34A' },
  { key: 'yellow', nameHe: 'צהוב',  nameAr: 'أصفر',  hex: '#FACC15' },
  { key: 'orange', nameHe: 'כתום',  nameAr: 'برتقالي', hex: '#F97316' },
  { key: 'brown',  nameHe: 'חום',   nameAr: 'بني',   hex: '#92400E' },
  { key: 'beige',  nameHe: 'בז\'',  nameAr: 'بيج',   hex: '#E5D3B3' },
];

export const DELIVERY_TIME_OPTIONS = [
  { value: 'same_day',    labelAr: 'نفس اليوم',  labelHe: 'אותו יום' },
  { value: '1_2_days',    labelAr: '1-2 أيام',   labelHe: '1-2 ימים' },
  { value: '2_3_days',    labelAr: '2-3 أيام',   labelHe: '2-3 ימים' },
  { value: '3_5_days',    labelAr: '3-5 أيام',   labelHe: '3-5 ימים' },
  { value: '5_7_days',    labelAr: '5-7 أيام',   labelHe: '5-7 ימים' },
  { value: '7_10_days',   labelAr: '7-10 أيام',  labelHe: '7-10 ימים' },
];

export function getColorByKey(key: string): ColorOption | undefined {
  return PRODUCT_COLORS.find((c) => c.key === key);
}

export function getDeliveryLabelAr(value: string): string {
  return DELIVERY_TIME_OPTIONS.find((d) => d.value === value)?.labelAr || value;
}

export function getDeliveryLabelHe(value: string): string {
  return DELIVERY_TIME_OPTIONS.find((d) => d.value === value)?.labelHe || value;
}
