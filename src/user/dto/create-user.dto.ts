import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class PersonalInfoDto {
  @IsNotEmpty()
  @IsString()
  @Min(2)
  @Max(25)
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @Min(2)
  @Max(25)
  lastName: string;

  @IsDate()
  @Type(() => Date)
  dateOfBirth: Date;

  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsString()
  @IsNotEmpty()
  contactNumber: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  address?: string;
}

class HealthInfoDto {
  @IsArray()
  @IsString({ each: true })
  medicalConditions: string[];

  @IsArray()
  @IsObject({ each: true })
  medications: { name: string; dosage: string; schedule: string }[];

  @IsArray()
  @IsString({ each: true })
  allergies: string[];

  @IsArray()
  @IsObject({ each: true })
  surgeries: { date: Date; reason: string }[];

  @IsArray()
  @IsString({ each: true })
  familyMedicalHistory: string[];

  @IsArray()
  @IsString({ each: true })
  vaccinationRecords: string[];
}

class LifestyleInfoDto {
  @IsString()
  @IsOptional()
  dietaryPreferences?: string;

  @IsString()
  @IsOptional()
  exerciseHabits?: string;

  @IsBoolean()
  @IsOptional()
  smokingStatus?: boolean;

  @IsBoolean()
  @IsOptional()
  alcoholConsumption?: boolean;
}

class MonitoringDataDto {
  @IsArray()
  @IsObject({ each: true })
  bloodSugarLevels: { date: Date; level: number }[];

  @IsArray()
  @IsObject({ each: true })
  bloodPressure: { date: Date; systolic: number; diastolic: number }[];

  @IsArray()
  @IsObject({ each: true })
  weight: { date: Date; weight: number }[];

  @IsArray()
  @IsObject({ each: true })
  symptomLogs: { date: Date; description: string }[];

  @IsArray()
  @IsObject({ each: true })
  dailyActivityLogs: { date: Date; activity: string; duration: number }[];
}

class AppointmentInfoDto {
  @IsArray()
  @IsObject({ each: true })
  upcomingAppointments: {
    date: Date;
    time: string;
    healthcareProvider: string;
  }[];

  @IsArray()
  @IsObject({ each: true })
  pastAppointments: { date: Date; notes: string; outcome: string }[];

  @IsArray()
  @IsString({ each: true })
  treatmentPlans: string[];

  @IsArray()
  @IsObject({ each: true })
  prescriptions: {
    name: string;
    dosage: string;
    schedule: string;
    startDate: Date;
    endDate?: Date;
  }[];
}

class InsuranceInfoDto {
  @IsString()
  @IsOptional()
  insuranceProvider?: string;

  @IsString()
  @IsOptional()
  policyNumber?: string;

  @IsString()
  @IsOptional()
  coverageDetails?: string;
}

class EmergencyContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  relationship: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

class TechnicalInfoDto {
  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  notificationSettings?: string;

  @IsArray()
  @IsObject({ each: true })
  appUsageHistory: { date: Date; action: string }[];

  @IsString()
  @IsOptional()
  deviceInfo?: string;
}

class ConsentDto {
  @IsBoolean()
  @IsNotEmpty()
  consentForDataSharing: boolean;

  @IsBoolean()
  @IsNotEmpty()
  hipaaComplianceAcknowledged: boolean;

  @IsBoolean()
  @IsNotEmpty()
  termsOfServiceAgreed: boolean;

  @IsBoolean()
  @IsNotEmpty()
  privacyPolicyAgreed: boolean;
}

export class CreateUserDto {
  @ValidateNested()
  @Type(() => PersonalInfoDto)
  personalInfo: PersonalInfoDto;

  @ValidateNested()
  @Type(() => HealthInfoDto)
  healthInfo: HealthInfoDto;

  @ValidateNested()
  @Type(() => LifestyleInfoDto)
  lifestyleInfo: LifestyleInfoDto;

  @ValidateNested()
  @Type(() => MonitoringDataDto)
  monitoringData: MonitoringDataDto;

  @ValidateNested()
  @Type(() => AppointmentInfoDto)
  appointmentInfo: AppointmentInfoDto;

  @ValidateNested()
  @Type(() => InsuranceInfoDto)
  insuranceInfo: InsuranceInfoDto;

  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  emergencyContacts: EmergencyContactDto[];

  @ValidateNested()
  @Type(() => TechnicalInfoDto)
  technicalInfo: TechnicalInfoDto;

  @ValidateNested()
  @Type(() => ConsentDto)
  consent: ConsentDto;
}
