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

export interface Trip {
  id: string;
  title: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  dailyAllowanceCentavos: number;
  createdAt: string;
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

export interface CompanySettings {
  id: string;
  hqName: string;
  hqLatitude: number | null;
  hqLongitude: number | null;
  hqRadiusMeters: number;
  updatedAt: string;
}

export interface JwtPayload {
  userId: string;
  cpf: string;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
