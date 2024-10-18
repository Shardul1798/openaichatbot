import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CreateUserDocument = User & Document;

@Schema()
export class PersonalInfo extends Document {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  dateOfBirth: Date;

  @Prop({ required: true })
  gender: string;

  @Prop({ required: true })
  contactNumber: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  address?: string;
}

@Schema()
export class Medication extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  dosage: string;

  @Prop({ required: true })
  schedule: string;
}

@Schema()
export class Surgery extends Document {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  reason: string;
}

@Schema()
export class HealthInfo extends Document {
  @Prop({ type: [String], required: true })
  medicalConditions: string[];

  @Prop({ type: [Medication], required: true })
  medications: Medication[];

  @Prop({ type: [String], required: true })
  allergies: string[];

  @Prop({ type: [Surgery], required: true })
  surgeries: Surgery[];

  @Prop({ type: [String], required: true })
  familyMedicalHistory: string[];

  @Prop({ type: [String], required: true })
  vaccinationRecords: string[];
}

@Schema()
export class LifestyleInfo extends Document {
  @Prop()
  dietaryPreferences?: string;

  @Prop()
  exerciseHabits?: string;

  @Prop()
  smokingStatus?: boolean;

  @Prop()
  alcoholConsumption?: boolean;
}

@Schema()
export class MonitoringData extends Document {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  level: number;
}

@Schema()
export class BloodPressure extends Document {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  systolic: number;

  @Prop({ required: true })
  diastolic: number;
}

@Schema()
export class Weight extends Document {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  weight: number;
}

@Schema()
export class SymptomLog extends Document {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  description: string;
}

@Schema()
export class DailyActivityLog extends Document {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  activity: string;

  @Prop({ required: true })
  duration: number;
}

@Schema()
export class Appointment extends Document {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  time: string;

  @Prop({ required: true })
  healthcareProvider: string;
}

@Schema()
export class PastAppointment extends Document {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  notes: string;

  @Prop({ required: true })
  outcome: string;
}

@Schema()
export class AppointmentInfo extends Document {
  @Prop({ type: [Appointment], required: true })
  upcomingAppointments: Appointment[];

  @Prop({ type: [PastAppointment], required: true })
  pastAppointments: PastAppointment[];

  @Prop({ type: [String], required: true })
  treatmentPlans: string[];

  @Prop({ type: [Medication], required: true })
  prescriptions: Medication[];
}

@Schema()
export class InsuranceInfo extends Document {
  @Prop()
  insuranceProvider?: string;

  @Prop()
  policyNumber?: string;

  @Prop()
  coverageDetails?: string;
}

@Schema()
export class EmergencyContact extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  relationship: string;

  @Prop({ required: true })
  phoneNumber: string;
}

@Schema()
export class TechnicalInfo extends Document {
  @Prop()
  language?: string;

  @Prop()
  notificationSettings?: string;

  @Prop({ type: [{ date: Date, action: String }], required: true })
  appUsageHistory: { date: Date; action: string }[];

  @Prop()
  deviceInfo?: string;
}

@Schema()
export class Consent extends Document {
  @Prop({ required: true })
  consentForDataSharing: boolean;

  @Prop({ required: true })
  hipaaComplianceAcknowledged: boolean;

  @Prop({ required: true })
  termsOfServiceAgreed: boolean;

  @Prop({ required: true })
  privacyPolicyAgreed: boolean;
}

@Schema()
export class User extends Document {
  @Prop({ type: PersonalInfo, required: true })
  personalInfo: PersonalInfo;

  @Prop({ type: HealthInfo, required: true })
  healthInfo: HealthInfo;

  @Prop({ type: LifestyleInfo, required: true })
  lifestyleInfo: LifestyleInfo;

  @Prop({ type: [MonitoringData], required: true })
  bloodSugarLevels: MonitoringData[];

  @Prop({ type: [BloodPressure], required: true })
  bloodPressure: BloodPressure[];

  @Prop({ type: [Weight], required: true })
  weight: Weight[];

  @Prop({ type: [SymptomLog], required: true })
  symptomLogs: SymptomLog[];

  @Prop({ type: [DailyActivityLog], required: true })
  dailyActivityLogs: DailyActivityLog[];

  @Prop({ type: AppointmentInfo, required: true })
  appointmentInfo: AppointmentInfo;

  @Prop({ type: InsuranceInfo, required: true })
  insuranceInfo: InsuranceInfo;

  @Prop({ type: [EmergencyContact], required: true })
  emergencyContacts: EmergencyContact[];

  @Prop({ type: TechnicalInfo, required: true })
  technicalInfo: TechnicalInfo;

  @Prop({ type: Consent, required: true })
  consent: Consent;
}

export const CreateUserSchema = SchemaFactory.createForClass(User);
export const PersonalInfoSchema = SchemaFactory.createForClass(PersonalInfo);
export const MedicationSchema = SchemaFactory.createForClass(Medication);
export const SurgerySchema = SchemaFactory.createForClass(Surgery);
export const HealthInfoSchema = SchemaFactory.createForClass(HealthInfo);
export const LifestyleInfoSchema = SchemaFactory.createForClass(LifestyleInfo);
export const MonitoringDataSchema = SchemaFactory.createForClass(MonitoringData);
export const BloodPressureSchema = SchemaFactory.createForClass(BloodPressure);
export const WeightSchema = SchemaFactory.createForClass(Weight);
export const SymptomLogSchema = SchemaFactory.createForClass(SymptomLog);
export const DailyActivityLogSchema = SchemaFactory.createForClass(DailyActivityLog);
export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
export const PastAppointmentSchema = SchemaFactory.createForClass(PastAppointment);
export const AppointmentInfoSchema = SchemaFactory.createForClass(AppointmentInfo);
export const InsuranceInfoSchema = SchemaFactory.createForClass(InsuranceInfo);
export const EmergencyContactSchema = SchemaFactory.createForClass(EmergencyContact);
export const TechnicalInfoSchema = SchemaFactory.createForClass(TechnicalInfo);
export const ConsentSchema = SchemaFactory.createForClass(Consent);
