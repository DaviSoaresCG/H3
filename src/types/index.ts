export type UserRole = 'EMPLOYEE' | 'ADMIN';

export interface User {
  id: string;
  cpf: string;
  name: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

export type TimeEntryType = 'CLOCK_IN' | 'MEAL_START' | 'MEAL_END' | 'CLOCK_OUT';
export type GpsStatus = 'OK' | 'UNAVAILABLE';

export interface TimeEntry {
  id: string;
  userId: string;
  entryType: TimeEntryType;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  gpsStatus: GpsStatus;
  isOutsideHq: boolean;
  isAdjusted: boolean;
  adjustedBy?: string | null;
  adjustmentReason?: string | null;
  createdAt: string;
}

export interface AudioDiary {
  id: string;
  timeEntryId: string;
  audioUrl: string | null;
  transcriptionText: string;
  isFallbackText: boolean;
  fallbackReason?: string | null;
  durationSeconds: number;
  createdAt: string;
}

export interface StoredTimeEntry {
  id: string;
  user_id: string;
  entry_type: TimeEntryType;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  gps_status: GpsStatus;
  is_outside_hq: boolean;
  is_adjusted?: boolean;
  adjusted_by?: string | null;
  adjustment_reason?: string | null;
  transcription_text?: string | null;
  audio_url?: string | null;
  is_fallback_text?: boolean;
}

export interface AudioDiaryValidationParams {
  entryType: TimeEntryType;
  transcriptionText?: string | null;
  audioUrl?: string | null;
  isFallbackText?: boolean;
  fallbackReason?: string | null;
  durationSeconds?: number;
}

export type VehicleStatus = 'GARAGE' | 'ON_ROAD' | 'TRIP';

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  status: VehicleStatus;
  createdAt: string;
}

export type VehicleUsageStatus = 'IN_USE' | 'RETURNED' | 'ON_TRIP';

export interface VehicleUsage {
  id: string;
  vehicleId: string;
  userId: string;
  pickedUpAt: string;
  returnedAt?: string | null;
  status: VehicleUsageStatus;
  createdAt: string;
}

export interface VehicleUsageWithDetails extends VehicleUsage {
  vehicleName?: string;
  plate?: string;
  driverName?: string;
}

export type VehicleNoteCategory = 'OIL' | 'BRAKES' | 'TIRES' | 'LIGHTS' | 'GENERAL';

export interface VehicleNote {
  id: string;
  vehicleId: string;
  userId: string;
  category: VehicleNoteCategory;
  noteText: string;
  isResolved: boolean;
  resolvedBy?: string | null;
  createdAt: string;
}

export interface VehicleNoteWithDetails extends VehicleNote {
  vehicleName?: string;
  plate?: string;
  reportedBy?: string;
  resolvedByName?: string | null;
}

export type TripStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Trip {
  id: string;
  title: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  dailyAllowanceCentavos: number;
  status?: TripStatus;
  createdAt: string;
}

export interface TripParticipant {
  id: string;
  tripId: string;
  userId: string;
  userName?: string;
  userCpf?: string;
  daysCount: number;
  totalAllowanceCentavos: number;
}

export interface TripVehicle {
  id: string;
  tripId: string;
  vehicleId: string;
  vehicleName?: string;
  plate?: string;
}

export interface TripWithDetails extends Trip {
  participants: TripParticipant[];
  vehicles: TripVehicle[];
  totalDays: number;
  totalBudgetCentavos: number;
}

export interface EventTechniqueService {
  id: string;
  userId: string;
  eventName: string;
  serviceDate: string;
  techniquesCount: number;
  amountPerTechniqueCentavos: number;
  totalAmountCentavos: number;
  notes?: string | null;
  createdAt: string;
}

export interface EventTechniqueServiceWithDetails extends EventTechniqueService {
  employeeName?: string;
  employeeCpf?: string;
}

export interface CompanySettings {
  id: string;
  hqName: string;
  hqLatitude: number | null;
  hqLongitude: number | null;
  hqRadiusMeters: number;
  updatedAt: string;
}

export type AnomalyType =
  | 'OUTSIDE_HQ'
  | 'NO_GPS'
  | 'SHIFT_EXCEEDED_12H'
  | 'VEHICLE_OVERDUE';

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AnomalyAlertItem {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  employeeName: string;
  timestamp: string;
  message: string;
  shiftHours?: number;
}

export interface EmployeeTechniqueSummary {
  userId: string;
  employeeName: string;
  servicesCount: number;
  techniquesCount: number;
  totalAmountCentavos: number;
  lastEventName?: string;
  lastServiceDate?: string;
}

export interface DashboardStatsData {
  activeWorkersCount: number;
  vehiclesOnRoadCount: number;
  pendingMaintenanceAlertsCount: number;
  anomaliesCount: number;
  totalAudioDiariesCount: number;
  totalTechniquesAmountCentavos?: number;
  totalTechniquesCount?: number;
  totalTravelAllowancesCentavos?: number;
  employeeTechniques?: EmployeeTechniqueSummary[];
}

export interface AudioDiaryFeedItem {
  id: string;
  timeEntryId?: string;
  employeeName: string;
  transcriptionText: string;
  audioUrl?: string | null;
  isFallbackText?: boolean;
  fallbackReason?: string | null;
  durationSeconds?: number;
  createdAt: string;
}

export type SundayHolidayRule = 'OVERTIME_100' | 'FIXED_DAILY';

export interface EspelhoSummary {
  entriesCount: number;
  totalWorkedHours: number;
  regularHours: number;
  overtimeHours: number;
  sundayHolidayHours: number;
  sundayDaysCount: number;
  sundayBonusReais: string;
  techniquesCount: number;
  totalTechniquesAmountReais: string;
  travelDaysCount: number;
  totalTravelAllowancesReais: string;
  grandTotalBonusReais: string;
}

export interface EspelhoReportData {
  success: boolean;
  month: string;
  sundayRule: SundayHolidayRule;
  employee: User;
  entries: StoredTimeEntry[];
  summary: EspelhoSummary;
}

export interface JwtPayload {
  userId: string;
  cpf: string;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
